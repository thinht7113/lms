from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
from decimal import Decimal

from app.api.deps import get_db, get_current_user
from app.modules.identity.models import User
from app.modules.identity.schemas import UserResponse
from app.modules.catalog.models import Course, CourseReview
from app.modules.catalog.schemas import CourseResponse, ReviewResponse
from app.modules.commerce.models import Order, OrderItem
from app.modules.learning.models import Enrollment
from app.modules.instructor.models import PayoutRequest

router = APIRouter()

# --- Schemas ---
class InstructorStats(BaseModel):
    total_courses: int
    total_students: int
    total_revenue: float
    average_rating: float
    revenue_this_month: float
    new_students_this_month: int

class StudentEnrollmentResponse(BaseModel):
    student_id: int
    ho_ten: str
    email: str
    avatar_url: Optional[str]
    course_title: str
    ngay_dang_ky: datetime

class TransactionResponse(BaseModel):
    id: int
    order_id: int
    course_title: str
    student_name: str
    amount: float
    date: datetime

class PayoutCreate(BaseModel):
    amount: float
    bank_name: str
    account_number: str
    account_name: str

class PayoutResponse(BaseModel):
    id: str
    amount: float
    bank: str
    account_number: str
    account_name: str
    status: str
    reason: Optional[str]
    date: datetime

# --- Dependencies ---
def require_instructor(current_user: User = Depends(get_current_user)) -> User:
    if current_user.vai_tro not in ["instructor", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Yêu cầu quyền giảng viên hoặc admin."
        )
    return current_user

# --- Endpoints ---

@router.get("/stats", response_model=InstructorStats)
async def get_instructor_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_instructor)
):
    # 1. Đếm số khóa học
    courses_count_res = await db.execute(
        select(func.count(Course.id)).where(Course.ma_giang_vien == current_user.id)
    )
    total_courses = courses_count_res.scalar() or 0

    # 2. Đếm tổng học viên (Enrollments)
    students_count_res = await db.execute(
        select(func.count(Enrollment.id))
        .join(Course, Enrollment.ma_khoa_hoc == Course.id)
        .where(Course.ma_giang_vien == current_user.id)
    )
    total_students = students_count_res.scalar() or 0

    # 3. Tính tổng doanh thu (OrderItems)
    revenue_res = await db.execute(
        select(func.sum(OrderItem.gia_luc_mua))
        .join(Course, OrderItem.ma_khoa_hoc == Course.id)
        .where(Course.ma_giang_vien == current_user.id)
    )
    total_revenue = float(revenue_res.scalar() or 0.0)

    # 4. Đánh giá trung bình
    rating_res = await db.execute(
        select(func.avg(CourseReview.so_sao))
        .join(Course, CourseReview.ma_khoa_hoc == Course.id)
        .where(Course.ma_giang_vien == current_user.id)
    )
    average_rating = float(rating_res.scalar() or 5.0)

    # 5. Doanh thu tháng này
    now = datetime.now()
    first_of_month = datetime(now.year, now.month, 1)
    rev_month_res = await db.execute(
        select(func.sum(OrderItem.gia_luc_mua))
        .join(Course, OrderItem.ma_khoa_hoc == Course.id)
        .join(Order, OrderItem.ma_don_hang == Order.id)
        .where(
            and_(
                Course.ma_giang_vien == current_user.id,
                Order.trang_thai == "success",
                Order.ngay_tao >= first_of_month
            )
        )
    )
    revenue_this_month = float(rev_month_res.scalar() or 0.0)

    # 6. Học viên mới tháng này
    new_std_res = await db.execute(
        select(func.count(Enrollment.id))
        .join(Course, Enrollment.ma_khoa_hoc == Course.id)
        .where(
            and_(
                Course.ma_giang_vien == current_user.id,
                Enrollment.ngay_dang_ky >= first_of_month
            )
        )
    )
    new_students_this_month = new_std_res.scalar() or 0

    return InstructorStats(
        total_courses=total_courses,
        total_students=total_students,
        total_revenue=total_revenue,
        average_rating=average_rating,
        revenue_this_month=revenue_this_month,
        new_students_this_month=new_students_this_month
    )

@router.get("/students", response_model=List[StudentEnrollmentResponse])
async def get_my_students(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_instructor)
):
    # Lấy danh sách học viên kèm tên khóa học họ đang học
    result = await db.execute(
        select(User.id, User.ho_ten, User.email, User.avatar_url, Course.tieu_de, Enrollment.ngay_dang_ky)
        .join(Enrollment, Enrollment.ma_nguoi_dung == User.id)
        .join(Course, Enrollment.ma_khoa_hoc == Course.id)
        .where(Course.ma_giang_vien == current_user.id)
        .order_by(Enrollment.ngay_dang_ky.desc())
    )
    
    rows = result.all()
    return [
        StudentEnrollmentResponse(
            student_id=r[0],
            ho_ten=r[1],
            email=r[2],
            avatar_url=r[3],
            course_title=r[4],
            ngay_dang_ky=r[5]
        ) for r in rows
    ]

@router.get("/reviews", response_model=List[ReviewResponse])
async def get_my_course_reviews(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_instructor)
):
    result = await db.execute(
        select(CourseReview)
        .options(selectinload(CourseReview.nguoi_dung), selectinload(CourseReview.khoa_hoc))
        .join(Course, CourseReview.ma_khoa_hoc == Course.id)
        .where(Course.ma_giang_vien == current_user.id)
        .order_by(CourseReview.ngay_tao.desc())
    )
    return list(result.scalars().all())

@router.get("/transactions", response_model=List[TransactionResponse])
async def get_my_transactions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_instructor)
):
    result = await db.execute(
        select(
            OrderItem.id,
            Order.id.label('order_id'),
            Course.tieu_de.label('course_title'),
            User.ho_ten.label('student_name'),
            OrderItem.gia_luc_mua.label('amount'),
            Order.ngay_tao.label('date')
        )
        .join(Order, OrderItem.ma_don_hang == Order.id)
        .join(Course, OrderItem.ma_khoa_hoc == Course.id)
        .join(User, Order.ma_nguoi_dung == User.id)
        .where(
            and_(
                Course.ma_giang_vien == current_user.id,
                Order.trang_thai == "success"
            )
        )
        .order_by(Order.ngay_tao.desc())
    )
    
    rows = result.all()
    return [
        TransactionResponse(
            id=r.id,
            order_id=r.order_id,
            course_title=r.course_title,
            student_name=r.student_name,
            amount=float(r.amount),
            date=r.date
        ) for r in rows
    ]

@router.post("/payouts", response_model=PayoutResponse, status_code=status.HTTP_201_CREATED)
async def create_payout_request(
    payout_in: PayoutCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_instructor)
):
    # Kiểm tra số dư (Đơn giản hóa cho MVP: Có thể check lại logic doanh thu thực)
    # Lấy tổng doanh thu
    revenue_res = await db.execute(
        select(func.sum(OrderItem.gia_luc_mua))
        .join(Course, OrderItem.ma_khoa_hoc == Course.id)
        .where(Course.ma_giang_vien == current_user.id)
    )
    total_revenue = float(revenue_res.scalar() or 0.0)
    
    # Lấy tổng đã rút
    payout_res = await db.execute(
        select(func.sum(PayoutRequest.so_tien))
        .where(
            and_(
                PayoutRequest.ma_giang_vien == current_user.id,
                PayoutRequest.trang_thai != 'rejected'
            )
        )
    )
    total_withdrawn = float(payout_res.scalar() or 0.0)
    
    available_balance = (total_revenue * 0.7) - total_withdrawn
    
    if payout_in.amount > available_balance:
        raise HTTPException(status_code=400, detail="Số dư khả dụng không đủ.")
        
    if payout_in.amount < 500000:
        raise HTTPException(status_code=400, detail="Số tiền rút tối thiểu là 500.000 đ.")

    new_payout = PayoutRequest(
        ma_giang_vien=current_user.id,
        so_tien=payout_in.amount,
        ngan_hang=payout_in.bank_name,
        so_tai_khoan=payout_in.account_number,
        ten_chu_tai_khoan=payout_in.account_name
    )
    db.add(new_payout)
    await db.commit()
    await db.refresh(new_payout)
    
    return PayoutResponse(
        id=f"WD-{new_payout.id}",
        amount=new_payout.so_tien,
        bank=new_payout.ngan_hang,
        account_number=new_payout.so_tai_khoan,
        account_name=new_payout.ten_chu_tai_khoan,
        status=new_payout.trang_thai,
        reason=new_payout.ly_do_tu_choi,
        date=new_payout.ngay_yeu_cau
    )

@router.get("/payouts", response_model=List[PayoutResponse])
async def get_my_payouts(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_instructor)
):
    result = await db.execute(
        select(PayoutRequest)
        .where(PayoutRequest.ma_giang_vien == current_user.id)
        .order_by(PayoutRequest.ngay_yeu_cau.desc())
    )
    payouts = result.scalars().all()
    
    return [
        PayoutResponse(
            id=f"WD-{p.id}",
            amount=p.so_tien,
            bank=p.ngan_hang,
            account_number=p.so_tai_khoan,
            account_name=p.ten_chu_tai_khoan,
            status=p.trang_thai,
            reason=p.ly_do_tu_choi,
            date=p.ngay_yeu_cau
        ) for p in payouts
    ]
