from sqlalchemy import String, Text, Numeric, Boolean, DateTime, ForeignKey, func, CheckConstraint
from sqlalchemy.orm import relationship, Mapped, mapped_column, DeclarativeBase
from datetime import datetime
from typing import Optional
from decimal import Decimal

class Base(DeclarativeBase):
    pass

class User(Base):
    __tablename__ = "nguoi_dung"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    ho_ten: Mapped[str] = mapped_column(String(255), nullable=False)
    vai_tro: Mapped[str] = mapped_column(String(50), default="student", nullable=False)


class Category(Base):
    __tablename__ = "danh_muc"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    ten_danh_muc: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    mo_ta: Mapped[Optional[str]] = mapped_column(Text, nullable=True)


class Course(Base):
    __tablename__ = "khoa_hoc"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    ma_giang_vien: Mapped[Optional[int]] = mapped_column(ForeignKey("nguoi_dung.id", ondelete="SET NULL"), nullable=True, index=True)
    ma_danh_muc: Mapped[Optional[int]] = mapped_column(ForeignKey("danh_muc.id", ondelete="SET NULL"), nullable=True, index=True)
    tieu_de: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    mo_ta: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    gia_tien: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0.00, nullable=False, index=True)
    trinh_do: Mapped[str] = mapped_column(String(50), default="beginner", nullable=False, index=True)
    anh_dai_dien: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    da_xuat_ban: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    trang_thai_phe_duyet: Mapped[str] = mapped_column(String(50), default="draft", nullable=False, index=True)
    danh_gia_trung_binh: Mapped[Decimal] = mapped_column(Numeric(3, 2), default=0.00, nullable=False, index=True)
    ngay_tao: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False, index=True)

    chuong_hoc = relationship("Section", back_populates="khoa_hoc", cascade="all, delete-orphan", order_by="Section.thu_tu")

class Section(Base):
    __tablename__ = "chuong_hoc"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    ma_khoa_hoc: Mapped[int] = mapped_column(ForeignKey("khoa_hoc.id", ondelete="CASCADE"), nullable=False, index=True)
    tieu_de: Mapped[str] = mapped_column(String(255), nullable=False)
    thu_tu: Mapped[int] = mapped_column(default=0, nullable=False, index=True)

    khoa_hoc = relationship("Course", back_populates="chuong_hoc")
    bai_hoc = relationship("Lesson", back_populates="chuong_hoc", cascade="all, delete-orphan", order_by="Lesson.thu_tu")

class Lesson(Base):
    __tablename__ = "bai_hoc"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    ma_chuong_hoc: Mapped[int] = mapped_column(ForeignKey("chuong_hoc.id", ondelete="CASCADE"), nullable=False, index=True)
    tieu_de: Mapped[str] = mapped_column(String(255), nullable=False)
    thoi_luong: Mapped[int] = mapped_column(default=0, nullable=False)
    thu_tu: Mapped[int] = mapped_column(default=0, nullable=False, index=True)
    xem_truoc: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    da_xuat_ban: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    trang_thai_phe_duyet: Mapped[str] = mapped_column(String(50), default="draft", nullable=False, index=True)

    chuong_hoc = relationship("Section", back_populates="bai_hoc")
    noi_dung = relationship("LessonContent", back_populates="bai_hoc", cascade="all, delete-orphan", order_by="LessonContent.thu_tu")

class LessonContent(Base):
    __tablename__ = "noi_dung_bai_hoc"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    ma_bai_hoc: Mapped[int] = mapped_column(ForeignKey("bai_hoc.id", ondelete="CASCADE"), nullable=False, index=True)
    loai_noi_dung: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    noi_dung_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    duong_dan_file: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    thu_tu: Mapped[int] = mapped_column(default=0, nullable=False, index=True)

    bai_hoc = relationship("Lesson", back_populates="noi_dung")
