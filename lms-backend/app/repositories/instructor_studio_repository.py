from datetime import datetime
from typing import Any, List

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.course import Course, CourseReview, Enrollment
from app.models.order import Order, OrderItem
from app.models.payout import PayoutRequest
from app.models.user import User
from app.repositories.base import BaseRepository


class InstructorStudioRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def count_courses(self, instructor_id: int) -> int:
        result = await self.db.execute(
            select(func.count(Course.id)).where(Course.ma_giang_vien == instructor_id)
        )
        return int(result.scalar() or 0)

    async def count_students(self, instructor_id: int) -> int:
        result = await self.db.execute(
            select(func.count(Enrollment.id))
            .join(Course, Enrollment.ma_khoa_hoc == Course.id)
            .where(Course.ma_giang_vien == instructor_id)
        )
        return int(result.scalar() or 0)

    async def sum_revenue(self, instructor_id: int) -> float:
        result = await self.db.execute(
            select(func.sum(OrderItem.gia_luc_mua))
            .join(Course, OrderItem.ma_khoa_hoc == Course.id)
            .where(Course.ma_giang_vien == instructor_id)
        )
        return float(result.scalar() or 0.0)

    async def average_rating(self, instructor_id: int) -> float:
        result = await self.db.execute(
            select(func.avg(CourseReview.so_sao))
            .join(Course, CourseReview.ma_khoa_hoc == Course.id)
            .where(Course.ma_giang_vien == instructor_id)
        )
        return float(result.scalar() or 5.0)

    async def sum_revenue_since(self, instructor_id: int, since: datetime) -> float:
        result = await self.db.execute(
            select(func.sum(OrderItem.gia_luc_mua))
            .join(Course, OrderItem.ma_khoa_hoc == Course.id)
            .join(Order, OrderItem.ma_don_hang == Order.id)
            .where(
                and_(
                    Course.ma_giang_vien == instructor_id,
                    Order.trang_thai == "success",
                    Order.ngay_tao >= since,
                )
            )
        )
        return float(result.scalar() or 0.0)

    async def count_students_since(self, instructor_id: int, since: datetime) -> int:
        result = await self.db.execute(
            select(func.count(Enrollment.id))
            .join(Course, Enrollment.ma_khoa_hoc == Course.id)
            .where(
                and_(
                    Course.ma_giang_vien == instructor_id,
                    Enrollment.ngay_dang_ky >= since,
                )
            )
        )
        return int(result.scalar() or 0)

    async def list_students(self, instructor_id: int) -> List[Any]:
        result = await self.db.execute(
            select(User.id, User.ho_ten, User.email, User.avatar_url, Course.tieu_de, Enrollment.ngay_dang_ky)
            .join(Enrollment, Enrollment.ma_nguoi_dung == User.id)
            .join(Course, Enrollment.ma_khoa_hoc == Course.id)
            .where(Course.ma_giang_vien == instructor_id)
            .order_by(Enrollment.ngay_dang_ky.desc())
        )
        return list(result.all())

    async def list_reviews(self, instructor_id: int) -> List[CourseReview]:
        result = await self.db.execute(
            select(CourseReview)
            .options(selectinload(CourseReview.nguoi_dung), selectinload(CourseReview.khoa_hoc))
            .join(Course, CourseReview.ma_khoa_hoc == Course.id)
            .where(Course.ma_giang_vien == instructor_id)
            .order_by(CourseReview.ngay_tao.desc())
        )
        return list(result.scalars().all())

    async def list_transactions(self, instructor_id: int) -> List[Any]:
        result = await self.db.execute(
            select(
                OrderItem.id,
                Order.id.label("order_id"),
                Course.tieu_de.label("course_title"),
                User.ho_ten.label("student_name"),
                OrderItem.gia_luc_mua.label("amount"),
                Order.ngay_tao.label("date"),
            )
            .join(Order, OrderItem.ma_don_hang == Order.id)
            .join(Course, OrderItem.ma_khoa_hoc == Course.id)
            .join(User, Order.ma_nguoi_dung == User.id)
            .where(
                and_(
                    Course.ma_giang_vien == instructor_id,
                    Order.trang_thai == "success",
                )
            )
            .order_by(Order.ngay_tao.desc())
        )
        return list(result.all())

    async def sum_requested_payouts(self, instructor_id: int) -> float:
        result = await self.db.execute(
            select(func.sum(PayoutRequest.so_tien)).where(
                and_(
                    PayoutRequest.ma_giang_vien == instructor_id,
                    PayoutRequest.trang_thai != "rejected",
                )
            )
        )
        return float(result.scalar() or 0.0)

    async def list_payouts(self, instructor_id: int) -> List[PayoutRequest]:
        result = await self.db.execute(
            select(PayoutRequest)
            .where(PayoutRequest.ma_giang_vien == instructor_id)
            .order_by(PayoutRequest.ngay_yeu_cau.desc())
        )
        return list(result.scalars().all())


class PayoutRepository(BaseRepository[PayoutRequest]):
    def __init__(self, db: AsyncSession):
        super().__init__(db, PayoutRequest)
