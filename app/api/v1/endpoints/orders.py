from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.schemas.order import (
    CouponCreate, CouponApplyRequest, CouponApplyResponse,
    CheckoutRequest, OrderResponse, PaymentMockRequest, PaymentResponse
)
from app.services.order_service import OrderService
from typing import List
from decimal import Decimal

router = APIRouter()

# Dependency xác thực Admin
def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.vai_tro != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Yêu cầu quyền admin."
        )
    return current_user


# ==================== COUPON ENDPOINTS ====================
@router.post(
    "/coupons/apply",
    response_model=CouponApplyResponse,
    summary="Học viên áp dụng mã giảm giá"
)
async def apply_coupon(
    payload: CouponApplyRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    coupon = await OrderService.apply_coupon(db, payload.code, payload.original_amount, current_user.id)

    if coupon.loai_giam_gia == "PERCENTAGE":
        discount_ratio = coupon.gia_tri_giam / Decimal("100.00")
        discount_amount = payload.original_amount * discount_ratio
    else:  # FIXED_AMOUNT
        discount_amount = coupon.gia_tri_giam
        
    final_amount = payload.original_amount - discount_amount
    if final_amount < Decimal("0.00"):
        final_amount = Decimal("0.00")

    return {
        "code": coupon.ma_code,
        "discount_percentage": coupon.phan_tram_giam,
        "discount_amount": discount_amount,
        "final_amount": final_amount,
        "loai_giam_gia": coupon.loai_giam_gia,
        "gia_tri_giam": coupon.gia_tri_giam
    }

@router.post(
    "/admin/coupons",
    status_code=status.HTTP_201_CREATED,
    summary="Admin tạo mã giảm giá mới",
)
async def create_coupon(
    coupon_in: CouponCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    coupon = await OrderService.create_coupon(db, coupon_in)
    return {
        "status": "success",
        "message": f"Đã tạo thành công mã giảm giá {coupon.ma_code}.",
        "coupon_id": coupon.id
    }


# ==================== ORDER ENDPOINTS ====================
@router.post(
    "/checkout",
    response_model=OrderResponse,
    summary="Học viên chốt giỏ hàng tạo đơn hàng mới"
)
async def checkout(
    checkout_in: CheckoutRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await OrderService.checkout(db, current_user.id, checkout_in)

@router.get(
    "/my-orders",
    response_model=List[OrderResponse],
    summary="Học viên xem lịch sử giao dịch mua hàng"
)
async def get_my_orders(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await OrderService.get_my_orders(db, current_user.id)


# ==================== PAYMENT & WEBHOOK ENDPOINTS ====================
@router.post(
    "/payments/mock",
    response_model=PaymentResponse,
    summary="Giả lập thanh toán hóa đơn (Dùng thử E2E)"
)
async def pay_mock(
    payment_in: PaymentMockRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await OrderService.process_mock_payment(db, payment_in, current_user.id)

@router.post(
    "/payments/webhook",
    summary="API nhận tín hiệu thanh toán thành công ngầm từ Momo/VNPay"
)
async def payment_webhook(
    payload: dict,
    db: AsyncSession = Depends(get_db)
):
    # Webhook giả lập: Đọc order_id và user_id từ payload gửi lên để thanh toán thành công
    order_id = payload.get("order_id")
    user_id = payload.get("user_id")
    payment_method = payload.get("payment_method", "webhook")
    transaction_code = payload.get("transaction_code", "TXWEBHOOK123456")

    if not order_id or not user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Thiếu order_id hoặc user_id trong payload."
        )

    # Khởi tạo mock payment request
    mock_req = PaymentMockRequest(
        ma_don_hang=order_id,
        phuong_thuc_thanh_toan=payment_method,
        ma_giao_dich=transaction_code
    )

    payment = await OrderService.process_mock_payment(db, mock_req, user_id)
    return {
        "status": "success",
        "message": "Instant Payment Notification nhận thành công. Ghi danh hoàn tất.",
        "payment_id": payment.id
    }
