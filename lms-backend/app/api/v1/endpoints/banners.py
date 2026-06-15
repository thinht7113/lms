from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, asc
from typing import List

from app.core.database import get_db
from app.api.deps import get_current_user
from app.modules.identity.models import User
from app.modules.catalog.models import Banner
from app.modules.catalog.schemas import BannerCreate, BannerUpdate, BannerResponse

router = APIRouter()

@router.get("", response_model=List[BannerResponse], summary="Get public banner list")
async def get_active_banners(db: AsyncSession = Depends(get_db)):
    """Lấy danh sách banner có trạng thái hoạt động (Dành cho trang chủ)"""
    result = await db.execute(
        select(Banner)
        .where(Banner.trang_thai == True)
        .order_by(asc(Banner.thu_tu), asc(Banner.id))
    )
    return result.scalars().all()

@router.get("/admin", response_model=List[BannerResponse], summary="Get all banners (Admin)")
async def get_all_banners(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lấy danh sách tất cả banner kể cả bị ẩn (Dành cho Admin)"""
    if current_user.vai_tro != "admin":
        raise HTTPException(status_code=403, detail="Không có quyền truy cập")
    result = await db.execute(select(Banner).order_by(asc(Banner.thu_tu), asc(Banner.id)))
    return result.scalars().all()

@router.post("/", response_model=BannerResponse, summary="Create new banner (Admin)")
async def create_banner(
    banner_in: BannerCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.vai_tro != "admin":
        raise HTTPException(status_code=403, detail="Không có quyền truy cập")
        
    db_banner = Banner(**banner_in.model_dump())
    db.add(db_banner)
    await db.commit()
    await db.refresh(db_banner)
    return db_banner

@router.put("/{banner_id}", response_model=BannerResponse, summary="Update banner (Admin)")
async def update_banner(
    banner_id: int,
    banner_in: BannerUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.vai_tro != "admin":
        raise HTTPException(status_code=403, detail="Không có quyền truy cập")
        
    result = await db.execute(select(Banner).where(Banner.id == banner_id))
    db_banner = result.scalars().first()
    if not db_banner:
        raise HTTPException(status_code=404, detail="Không tìm thấy Banner")
        
    update_data = banner_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_banner, field, value)
        
    db.add(db_banner)
    await db.commit()
    await db.refresh(db_banner)
    return db_banner

@router.delete("/{banner_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete banner (Admin)")
async def delete_banner(
    banner_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.vai_tro != "admin":
        raise HTTPException(status_code=403, detail="Không có quyền truy cập")
        
    result = await db.execute(select(Banner).where(Banner.id == banner_id))
    db_banner = result.scalars().first()
    if not db_banner:
        raise HTTPException(status_code=404, detail="Không tìm thấy Banner")
        
    await db.delete(db_banner)
    await db.commit()
