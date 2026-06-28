from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.banner import BannerCreate, BannerResponse, BannerUpdate
from app.services.banner_service import BannerService


router = APIRouter()


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.vai_tro != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Khong co quyen truy cap.",
        )
    return current_user


@router.get("", response_model=List[BannerResponse], summary="Get public banner list")
async def get_active_banners(db: AsyncSession = Depends(get_db)):
    return await BannerService.list_active_banners(db)


@router.get("/admin", response_model=List[BannerResponse], summary="Get all banners (Admin)")
async def get_all_banners(
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(require_admin),
):
    return await BannerService.list_all_banners(db)


@router.post("/", response_model=BannerResponse, summary="Create new banner (Admin)")
async def create_banner(
    banner_in: BannerCreate,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(require_admin),
):
    return await BannerService.create_banner(db, banner_in)


@router.put("/{banner_id}", response_model=BannerResponse, summary="Update banner (Admin)")
async def update_banner(
    banner_id: int,
    banner_in: BannerUpdate,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(require_admin),
):
    return await BannerService.update_banner(db, banner_id, banner_in)


@router.delete("/{banner_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete banner (Admin)")
async def delete_banner(
    banner_id: int,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(require_admin),
):
    await BannerService.delete_banner(db, banner_id)
