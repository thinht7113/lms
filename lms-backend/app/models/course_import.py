from sqlalchemy import DateTime, ForeignKey, JSON, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from typing import Any, Optional

from app.models.base import Base


class CourseImportJob(Base):
    __tablename__ = "course_import_jobs"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    source: Mapped[str] = mapped_column(String(100), default="hoctapgiare", nullable=False, index=True)
    source_url: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="pending", nullable=False, index=True)
    draft_data: Mapped[Optional[dict[str, Any]]] = mapped_column(JSON, nullable=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    imported_course_id: Mapped[Optional[int]] = mapped_column(ForeignKey("khoa_hoc.id", ondelete="SET NULL"), nullable=True, index=True)
    created_by: Mapped[Optional[int]] = mapped_column(ForeignKey("nguoi_dung.id", ondelete="SET NULL"), nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False, index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    imported_course = relationship("Course")
    creator = relationship("User")
