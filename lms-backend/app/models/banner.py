from sqlalchemy import String, Boolean, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base

class Banner(Base):
    __tablename__ = "banners"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    hinh_anh_url: Mapped[str] = mapped_column(String(500), nullable=False)
    tieu_de: Mapped[str] = mapped_column(String(255), nullable=True)
    duong_dan: Mapped[str] = mapped_column(String(500), nullable=True)
    trang_thai: Mapped[bool] = mapped_column(Boolean, default=True)
    thu_tu: Mapped[int] = mapped_column(Integer, default=0)

    def __repr__(self):
        return f"<Banner {self.tieu_de} (Active: {self.trang_thai})>"
