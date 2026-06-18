from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload
from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.course import Course, Section, Lesson
from app.schemas.course import CourseResponse, LessonResponse
from app.models.course import Enrollment, Progress
from app.schemas.certificate import ProgressUpdate, ProgressResponse, CourseProgressResponse
from app.services.cert_service import CertService
from app.services.storage_service import StorageService
from typing import List, Dict, Any
from pydantic import BaseModel

class LearnerDashboardResponse(BaseModel):
    courses: List[CourseResponse]
    progress_map: Dict[int, Any]
    quizzes_map: Dict[int, List[Any]]

router = APIRouter()

# ==================== MY ENROLLED COURSES ENDPOINT ====================
@router.get(
    "/enrollments/my-courses",
    response_model=List[CourseResponse],
    summary="Student gets all owned (purchased) courses"
)
async def get_my_courses(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Course)
        .options(selectinload(Course.dang_ky_hoc), selectinload(Course.giang_vien))
        .join(Enrollment, Enrollment.ma_khoa_hoc == Course.id)
        .where(Enrollment.ma_nguoi_dung == current_user.id)
    )
    return list(result.scalars().all())

@router.get(
    "/learn/my-dashboard",
    response_model=LearnerDashboardResponse,
    summary="Get all learning progress and quiz data to optimize student dashboard"
)
async def get_my_dashboard(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await CertService.get_user_dashboard(db, current_user.id)


# ==================== LESSON LEARNING CONTENT ENDPOINT ====================
@router.get(
    "/learn/courses/{course_id}/lessons/{lesson_id}",
    response_model=LessonResponse,
    summary="Student views lesson details (Secure - Only for enrolled students)"
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
        .options(selectinload(Lesson.chuong_hoc).selectinload(Section.khoa_hoc))
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

    # 1b. Nếu bài học chưa được xuất bản, chỉ cho phép giảng viên sở hữu hoặc admin xem
    if not lesson.da_xuat_ban:
        if current_user.vai_tro != "admin" and lesson.chuong_hoc.khoa_hoc.ma_giang_vien != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bài học này chưa được xuất bản."
            )

    # Helper function to sign URLs inside lesson content
    def sign_lesson_content(lsn: Lesson) -> Lesson:
        if lsn.noi_dung:
            for content in lsn.noi_dung:
                if content.duong_dan_file:
                    # Images, PDFs, and Videos are publicly accessible via bucket policy, no signing needed
                    if content.loai_noi_dung and content.loai_noi_dung.lower() in ["image", "video", "pdf"]:
                        continue
                    content.duong_dan_file = StorageService.generate_presigned_url(content.duong_dan_file)
        return lsn

    # Nếu bài học được xem trước và đã xuất bản thì cho phép xem luôn
    if lesson.xem_truoc and lesson.da_xuat_ban:
        lesson_opt_res = await db.execute(
            select(Lesson)
            .options(selectinload(Lesson.noi_dung))
            .where(Lesson.id == lesson.id)
        )
        return sign_lesson_content(lesson_opt_res.scalars().one())

    # 2. Kiểm tra quyền sở hữu (Admin/Giảng viên tạo khóa học được miễn enroll và drip content)
    is_owner = current_user.vai_tro == "admin" or lesson.chuong_hoc.khoa_hoc.ma_giang_vien == current_user.id
    if is_owner:
        lesson_opt_res = await db.execute(
            select(Lesson)
            .options(selectinload(Lesson.noi_dung))
            .where(Lesson.id == lesson.id)
        )
        return sign_lesson_content(lesson_opt_res.scalars().one())

    # 3. Kiểm tra học viên đã mua khóa học chưa
    enroll_result = await db.execute(
        select(Enrollment).where(
            and_(
                Enrollment.ma_nguoi_dung == current_user.id,
                Enrollment.ma_khoa_hoc == course_id
            )
        )
    )
    enrollment = enroll_result.scalars().first()
    if not enrollment:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn chưa mua khóa học này. Hãy thanh toán để bắt đầu học bài giảng."
        )

    # 4. Học bài giảng tuần tự (Drip Content) - Chỉ tính các bài học đã xuất bản
    lessons_result = await db.execute(
        select(Lesson)
        .join(Section, Lesson.ma_chuong_hoc == Section.id)
        .where(
            and_(
                Section.ma_khoa_hoc == course_id,
                Lesson.da_xuat_ban == True
            )
        )
        .order_by(Section.thu_tu.asc(), Lesson.thu_tu.asc())
    )
    all_lessons = lessons_result.scalars().all()

    
    curr_index = -1
    for idx, l in enumerate(all_lessons):
        if l.id == lesson_id:
            curr_index = idx
            break
            
    if curr_index > 0:
        prev_lesson = all_lessons[curr_index - 1]
        progress_res = await db.execute(
            select(Progress).where(
                and_(
                    Progress.ma_dang_ky_hoc == enrollment.id,
                    Progress.ma_bai_hoc == prev_lesson.id,
                    Progress.da_hoan_thanh == True
                )
            )
        )
        if not progress_res.scalars().first():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Bạn phải hoàn thành bài giảng trước: {prev_lesson.tieu_de}."
            )

    # Load lesson content explicitly to populate LessonResponse's noi_dung field safely
    lesson_opt_res = await db.execute(
        select(Lesson)
        .options(selectinload(Lesson.noi_dung))
        .where(Lesson.id == lesson.id)
    )
    return sign_lesson_content(lesson_opt_res.scalars().one())


# ==================== LESSON PROGRESS UPDATE ENDPOINT ====================
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
    summary="Student marks lesson as completed or updates video playback position"
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
    summary="Student views actual course completion percentage"
)
async def get_course_progress(
    course_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await CertService.get_course_progress(db, current_user.id, course_id)
