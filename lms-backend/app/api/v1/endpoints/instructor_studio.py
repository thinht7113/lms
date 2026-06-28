from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.course import ReviewResponse
from app.schemas.instructor_studio import (
    InstructorStats,
    PayoutCreate,
    PayoutResponse,
    StudentEnrollmentResponse,
    TransactionResponse,
)
from app.services.instructor_studio_service import InstructorStudioService


router = APIRouter()


def require_instructor(current_user: User = Depends(get_current_user)) -> User:
    if current_user.vai_tro not in ["instructor", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Yeu cau quyen giang vien hoac admin.",
        )
    return current_user


@router.get("/stats", response_model=InstructorStats)
async def get_instructor_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_instructor),
):
    return await InstructorStudioService.get_stats(db, current_user.id)


@router.get("/students", response_model=List[StudentEnrollmentResponse])
async def get_my_students(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_instructor),
):
    return await InstructorStudioService.get_students(db, current_user.id)


@router.get("/reviews", response_model=List[ReviewResponse])
async def get_my_course_reviews(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_instructor),
):
    return await InstructorStudioService.get_reviews(db, current_user.id)


@router.get("/transactions", response_model=List[TransactionResponse])
async def get_my_transactions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_instructor),
):
    return await InstructorStudioService.get_transactions(db, current_user.id)


@router.post("/payouts", response_model=PayoutResponse, status_code=status.HTTP_201_CREATED)
async def create_payout_request(
    payout_in: PayoutCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_instructor),
):
    return await InstructorStudioService.create_payout_request(db, current_user.id, payout_in)


@router.get("/payouts", response_model=List[PayoutResponse])
async def get_my_payouts(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_instructor),
):
    return await InstructorStudioService.get_payouts(db, current_user.id)
