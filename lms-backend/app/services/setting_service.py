from typing import List

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.setting import Setting
from app.repositories.setting_repository import SettingRepository


class SettingService:
    PUBLIC_SETTING_KEYS = ["site_name", "ckeditor_license_key", "SYSTEM_LOGO"]

    @staticmethod
    async def list_public_settings(db: AsyncSession) -> List[Setting]:
        setting_repo = SettingRepository(db)
        return await setting_repo.list_by_keys(SettingService.PUBLIC_SETTING_KEYS)
