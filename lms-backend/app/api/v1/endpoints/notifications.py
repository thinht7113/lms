from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from typing import List
from datetime import datetime

from app.core.database import get_db
from app.api.deps import get_current_user
from app.modules.identity.models import User
from app.models.notification import Notification
from pydantic import BaseModel

router = APIRouter()

class NotificationResponse(BaseModel):
    id: int
    ma_nguoi_dung: int
    tieu_de: str
    noi_dung: str
    loai: str
    da_doc: bool
    ngay_tao: datetime

    class Config:
        from_attributes = True

@router.get("/", response_model=List[NotificationResponse], summary="Lấy danh sách thông báo của người dùng")
async def get_my_notifications(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Notification)
        .where(Notification.ma_nguoi_dung == current_user.id)
        .order_by(desc(Notification.ngay_tao))
    )
    return result.scalars().all()

@router.post("/{notification_id}/read", response_model=NotificationResponse, summary="Đánh dấu thông báo đã đọc")
async def mark_notification_as_read(
    notification_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Notification)
        .where(Notification.id == notification_id)
    )
    notification = result.scalars().first()
    if not notification:
        raise HTTPException(status_code=404, detail="Không tìm thấy thông báo")
    if notification.ma_nguoi_dung != current_user.id:
        raise HTTPException(status_code=403, detail="Không có quyền truy cập")
    
    notification.da_doc = True
    db.add(notification)
    await db.commit()
    await db.refresh(notification)
    return notification
