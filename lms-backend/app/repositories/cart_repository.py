from typing import List, Sequence

from sqlalchemy import and_, delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.cart import CartItem
from app.models.course import Course
from app.repositories.base import BaseRepository


class CartRepository(BaseRepository[CartItem]):
    def __init__(self, db: AsyncSession):
        super().__init__(db, CartItem)

    async def get_by_user_with_course_and_instructor(self, user_id: int) -> List[CartItem]:
        result = await self.db.execute(
            select(CartItem)
            .options(selectinload(CartItem.khoa_hoc).selectinload(Course.giang_vien))
            .where(CartItem.ma_nguoi_dung == user_id)
        )
        return list(result.scalars().all())

    async def get_by_user_and_course(self, user_id: int, course_id: int) -> CartItem | None:
        result = await self.db.execute(
            select(CartItem).where(
                and_(
                    CartItem.ma_nguoi_dung == user_id,
                    CartItem.ma_khoa_hoc == course_id,
                )
            )
        )
        return result.scalars().first()

    async def delete_by_user_and_course_ids(self, user_id: int, course_ids: Sequence[int]) -> None:
        if not course_ids:
            return

        await self.db.execute(
            delete(CartItem).where(
                and_(
                    CartItem.ma_nguoi_dung == user_id,
                    CartItem.ma_khoa_hoc.in_(course_ids),
                )
            )
        )
