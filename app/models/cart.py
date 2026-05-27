from sqlalchemy import ForeignKey
from sqlalchemy.orm import relationship, Mapped, mapped_column
from app.models.base import Base

class Cart(Base):
    __tablename__ = "gio_hang"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    ma_nguoi_dung: Mapped[int] = mapped_column(ForeignKey("nguoi_dung.id", ondelete="CASCADE"), unique=True, nullable=False)

    # Relationships
    nguoi_dung = relationship("User", back_populates="gio_hang")
    chi_tiet_gio_hang = relationship("CartItem", back_populates="gio_hang", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Cart UserID:{self.ma_nguoi_dung}>"


class CartItem(Base):
    __tablename__ = "chi_tiet_gio_hang"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    ma_gio_hang: Mapped[int] = mapped_column(ForeignKey("gio_hang.id", ondelete="CASCADE"), nullable=False)
    ma_khoa_hoc: Mapped[int] = mapped_column(ForeignKey("khoa_hoc.id", ondelete="CASCADE"), nullable=False)

    # Relationships
    gio_hang = relationship("Cart", back_populates="chi_tiet_gio_hang")
    khoa_hoc = relationship("Course", back_populates="chi_tiet_gio_hang")

    def __repr__(self):
        return f"<CartItem CartID:{self.ma_gio_hang} CourseID:{self.ma_khoa_hoc}>"
