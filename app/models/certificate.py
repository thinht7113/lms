from sqlalchemy import String, DateTime, ForeignKey, func, UniqueConstraint
from sqlalchemy.orm import relationship, Mapped, mapped_column
from datetime import datetime
from typing import Optional
from app.models.base import Base

class Certificate(Base):
    __tablename__ = "chung_chi"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    ma_nguoi_dung: Mapped[int] = mapped_column(ForeignKey("nguoi_dung.id", ondelete="CASCADE"), nullable=False)
    ma_khoa_hoc: Mapped[int] = mapped_column(ForeignKey("khoa_hoc.id", ondelete="CASCADE"), nullable=False)
    uuid: Mapped[Optional[str]] = mapped_column(String(100), unique=True, nullable=True)  # UUID định danh chứng chỉ để verify công khai
    duong_dan_chung_chi: Mapped[str] = mapped_column(String(255), nullable=False)
    ngay_cap: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    # Đảm bảo một khóa học chỉ cấp 1 chứng chỉ cho 1 người (Đồng bộ Unique Constraint từ DDL SQL của bạn)
    __table_args__ = (
        UniqueConstraint("ma_nguoi_dung", "ma_khoa_hoc", name="uq_ma_nguoi_dung_ma_khoa_hoc"),
    )

    # Relationships
    nguoi_dung = relationship("User", back_populates="chung_chi")
    khoa_hoc = relationship("Course", back_populates="chung_chi")

    def __repr__(self):
        return f"<Certificate User:{self.ma_nguoi_dung} Course:{self.ma_khoa_hoc}>"
