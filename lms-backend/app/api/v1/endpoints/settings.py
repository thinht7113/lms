from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.schemas.setting import SettingPublicResponse
from app.services.setting_service import SettingService


router = APIRouter()


@router.get("/public", response_model=List[SettingPublicResponse])
async def get_public_settings(db: AsyncSession = Depends(get_db)):
    return await SettingService.list_public_settings(db)
