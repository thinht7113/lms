from sqlalchemy import String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base
from typing import Optional

class Setting(Base):
    __tablename__ = "cau_hinh_he_thong"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    key: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    value: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    data_type: Mapped[str] = mapped_column(String(50), default="string", nullable=False) # string, boolean, integer, json
    group: Mapped[str] = mapped_column(String(50), default="general", nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    def __repr__(self):
        return f"<Setting key={self.key} value={self.value}>"
