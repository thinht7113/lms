from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.api.deps import get_db
from app.models.setting import Setting
from app.schemas.setting import SettingPublicResponse

router = APIRouter()

@router.get("/public", response_model=List[SettingPublicResponse])
async def get_public_settings(db: AsyncSession = Depends(get_db)):
    """Lấy danh sách các cấu hình công khai (không cần đăng nhập)"""
    # Chỉ trả về một số cấu hình cụ thể được phép công khai
    public_keys = ["site_name", "ckeditor_license_key"]
    
    query = select(Setting).where(Setting.key.in_(public_keys))
    result = await db.execute(query)
    return result.scalars().all()
