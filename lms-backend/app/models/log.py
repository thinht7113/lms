from sqlalchemy import String, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship, Mapped, mapped_column
from datetime import datetime
from typing import Optional
from app.models.base import Base

class AdminLog(Base):
    __tablename__ = "nhat_ky_quan_tri"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    ma_admin: Mapped[int] = mapped_column(ForeignKey("nguoi_dung.id", ondelete="CASCADE"), nullable=False)
    hanh_dong: Mapped[str] = mapped_column(String(255), nullable=False)
    chi_tiet: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    ngay_thuc_hien: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    # Relationships
    admin = relationship("User", foreign_keys=[ma_admin])

    @property
    def email_admin(self) -> Optional[str]:
        return self.admin.email if self.admin else None

    def __repr__(self):
        return f"<AdminLog Admin:{self.ma_admin} Action:{self.hanh_dong}>"
