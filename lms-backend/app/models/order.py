from sqlalchemy import String, Numeric, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship, Mapped, mapped_column
from datetime import datetime
from typing import Optional
from decimal import Decimal
from app.models.base import Base

class Coupon(Base):
    __tablename__ = "ma_giam_gia"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    ma_code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    loai_giam_gia: Mapped[str] = mapped_column(String(20), default="PERCENTAGE", nullable=False)  # 'PERCENTAGE', 'FIXED_AMOUNT'
    gia_tri_giam: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0.00, nullable=False)
    gia_tri_don_toi_thieu: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0.00, nullable=False)
    so_luot_dung_toi_da: Mapped[Optional[int]] = mapped_column(nullable=True)
    so_luot_da_dung: Mapped[int] = mapped_column(default=0, nullable=False)
    ngay_het_han: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True, index=True)

    # Relationships
    don_hang = relationship("Order", back_populates="ma_giam_gia")

    # Property tương thích ngược với trường phan_tram_giam cũ
    @property
    def phan_tram_giam(self) -> Decimal:
        return self.gia_tri_giam if self.loai_giam_gia == "PERCENTAGE" else Decimal("0.00")

    def __repr__(self):
        return f"<Coupon {self.ma_code} Type:{self.loai_giam_gia} Val:{self.gia_tri_giam}>"


class Order(Base):
    __tablename__ = "don_hang"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    ma_nguoi_dung: Mapped[Optional[int]] = mapped_column(ForeignKey("nguoi_dung.id", ondelete="SET NULL"), nullable=True, index=True)
    ma_giam_gia_id: Mapped[Optional[int]] = mapped_column(ForeignKey("ma_giam_gia.id", ondelete="SET NULL"), nullable=True, index=True)
    tong_tien: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    trang_thai: Mapped[str] = mapped_column(String(50), default="pending", nullable=False, index=True)  # 'pending', 'success', 'fail'
    ngay_tao: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False, index=True)
    
    # Hợp nhất thông tin thanh toán trực tiếp vào đơn hàng (Chuẩn hóa)
    phuong_thuc_thanh_toan: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, index=True)
    ma_giao_dich: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, index=True)
    ngay_thanh_toan: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True, index=True)

    # Relationships
    nguoi_dung = relationship("User", back_populates="don_hang")
    ma_giam_gia = relationship("Coupon", back_populates="don_hang")
    chi_tiet_don_hang = relationship("OrderItem", back_populates="don_hang", cascade="all, delete-orphan")

    @property
    def ma_giam_gia_code(self) -> Optional[str]:
        if "ma_giam_gia" in self.__dict__:
            return self.ma_giam_gia.ma_code if self.ma_giam_gia else None
        return None

    @property
    def ma_don_hang(self) -> int:
        return self.id

    def __repr__(self):
        return f"<Order {self.id} Status:{self.trang_thai}>"


class OrderItem(Base):
    __tablename__ = "chi_tiet_don_hang"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    ma_don_hang: Mapped[int] = mapped_column(ForeignKey("don_hang.id", ondelete="CASCADE"), nullable=False, index=True)
    ma_khoa_hoc: Mapped[Optional[int]] = mapped_column(ForeignKey("khoa_hoc.id", ondelete="SET NULL"), nullable=True, index=True)
    gia_luc_mua: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)

    # Relationships
    don_hang = relationship("Order", back_populates="chi_tiet_don_hang")
    khoa_hoc = relationship("Course", back_populates="chi_tiet_don_hang")

    def __repr__(self):
        return f"<OrderItem Order:{self.ma_don_hang} Course:{self.ma_khoa_hoc} Price:{self.gia_luc_mua}>"
