from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, desc
from sqlalchemy.orm import selectinload, attributes
from fastapi import HTTPException, status
from app.models.cart import CartItem
from app.models.course import Course, Enrollment
from app.models.order import Coupon, Order, OrderItem
from app.schemas.order import CouponCreate, CheckoutRequest, PaymentMockRequest
from typing import List, Optional
from decimal import Decimal
from datetime import datetime, timezone

class OrderService:
    # ==================== CART SERVICES ====================
    @staticmethod
    async def get_cart(db: AsyncSession, user_id: int):
        result = await db.execute(
            select(CartItem)
            .options(selectinload(CartItem.khoa_hoc))
            .where(CartItem.ma_nguoi_dung == user_id)
        )
        cart_items = list(result.scalars().all())
        
        # Tính tổng tiền tạm tính
        tong_tien = Decimal("0.00")
        for item in cart_items:
            if item.khoa_hoc:
                tong_tien += item.khoa_hoc.gia_tien
                
        return {
            "chi_tiet_gio_hang": cart_items,
            "tong_tien_tam_tinh": tong_tien
        }

    @staticmethod
    async def add_to_cart(db: AsyncSession, user_id: int, course_id: int) -> CartItem:
        # 1. Kiểm tra khóa học tồn tại
        course_result = await db.execute(select(Course).where(Course.id == course_id))
        course = course_result.scalars().first()
        if not course:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Khóa học không tồn tại."
            )

        # 2. Kiểm tra học viên đã đăng ký học khóa học này chưa (Đã mua thành công)
        enrolled_result = await db.execute(
            select(Enrollment).where(
                and_(
                    Enrollment.ma_nguoi_dung == user_id,
                    Enrollment.ma_khoa_hoc == course_id
                )
            )
        )
        if enrolled_result.scalars().first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Bạn đã mua và ghi danh khóa học này rồi."
            )

        # 3. Kiểm tra khóa học đã có sẵn trong giỏ chưa
        existing_item = await db.execute(
            select(CartItem).where(
                and_(
                    CartItem.ma_nguoi_dung == user_id,
                    CartItem.ma_khoa_hoc == course_id
                )
            )
        )
        if existing_item.scalars().first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Khóa học đã có sẵn trong giỏ hàng."
            )

        # 4. Thêm vào giỏ hàng
        cart_item = CartItem(
            ma_nguoi_dung=user_id,
            ma_khoa_hoc=course_id
        )
        db.add(cart_item)
        await db.commit()
        await db.refresh(cart_item)
        # Gán trước thực thể khoa_hoc để tránh kích hoạt lazy-loading khi serialize
        attributes.set_committed_value(cart_item, "khoa_hoc", course)
        return cart_item

    @staticmethod
    async def remove_from_cart(db: AsyncSession, user_id: int, course_id: int) -> bool:
        result = await db.execute(
            select(CartItem).where(
                and_(
                    CartItem.ma_nguoi_dung == user_id,
                    CartItem.ma_khoa_hoc == course_id
                )
            )
        )
        item_to_delete = result.scalars().first()
                
        if not item_to_delete:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Khóa học không nằm trong giỏ hàng."
            )
            
        await db.delete(item_to_delete)
        await db.commit()
        return True

    # ==================== COUPON SERVICES ====================
    @staticmethod
    async def create_coupon(db: AsyncSession, coupon_in: CouponCreate) -> Coupon:
        # Kiểm tra mã trùng lặp
        result = await db.execute(select(Coupon).where(Coupon.ma_code == coupon_in.code))
        if result.scalars().first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Mã giảm giá này đã tồn tại."
            )

        # Hỗ trợ tương thích ngược với discount_value (phan_tram_giam) và gia_tri_giam mới
        val = coupon_in.gia_tri_giam if coupon_in.gia_tri_giam is not None else coupon_in.discount_value
        db_coupon = Coupon(
            ma_code=coupon_in.code,
            loai_giam_gia=coupon_in.loai_giam_gia or "PERCENTAGE",
            gia_tri_giam=val or Decimal("0.00"),
            gia_tri_don_toi_thieu=coupon_in.gia_tri_don_toi_thieu or Decimal("0.00"),
            so_luot_dung_toi_da=coupon_in.so_luot_dung_toi_da,
            ngay_het_han=coupon_in.end_date
        )
        db.add(db_coupon)
        await db.commit()
        await db.refresh(db_coupon)
        return db_coupon

    @staticmethod
    async def apply_coupon(db: AsyncSession, code: str, original_amount: Decimal, user_id: int) -> Coupon:
        result = await db.execute(select(Coupon).where(Coupon.ma_code == code))
        coupon = result.scalars().first()
        if not coupon:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Mã giảm giá không hợp lệ."
            )

        # 1. Kiểm tra ngày hết hạn
        if coupon.ngay_het_han and coupon.ngay_het_han < datetime.now():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Mã giảm giá này đã hết hạn sử dụng."
            )

        # 2. Kiểm tra giá trị đơn hàng tối thiểu
        if original_amount < coupon.gia_tri_don_toi_thieu:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Đơn hàng của bạn chưa đạt giá trị tối thiểu để áp dụng mã này (Tối thiểu: {coupon.gia_tri_don_toi_thieu} VND)."
            )

        # 3. Kiểm tra số lần sử dụng tối đa
        if coupon.so_luot_dung_toi_da is not None and coupon.so_luot_da_dung >= coupon.so_luot_dung_toi_da:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Mã giảm giá này đã hết số lần sử dụng cho phép."
            )

        # 4. Kiểm tra xem người dùng đã sử dụng mã này chưa
        used_result = await db.execute(
            select(Order).where(
                and_(
                    Order.ma_nguoi_dung == user_id,
                    Order.ma_giam_gia_id == coupon.id,
                    Order.trang_thai == "success"
                )
            )
        )
        if used_result.scalars().first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Bạn đã sử dụng mã giảm giá này cho một đơn hàng trước đó."
            )

        return coupon

    # ==================== ORDER & CHECKOUT SERVICES ====================
    @staticmethod
    async def checkout(db: AsyncSession, user_id: int, checkout_in: CheckoutRequest) -> Order:
        cart_data = await OrderService.get_cart(db, user_id)
        if not cart_data["chi_tiet_gio_hang"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Giỏ hàng rỗng. Không thể tiến hành thanh toán."
            )

        # 1. Tính tổng tiền khóa học gốc
        original_amount = cart_data["tong_tien_tam_tinh"]
        final_amount = original_amount
        coupon_id = None

        # 2. Áp dụng giảm giá nếu có coupon_id
        if checkout_in.coupon_id:
            coupon_result = await db.execute(select(Coupon).where(Coupon.id == checkout_in.coupon_id))
            coupon = coupon_result.scalars().first()
            if coupon:
                # Kiểm tra đầy đủ các điều kiện trước khi giảm trừ
                is_expired = coupon.ngay_het_han and coupon.ngay_het_han < datetime.now()
                is_below_min = original_amount < coupon.gia_tri_don_toi_thieu
                is_limit_reached = coupon.so_luot_dung_toi_da is not None and coupon.so_luot_da_dung >= coupon.so_luot_dung_toi_da
                
                # Kiểm tra xem user đã dùng mã này chưa
                used_res = await db.execute(
                    select(Order).where(
                        and_(
                            Order.ma_nguoi_dung == user_id,
                            Order.ma_giam_gia_id == coupon.id,
                            Order.trang_thai == "success"
                        )
                    )
                )
                is_already_used = used_res.scalars().first() is not None
                
                if not is_expired and not is_below_min and not is_limit_reached and not is_already_used:
                    coupon_id = coupon.id
                    if coupon.loai_giam_gia == "PERCENTAGE":
                        discount_ratio = coupon.gia_tri_giam / Decimal("100.00")
                        discount_amount = original_amount * discount_ratio
                    else:  # FIXED_AMOUNT
                        discount_amount = coupon.gia_tri_giam
                        
                    final_amount = original_amount - discount_amount
                    if final_amount < Decimal("0.00"):
                        final_amount = Decimal("0.00")

        # 3. Tạo Đơn hàng ở trạng thái PENDING
        db_order = Order(
            ma_nguoi_dung=user_id,
            ma_giam_gia_id=coupon_id,
            tong_tien=final_amount,
            trang_thai="pending"
        )
        db.add(db_order)
        await db.commit()
        await db.refresh(db_order)

        # 4. Tạo chi tiết các OrderItem
        for item in cart_data["chi_tiet_gio_hang"]:
            order_item = OrderItem(
                ma_don_hang=db_order.id,
                ma_khoa_hoc=item.ma_khoa_hoc,
                gia_luc_mua=item.khoa_hoc.gia_tien if item.khoa_hoc else Decimal("0.00")
            )
            db.add(order_item)

        await db.commit()
        
        # Load đầy đủ chi tiết đơn hàng để trả về
        result = await db.execute(
            select(Order)
            .options(selectinload(Order.chi_tiet_don_hang).selectinload(OrderItem.khoa_hoc))
            .where(Order.id == db_order.id)
        )
        return result.scalars().one()

    @staticmethod
    async def get_my_orders(db: AsyncSession, user_id: int) -> List[Order]:
        result = await db.execute(
            select(Order)
            .options(selectinload(Order.chi_tiet_don_hang).selectinload(OrderItem.khoa_hoc))
            .where(Order.ma_nguoi_dung == user_id)
            .order_by(desc(Order.ngay_tao))
        )
        return list(result.scalars().all())

    @staticmethod
    async def process_mock_payment(db: AsyncSession, payment_in: PaymentMockRequest, user_id: int) -> Order:
        # 1. Tìm đơn hàng
        result = await db.execute(
            select(Order)
            .options(selectinload(Order.chi_tiet_don_hang))
            .where(Order.id == payment_in.order_id)
        )
        order = result.scalars().first()
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Đơn hàng không tồn tại."
            )

        if order.ma_nguoi_dung != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn không có quyền thanh toán đơn hàng này."
            )

        if order.trang_thai != "pending":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Đơn hàng đã được xử lý (Trạng thái hiện tại: {order.trang_thai})."
            )

        # 2. Cập nhật thông tin thanh toán trực tiếp lên Order (Chuẩn hóa)
        order.phuong_thuc_thanh_toan = payment_in.payment_method
        order.ma_giao_dich = payment_in.transaction_code or f"TXMOCK{int(datetime.now().timestamp())}"
        order.ngay_thanh_toan = datetime.now()
        order.trang_thai = "success"
        db.add(order)

        # Cập nhật số lượt sử dụng của Mã giảm giá nếu có áp dụng
        if order.ma_giam_gia_id:
            coupon_res = await db.execute(select(Coupon).where(Coupon.id == order.ma_giam_gia_id))
            coupon = coupon_res.scalars().first()
            if coupon:
                coupon.so_luot_da_dung += 1
                db.add(coupon)

        # 3. Tự động ghi danh (Enrollment) cho học viên vào tất cả khóa học trong đơn hàng
        for item in order.chi_tiet_don_hang:
            if item.ma_khoa_hoc:
                # Kiểm tra xem đã ghi danh chưa (đề phòng trùng lặp)
                enroll_check = await db.execute(
                    select(Enrollment).where(
                        and_(
                            Enrollment.ma_nguoi_dung == user_id,
                            Enrollment.ma_khoa_hoc == item.ma_khoa_hoc
                        )
                    )
                )
                if not enroll_check.scalars().first():
                    new_enrollment = Enrollment(
                        ma_nguoi_dung=user_id,
                        ma_khoa_hoc=item.ma_khoa_hoc
                    )
                    db.add(new_enrollment)

        # 4. DỌN SẠCH GIỎ HÀNG
        items_result = await db.execute(
            select(CartItem).where(CartItem.ma_nguoi_dung == user_id)
        )
        for item in items_result.scalars().all():
            await db.delete(item)

        await db.commit()
        await db.refresh(order)
        return order
