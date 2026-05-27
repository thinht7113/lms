from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload
from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.course import Course, Section, Lesson, Enrollment, Progress
from app.schemas.course import CourseResponse, LessonResponse
from app.schemas.certificate import ProgressUpdate, ProgressResponse, CourseProgressResponse
from app.services.cert_service import CertService
from typing import List

router = APIRouter()

# ==================== MY ENROLLED COURSES ENDPOINT ====================
@router.get(
    "/enrollments/my-courses",
    response_model=List[CourseResponse],
    summary="Học viên lấy danh sách toàn bộ khóa học đã sở hữu (đã mua)"
)
async def get_my_courses(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Course)
        .join(Enrollment, Enrollment.ma_khoa_hoc == Course.id)
        .where(Enrollment.ma_nguoi_dung == current_user.id)
    )
    return list(result.scalars().all())


# ==================== LESSON LEARNING CONTENT ENDPOINT ====================
@router.get(
    "/learn/courses/{course_id}/lessons/{lesson_id}",
    response_model=LessonResponse,
    summary="Học viên xem nội dung chi tiết bài học (Bảo mật - Chỉ dành cho học viên đã mua)"
)
async def get_lesson_learning_content(
    course_id: int,
    lesson_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. Kiểm tra bài học thuộc về khóa học thông qua join với Section (chuong_hoc)
    lesson_result = await db.execute(
        select(Lesson)
        .join(Section, Lesson.ma_chuong_hoc == Section.id)
        .options(selectinload(Lesson.chuong_hoc))
        .where(
            and_(
                Lesson.id == lesson_id,
                Section.ma_khoa_hoc == course_id
            )
        )
    )
    lesson = lesson_result.scalars().first()
    if not lesson:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bài học không tồn tại hoặc không thuộc khóa học này."
        )

    # Nếu bài học được xem trước thì cho phép xem luôn
    if lesson.xem_truoc:
        return lesson

    # 2. Kiểm tra học viên đã mua khóa học chưa
    enroll_result = await db.execute(
        select(Enrollment).where(
            and_(
                Enrollment.ma_nguoi_dung == current_user.id,
                Enrollment.ma_khoa_hoc == course_id
            )
        )
    )
    if not enroll_result.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn chưa mua khóa học này. Hãy thanh toán để bắt đầu học bài giảng."
        )

    return lesson


# ==================== LESSON PROGRESS UPDATE ENDPOINT ====================
@router.put(
    "/progress/lessons/{lesson_id}",
    response_model=ProgressResponse,
    summary="Học viên đánh dấu đã hoàn thành bài học hoặc cập nhật vị trí video phát"
)
async def update_lesson_progress(
    lesson_id: int,
    progress_in: ProgressUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await CertService.update_lesson_progress(db, current_user.id, lesson_id, progress_in)


# ==================== COURSE PERCENTAGE PROGRESS ENDPOINT ====================
@router.get(
    "/learn/courses/{course_id}/progress",
    response_model=CourseProgressResponse,
    summary="Học viên xem phần trăm tiến độ hoàn thành khóa học thực tế"
)
async def get_course_progress(
    course_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await CertService.get_course_progress(db, current_user.id, course_id)
