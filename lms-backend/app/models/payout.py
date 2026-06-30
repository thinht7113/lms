from sqlalchemy import String, Numeric, DateTime, ForeignKey, Text, func
from sqlalchemy.orm import relationship, Mapped, mapped_column
from datetime import datetime
from typing import Optional
from decimal import Decimal
from app.models.base import Base

class PayoutRequest(Base):
    __tablename__ = 'yeu_cau_rut_tien'

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    ma_giang_vien: Mapped[int] = mapped_column(ForeignKey('nguoi_dung.id', ondelete='CASCADE'), nullable=False, index=True)
    so_tien: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    ngan_hang: Mapped[str] = mapped_column(String(255), nullable=False)
    so_tai_khoan: Mapped[str] = mapped_column(String(50), nullable=False)
    ten_chu_tai_khoan: Mapped[str] = mapped_column(String(255), nullable=False)
    trang_thai: Mapped[str] = mapped_column(String(50), default='pending', nullable=False, index=True)  # pending, success, rejected
    ly_do_tu_choi: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    ngay_yeu_cau: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    ngay_xu_ly: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    giang_vien = relationship('User')

    def __repr__(self):
        return f"<PayoutRequest Instructor:{self.ma_giang_vien} Amount:{self.so_tien} Status:{self.trang_thai}>"
