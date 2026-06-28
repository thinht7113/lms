from typing import List

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.course_import import CourseImportJob
from app.repositories.base import BaseRepository


class CourseImportRepository(BaseRepository[CourseImportJob]):
    def __init__(self, db: AsyncSession):
        super().__init__(db, CourseImportJob)

    async def get_by_id(self, job_id: int) -> CourseImportJob | None:
        result = await self.db.execute(select(CourseImportJob).where(CourseImportJob.id == job_id))
        return result.scalars().first()

    async def list_recent(self, limit: int = 50) -> List[CourseImportJob]:
        result = await self.db.execute(
            select(CourseImportJob).order_by(CourseImportJob.id.desc()).limit(limit)
        )
        return list(result.scalars().all())
