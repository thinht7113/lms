from pydantic import BaseModel, Field
from typing import Optional, List
from decimal import Decimal
from datetime import datetime
from app.schemas.course import CourseResponse

# ==================== CART SCHEMAS ====================
class CartItemAdd(BaseModel):
    course_id: int = Field(..., alias="ma_khoa_hoc", description="ID Khóa học")

    class Config:
        populate_by_name = True

class CartItemResponse(BaseModel):
    id: int
    ma_nguoi_dung: int
    ma_khoa_hoc: int
    ngay_them_vao_gio: Optional[datetime] = None
    khoa_hoc: CourseResponse

    class Config:
        from_attributes = True

class CartResponse(BaseModel):
    chi_tiet_gio_hang: List[CartItemResponse] = []
    tong_tien_tam_tinh: Decimal = Decimal("0.00")

    class Config:
        from_attributes = True


# ==================== COUPON SCHEMAS ====================
class CouponCreate(BaseModel):
    code: str = Field(..., alias="ma_code", description="Mã giảm giá")
    discount_value: Optional[Decimal] = Field(None, alias="phan_tram_giam", description="Giá trị phần trăm giảm (Tương thích ngược)")
    loai_giam_gia: Optional[str] = Field("PERCENTAGE", description="PERCENTAGE hoặc FIXED_AMOUNT")
    gia_tri_giam: Optional[Decimal] = Field(None, description="Giá trị giảm thực tế")
    gia_tri_don_toi_thieu: Optional[Decimal] = Field(Decimal("0.00"), alias="gia_tri_don_toi_thieu")
    so_luot_dung_toi_da: Optional[int] = Field(None, alias="so_luot_dung_toi_da")
    end_date: Optional[datetime] = Field(None, alias="ngay_het_han", description="Ngày hết hạn")

    class Config:
        populate_by_name = True

class CouponApplyRequest(BaseModel):
    code: str = Field(..., description="Mã giảm giá cần áp dụng")
    original_amount: Decimal = Field(..., description="Số tiền gốc")

class CouponApplyResponse(BaseModel):
    code: str
    discount_percentage: Decimal  # Tương thích ngược (ví dụ: phan_tram_giam)
    discount_amount: Decimal
    final_amount: Decimal
    loai_giam_gia: Optional[str] = None
    gia_tri_giam: Optional[Decimal] = None


# ==================== ORDER & PAYMENT SCHEMAS ====================
class CheckoutRequest(BaseModel):
    coupon_id: Optional[int] = None
    payment_method: str = Field("visa", description="Phương thức thanh toán: momo, vnpay, visa")

class OrderItemResponse(BaseModel):
    id: int
    ma_khoa_hoc: Optional[int]
    gia_luc_mua: Decimal
    khoa_hoc: Optional[CourseResponse] = None

    class Config:
        from_attributes = True

class OrderResponse(BaseModel):
    id: int
    ma_nguoi_dung: Optional[int]
    ma_giam_gia_id: Optional[int]
    tong_tien: Decimal
    trang_thai: str  # 'pending', 'success', 'fail'
    ngay_tao: datetime
    chi_tiet_don_hang: List[OrderItemResponse] = []

    class Config:
        from_attributes = True

class PaymentMockRequest(BaseModel):
    order_id: int = Field(..., alias="ma_don_hang", description="ID Đơn hàng")
    payment_method: str = Field("visa", alias="phuong_thuc_thanh_toan", description="Phương thức thanh toán")
    transaction_code: Optional[str] = Field("TX12345678", alias="ma_giao_dich", description="Mã giao dịch")

    class Config:
        populate_by_name = True

class PaymentResponse(BaseModel):
    id: int
    ma_don_hang: int
    phuong_thuc_thanh_toan: Optional[str]
    ma_giao_dich: Optional[str]
    ngay_thanh_toan: Optional[datetime] = None

    class Config:
        from_attributes = True
