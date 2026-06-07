from sqlalchemy import String, Text, Numeric, Boolean, DateTime, ForeignKey, func, UniqueConstraint, CheckConstraint
from sqlalchemy.orm import relationship, Mapped, mapped_column
from datetime import datetime
from typing import Optional, List
from decimal import Decimal
from app.models.base import Base

class Category(Base):
    __tablename__ = "danh_muc"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    ten_danh_muc: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    mo_ta: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    khoa_hoc = relationship("Course", back_populates="danh_muc")


class Course(Base):
    __tablename__ = "khoa_hoc"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    ma_giang_vien: Mapped[Optional[int]] = mapped_column(ForeignKey("nguoi_dung.id", ondelete="SET NULL"), nullable=True, index=True)
    ma_danh_muc: Mapped[Optional[int]] = mapped_column(ForeignKey("danh_muc.id", ondelete="SET NULL"), nullable=True, index=True)
    tieu_de: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    mo_ta: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    gia_tien: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0.00, nullable=False, index=True)
    trinh_do: Mapped[str] = mapped_column(String(50), default="beginner", nullable=False, index=True)  # 'beginner', 'intermediate', 'advanced'
    anh_dai_dien: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    da_xuat_ban: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    trang_thai_phe_duyet: Mapped[str] = mapped_column(String(50), default="draft", nullable=False, index=True)
    danh_gia_trung_binh: Mapped[Decimal] = mapped_column(Numeric(3, 2), default=0.00, nullable=False, index=True)
    ngay_tao: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False, index=True)

    # Relationships
    giang_vien = relationship("User", back_populates="khoa_hoc")
    danh_muc = relationship("Category", back_populates="khoa_hoc")
    chuong_hoc = relationship("Section", back_populates="khoa_hoc", cascade="all, delete-orphan")
    dang_ky_hoc = relationship("Enrollment", back_populates="khoa_hoc", cascade="all, delete-orphan")
    chi_tiet_gio_hang = relationship("CartItem", back_populates="khoa_hoc", cascade="all, delete-orphan")
    chi_tiet_don_hang = relationship("OrderItem", back_populates="khoa_hoc")
    bai_kiem_tra = relationship("Quiz", back_populates="khoa_hoc", cascade="all, delete-orphan")
    chung_chi = relationship("Certificate", back_populates="khoa_hoc", cascade="all, delete-orphan")
    danh_gia_khoa_hoc = relationship("CourseReview", back_populates="khoa_hoc", cascade="all, delete-orphan")
    danh_sach_yeu_thich = relationship("Wishlist", back_populates="khoa_hoc", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Course {self.tieu_de}>"

    @property
    def so_luong_hoc_vien(self) -> int:
        try:
            return len(self.dang_ky_hoc)
        except Exception:
            return 0


class Section(Base):
    __tablename__ = "chuong_hoc"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    ma_khoa_hoc: Mapped[int] = mapped_column(ForeignKey("khoa_hoc.id", ondelete="CASCADE"), nullable=False, index=True)
    tieu_de: Mapped[str] = mapped_column(String(255), nullable=False)
    thu_tu: Mapped[int] = mapped_column(default=0, nullable=False, index=True)

    # Relationships
    khoa_hoc = relationship("Course", back_populates="chuong_hoc")
    bai_hoc = relationship("Lesson", back_populates="chuong_hoc", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Section {self.tieu_de}>"


class Lesson(Base):
    __tablename__ = "bai_hoc"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    ma_chuong_hoc: Mapped[int] = mapped_column(ForeignKey("chuong_hoc.id", ondelete="CASCADE"), nullable=False, index=True)
    tieu_de: Mapped[str] = mapped_column(String(255), nullable=False)
    thoi_luong: Mapped[int] = mapped_column(default=0, nullable=False)  # thời lượng (giây)
    thu_tu: Mapped[int] = mapped_column(default=0, nullable=False, index=True)
    xem_truoc: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)  # is_preview
    da_xuat_ban: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)  # is_published
    trang_thai_phe_duyet: Mapped[str] = mapped_column(String(50), default="draft", nullable=False, index=True)


    # Relationships
    chuong_hoc = relationship("Section", back_populates="bai_hoc")
    noi_dung = relationship("LessonContent", back_populates="bai_hoc", cascade="all, delete-orphan", order_by="LessonContent.thu_tu")
    tien_do_hoc_tap = relationship("Progress", back_populates="bai_hoc", cascade="all, delete-orphan")

    # Property tương thích ngược lấy ma_khoa_hoc gián tiếp từ chuong_hoc
    @property
    def ma_khoa_hoc(self) -> int:
        return self.chuong_hoc.ma_khoa_hoc if self.chuong_hoc else 0

    def __repr__(self):
        return f"<Lesson {self.tieu_de}>"


class LessonContent(Base):
    __tablename__ = "noi_dung_bai_hoc"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    ma_bai_hoc: Mapped[int] = mapped_column(ForeignKey("bai_hoc.id", ondelete="CASCADE"), nullable=False, index=True)
    loai_noi_dung: Mapped[str] = mapped_column(String(50), nullable=False, index=True)  # 'video', 'pdf', 'text', 'code', 'image'
    noi_dung_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True) # Lưu mã HTML/Markdown dài
    duong_dan_file: Mapped[Optional[str]] = mapped_column(Text, nullable=True) # Link video, file pdf
    thu_tu: Mapped[int] = mapped_column(default=0, nullable=False, index=True)

    __table_args__ = (
        CheckConstraint(loai_noi_dung.in_(["video", "pdf", "text", "code", "image"]), name="cc_lesson_content_type"),
    )

    # Relationships
    bai_hoc = relationship("Lesson", back_populates="noi_dung")

    def __repr__(self):
        return f"<LessonContent {self.loai_noi_dung} Order:{self.thu_tu}>"


class Enrollment(Base):
    __tablename__ = "dang_ky_hoc"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    ma_nguoi_dung: Mapped[int] = mapped_column(ForeignKey("nguoi_dung.id", ondelete="CASCADE"), nullable=False, index=True)
    ma_khoa_hoc: Mapped[int] = mapped_column(ForeignKey("khoa_hoc.id", ondelete="CASCADE"), nullable=False, index=True)
    ngay_dang_ky: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False, index=True)

    __table_args__ = (
        UniqueConstraint("ma_nguoi_dung", "ma_khoa_hoc", name="uq_nguoi_dung_khoa_hoc"),
    )

    # Relationships
    nguoi_dung = relationship("User", back_populates="dang_ky_hoc")
    khoa_hoc = relationship("Course", back_populates="dang_ky_hoc")
    tien_do_hoc_tap = relationship("Progress", back_populates="dang_ky_hoc", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Enrollment User:{self.ma_nguoi_dung} Course:{self.ma_khoa_hoc}>"


class Progress(Base):
    __tablename__ = "tien_do_hoc_tap"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    ma_dang_ky_hoc: Mapped[int] = mapped_column(ForeignKey("dang_ky_hoc.id", ondelete="CASCADE"), nullable=False, index=True)
    ma_bai_hoc: Mapped[int] = mapped_column(ForeignKey("bai_hoc.id", ondelete="CASCADE"), nullable=False, index=True)
    da_hoan_thanh: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    ngay_hoan_thanh: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    video_resume_seconds: Mapped[int] = mapped_column(default=0, nullable=False)

    __table_args__ = (
        UniqueConstraint("ma_dang_ky_hoc", "ma_bai_hoc", name="uq_progress_enrollment_lesson"),
    )

    # Relationships
    dang_ky_hoc = relationship("Enrollment", back_populates="tien_do_hoc_tap")
    bai_hoc = relationship("Lesson", back_populates="tien_do_hoc_tap")

    def __repr__(self):
        return f"<Progress Lesson:{self.ma_bai_hoc} Completed:{self.da_hoan_thanh}>"


class CourseReview(Base):
    __tablename__ = "danh_gia_khoa_hoc"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    ma_nguoi_dung: Mapped[int] = mapped_column(ForeignKey("nguoi_dung.id", ondelete="CASCADE"), nullable=False, index=True)
    ma_khoa_hoc: Mapped[int] = mapped_column(ForeignKey("khoa_hoc.id", ondelete="CASCADE"), nullable=False, index=True)
    so_sao: Mapped[int] = mapped_column(nullable=False, index=True)
    binh_luan: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    ngay_tao: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False, index=True)

    __table_args__ = (
        UniqueConstraint("ma_nguoi_dung", "ma_khoa_hoc", name="uq_review_user_course"),
        CheckConstraint("so_sao >= 1 AND so_sao <= 5", name="cc_review_so_sao"),
    )

    # Relationships
    nguoi_dung = relationship("User", back_populates="danh_gia_khoa_hoc")
    khoa_hoc = relationship("Course", back_populates="danh_gia_khoa_hoc")

    def __repr__(self):
        return f"<CourseReview User:{self.ma_nguoi_dung} Course:{self.ma_khoa_hoc} Stars:{self.so_sao}>"


class Wishlist(Base):
    __tablename__ = "danh_sach_yeu_thich"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    ma_nguoi_dung: Mapped[int] = mapped_column(ForeignKey("nguoi_dung.id", ondelete="CASCADE"), nullable=False, index=True)
    ma_khoa_hoc: Mapped[int] = mapped_column(ForeignKey("khoa_hoc.id", ondelete="CASCADE"), nullable=False, index=True)
    ngay_them: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False, index=True)

    __table_args__ = (
        UniqueConstraint("ma_nguoi_dung", "ma_khoa_hoc", name="uq_wishlist_user_course"),
    )

    # Relationships
    nguoi_dung = relationship("User", back_populates="danh_sach_yeu_thich")
    khoa_hoc = relationship("Course", back_populates="danh_sach_yeu_thich")

    def __repr__(self):
        return f"<Wishlist UserID:{self.ma_nguoi_dung} CourseID:{self.ma_khoa_hoc}>"
