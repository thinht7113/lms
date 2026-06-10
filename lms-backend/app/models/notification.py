from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from datetime import datetime
from typing import Optional

from app.models.base import Base

class Notification(Base):
    __tablename__ = "thong_bao"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    ma_nguoi_dung: Mapped[int] = mapped_column(ForeignKey("nguoi_dung.id", ondelete="CASCADE"), nullable=False, index=True)
    tieu_de: Mapped[str] = mapped_column(String(255), nullable=False)
    noi_dung: Mapped[str] = mapped_column(Text, nullable=False)
    loai: Mapped[str] = mapped_column(String(50), nullable=False, default="system")  # system, course, order, refund
    da_doc: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    ngay_tao: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    # Relationships
    nguoi_dung = relationship("User", backref="thong_bao")
