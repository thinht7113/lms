from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.certificate import CourseProgressResponse, ProgressResponse, ProgressUpdate
from app.schemas.course import CourseResponse, LessonResponse
from app.schemas.learning import LearnerDashboardResponse
from app.services.cert_service import CertService
from app.services.learning_service import LearningService


router = APIRouter()


@router.get(
    "/enrollments/my-courses",
    response_model=List[CourseResponse],
    summary="Student gets all owned (purchased) courses",
)
async def get_my_courses(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await LearningService.get_my_courses(db, current_user.id)


@router.get(
    "/learn/my-dashboard",
    response_model=LearnerDashboardResponse,
    summary="Get all learning progress and quiz data to optimize student dashboard",
)
async def get_my_dashboard(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await CertService.get_user_dashboard(db, current_user.id)


@router.get(
    "/learn/courses/{course_id}/lessons/{lesson_id}",
    response_model=LessonResponse,
    summary="Student views lesson details (Secure - Only for enrolled students)",
)
async def get_lesson_learning_content(
    course_id: int,
    lesson_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await LearningService.get_lesson_learning_content(db, course_id, lesson_id, current_user)


@router.get(
    "/progress/lessons/{lesson_id}",
    response_model=ProgressResponse,
    summary="Get status and last watched position of a lesson",
)
async def get_lesson_progress(
    lesson_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await CertService.get_lesson_progress(db, current_user.id, lesson_id)


@router.put(
    "/progress/lessons/{lesson_id}",
    response_model=ProgressResponse,
    summary="Student marks lesson as completed or updates video playback position",
)
async def update_lesson_progress(
    lesson_id: int,
    progress_in: ProgressUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await CertService.update_lesson_progress(db, current_user.id, lesson_id, progress_in)


@router.get(
    "/learn/courses/{course_id}/progress",
    response_model=CourseProgressResponse,
    summary="Student views actual course completion percentage",
)
async def get_course_progress(
    course_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await CertService.get_course_progress(db, current_user.id, course_id)
