from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.schemas.course import (
    CategoryCreate, CategoryResponse,
    CourseCreate, CourseUpdate, CourseResponse, CourseDetailResponse,
    SectionCreate, SectionResponse,
    LessonCreate, LessonUpdate, LessonResponse
)
from app.services.course_service import CourseService
from typing import List, Optional
from decimal import Decimal

router = APIRouter()

# Helper Dependency để xác thực quyền Giảng viên
def require_instructor(current_user: User = Depends(get_current_user)) -> User:
    if current_user.vai_tro not in ["instructor", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Yêu cầu quyền giảng viên hoặc admin."
        )
    return current_user

# Helper Dependency để xác thực quyền Admin
def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.vai_tro != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Yêu cầu quyền admin."
        )
    return current_user


# ==================== CATEGORY ENDPOINTS ====================
@router.post(
    "/categories", 
    response_model=CategoryResponse, 
    status_code=status.HTTP_201_CREATED,
    summary="Admin tạo danh mục khóa học mới"
)
async def create_category(
    category_in: CategoryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    return await CourseService.create_category(db, category_in)

@router.get(
    "/categories", 
    response_model=List[CategoryResponse],
    summary="Lấy danh sách danh mục khóa học"
)
async def get_categories(db: AsyncSession = Depends(get_db)):
    return await CourseService.get_categories(db)


# ==================== INSTRUCTOR COURSE ENDPOINTS ====================
@router.post(
    "/instructor/courses",
    response_model=CourseResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Giảng viên tạo khóa học mới (Bản nháp)"
)
async def create_course(
    course_in: CourseCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_instructor)
):
    return await CourseService.create_course(db, course_in, current_user.id)

@router.get(
    "/instructor/courses",
    response_model=List[CourseResponse],
    summary="Lấy danh sách khóa học do giảng viên hiện tại quản lý"
)
async def get_instructor_courses(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_instructor)
):
    return await CourseService.get_instructor_courses(db, current_user.id)

@router.put(
    "/courses/{course_id}",
    response_model=CourseResponse,
    summary="Giảng viên cập nhật thông tin khóa học"
)
async def update_course(
    course_id: int,
    course_in: CourseUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_instructor)
):
    return await CourseService.update_course(db, course_id, course_in, current_user.id)


# ==================== SECTION ENDPOINTS ====================
@router.post(
    "/courses/{course_id}/sections",
    response_model=SectionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Giảng viên thêm chương học mới vào khóa học"
)
async def create_section(
    course_id: int,
    section_in: SectionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_instructor)
):
    return await CourseService.create_section(db, course_id, section_in, current_user.id)


# ==================== LESSON ENDPOINTS ====================
@router.post(
    "/sections/{section_id}/lessons",
    response_model=LessonResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Giảng viên thêm bài học mới vào chương học"
)
async def create_lesson(
    section_id: int,
    lesson_in: LessonCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_instructor)
):
    return await CourseService.create_lesson(db, section_id, lesson_in, current_user.id)

@router.put(
    "/lessons/{lesson_id}",
    response_model=LessonResponse,
    summary="Giảng viên cập nhật nội dung bài học"
)
async def update_lesson(
    lesson_id: int,
    lesson_in: LessonUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_instructor)
):
    return await CourseService.update_lesson(db, lesson_id, lesson_in, current_user.id)

@router.delete(
    "/lessons/{lesson_id}",
    summary="Giảng viên xóa bài học"
)
async def delete_lesson(
    lesson_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_instructor)
):
    success = await CourseService.delete_lesson(db, lesson_id, current_user.id)
    return {"status": "success", "message": "Đã xóa bài học thành công."}


# ==================== PUBLIC SEARCH & FILTER ENDPOINTS ====================
@router.get(
    "/courses",
    response_model=List[CourseResponse],
    summary="Tìm kiếm, lọc và sắp xếp khóa học dành cho học viên và khách vãng lai"
)
async def get_courses(
    q: Optional[str] = Query(None, description="Từ khóa tìm kiếm trong tiêu đề và mô tả"),
    category_id: Optional[int] = Query(None, alias="ma_danh_muc", description="ID Danh mục"),
    level: Optional[str] = Query(None, alias="trinh_do", description="Trình độ: beginner, intermediate, advanced"),
    min_price: Optional[Decimal] = Query(None, alias="gia_min", description="Giá tối thiểu"),
    max_price: Optional[Decimal] = Query(None, alias="gia_max", description="Giá tối đa"),
    instructor_id: Optional[int] = Query(None, alias="ma_giang_vien", description="ID Giảng viên"),
    sort_by: Optional[str] = Query("ngay_tao", description="Trường sắp xếp: ngay_tao, gia_tien, danh_gia_trung_binh"),
    order: Optional[str] = Query("desc", description="Hướng sắp xếp: asc hoặc desc"),
    skip: int = 0,
    limit: int = 20,
    db: AsyncSession = Depends(get_db)
):
    return await CourseService.get_courses(
        db, skip=skip, limit=limit, q=q, category_id=category_id,
        level=level, min_price=min_price, max_price=max_price,
        instructor_id=instructor_id, sort_by=sort_by, order=order
    )

@router.get(
    "/courses/{course_id}",
    response_model=CourseDetailResponse,
    summary="Xem chi tiết đề cương khóa học (Mọi người có thể xem)"
)
async def get_course_detail(
    course_id: int,
    db: AsyncSession = Depends(get_db)
):
    course = await CourseService.get_course(db, course_id)
    # Ẩn các thuộc tính bảo mật của bài học nếu là khóa học thu phí đối với khách vãng lai
    # Ở đây chúng ta trả về toàn bộ cấu trúc CourseDetailResponse, 
    # Nhưng trong thực tế, các bài học sẽ ẩn link tài liệu và video nếu is_preview = False (sẽ xử lý ở API học tập).
    return course
