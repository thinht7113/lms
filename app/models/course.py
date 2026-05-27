from sqlalchemy import String, Text, Numeric, Boolean, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship, Mapped, mapped_column
from datetime import datetime
from typing import Optional, List
from decimal import Decimal
from app.models.base import Base

class Category(Base):
    __tablename__ = "danh_muc"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    ten_danh_muc: Mapped[str] = mapped_column(String(255), nullable=False)
    mo_ta: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    khoa_hoc = relationship("Course", back_populates="danh_muc")


class Course(Base):
    __tablename__ = "khoa_hoc"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    ma_giang_vien: Mapped[Optional[int]] = mapped_column(ForeignKey("nguoi_dung.id", ondelete="SET NULL"), nullable=True)
    ma_danh_muc: Mapped[Optional[int]] = mapped_column(ForeignKey("danh_muc.id", ondelete="SET NULL"), nullable=True)
    tieu_de: Mapped[str] = mapped_column(String(255), nullable=False)
    mo_ta: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    gia_tien: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0.00, nullable=False)
    trinh_do: Mapped[str] = mapped_column(String(50), default="beginner", nullable=False)  # 'beginner', 'intermediate', 'advanced'
    da_xuat_ban: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    danh_gia_trung_binh: Mapped[Decimal] = mapped_column(Numeric(3, 2), default=0.00, nullable=False)
    ngay_tao: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    # Relationships
    giang_vien = relationship("User", back_populates="khoa_hoc")
    danh_muc = relationship("Category", back_populates="khoa_hoc")
    chuong_hoc = relationship("Section", back_populates="khoa_hoc", cascade="all, delete-orphan")
    dang_ky_hoc = relationship("Enrollment", back_populates="khoa_hoc", cascade="all, delete-orphan")
    chi_tiet_gio_hang = relationship("CartItem", back_populates="khoa_hoc", cascade="all, delete-orphan")
    chi_tiet_don_hang = relationship("OrderItem", back_populates="khoa_hoc")
    bai_kiem_tra = relationship("Quiz", back_populates="khoa_hoc", cascade="all, delete-orphan")
    chung_chi = relationship("Certificate", back_populates="khoa_hoc", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Course {self.tieu_de}>"


class Section(Base):
    __tablename__ = "chuong_hoc"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    ma_khoa_hoc: Mapped[int] = mapped_column(ForeignKey("khoa_hoc.id", ondelete="CASCADE"), nullable=False)
    tieu_de: Mapped[str] = mapped_column(String(255), nullable=False)
    thu_tu: Mapped[int] = mapped_column(default=0, nullable=False)

    # Relationships
    khoa_hoc = relationship("Course", back_populates="chuong_hoc")
    bai_hoc = relationship("Lesson", back_populates="chuong_hoc", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Section {self.tieu_de}>"


class Lesson(Base):
    __tablename__ = "bai_hoc"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    ma_chuong_hoc: Mapped[int] = mapped_column(ForeignKey("chuong_hoc.id", ondelete="CASCADE"), nullable=False)
    tieu_de: Mapped[str] = mapped_column(String(255), nullable=False)
    loai_noi_dung: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # 'video', 'pdf', 'van_ban'
    duong_dan_noi_dung: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    duong_dan_video: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    duong_dan_tai_lieu: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    thoi_luong: Mapped[int] = mapped_column(default=0, nullable=False)  # thời lượng (giây)
    thu_tu: Mapped[int] = mapped_column(default=0, nullable=False)
    xem_truoc: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)  # is_preview

    # Relationships
    chuong_hoc = relationship("Section", back_populates="bai_hoc")
    tien_do_hoc_tap = relationship("Progress", back_populates="bai_hoc", cascade="all, delete-orphan")

    # Property tương thích ngược lấy ma_khoa_hoc gián tiếp từ chuong_hoc
    @property
    def ma_khoa_hoc(self) -> int:
        return self.chuong_hoc.ma_khoa_hoc if self.chuong_hoc else 0

    def __repr__(self):
        return f"<Lesson {self.tieu_de}>"


class Enrollment(Base):
    __tablename__ = "dang_ky_hoc"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    ma_nguoi_dung: Mapped[int] = mapped_column(ForeignKey("nguoi_dung.id", ondelete="CASCADE"), nullable=False)
    ma_khoa_hoc: Mapped[int] = mapped_column(ForeignKey("khoa_hoc.id", ondelete="CASCADE"), nullable=False)
    ngay_dang_ky: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    # Relationships
    nguoi_dung = relationship("User", back_populates="dang_ky_hoc")
    khoa_hoc = relationship("Course", back_populates="dang_ky_hoc")
    tien_do_hoc_tap = relationship("Progress", back_populates="dang_ky_hoc", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Enrollment User:{self.ma_nguoi_dung} Course:{self.ma_khoa_hoc}>"


class Progress(Base):
    __tablename__ = "tien_do_hoc_tap"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    ma_dang_ky_hoc: Mapped[int] = mapped_column(ForeignKey("dang_ky_hoc.id", ondelete="CASCADE"), nullable=False)
    ma_bai_hoc: Mapped[int] = mapped_column(ForeignKey("bai_hoc.id", ondelete="CASCADE"), nullable=False)
    da_hoan_thanh: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    ngay_hoan_thanh: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Relationships
    dang_ky_hoc = relationship("Enrollment", back_populates="tien_do_hoc_tap")
    bai_hoc = relationship("Lesson", back_populates="tien_do_hoc_tap")

    def __repr__(self):
        return f"<Progress Lesson:{self.ma_bai_hoc} Completed:{self.da_hoan_thanh}>"
