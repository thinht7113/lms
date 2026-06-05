from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
import secrets
import string
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from app.api.deps import get_db, get_current_admin_user
from app.models import User, Course, Order, OrderItem, Enrollment, Category, Coupon
from app.models.setting import Setting
from app.schemas.course import CategoryUpdate, CategoryResponse, CourseResponse, LessonResponse
from app.schemas.order import OrderResponse, CouponCreate, CouponUpdate, CouponResponse
from app.schemas.setting import SettingResponse, SettingUpdateBulk, SettingPublicResponse
from app.services.auth_service import get_password_hash

router = APIRouter()

# --- Schemas ---
class ChartDataPoint(BaseModel):
    name: str
    revenue: float
    students: int

class PendingCourse(BaseModel):
    id: int
    tieu_de: str
    giang_vien: str

class TopCourse(BaseModel):
    id: int
    tieu_de: str
    so_hoc_vien: int
    doanh_thu: float

class RecentActivity(BaseModel):
    id: int
    hanh_dong: str
    chi_tiet: Optional[str]
    ngay_thuc_hien: datetime
    nguoi_thuc_hien: str

class SystemStats(BaseModel):
    total_users: int
    total_students: int
    total_instructors: int
    total_courses: int
    total_orders: int
    total_revenue: float
    revenue_this_month: float
    completion_rate: float
    chart_data: List[ChartDataPoint]
    pending_courses: List[PendingCourse]
    top_courses: List[TopCourse]
    recent_activities: List[RecentActivity]

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

    from datetime import datetime, timedelta
    from app.models.log import AdminLog
    
    # Doanh thu tháng này
    now = datetime.now()
    first_day_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    rev_month_res = await db.execute(select(func.sum(Order.tong_tien)).where(Order.ngay_tao >= first_day_of_month))
    revenue_this_month = float(rev_month_res.scalar() or 0)

    # Tỷ lệ hoàn thành (mock)
    completion_rate = 78.5

    # Dữ liệu biểu đồ (mock 6 tháng)
    chart_data = [
        {"name": "Th 1", "revenue": 15000000, "students": 120},
        {"name": "Th 2", "revenue": 18000000, "students": 150},
        {"name": "Th 3", "revenue": 22000000, "students": 180},
        {"name": "Th 4", "revenue": 19000000, "students": 160},
        {"name": "Th 5", "revenue": 25000000, "students": 210},
        {"name": "Th 6", "revenue": revenue_this_month or 30000000, "students": 250},
    ]

    # Khóa học chờ duyệt
    pending_courses_res = await db.execute(
        select(Course)
        .options(selectinload(Course.giang_vien))
        .where(Course.trang_thai_phe_duyet == "pending")
        .limit(5)
    )
    pending_courses = pending_courses_res.scalars().all()
    pending_courses_mapped = [
        {
            "id": c.id, 
            "tieu_de": c.tieu_de, 
            "giang_vien": c.giang_vien.ho_ten if c.giang_vien else "Giảng viên ẩn danh"
        } for c in pending_courses
    ]

    # Hoạt động gần đây
    recent_activities_res = await db.execute(select(AdminLog).options(selectinload(AdminLog.admin)).order_by(AdminLog.id.desc()).limit(5))
    recent_activities = recent_activities_res.scalars().all()
    recent_activities_mapped = [{
        "id": a.id, 
        "hanh_dong": a.hanh_dong, 
        "chi_tiet": a.chi_tiet, 
        "ngay_thuc_hien": a.ngay_thuc_hien,
        "nguoi_thuc_hien": a.admin.ho_ten if a.admin else f"ID {a.ma_admin}"
    } for a in recent_activities]

    # Top khóa học
    top_courses_res = await db.execute(select(Course).order_by(Course.gia_tien.desc()).limit(4))
    top_courses = top_courses_res.scalars().all()
    top_courses_mapped = [{"id": c.id, "tieu_de": c.tieu_de, "so_hoc_vien": 100 + c.id * 15, "doanh_thu": float(c.gia_tien or 0) * (100 + c.id * 15)} for c in top_courses]

    return SystemStats(
        total_users=total_users,
        total_students=total_students,
        total_instructors=total_instructors,
        total_courses=total_courses,
        total_orders=total_orders,
        total_revenue=total_revenue,
        revenue_this_month=revenue_this_month,
        completion_rate=completion_rate,
        chart_data=chart_data,
        pending_courses=pending_courses_mapped,
        top_courses=top_courses_mapped,
        recent_activities=recent_activities_mapped
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
    
    await log_admin_action(db, current_admin.id, "UPDATE_USER_ROLE", f"User {user_id} -> {request.vai_tro}")
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

@router.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """
    Xóa người dùng khỏi hệ thống.
    """
    if current_admin.id == user_id:
        raise HTTPException(status_code=400, detail="Không thể tự xóa tài khoản của chính mình.")
        
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng.")
        
    await db.delete(user)
    await db.commit()
    
    await log_admin_action(db, current_admin.id, "DELETE_USER", f"Đã xóa User ID {user_id}")
    return {"message": "Đã xóa người dùng thành công."}

@router.post("/users/{user_id}/reset-password")
async def reset_user_password(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """
    Khôi phục mật khẩu người dùng về một mật khẩu ngẫu nhiên.
    """
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng.")
        
    alphabet = string.ascii_letters + string.digits + "!@#$%"
    new_password = ''.join(secrets.choice(alphabet) for i in range(10))
        
    user.mat_khau = get_password_hash(new_password)
    db.add(user)
    await db.commit()
    
    await log_admin_action(db, current_admin.id, "RESET_PASSWORD", f"Đã reset mật khẩu ngẫu nhiên cho User ID {user_id}")
    return {"message": f"Mật khẩu đã được reset", "new_password": new_password}


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

@router.put("/courses/{course_id}/approve", response_model=CourseResponse)
async def approve_course(
    course_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """
    Phê duyệt khóa học: Đặt trang_thai_phe_duyet = 'approved' và da_xuat_ban = True
    """
    result = await db.execute(select(Course).where(Course.id == course_id))
    course = result.scalars().first()
    if not course:
        raise HTTPException(status_code=404, detail="Không tìm thấy khóa học.")
    
    course.trang_thai_phe_duyet = "approved"
    course.da_xuat_ban = True
    db.add(course)
    await db.commit()
    await db.refresh(course)
    
    await log_admin_action(db, current_admin.id, "APPROVE_COURSE", f"Đã duyệt Course ID {course_id}")
    return course

@router.put("/courses/{course_id}/reject", response_model=CourseResponse)
async def reject_course(
    course_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """
    Từ chối khóa học: Đặt trang_thai_phe_duyet = 'rejected' và da_xuat_ban = False
    """
    result = await db.execute(select(Course).where(Course.id == course_id))
    course = result.scalars().first()
    if not course:
        raise HTTPException(status_code=404, detail="Không tìm thấy khóa học.")
    
    course.trang_thai_phe_duyet = "rejected"
    course.da_xuat_ban = False
    db.add(course)
    await db.commit()
    await db.refresh(course)
    
    await log_admin_action(db, current_admin.id, "REJECT_COURSE", f"Đã từ chối Course ID {course_id}")
    return course

@router.put("/lessons/{lesson_id}/approve", response_model=LessonResponse)
async def approve_lesson(
    lesson_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """
    Phê duyệt bài học: Đặt trang_thai_phe_duyet = 'approved' và da_xuat_ban = True
    """
    from app.models.course import Lesson
    result = await db.execute(
        select(Lesson)
        .options(selectinload(Lesson.chuong_hoc))
        .where(Lesson.id == lesson_id)
    )
    lesson = result.scalars().first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Không tìm thấy bài học.")
    
    lesson.trang_thai_phe_duyet = "approved"
    lesson.da_xuat_ban = True
    db.add(lesson)
    await db.commit()
    
    # Refresh to return LessonResponse matching schema (requires ma_khoa_hoc, etc.)
    final_res = await db.execute(
        select(Lesson)
        .options(
            selectinload(Lesson.chuong_hoc),
            selectinload(Lesson.noi_dung)
        )
        .where(Lesson.id == lesson_id)
    )
    db_lesson = final_res.scalars().one()
    
    await log_admin_action(db, current_admin.id, "APPROVE_LESSON", f"Đã duyệt Lesson ID {lesson_id}")
    return db_lesson

@router.put("/lessons/{lesson_id}/reject", response_model=LessonResponse)
async def reject_lesson(
    lesson_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """
    Từ chối bài học: Đặt trang_thai_phe_duyet = 'rejected' và da_xuat_ban = False
    """
    from app.models.course import Lesson
    result = await db.execute(
        select(Lesson)
        .options(selectinload(Lesson.chuong_hoc))
        .where(Lesson.id == lesson_id)
    )
    lesson = result.scalars().first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Không tìm thấy bài học.")
    
    lesson.trang_thai_phe_duyet = "rejected"
    lesson.da_xuat_ban = False
    db.add(lesson)
    await db.commit()
    
    # Refresh to return LessonResponse matching schema
    final_res = await db.execute(
        select(Lesson)
        .options(
            selectinload(Lesson.chuong_hoc),
            selectinload(Lesson.noi_dung)
        )
        .where(Lesson.id == lesson_id)
    )
    db_lesson = final_res.scalars().one()
    
    await log_admin_action(db, current_admin.id, "REJECT_LESSON", f"Đã từ chối Lesson ID {lesson_id}")
    return db_lesson

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
    await log_admin_action(db, current_admin.id, "DELETE_COURSE", f"Xóa Course {course_id}")
    return {"status": "success", "message": "Đã xóa khóa học thành công."}

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

# ==================== ENROLLMENTS (ADMIN) ====================
from app.models.course import Enrollment
from app.schemas.course import EnrollmentResponse, EnrollmentCreate
from sqlalchemy.exc import IntegrityError

@router.get("/enrollments", response_model=List[EnrollmentResponse])
async def get_all_enrollments_admin(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    query = select(Enrollment).options(
        selectinload(Enrollment.nguoi_dung),
        selectinload(Enrollment.khoa_hoc)
    ).order_by(Enrollment.id.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()

@router.post("/enrollments", response_model=EnrollmentResponse)
async def create_enrollment_admin(
    request: EnrollmentCreate,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    # Verify user and course exist
    user_res = await db.execute(select(User).where(User.id == request.ma_nguoi_dung))
    if not user_res.scalars().first():
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng.")
        
    course_res = await db.execute(select(Course).where(Course.id == request.ma_khoa_hoc))
    if not course_res.scalars().first():
        raise HTTPException(status_code=404, detail="Không tìm thấy khóa học.")

    try:
        new_enrollment = Enrollment(
            ma_nguoi_dung=request.ma_nguoi_dung,
            ma_khoa_hoc=request.ma_khoa_hoc
        )
        db.add(new_enrollment)
        await db.commit()
        await db.refresh(new_enrollment)
        
        # Load relationships for response
        res = await db.execute(select(Enrollment).options(
            selectinload(Enrollment.nguoi_dung),
            selectinload(Enrollment.khoa_hoc)
        ).where(Enrollment.id == new_enrollment.id))
        
        await log_admin_action(db, current_admin.id, "CREATE_ENROLLMENT", f"Cấp quyền User {request.ma_nguoi_dung} vào Course {request.ma_khoa_hoc}")
        return res.scalars().first()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=400, detail="Học viên đã được cấp quyền khóa học này rồi.")

@router.delete("/enrollments/{enrollment_id}")
async def delete_enrollment_admin(
    enrollment_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    result = await db.execute(select(Enrollment).where(Enrollment.id == enrollment_id))
    enrollment = result.scalars().first()
    if not enrollment:
        raise HTTPException(status_code=404, detail="Không tìm thấy bản ghi danh này.")
        
    await db.delete(enrollment)
    await db.commit()
    await log_admin_action(db, current_admin.id, "DELETE_ENROLLMENT", f"Thu hồi quyền Enrollment {enrollment_id}")
    return {"status": "success", "message": "Đã thu hồi quyền truy cập khóa học thành công."}

# ==================== CERTIFICATES (ADMIN) ====================
from app.models.certificate import Certificate
from app.schemas.course import CertificateResponse

@router.get("/certificates", response_model=List[CertificateResponse])
async def get_all_certificates_admin(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    query = select(Certificate).options(
        selectinload(Certificate.nguoi_dung),
        selectinload(Certificate.khoa_hoc)
    ).order_by(Certificate.id.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()

@router.delete("/certificates/{certificate_id}")
async def delete_certificate_admin(
    certificate_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    result = await db.execute(select(Certificate).where(Certificate.id == certificate_id))
    certificate = result.scalars().first()
    if not certificate:
        raise HTTPException(status_code=404, detail="Không tìm thấy chứng chỉ.")
        
    await db.delete(certificate)
    await db.commit()
    await log_admin_action(db, current_admin.id, "DELETE_CERTIFICATE", f"Thu hồi Certificate {certificate_id}")
    return {"status": "success", "message": "Đã thu hồi chứng chỉ thành công."}

# ==================== ORDERS (ADMIN) ====================
@router.get("/orders", response_model=List[OrderResponse])
async def get_all_orders(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    query = select(Order).options(
        selectinload(Order.chi_tiet_don_hang).selectinload(OrderItem.khoa_hoc)
    ).order_by(Order.id.desc()).offset(skip).limit(limit)
    
    result = await db.execute(query)
    return result.scalars().all()

# ==================== ADMIN LOGS ====================
from app.models.log import AdminLog
from app.schemas.log import AdminLogResponse

async def log_admin_action(db: AsyncSession, admin_id: int, action: str, details: Optional[str] = None):
    new_log = AdminLog(
        ma_admin=admin_id,
        hanh_dong=action,
        chi_tiet=details
    )
    db.add(new_log)
    await db.commit()

@router.get("/logs", response_model=List[AdminLogResponse])
async def get_admin_logs(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    query = select(AdminLog).order_by(AdminLog.id.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()

# ==================== SYSTEM SETTINGS ====================
@router.get("/settings", response_model=List[SettingResponse])
async def get_all_settings(
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    result = await db.execute(select(Setting).order_by(Setting.group, Setting.key))
    return result.scalars().all()

@router.put("/settings")
async def update_settings_bulk(
    request: SettingUpdateBulk,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    updates = 0
    for s_update in request.settings:
        result = await db.execute(select(Setting).where(Setting.key == s_update.key))
        db_setting = result.scalars().first()
        if db_setting:
            db_setting.value = s_update.value
            updates += 1
            
    await db.commit()
    await log_admin_action(db, current_admin.id, "UPDATE_SETTINGS", f"Đã cập nhật {updates} mục cấu hình")
    return {"message": f"Đã cập nhật {updates} mục cấu hình thành công"}
