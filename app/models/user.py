from sqlalchemy import String, DateTime, func
from sqlalchemy.orm import relationship, Mapped, mapped_column
from datetime import datetime
from typing import Optional
from app.models.base import Base

class User(Base):
    __tablename__ = "nguoi_dung"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    ho_ten: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    mat_khau: Mapped[str] = mapped_column(String(255), nullable=False)
    vai_tro: Mapped[str] = mapped_column(String(50), default="student", nullable=False)  # 'student', 'instructor', 'admin'
    ngay_tao: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    # Relationships
    khoa_hoc = relationship("Course", back_populates="giang_vien")
    gio_hang = relationship("Cart", back_populates="nguoi_dung", uselist=False, cascade="all, delete-orphan")
    don_hang = relationship("Order", back_populates="nguoi_dung")
    dang_ky_hoc = relationship("Enrollment", back_populates="nguoi_dung", cascade="all, delete-orphan")
    lich_su_lam_bai = relationship("QuizAttempt", back_populates="nguoi_dung", cascade="all, delete-orphan")
    chung_chi = relationship("Certificate", back_populates="nguoi_dung", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<User {self.email} ({self.vai_tro})>"
