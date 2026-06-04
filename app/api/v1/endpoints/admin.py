from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from app.api.deps import get_db, get_current_admin_user
from app.models import User, Course, Order, Enrollment, Category, Coupon
from app.schemas.course import CategoryUpdate, CategoryResponse, CourseResponse
from app.schemas.order import OrderResponse, CouponCreate, CouponUpdate, CouponResponse

router = APIRouter()

# --- Schemas ---
class SystemStats(BaseModel):
    total_users: int
    total_students: int
    total_instructors: int
    total_courses: int
    total_orders: int
    total_revenue: float

class UserResponse(BaseModel):
    id: int
    ho_ten: str
    email: str
    vai_tro: str
    trang_thai_hoat_dong: bool
    ngay_tao: datetime

    class Config:
        orm_mode = True

class RoleUpdateRequest(BaseModel):
    vai_tro: str

class StatusUpdateRequest(BaseModel):
    trang_thai_hoat_dong: bool

# --- Endpoints ---

@router.get("/stats", response_model=SystemStats)
async def get_system_stats(
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """
    Lấy thống kê tổng quan hệ thống (chỉ dành cho Admin).
    """
    # Đếm user
    users_res = await db.execute(select(func.count(User.id)))
    total_users = users_res.scalar() or 0

    students_res = await db.execute(select(func.count(User.id)).where(User.vai_tro == "student"))
    total_students = students_res.scalar() or 0

    instructors_res = await db.execute(select(func.count(User.id)).where(User.vai_tro == "instructor"))
    total_instructors = instructors_res.scalar() or 0

    # Đếm khóa học
    courses_res = await db.execute(select(func.count(Course.id)))
    total_courses = courses_res.scalar() or 0

    # Đếm đơn hàng (tạm tính tất cả đơn hàng)
    orders_res = await db.execute(select(func.count(Order.id)))
    total_orders = orders_res.scalar() or 0

    # Tính tổng doanh thu
    revenue_res = await db.execute(select(func.sum(Order.tong_tien)))
    total_revenue = float(revenue_res.scalar() or 0)

    return SystemStats(
        total_users=total_users,
        total_students=total_students,
        total_instructors=total_instructors,
        total_courses=total_courses,
        total_orders=total_orders,
        total_revenue=total_revenue
    )

@router.get("/users", response_model=List[UserResponse])
async def get_all_users(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    role: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """
    Lấy danh sách người dùng.
    """
    query = select(User)
    
    if search:
        query = query.where((User.ho_ten.ilike(f"%{search}%")) | (User.email.ilike(f"%{search}%")))
    if role:
        query = query.where(User.vai_tro == role)
        
    query = query.order_by(User.id.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    users = result.scalars().all()
    
    return users

@router.put("/users/{user_id}/role", response_model=UserResponse)
async def update_user_role(
    user_id: int,
    request: RoleUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """
    Cập nhật vai trò của người dùng (student, instructor, admin).
    """
    if request.vai_tro not in ["student", "instructor", "admin"]:
        raise HTTPException(status_code=400, detail="Vai trò không hợp lệ.")
        
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng.")
        
    user.vai_tro = request.vai_tro
    db.add(user)
    await db.commit()
    await db.refresh(user)
    
    return user

@router.put("/users/{user_id}/status", response_model=UserResponse)
async def update_user_status(
    user_id: int,
    request: StatusUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """
    Khóa hoặc mở khóa người dùng.
    """
    if current_admin.id == user_id:
        raise HTTPException(status_code=400, detail="Không thể tự khóa tài khoản của chính mình.")
        
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng.")
        
    user.trang_thai_hoat_dong = request.trang_thai_hoat_dong
    db.add(user)
    await db.commit()
    await db.refresh(user)
    
    return user

# ==================== CATEGORIES (ADMIN) ====================
@router.put("/categories/{category_id}", response_model=CategoryResponse)
async def update_category(
    category_id: int,
    request: CategoryUpdate,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    result = await db.execute(select(Category).where(Category.id == category_id))
    category = result.scalars().first()
    if not category:
        raise HTTPException(status_code=404, detail="Không tìm thấy danh mục.")
        
    if request.ten_danh_muc is not None:
        category.ten_danh_muc = request.ten_danh_muc
    if request.mo_ta is not None:
        category.mo_ta = request.mo_ta
        
    db.add(category)
    await db.commit()
    await db.refresh(category)
    return category

@router.delete("/categories/{category_id}")
async def delete_category(
    category_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    result = await db.execute(select(Category).where(Category.id == category_id))
    category = result.scalars().first()
    if not category:
        raise HTTPException(status_code=404, detail="Không tìm thấy danh mục.")
        
    await db.delete(category)
    await db.commit()
    return {"status": "success", "message": "Đã xóa danh mục thành công."}

# ==================== COURSES (ADMIN) ====================
from sqlalchemy.orm import selectinload

@router.get("/courses", response_model=List[CourseResponse])
async def get_all_courses_admin(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    # Trả về tất cả khóa học kể cả chưa xuất bản để Admin duyệt
    query = select(Course).order_by(Course.id.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()

@router.delete("/courses/{course_id}")
async def delete_course_admin(
    course_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    result = await db.execute(select(Course).where(Course.id == course_id))
    course = result.scalars().first()
    if not course:
        raise HTTPException(status_code=404, detail="Không tìm thấy khóa học.")
        
    await db.delete(course)
    await db.commit()
    return {"status": "success", "message": "Đã xóa khóa học thành công."}

# ==================== ORDERS (ADMIN) ====================
@router.get("/orders", response_model=List[OrderResponse])
async def get_all_orders_admin(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    query = select(Order).options(selectinload(Order.chi_tiet_don_hang)).order_by(Order.id.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()

# ==================== COUPONS (ADMIN) ====================
@router.get("/coupons", response_model=List[CouponResponse])
async def get_all_coupons_admin(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    query = select(Coupon).order_by(Coupon.id.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()

@router.put("/coupons/{coupon_id}", response_model=CouponResponse)
async def update_coupon_admin(
    coupon_id: int,
    request: CouponUpdate,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    result = await db.execute(select(Coupon).where(Coupon.id == coupon_id))
    coupon = result.scalars().first()
    if not coupon:
        raise HTTPException(status_code=404, detail="Không tìm thấy mã giảm giá.")
        
    if request.loai_giam_gia is not None:
        coupon.loai_giam_gia = request.loai_giam_gia
    if request.gia_tri_giam is not None:
        coupon.gia_tri_giam = request.gia_tri_giam
    if request.gia_tri_don_toi_thieu is not None:
        coupon.gia_tri_don_toi_thieu = request.gia_tri_don_toi_thieu
    if request.so_luot_dung_toi_da is not None:
        coupon.so_luot_dung_toi_da = request.so_luot_dung_toi_da
    if request.end_date is not None:
        coupon.ngay_het_han = request.end_date
        
    db.add(coupon)
    await db.commit()
    await db.refresh(coupon)
    return coupon

@router.delete("/coupons/{coupon_id}")
async def delete_coupon_admin(
    coupon_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    result = await db.execute(select(Coupon).where(Coupon.id == coupon_id))
    coupon = result.scalars().first()
    if not coupon:
        raise HTTPException(status_code=404, detail="Không tìm thấy mã giảm giá.")
        
    await db.delete(coupon)
    await db.commit()
    return {"status": "success", "message": "Đã xóa mã giảm giá thành công."}

# ==================== COURSE REVIEWS (ADMIN) ====================
from app.models.course import CourseReview
from app.schemas.course import ReviewResponse

@router.get("/reviews", response_model=List[ReviewResponse])
async def get_all_reviews_admin(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    query = select(CourseReview).options(
        selectinload(CourseReview.nguoi_dung),
        selectinload(CourseReview.khoa_hoc)
    ).order_by(CourseReview.id.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()

@router.delete("/reviews/{review_id}")
async def delete_review_admin(
    review_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    result = await db.execute(select(CourseReview).where(CourseReview.id == review_id))
    review = result.scalars().first()
    if not review:
        raise HTTPException(status_code=404, detail="Không tìm thấy đánh giá.")
        
    await db.delete(review)
    await db.commit()
    return {"status": "success", "message": "Đã xóa đánh giá vi phạm thành công."}

# ==================== QUIZZES (ADMIN) ====================
from app.models.quiz import Quiz, Question
from app.schemas.quiz import QuizResponse, QuizDetailResponse

@router.get("/quizzes", response_model=List[QuizResponse])
async def get_all_quizzes_admin(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    query = select(Quiz).options(selectinload(Quiz.khoa_hoc)).order_by(Quiz.id.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()

@router.get("/quizzes/{quiz_id}", response_model=QuizDetailResponse)
async def get_quiz_detail_admin(
    quiz_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    query = select(Quiz).options(
        selectinload(Quiz.khoa_hoc),
        selectinload(Quiz.cau_hoi).selectinload(Question.lua_chon_cau_hoi)
    ).where(Quiz.id == quiz_id)
    
    result = await db.execute(query)
    quiz = result.scalars().first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Không tìm thấy bài kiểm tra.")
    return quiz

@router.delete("/quizzes/{quiz_id}")
async def delete_quiz_admin(
    quiz_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    result = await db.execute(select(Quiz).where(Quiz.id == quiz_id))
    quiz = result.scalars().first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Không tìm thấy bài kiểm tra.")
        
    await db.delete(quiz)
    await db.commit()
    return {"status": "success", "message": "Đã xóa bài kiểm tra thành công."}
