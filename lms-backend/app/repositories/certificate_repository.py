from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.certificate import Certificate
from app.models.course import Course
from app.repositories.base import BaseRepository


class CertificateRepository(BaseRepository[Certificate]):
    def __init__(self, db: AsyncSession):
        super().__init__(db, Certificate)

    async def get_by_user_and_course_with_relations(
        self,
        user_id: int,
        course_id: int,
    ) -> Certificate | None:
        result = await self.db.execute(
            select(Certificate)
            .options(
                selectinload(Certificate.khoa_hoc).selectinload(Course.giang_vien),
                selectinload(Certificate.nguoi_dung),
            )
            .where(
                and_(
                    Certificate.ma_nguoi_dung == user_id,
                    Certificate.ma_khoa_hoc == course_id,
                )
            )
        )
        return result.scalars().first()
