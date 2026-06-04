from sqlalchemy import String, Text, Numeric, Boolean, DateTime, ForeignKey, func, UniqueConstraint
from sqlalchemy.orm import relationship, Mapped, mapped_column
from sqlalchemy.dialects.postgresql import JSONB
from datetime import datetime
from typing import Optional, Any, List
from decimal import Decimal
from app.models.base import Base

class Quiz(Base):
    __tablename__ = "bai_kiem_tra"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    ma_khoa_hoc: Mapped[int] = mapped_column(ForeignKey("khoa_hoc.id", ondelete="CASCADE"), nullable=False)
    tieu_de: Mapped[str] = mapped_column(String(255), nullable=False)
    diem_dat: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)  # Ví dụ: cần 8.0 điểm để qua
    thoi_gian_lam_bai: Mapped[Optional[int]] = mapped_column(nullable=True)  # thời gian làm bài (phút)
    so_luot_lam_toi_da: Mapped[int] = mapped_column(default=3, nullable=False)
    ngay_tao: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    # Relationships
    khoa_hoc = relationship("Course", back_populates="bai_kiem_tra")
    cau_hoi = relationship("Question", back_populates="bai_kiem_tra", cascade="all, delete-orphan")
    lich_su_lam_bai = relationship("QuizAttempt", back_populates="bai_kiem_tra", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Quiz {self.tieu_de}>"


class Question(Base):
    __tablename__ = "cau_hoi"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    ma_bai_kiem_tra: Mapped[int] = mapped_column(ForeignKey("bai_kiem_tra.id", ondelete="CASCADE"), nullable=False)
    noi_dung: Mapped[str] = mapped_column(Text, nullable=False)
    diem_so: Mapped[int] = mapped_column(default=1, nullable=False)
    giai_thich: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    bai_kiem_tra = relationship("Quiz", back_populates="cau_hoi")
    lua_chon_cau_hoi = relationship("QuestionOption", back_populates="cau_hoi", cascade="all, delete-orphan")

    # Property getters để đảm bảo tương thích ngược 100% với Pydantic Schemas hiện tại
    @property
    def cac_lua_chon(self) -> List["QuestionOption"]:
        return self.lua_chon_cau_hoi

    @property
    def dap_an_dung(self) -> str:
        for opt in self.lua_chon_cau_hoi:
            if opt.la_dap_an_dung:
                return opt.noi_dung_lua_chon
        return ""

    def __repr__(self):
        return f"<Question id:{self.id}>"


class QuestionOption(Base):
    __tablename__ = "lua_chon_cau_hoi"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    ma_cau_hoi: Mapped[int] = mapped_column(ForeignKey("cau_hoi.id", ondelete="CASCADE"), nullable=False)
    noi_dung_lua_chon: Mapped[str] = mapped_column(Text, nullable=False)
    la_dap_an_dung: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Relationships
    cau_hoi = relationship("Question", back_populates="lua_chon_cau_hoi")

    # Property getters phục vụ Pydantic mapping tương thích ngược
    @property
    def text(self) -> str:
        return self.noi_dung_lua_chon

    @property
    def is_correct(self) -> bool:
        return self.la_dap_an_dung

    def __repr__(self):
        return f"<QuestionOption id:{self.id} text:{self.noi_dung_lua_chon}>"


class QuizAttempt(Base):
    __tablename__ = "lich_su_lam_bai"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    ma_nguoi_dung: Mapped[int] = mapped_column(ForeignKey("nguoi_dung.id", ondelete="CASCADE"), nullable=False)
    ma_bai_kiem_tra: Mapped[int] = mapped_column(ForeignKey("bai_kiem_tra.id", ondelete="CASCADE"), nullable=False)
    diem_dat_duoc: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 2), nullable=True)
    da_qua_mon: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    ngay_bat_dau: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    ngay_lam_bai: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    trang_thai: Mapped[str] = mapped_column(String(50), default="started", nullable=False) # 'started', 'completed'

    # Relationships
    nguoi_dung = relationship("User", back_populates="lich_su_lam_bai")
    bai_kiem_tra = relationship("Quiz", back_populates="lich_su_lam_bai")
    cau_tra_loi_chi_tiet = relationship("QuizAttemptAnswer", back_populates="luot_lam", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<QuizAttempt User:{self.ma_nguoi_dung} Quiz:{self.ma_bai_kiem_tra} Score:{self.diem_dat_duoc}>"


class QuizAttemptAnswer(Base):
    __tablename__ = "chi_tiet_bai_lam"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    ma_luot_lam: Mapped[int] = mapped_column(ForeignKey("lich_su_lam_bai.id", ondelete="CASCADE"), nullable=False)
    ma_cau_hoi: Mapped[int] = mapped_column(ForeignKey("cau_hoi.id", ondelete="CASCADE"), nullable=False)
    ma_lua_chon: Mapped[int] = mapped_column(ForeignKey("lua_chon_cau_hoi.id", ondelete="CASCADE"), nullable=False)

    __table_args__ = (
        UniqueConstraint("ma_luot_lam", "ma_cau_hoi", name="uq_attempt_question"),
    )

    # Relationships
    luot_lam = relationship("QuizAttempt", back_populates="cau_tra_loi_chi_tiet")
    cau_hoi = relationship("Question")
    lua_chon = relationship("QuestionOption")

    def __repr__(self):
        return f"<QuizAttemptAnswer Attempt:{self.ma_luot_lam} Question:{self.ma_cau_hoi} Option:{self.ma_lua_chon}>"

