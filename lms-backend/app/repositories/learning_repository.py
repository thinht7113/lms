from typing import List

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.course import Course, Enrollment, Lesson, Progress, Section


class LearningRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_enrolled_courses(self, user_id: int) -> List[Course]:
        result = await self.db.execute(
            select(Course)
            .options(selectinload(Course.dang_ky_hoc), selectinload(Course.giang_vien))
            .join(Enrollment, Enrollment.ma_khoa_hoc == Course.id)
            .where(Enrollment.ma_nguoi_dung == user_id)
        )
        return list(result.scalars().all())

    async def get_lesson_in_course(self, course_id: int, lesson_id: int) -> Lesson | None:
        result = await self.db.execute(
            select(Lesson)
            .join(Section, Lesson.ma_chuong_hoc == Section.id)
            .options(selectinload(Lesson.chuong_hoc).selectinload(Section.khoa_hoc))
            .where(
                and_(
                    Lesson.id == lesson_id,
                    Section.ma_khoa_hoc == course_id,
                )
            )
        )
        return result.scalars().first()

    async def get_lesson_with_content(self, lesson_id: int) -> Lesson:
        result = await self.db.execute(
            select(Lesson)
            .options(selectinload(Lesson.noi_dung))
            .where(Lesson.id == lesson_id)
        )
        return result.scalars().one()

    async def get_enrollment(self, user_id: int, course_id: int) -> Enrollment | None:
        result = await self.db.execute(
            select(Enrollment).where(
                and_(
                    Enrollment.ma_nguoi_dung == user_id,
                    Enrollment.ma_khoa_hoc == course_id,
                )
            )
        )
        return result.scalars().first()

    async def list_published_lessons(self, course_id: int) -> List[Lesson]:
        result = await self.db.execute(
            select(Lesson)
            .join(Section, Lesson.ma_chuong_hoc == Section.id)
            .where(
                and_(
                    Section.ma_khoa_hoc == course_id,
                    Lesson.da_xuat_ban.is_(True),
                )
            )
            .order_by(Section.thu_tu.asc(), Lesson.thu_tu.asc())
        )
        return list(result.scalars().all())

    async def get_completed_progress(self, enrollment_id: int, lesson_id: int) -> Progress | None:
        result = await self.db.execute(
            select(Progress).where(
                and_(
                    Progress.ma_dang_ky_hoc == enrollment_id,
                    Progress.ma_bai_hoc == lesson_id,
                    Progress.da_hoan_thanh.is_(True),
                )
            )
        )
        return result.scalars().first()
