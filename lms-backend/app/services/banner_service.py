from typing import List

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.banner import Banner
from app.repositories.banner_repository import BannerRepository
from app.schemas.banner import BannerCreate, BannerUpdate


class BannerService:
    @staticmethod
    async def list_active_banners(db: AsyncSession) -> List[Banner]:
        banner_repo = BannerRepository(db)
        return await banner_repo.list_active()

    @staticmethod
    async def list_all_banners(db: AsyncSession) -> List[Banner]:
        banner_repo = BannerRepository(db)
        return await banner_repo.list_all()

    @staticmethod
    async def create_banner(db: AsyncSession, banner_in: BannerCreate) -> Banner:
        banner_repo = BannerRepository(db)
        banner = Banner(**banner_in.model_dump())
        await banner_repo.add(banner)
        await db.commit()
        await banner_repo.refresh(banner)
        return banner

    @staticmethod
    async def update_banner(db: AsyncSession, banner_id: int, banner_in: BannerUpdate) -> Banner:
        banner_repo = BannerRepository(db)
        banner = await banner_repo.get_by_id(banner_id)
        if banner is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Khong tim thay banner.",
            )

        for field, value in banner_in.model_dump(exclude_unset=True).items():
            setattr(banner, field, value)

        await banner_repo.add(banner)
        await db.commit()
        await banner_repo.refresh(banner)
        return banner

    @staticmethod
    async def delete_banner(db: AsyncSession, banner_id: int) -> None:
        banner_repo = BannerRepository(db)
        banner = await banner_repo.get_by_id(banner_id)
        if banner is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Khong tim thay banner.",
            )

        await banner_repo.delete(banner)
        await db.commit()
