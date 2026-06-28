from typing import List

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.course import Course
from app.models.user import User


class InstructorRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_public_instructors(self) -> List[User]:
        result = await self.db.execute(
            select(User)
            .options(selectinload(User.khoa_hoc).selectinload(Course.dang_ky_hoc))
            .where(User.vai_tro == "instructor")
        )
        return list(result.scalars().all())

    async def get_public_instructor(self, instructor_id: int) -> User | None:
        result = await self.db.execute(
            select(User)
            .options(selectinload(User.khoa_hoc).selectinload(Course.dang_ky_hoc))
            .where(User.id == instructor_id, User.vai_tro == "instructor")
        )
        return result.scalar_one_or_none()
