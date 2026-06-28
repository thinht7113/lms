from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.schemas.user import InstructorDetailResponse, InstructorResponse
from app.services.instructor_service import InstructorService


router = APIRouter()


@router.get("", response_model=List[InstructorResponse], summary="Get public instructor list")
async def get_public_instructors(db: AsyncSession = Depends(get_db)):
    return await InstructorService.list_public_instructors(db)


@router.get(
    "/{instructor_id}",
    response_model=InstructorDetailResponse,
    summary="Get instructor details and course list",
)
async def get_instructor_detail(instructor_id: int, db: AsyncSession = Depends(get_db)):
    return await InstructorService.get_instructor_detail(db, instructor_id)
