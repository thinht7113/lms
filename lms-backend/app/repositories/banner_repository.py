from typing import List

from sqlalchemy import asc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.banner import Banner
from app.repositories.base import BaseRepository


class BannerRepository(BaseRepository[Banner]):
    def __init__(self, db: AsyncSession):
        super().__init__(db, Banner)

    async def list_active(self) -> List[Banner]:
        result = await self.db.execute(
            select(Banner)
            .where(Banner.trang_thai.is_(True))
            .order_by(asc(Banner.thu_tu), asc(Banner.id))
        )
        return list(result.scalars().all())

    async def list_all(self) -> List[Banner]:
        result = await self.db.execute(
            select(Banner).order_by(asc(Banner.thu_tu), asc(Banner.id))
        )
        return list(result.scalars().all())

    async def get_by_id(self, banner_id: int) -> Banner | None:
        result = await self.db.execute(select(Banner).where(Banner.id == banner_id))
        return result.scalars().first()
