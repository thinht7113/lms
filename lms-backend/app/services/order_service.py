from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import and_, delete, desc, select
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
    def _ensure_course_purchasable(course: Course, user_id: int) -> None:
        if course.ma_giang_vien == user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Bạn không thể mua khóa học do chính mình giảng dạy."
            )

        if not course.da_xuat_ban or course.trang_thai_phe_duyet != "approved":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Khóa học này chưa sẵn sàng để mua."
            )

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

        OrderService._ensure_course_purchasable(course, user_id)

        # 2. Kiểm tra người dùng đã đăng ký học khóa học này chưa (Đã mua thành công)
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

        for item in cart_data["chi_tiet_gio_hang"]:
            if not item.khoa_hoc:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Giỏ hàng có khóa học không hợp lệ."
                )
            OrderService._ensure_course_purchasable(item.khoa_hoc, user_id)

        # 1. Tính tổng tiền khóa học gốc
        original_amount = cart_data["tong_tien_tam_tinh"]
        final_amount = original_amount
        coupon_id = None

        # 2. Áp dụng giảm giá nếu có coupon_id
        if checkout_in.coupon_id:
            coupon_result = await db.execute(select(Coupon).where(Coupon.id == checkout_in.coupon_id))
            coupon = coupon_result.scalars().first()
            if not coupon:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Mã giảm giá không hợp lệ."
                )

            is_expired = coupon.ngay_het_han and coupon.ngay_het_han < datetime.now()
            is_below_min = original_amount < coupon.gia_tri_don_toi_thieu
            is_limit_reached = coupon.so_luot_dung_toi_da is not None and coupon.so_luot_da_dung >= coupon.so_luot_dung_toi_da

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

            if is_expired:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Mã giảm giá này đã hết hạn sử dụng."
                )
            if is_below_min:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Đơn hàng của bạn chưa đạt giá trị tối thiểu để áp dụng mã này (Tối thiểu: {coupon.gia_tri_don_toi_thieu} VND)."
                )
            if is_limit_reached:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Mã giảm giá này đã hết số lần sử dụng cho phép."
                )
            if is_already_used:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Bạn đã sử dụng mã giảm giá này cho một đơn hàng trước đó."
                )

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
        await db.flush()

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
        result = await db.execute(
            select(Order)
            .options(selectinload(Order.chi_tiet_don_hang))
            .where(Order.id == payment_in.order_id)
            .with_for_update()
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

        return await OrderService._finalize_payment(
            db,
            order,
            user_id=user_id,
            payment_method=payment_in.payment_method,
            transaction_code=payment_in.transaction_code
            or f"TXMOCK{int(datetime.now().timestamp())}",
        )

    @staticmethod
    async def process_webhook_payment(
        db: AsyncSession,
        order_id: int,
        payment_method: str,
        transaction_code: str,
    ) -> Order:
        result = await db.execute(
            select(Order)
            .options(selectinload(Order.chi_tiet_don_hang))
            .where(Order.id == order_id)
            .with_for_update()
        )
        order = result.scalars().first()
        if not order or order.ma_nguoi_dung is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Đơn hàng không tồn tại."
            )

        return await OrderService._finalize_payment(
            db,
            order,
            user_id=order.ma_nguoi_dung,
            payment_method=payment_method,
            transaction_code=transaction_code,
        )

    @staticmethod
    async def _finalize_payment(
        db: AsyncSession,
        order: Order,
        user_id: int,
        payment_method: str,
        transaction_code: str,
    ) -> Order:
        if order.trang_thai == "success":
            if order.ma_giao_dich != transaction_code:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Đơn hàng đã được thanh toán bằng một mã giao dịch khác."
                )
            refreshed_result = await db.execute(
                select(Order)
                .options(
                    selectinload(Order.chi_tiet_don_hang)
                    .selectinload(OrderItem.khoa_hoc)
                )
                .where(Order.id == order.id)
            )
            return refreshed_result.scalars().one()

        if order.trang_thai != "pending":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Đơn hàng đã được xử lý (Trạng thái hiện tại: {order.trang_thai})."
            )

        order.phuong_thuc_thanh_toan = payment_method
        order.ma_giao_dich = transaction_code
        order.ngay_thanh_toan = datetime.now()
        order.trang_thai = "success"
        db.add(order)

        if order.ma_giam_gia_id:
            coupon_res = await db.execute(
                select(Coupon)
                .where(Coupon.id == order.ma_giam_gia_id)
                .with_for_update()
            )
            coupon = coupon_res.scalars().first()
            if coupon:
                coupon.so_luot_da_dung += 1
                db.add(coupon)

        purchased_course_ids = []
        for item in order.chi_tiet_don_hang:
            if item.ma_khoa_hoc:
                purchased_course_ids.append(item.ma_khoa_hoc)
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

        if purchased_course_ids:
            await db.execute(
                delete(CartItem).where(
                    and_(
                        CartItem.ma_nguoi_dung == user_id,
                        CartItem.ma_khoa_hoc.in_(purchased_course_ids),
                    )
                )
            )

        await db.commit()
        refreshed_result = await db.execute(
            select(Order)
            .options(
                selectinload(Order.chi_tiet_don_hang)
                .selectinload(OrderItem.khoa_hoc)
            )
            .where(Order.id == order.id)
        )
        return refreshed_result.scalars().one()

    @staticmethod
    async def refund_order(db: AsyncSession, order_id: int, user_id: int) -> Order:
        # 1. Tìm đơn hàng kèm theo chi tiết và thông tin khóa học để tránh lazy-load khi serialize
        result = await db.execute(
            select(Order)
            .options(selectinload(Order.chi_tiet_don_hang).selectinload(OrderItem.khoa_hoc))
            .where(Order.id == order_id)
        )
        order = result.scalars().first()
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Đơn hàng không tồn tại."
            )

        # 2. Kiểm tra quyền sở hữu đơn hàng
        if order.ma_nguoi_dung != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn không có quyền yêu cầu hoàn tiền cho đơn hàng này."
            )

        # 3. Kiểm tra trạng thái đơn hàng (chỉ cho phép hoàn tiền đơn hàng ở trạng thái 'success')
        if order.trang_thai != "success":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Chỉ có thể hoàn tiền các đơn hàng đã thanh toán thành công (Trạng thái hiện tại: {order.trang_thai})."
            )

        # 4. Kiểm tra điều kiện thời gian hoàn tiền (trong vòng 7 ngày kể từ ngày thanh toán)
        if order.ngay_thanh_toan:
            # So sánh ngày thanh toán với hiện tại
            delta = datetime.now() - order.ngay_thanh_toan.replace(tzinfo=None)
            if delta.days > 7:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Đơn hàng đã mua vượt quá giới hạn 7 ngày hoàn tiền."
                )

        # 4b. Kiểm tra điều kiện tiến trình học tập (dưới 10%)
        from app.services.cert_service import CertService
        for item in order.chi_tiet_don_hang:
            if item.ma_khoa_hoc:
                progress_data = await CertService.get_course_progress(db, user_id, item.ma_khoa_hoc)
                if progress_data["progress_percentage"] >= 10.0:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Không thể hoàn tiền đơn hàng này do khóa học '{item.khoa_hoc.tieu_de if item.khoa_hoc else ''}' đã học được {progress_data['progress_percentage']}%, vượt quá giới hạn 10%."
                    )

        # 5. Cập nhật trạng thái đơn hàng sang 'refund_requested' (chờ phê duyệt)
        order.trang_thai = "refund_requested"
        db.add(order)

        await db.commit()
        
        # 6. Tải lại đơn hàng cùng các quan hệ để tránh lỗi lazy-load khi serialize response
        refreshed_result = await db.execute(
            select(Order)
            .options(selectinload(Order.chi_tiet_don_hang).selectinload(OrderItem.khoa_hoc))
            .where(Order.id == order_id)
        )
        return refreshed_result.scalars().one()

    @staticmethod
    async def approve_refund(db: AsyncSession, order_id: int) -> Order:
        # 1. Tìm đơn hàng kèm theo chi tiết và thông tin khóa học
        result = await db.execute(
            select(Order)
            .options(selectinload(Order.chi_tiet_don_hang).selectinload(OrderItem.khoa_hoc))
            .where(Order.id == order_id)
        )
        order = result.scalars().first()
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Đơn hàng không tồn tại."
            )

        # 2. Kiểm tra trạng thái đơn hàng
        if order.trang_thai != "refund_requested":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Chỉ có thể duyệt hoàn tiền cho đơn hàng có trạng thái 'refund_requested' (Trạng thái hiện tại: {order.trang_thai})."
            )

        # 3. Cập nhật trạng thái đơn hàng sang 'refunded'
        order.trang_thai = "refunded"
        db.add(order)

        # 4. Thu hồi quyền học tập (Hủy Enrollment)
        for item in order.chi_tiet_don_hang:
            if item.ma_khoa_hoc:
                enroll_result = await db.execute(
                    select(Enrollment).where(
                        and_(
                            Enrollment.ma_nguoi_dung == order.ma_nguoi_dung,
                            Enrollment.ma_khoa_hoc == item.ma_khoa_hoc
                        )
                    )
                )
                enrollment = enroll_result.scalars().first()
                if enrollment:
                    await db.delete(enrollment)

        # 5. Khôi phục số lượt sử dụng của Mã giảm giá nếu có áp dụng
        if order.ma_giam_gia_id:
            coupon_res = await db.execute(select(Coupon).where(Coupon.id == order.ma_giam_gia_id))
            coupon = coupon_res.scalars().first()
            if coupon and coupon.so_luot_da_dung > 0:
                coupon.so_luot_da_dung -= 1
                db.add(coupon)

        await db.commit()

        # Tải lại đơn hàng cùng các quan hệ
        refreshed_result = await db.execute(
            select(Order)
            .options(selectinload(Order.chi_tiet_don_hang).selectinload(OrderItem.khoa_hoc))
            .where(Order.id == order_id)
        )
        return refreshed_result.scalars().one()

    @staticmethod
    async def reject_refund(db: AsyncSession, order_id: int) -> Order:
        # 1. Tìm đơn hàng
        result = await db.execute(
            select(Order)
            .options(selectinload(Order.chi_tiet_don_hang).selectinload(OrderItem.khoa_hoc))
            .where(Order.id == order_id)
        )
        order = result.scalars().first()
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Đơn hàng không tồn tại."
            )

        # 2. Kiểm tra trạng thái đơn hàng
        if order.trang_thai != "refund_requested":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Chỉ có thể từ chối hoàn tiền cho đơn hàng có trạng thái 'refund_requested' (Trạng thái hiện tại: {order.trang_thai})."
            )

        # 3. Khôi phục trạng thái đơn hàng sang 'success'
        order.trang_thai = "success"
        db.add(order)

        await db.commit()

        # Tải lại đơn hàng cùng các quan hệ
        refreshed_result = await db.execute(
            select(Order)
            .options(selectinload(Order.chi_tiet_don_hang).selectinload(OrderItem.khoa_hoc))
            .where(Order.id == order_id)
        )
        return refreshed_result.scalars().one()
