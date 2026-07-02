"""drop_course_import_jobs_table

Revision ID: a8d9e0f1b2c3
Revises: 7c2b8f4a9d31
Create Date: 2026-07-02 22:55:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a8d9e0f1b2c3"
down_revision: Union[str, None] = "7c2b8f4a9d31"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_index("ix_course_import_jobs_status", table_name="course_import_jobs")
    op.drop_index("ix_course_import_jobs_source", table_name="course_import_jobs")
    op.drop_index("ix_course_import_jobs_imported_course_id", table_name="course_import_jobs")
    op.drop_index("ix_course_import_jobs_created_by", table_name="course_import_jobs")
    op.drop_index("ix_course_import_jobs_created_at", table_name="course_import_jobs")
    op.drop_table("course_import_jobs")


def downgrade() -> None:
    op.create_table(
        "course_import_jobs",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("source", sa.String(length=100), nullable=False),
        sa.Column("source_url", sa.Text(), nullable=False),
        sa.Column("status", sa.String(length=50), nullable=False),
        sa.Column("draft_data", sa.JSON(), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("imported_course_id", sa.Integer(), nullable=True),
        sa.Column("created_by", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["created_by"], ["nguoi_dung.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["imported_course_id"], ["khoa_hoc.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_course_import_jobs_created_at", "course_import_jobs", ["created_at"], unique=False)
    op.create_index("ix_course_import_jobs_created_by", "course_import_jobs", ["created_by"], unique=False)
    op.create_index("ix_course_import_jobs_imported_course_id", "course_import_jobs", ["imported_course_id"], unique=False)
    op.create_index("ix_course_import_jobs_source", "course_import_jobs", ["source"], unique=False)
    op.create_index("ix_course_import_jobs_status", "course_import_jobs", ["status"], unique=False)
