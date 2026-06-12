from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_db, get_current_user, get_current_user_optional
from sqlalchemy.orm import attributes

from app.modules.identity.models import User
from app.modules.identity.schemas import UserResponse
from app.modules.catalog.models import Course
from app.modules.catalog.schemas import (
    CategoryCreate, CategoryResponse,
    CourseCreate, CourseUpdate, CourseResponse, CourseDetailResponse,
    SectionCreate, SectionUpdate, SectionResponse,
    LessonCreate, LessonUpdate, LessonResponse,
    LessonContentCreate, LessonContentUpdate, LessonContentResponse,
    ReviewCreate, ReviewResponse,
    WishlistResponse
)
from app.modules.catalog.services import CourseService
from app.modules.learning.models import Enrollment
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
import json
from app.core.redis import redis_client, clear_categories_cache

@router.post(
    "/categories", 
    response_model=CategoryResponse, 
    status_code=status.HTTP_201_CREATED,
    summary="Admin creates a new course category"
)
async def create_category(
    category_in: CategoryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    category = await CourseService.create_category(db, category_in)
    await clear_categories_cache()
    return category

@router.get(
    "/categories", 
    response_model=List[CategoryResponse],
    summary="Get course category list"
)
async def get_categories(db: AsyncSession = Depends(get_db)):
    cache_key = "categories:all"
    try:
        cached = await redis_client.get(cache_key)
        if cached:
            return json.loads(cached)
    except Exception:
        pass

    categories = await CourseService.get_categories(db)
    
    try:
        data_to_cache = [CategoryResponse.model_validate(c).model_dump() for c in categories]
        await redis_client.setex(cache_key, 3600, json.dumps(data_to_cache))
    except Exception:
        pass

    return categories

@router.get(
    "/categories/with-counts",
    summary="Get categories with course count (optimized for homepage)"
)
async def get_categories_with_counts(db: AsyncSession = Depends(get_db)):
    cache_key = "categories:with_counts"
    try:
        cached = await redis_client.get(cache_key)
        if cached:
            return json.loads(cached)
    except Exception:
        pass

    data = await CourseService.get_categories_with_counts(db)

    try:
        await redis_client.setex(cache_key, 3600, json.dumps(data))
    except Exception:
        pass

    return data

@router.get(
    "/courses/featured",
    summary="Get featured courses: popular, affordable, newest (optimized for homepage)"
)
async def get_featured_courses(
    limit: int = Query(default=8, le=20),
    db: AsyncSession = Depends(get_db)
):
    return await CourseService.get_featured_courses(db, limit)

# ==================== INSTRUCTOR COURSE ENDPOINTS ====================
@router.post(
    "/instructor/courses",
    response_model=CourseResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Instructor creates a new course (Draft)"
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
    summary="Get list of courses managed by current instructor"
)
async def get_instructor_courses(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_instructor)
):
    return await CourseService.get_instructor_courses(db, current_user.id)

@router.get(
    "/instructor/courses/{course_id}/students",
    response_model=List[UserResponse],
    summary="Get list of students in a course"
)
async def get_course_students(
    course_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_instructor)
):
    from sqlalchemy import select
    from sqlalchemy.orm import selectinload
    
    # Kiểm tra khóa học thuộc về giảng viên
    result = await db.execute(select(Course).where(Course.id == course_id, Course.ma_giang_vien == current_user.id))
    course = result.scalars().first()
    if not course:
        raise HTTPException(status_code=404, detail="Khóa học không tồn tại hoặc bạn không có quyền.")
        
    # Lấy danh sách đăng ký học của khóa học này
    enroll_result = await db.execute(
        select(Enrollment)
        .options(selectinload(Enrollment.nguoi_dung))
        .where(Enrollment.ma_khoa_hoc == course_id)
        .order_by(Enrollment.id.desc())
    )
    enrollments = enroll_result.scalars().all()
    
    return [enrollment.nguoi_dung for enrollment in enrollments]

@router.put(
    "/courses/{course_id}",
    response_model=CourseResponse,
    summary="Instructor updates course information"
)
async def update_course(
    course_id: int,
    course_in: CourseUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_instructor)
):
    if current_user.vai_tro != "admin":
        if course_in.da_xuat_ban is True or course_in.trang_thai_phe_duyet == "approved":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Chỉ quản trị viên mới có quyền phê duyệt/xuất bản khóa học."
            )
    return await CourseService.update_course(db, course_id, course_in, current_user.id)


# ==================== SECTION ENDPOINTS ====================
@router.post(
    "/courses/{course_id}/sections",
    response_model=SectionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Instructor adds a new chapter to the course"
)
async def create_section(
    course_id: int,
    section_in: SectionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_instructor)
):
    return await CourseService.create_section(db, course_id, section_in, current_user.id)

@router.put(
    "/sections/{section_id}",
    response_model=SectionResponse,
    summary="Instructor updates chapter"
)
async def update_section(
    section_id: int,
    section_in: SectionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_instructor)
):
    return await CourseService.update_section(db, section_id, section_in, current_user.id)

@router.delete(
    "/sections/{section_id}",
    summary="Instructor deletes a chapter"
)
async def delete_section(
    section_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_instructor)
):
    await CourseService.delete_section(db, section_id, current_user.id)
    return {"status": "success", "message": "Đã xóa chương học thành công."}


# ==================== LESSON ENDPOINTS ====================
@router.post(
    "/sections/{section_id}/lessons",
    response_model=LessonResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Instructor adds a new lesson to a chapter"
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
    summary="Instructor updates lesson content"
)
async def update_lesson(
    lesson_id: int,
    lesson_in: LessonUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_instructor)
):
    if current_user.vai_tro != "admin":
        if lesson_in.da_xuat_ban is True or lesson_in.trang_thai_phe_duyet == "approved":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Chỉ quản trị viên mới có quyền phê duyệt/xuất bản bài học."
            )
    return await CourseService.update_lesson(db, lesson_id, lesson_in, current_user.id)

@router.delete(
    "/lessons/{lesson_id}",
    summary="Instructor deletes a lesson"
)
async def delete_lesson(
    lesson_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_instructor)
):
    success = await CourseService.delete_lesson(db, lesson_id, current_user.id)
    return {"status": "success", "message": "Đã xóa bài học thành công."}

# ==================== LESSON CONTENT ENDPOINTS ====================
@router.post(
    "/lessons/{lesson_id}/contents",
    response_model=LessonContentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Instructor adds a content block to a lesson"
)
async def create_lesson_content(
    lesson_id: int,
    content_in: LessonContentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_instructor)
):
    return await CourseService.create_lesson_content(db, lesson_id, content_in, current_user.id)

@router.put(
    "/lesson-contents/{content_id}",
    response_model=LessonContentResponse,
    summary="Instructor updates a content block"
)
async def update_lesson_content(
    content_id: int,
    content_in: LessonContentUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_instructor)
):
    return await CourseService.update_lesson_content(db, content_id, content_in, current_user.id)

@router.delete(
    "/lesson-contents/{content_id}",
    summary="Instructor deletes a content block from a lesson"
)
async def delete_lesson_content(
    content_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_instructor)
):
    await CourseService.delete_lesson_content(db, content_id, current_user.id)
    return {"status": "success", "message": "Đã xóa nội dung bài học thành công."}


# ==================== PUBLIC SEARCH & FILTER ENDPOINTS ====================
@router.get(
    "/courses",
    response_model=List[CourseResponse],
    summary="Search, filter, and sort courses for students and guests"
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
    "/courses/wishlist/me",
    response_model=List[WishlistResponse],
    summary="Get personal favorite courses list"
)
async def get_my_wishlist(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await CourseService.get_user_wishlist(db, current_user.id)

@router.get(
    "/courses/{course_id}",
    response_model=CourseDetailResponse,
    summary="View course syllabus details (Publicly accessible)"
)
async def get_course_detail(
    course_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    course = await CourseService.get_course(db, course_id)
    
    # Kiểm tra xem người dùng hiện tại có phải giảng viên sở hữu hoặc admin không
    is_owner_or_admin = False
    if current_user:
        if current_user.vai_tro == "admin" or course.ma_giang_vien == current_user.id:
            is_owner_or_admin = True

    if not is_owner_or_admin and (not course.da_xuat_ban or course.trang_thai_phe_duyet != "approved"):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy khóa học."
        )
            
    # Nếu không phải chủ sở hữu hoặc admin, ẩn các bài học chưa xuất bản (da_xuat_ban = False)
    if not is_owner_or_admin:
        for section in course.chuong_hoc:
            filtered_lessons = [l for l in section.bai_hoc if l.da_xuat_ban]
            attributes.set_committed_value(section, "bai_hoc", filtered_lessons)
            
    return course


# ==================== COURSE REVIEW ENDPOINTS ====================
@router.post(
    "/courses/{course_id}/reviews",
    response_model=ReviewResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Student submits a course review"
)
async def create_course_review(
    course_id: int,
    review_in: ReviewCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await CourseService.create_course_review(db, current_user.id, course_id, review_in)

@router.get(
    "/courses/{course_id}/reviews",
    response_model=List[ReviewResponse],
    summary="Get course review list"
)
async def get_course_reviews(
    course_id: int,
    skip: int = 0,
    limit: int = 20,
    db: AsyncSession = Depends(get_db)
):
    return await CourseService.get_course_reviews(db, course_id, skip=skip, limit=limit)

# ==================== COURSE WISHLIST ENDPOINTS ====================
@router.post(
    "/courses/{course_id}/wishlist",
    summary="Favorite / Unfavorite course"
)
async def toggle_course_wishlist(
    course_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    added = await CourseService.toggle_wishlist(db, current_user.id, course_id)
    msg = "Đã thêm khóa học vào danh sách yêu thích thành công." if added else "Đã xóa khóa học khỏi danh sách yêu thích."
    return {"added": added, "message": msg}
