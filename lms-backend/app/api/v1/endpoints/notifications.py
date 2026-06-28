from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.notification import NotificationCreate, NotificationResponse
from app.services.notification_service import NotificationService


router = APIRouter()


@router.get("/", response_model=List[NotificationResponse])
async def get_my_notifications(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await NotificationService.list_user_notifications(db, current_user.id)


@router.post("/", response_model=NotificationResponse)
async def create_notification(
    notification_in: NotificationCreate,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_user),
):
    return await NotificationService.create_notification(db, notification_in)


@router.patch("/{notification_id}/read", response_model=NotificationResponse)
async def mark_notification_as_read(
    notification_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await NotificationService.mark_as_read(db, notification_id, current_user.id)


@router.post("/{notification_id}/read", response_model=NotificationResponse)
async def mark_notification_as_read_post(
    notification_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await NotificationService.mark_as_read(db, notification_id, current_user.id)
