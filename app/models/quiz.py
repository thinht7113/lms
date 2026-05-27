from sqlalchemy import String, Text, Numeric, Boolean, DateTime, ForeignKey, func
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
    diem_dat_duoc: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    da_qua_mon: Mapped[bool] = mapped_column(Boolean, nullable=False)
    ngay_lam_bai: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    # Relationships
    nguoi_dung = relationship("User", back_populates="lich_su_lam_bai")
    bai_kiem_tra = relationship("Quiz", back_populates="lich_su_lam_bai")

    def __repr__(self):
        return f"<QuizAttempt User:{self.ma_nguoi_dung} Quiz:{self.ma_bai_kiem_tra} Score:{self.diem_dat_duoc}>"
