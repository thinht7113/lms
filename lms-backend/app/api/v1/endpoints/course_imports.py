from typing import List

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_admin_user, get_db
from app.models.user import User
from app.schemas.course_import import (
    CourseImportCreate,
    CourseImportImportRequest,
    CourseImportJobResponse,
)
from app.services.course_import_service import CourseImportService


router = APIRouter()


@router.post("/hoctapgiare", response_model=CourseImportJobResponse, status_code=status.HTTP_201_CREATED)
async def crawl_hoctapgiare_courses(
    request: CourseImportCreate,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
):
    return await CourseImportService.create_hoctapgiare_job(db, request, current_admin.id)


@router.get("/", response_model=List[CourseImportJobResponse])
async def list_course_import_jobs(
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
):
    return await CourseImportService.list_jobs(db, limit=limit)


@router.get("/{job_id}", response_model=CourseImportJobResponse)
async def get_course_import_job(
    job_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
):
    return await CourseImportService.get_job(db, job_id)


@router.post("/{job_id}/import", response_model=CourseImportJobResponse)
async def import_course_import_job(
    job_id: int,
    request: CourseImportImportRequest,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
):
    return await CourseImportService.import_job(db, job_id, request, current_admin.id)
