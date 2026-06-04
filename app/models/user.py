from sqlalchemy import String, DateTime, func, Boolean, CheckConstraint
from sqlalchemy.orm import relationship, Mapped, mapped_column
from datetime import datetime
from typing import Optional
from app.models.base import Base

class User(Base):
    __tablename__ = "nguoi_dung"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    ho_ten: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    mat_khau: Mapped[Optional[str]] = mapped_column(String(255), nullable=True) # Mật khẩu có thể null nếu dùng MXH
    vai_tro: Mapped[str] = mapped_column(String(50), default="student", nullable=False)  # 'student', 'instructor', 'admin'
    trang_thai_hoat_dong: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    ngay_tao: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    
    # Các cột đăng nhập Mạng xã hội
    google_id: Mapped[Optional[str]] = mapped_column(String(255), unique=True, nullable=True)
    facebook_id: Mapped[Optional[str]] = mapped_column(String(255), unique=True, nullable=True)
    avatar_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    __table_args__ = (
        CheckConstraint(vai_tro.in_(["student", "instructor", "admin"]), name="cc_user_vai_tro"),
    )

    # Relationships
    khoa_hoc = relationship("Course", back_populates="giang_vien")
    chi_tiet_gio_hang = relationship("CartItem", back_populates="nguoi_dung", cascade="all, delete-orphan")
    don_hang = relationship("Order", back_populates="nguoi_dung")
    dang_ky_hoc = relationship("Enrollment", back_populates="nguoi_dung", cascade="all, delete-orphan")
    lich_su_lam_bai = relationship("QuizAttempt", back_populates="nguoi_dung", cascade="all, delete-orphan")
    chung_chi = relationship("Certificate", back_populates="nguoi_dung", cascade="all, delete-orphan")
    danh_gia_khoa_hoc = relationship("CourseReview", back_populates="nguoi_dung", cascade="all, delete-orphan")
    danh_sach_yeu_thich = relationship("Wishlist", back_populates="nguoi_dung", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<User {self.email} ({self.vai_tro})>"

