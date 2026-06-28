from typing import List

from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import Notification
from app.repositories.base import BaseRepository


class NotificationRepository(BaseRepository[Notification]):
    def __init__(self, db: AsyncSession):
        super().__init__(db, Notification)

    async def list_by_user(self, user_id: int) -> List[Notification]:
        result = await self.db.execute(
            select(Notification)
            .where(Notification.ma_nguoi_dung == user_id)
            .order_by(desc(Notification.ngay_tao))
        )
        return list(result.scalars().all())

    async def get_by_id_and_user(self, notification_id: int, user_id: int) -> Notification | None:
        result = await self.db.execute(
            select(Notification).where(
                Notification.id == notification_id,
                Notification.ma_nguoi_dung == user_id,
            )
        )
        return result.scalars().first()
