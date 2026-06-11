from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_db, get_current_user
from app.modules.identity.models import User
from app.modules.commerce.schemas import (
    CouponCreate, CouponApplyRequest, CouponApplyResponse,
    CheckoutRequest, OrderResponse, PaymentMockRequest, PaymentResponse
)
from app.modules.commerce.services import OrderService
from app.core.config import settings
from app.core.security_guards import mock_feature_enabled, verify_webhook_signature
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
        "coupon_id": coupon.id,
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
    if not mock_feature_enabled(settings.APP_ENV, settings.ENABLE_MOCK_PAYMENTS):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Thanh toán thử nghiệm chưa được bật."
        )
    return await OrderService.process_mock_payment(db, payment_in, current_user.id)

@router.post(
    "/payments/webhook",
    summary="API nhận tín hiệu thanh toán thành công ngầm từ Momo/VNPay"
)
async def payment_webhook(
    request: Request,
    signature: str | None = Header(default=None, alias="X-Webhook-Signature"),
    db: AsyncSession = Depends(get_db)
):
    raw_body = await request.body()
    if not verify_webhook_signature(
        raw_body,
        signature,
        settings.PAYMENT_WEBHOOK_SECRET,
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Chữ ký webhook không hợp lệ."
        )

    try:
        payload = await request.json()
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payload webhook không hợp lệ."
        ) from exc

    order_id = payload.get("order_id")
    payment_method = payload.get("payment_method", "webhook")
    transaction_code = payload.get("transaction_code")

    if not order_id or not transaction_code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Thiếu order_id hoặc transaction_code trong payload."
        )

    payment = await OrderService.process_webhook_payment(
        db,
        order_id=order_id,
        payment_method=payment_method,
        transaction_code=transaction_code,
    )
    return {
        "status": "success",
        "message": "Instant Payment Notification nhận thành công. Ghi danh hoàn tất.",
        "payment_id": payment.id
    }

@router.post(
    "/orders/{order_id}/refund",
    response_model=OrderResponse,
    summary="Học viên yêu cầu hoàn tiền cho đơn hàng (Trong vòng 7 ngày)"
)
async def refund_order(
    order_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await OrderService.refund_order(db, order_id, current_user.id)


@router.post(
    "/orders/{order_id}/cancel-refund",
    response_model=OrderResponse,
    summary="Học viên hủy yêu cầu hoàn tiền cho đơn hàng"
)
async def cancel_refund_order(
    order_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await OrderService.cancel_refund_request(db, order_id, current_user.id)
