"""Initial LMS schema baseline.

Revision ID: 20260605_0001
Revises:
Create Date: 2026-06-05
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

from app.models.base import Base
import app.models  # noqa: F401


revision: str = "20260605_0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    Base.metadata.create_all(bind=bind, checkfirst=True)

    columns = {
        column["name"]
        for column in sa.inspect(bind).get_columns("tien_do_hoc_tap")
    }
    if "video_resume_seconds" not in columns:
        op.add_column(
            "tien_do_hoc_tap",
            sa.Column("video_resume_seconds", sa.Integer(), nullable=False, server_default="0"),
        )


def downgrade() -> None:
    Base.metadata.drop_all(bind=op.get_bind(), checkfirst=True)
