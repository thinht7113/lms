from typing import List

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import Notification
from app.repositories.notification_repository import NotificationRepository
from app.schemas.notification import NotificationCreate


class NotificationService:
    @staticmethod
    async def list_user_notifications(db: AsyncSession, user_id: int) -> List[Notification]:
        notification_repo = NotificationRepository(db)
        return await notification_repo.list_by_user(user_id)

    @staticmethod
    async def create_notification(db: AsyncSession, notification_in: NotificationCreate) -> Notification:
        notification_repo = NotificationRepository(db)
        notification = Notification(
            ma_nguoi_dung=notification_in.ma_nguoi_dung,
            tieu_de=notification_in.tieu_de,
            noi_dung=notification_in.noi_dung,
            loai=notification_in.loai,
            da_doc=False,
        )
        await notification_repo.add(notification)
        await db.commit()
        await notification_repo.refresh(notification)
        return notification

    @staticmethod
    async def mark_as_read(db: AsyncSession, notification_id: int, user_id: int) -> Notification:
        notification_repo = NotificationRepository(db)
        notification = await notification_repo.get_by_id_and_user(notification_id, user_id)
        if notification is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Thong bao khong ton tai.",
            )

        notification.da_doc = True
        await notification_repo.add(notification)
        await db.commit()
        await notification_repo.refresh(notification)
        return notification
