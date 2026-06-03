from sqlalchemy import ForeignKey, DateTime, func, UniqueConstraint
from sqlalchemy.orm import relationship, Mapped, mapped_column
from datetime import datetime
from app.models.base import Base

class CartItem(Base):
    __tablename__ = "chi_tiet_gio_hang"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    ma_nguoi_dung: Mapped[int] = mapped_column(ForeignKey("nguoi_dung.id", ondelete="CASCADE"), nullable=False)
    ma_khoa_hoc: Mapped[int] = mapped_column(ForeignKey("khoa_hoc.id", ondelete="CASCADE"), nullable=False)
    ngay_them_vao_gio: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    __table_args__ = (
        UniqueConstraint("ma_nguoi_dung", "ma_khoa_hoc", name="uq_cart_user_course"),
    )

    # Relationships
    nguoi_dung = relationship("User", back_populates="chi_tiet_gio_hang")
    khoa_hoc = relationship("Course", back_populates="chi_tiet_gio_hang")

    def __repr__(self):
        return f"<CartItem UserID:{self.ma_nguoi_dung} CourseID:{self.ma_khoa_hoc}>"

