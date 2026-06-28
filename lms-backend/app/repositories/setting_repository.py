from typing import List, Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.setting import Setting
from app.repositories.base import BaseRepository


class SettingRepository(BaseRepository[Setting]):
    def __init__(self, db: AsyncSession):
        super().__init__(db, Setting)

    async def list_by_keys(self, keys: Sequence[str]) -> List[Setting]:
        result = await self.db.execute(select(Setting).where(Setting.key.in_(keys)))
        return list(result.scalars().all())
