from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.course import Course, Enrollment
from app.repositories.base import BaseRepository


class CourseRepository(BaseRepository[Course]):
    def __init__(self, db: AsyncSession):
        super().__init__(db, Course)

    async def get_by_id_with_instructor(self, course_id: int) -> Course | None:
        result = await self.db.execute(
            select(Course)
            .options(selectinload(Course.giang_vien))
            .where(Course.id == course_id)
        )
        return result.scalars().first()

    async def get_owned_by_instructor(self, course_id: int, instructor_id: int) -> Course | None:
        result = await self.db.execute(
            select(Course).where(
                Course.id == course_id,
                Course.ma_giang_vien == instructor_id,
            )
        )
        return result.scalars().first()


class EnrollmentRepository(BaseRepository[Enrollment]):
    def __init__(self, db: AsyncSession):
        super().__init__(db, Enrollment)

    async def get_by_user_and_course(self, user_id: int, course_id: int) -> Enrollment | None:
        result = await self.db.execute(
            select(Enrollment).where(
                and_(
                    Enrollment.ma_nguoi_dung == user_id,
                    Enrollment.ma_khoa_hoc == course_id,
                )
            )
        )
        return result.scalars().first()

    async def list_by_course_with_user(self, course_id: int) -> list[Enrollment]:
        result = await self.db.execute(
            select(Enrollment)
            .options(selectinload(Enrollment.nguoi_dung))
            .where(Enrollment.ma_khoa_hoc == course_id)
            .order_by(Enrollment.id.desc())
        )
        return list(result.scalars().all())
