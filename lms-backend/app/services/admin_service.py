from datetime import datetime
from decimal import Decimal
from typing import List, Optional
import secrets
import string

from fastapi import HTTPException
from sqlalchemy import func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.redis import clear_categories_cache
from app.models.certificate import Certificate
from app.models.course import Category, Course, CourseReview, Enrollment, Lesson, Progress, Section
from app.models.log import AdminLog
from app.models.order import Coupon, Order, OrderItem
from app.models.quiz import Question, Quiz
from app.models.setting import Setting
from app.models.user import User
from app.schemas.admin import (
    ChartDataPoint,
    PendingCourse,
    PendingRefund,
    RecentActivity,
    SystemStats,
    TopCourse,
)
from app.schemas.course import CategoryUpdate, EnrollmentCreate
from app.schemas.order import CouponUpdate
from app.schemas.setting import SettingUpdateBulk
from app.services.auth_service import get_password_hash
from app.services.order_service import OrderService


class AdminService:
    @staticmethod
    def month_start(value: datetime, offset: int = 0) -> datetime:
        month_index = value.year * 12 + value.month - 1 + offset
        year, zero_based_month = divmod(month_index, 12)
        return datetime(year, zero_based_month + 1, 1)

    @staticmethod
    async def log_admin_action(
        db: AsyncSession,
        admin_id: int,
        action: str,
        details: Optional[str] = None,
    ) -> None:
        db.add(AdminLog(ma_admin=admin_id, hanh_dong=action, chi_tiet=details))
        await db.commit()

    @staticmethod
    async def get_system_stats(db: AsyncSession) -> SystemStats:
        users_res = await db.execute(select(func.count(User.id)))
        total_users = users_res.scalar() or 0

        students_res = await db.execute(select(func.count(User.id)).where(User.vai_tro == "student"))
        total_students = students_res.scalar() or 0

        instructors_res = await db.execute(select(func.count(User.id)).where(User.vai_tro == "instructor"))
        total_instructors = instructors_res.scalar() or 0

        courses_res = await db.execute(select(func.count(Course.id)))
        total_courses = courses_res.scalar() or 0

        orders_res = await db.execute(select(func.count(Order.id)))
        total_orders = orders_res.scalar() or 0

        revenue_res = await db.execute(
            select(func.sum(Order.tong_tien)).where(Order.trang_thai == "success")
        )
        total_revenue = float(revenue_res.scalar() or 0)
        instructor_revenue = total_revenue * 0.7
        platform_revenue = total_revenue * 0.3

        now = datetime.now()
        first_day_of_month = AdminService.month_start(now)
        first_day_of_next_month = AdminService.month_start(now, 1)
        rev_month_res = await db.execute(
            select(func.sum(Order.tong_tien)).where(
                Order.trang_thai == "success",
                Order.ngay_tao >= first_day_of_month,
                Order.ngay_tao < first_day_of_next_month,
            )
        )
        revenue_this_month = float(rev_month_res.scalar() or 0)

        progress_total_res = await db.execute(select(func.count(Progress.id)))
        progress_completed_res = await db.execute(
            select(func.count(Progress.id)).where(Progress.da_hoan_thanh.is_(True))
        )
        progress_total = progress_total_res.scalar() or 0
        progress_completed = progress_completed_res.scalar() or 0
        completion_rate = round(progress_completed * 100 / progress_total, 2) if progress_total else 0.0

        chart_data: List[ChartDataPoint] = []
        for offset in range(-5, 1):
            start = AdminService.month_start(now, offset)
            end = AdminService.month_start(now, offset + 1)
            month_revenue_res = await db.execute(
                select(func.sum(Order.tong_tien)).where(
                    Order.trang_thai == "success",
                    Order.ngay_tao >= start,
                    Order.ngay_tao < end,
                )
            )
            month_students_res = await db.execute(
                select(func.count(Enrollment.id)).where(
                    Enrollment.ngay_dang_ky >= start,
                    Enrollment.ngay_dang_ky < end,
                )
            )
            chart_data.append(
                ChartDataPoint(
                    name=f"{start.month:02d}/{str(start.year)[2:]}",
                    revenue=float(month_revenue_res.scalar() or 0),
                    students=month_students_res.scalar() or 0,
                )
            )

        pending_courses_res = await db.execute(
            select(Course)
            .options(selectinload(Course.giang_vien))
            .where(Course.trang_thai_phe_duyet == "pending")
            .limit(5)
        )
        pending_courses_mapped = [
            PendingCourse(
                id=course.id,
                tieu_de=course.tieu_de,
                giang_vien=course.giang_vien.ho_ten if course.giang_vien else "Giang vien an danh",
            )
            for course in pending_courses_res.scalars().all()
        ]

        pending_refunds_res = await db.execute(
            select(Order)
            .options(selectinload(Order.nguoi_dung))
            .where(Order.trang_thai == "refund_requested")
            .limit(5)
        )
        pending_refunds_mapped = [
            PendingRefund(
                id=order.id,
                nguoi_yeu_cau=order.nguoi_dung.ho_ten if order.nguoi_dung else "Khach hang",
                so_tien=float(order.tong_tien),
                ngay_yeu_cau=order.ngay_tao,
            )
            for order in pending_refunds_res.scalars().all()
        ]

        recent_activities_res = await db.execute(
            select(AdminLog)
            .options(selectinload(AdminLog.admin))
            .order_by(AdminLog.id.desc())
            .limit(5)
        )
        recent_activities_mapped = [
            RecentActivity(
                id=activity.id,
                hanh_dong=activity.hanh_dong,
                chi_tiet=activity.chi_tiet,
                ngay_thuc_hien=activity.ngay_thuc_hien,
                nguoi_thuc_hien=activity.admin.ho_ten if activity.admin else f"ID {activity.ma_admin}",
            )
            for activity in recent_activities_res.scalars().all()
        ]

        enrollment_totals = (
            select(
                Enrollment.ma_khoa_hoc.label("course_id"),
                func.count(Enrollment.id).label("student_count"),
            )
            .group_by(Enrollment.ma_khoa_hoc)
            .subquery()
        )
        course_revenue = (
            select(
                OrderItem.ma_khoa_hoc.label("course_id"),
                func.sum(OrderItem.gia_luc_mua).label("revenue"),
            )
            .join(Order, Order.id == OrderItem.ma_don_hang)
            .where(Order.trang_thai == "success")
            .group_by(OrderItem.ma_khoa_hoc)
            .subquery()
        )
        top_courses_res = await db.execute(
            select(
                Course.id,
                Course.tieu_de,
                func.coalesce(enrollment_totals.c.student_count, 0),
                func.coalesce(course_revenue.c.revenue, 0),
            )
            .outerjoin(enrollment_totals, enrollment_totals.c.course_id == Course.id)
            .outerjoin(course_revenue, course_revenue.c.course_id == Course.id)
            .order_by(
                func.coalesce(enrollment_totals.c.student_count, 0).desc(),
                func.coalesce(course_revenue.c.revenue, 0).desc(),
            )
            .limit(4)
        )
        top_courses_mapped = [
            TopCourse(
                id=row[0],
                tieu_de=row[1],
                so_hoc_vien=row[2],
                doanh_thu=float(row[3] or 0),
            )
            for row in top_courses_res.all()
        ]

        return SystemStats(
            total_users=total_users,
            total_students=total_students,
            total_instructors=total_instructors,
            total_courses=total_courses,
            total_orders=total_orders,
            total_revenue=total_revenue,
            instructor_revenue=instructor_revenue,
            platform_revenue=platform_revenue,
            revenue_this_month=revenue_this_month,
            completion_rate=completion_rate,
            chart_data=chart_data,
            pending_courses=pending_courses_mapped,
            pending_refunds=pending_refunds_mapped,
            top_courses=top_courses_mapped,
            recent_activities=recent_activities_mapped,
        )

    @staticmethod
    async def get_users(
        db: AsyncSession,
        skip: int = 0,
        limit: int = 100,
        search: Optional[str] = None,
        role: Optional[str] = None,
    ) -> list[User]:
        query = select(User)
        if search:
            query = query.where((User.ho_ten.ilike(f"%{search}%")) | (User.email.ilike(f"%{search}%")))
        if role:
            query = query.where(User.vai_tro == role)
        result = await db.execute(query.order_by(User.id.desc()).offset(skip).limit(limit))
        return list(result.scalars().all())

    @staticmethod
    async def update_user_role(db: AsyncSession, admin_id: int, user_id: int, role: str) -> User:
        if role not in ["student", "instructor", "admin"]:
            raise HTTPException(status_code=400, detail="Vai tro khong hop le.")

        user = await AdminService._get_user_or_404(db, user_id)
        user.vai_tro = role
        db.add(user)
        await db.commit()
        await db.refresh(user)

        await AdminService.log_admin_action(
            db,
            admin_id,
            "Cap nhat vai tro",
            f"Nguoi dung: {user.ho_ten or user.email} -> {role}",
        )
        return user

    @staticmethod
    async def update_user_status(
        db: AsyncSession,
        current_admin_id: int,
        user_id: int,
        is_active: bool,
    ) -> User:
        if current_admin_id == user_id:
            raise HTTPException(status_code=400, detail="Khong the tu khoa tai khoan cua chinh minh.")

        user = await AdminService._get_user_or_404(db, user_id)
        user.trang_thai_hoat_dong = is_active
        db.add(user)
        await db.commit()
        await db.refresh(user)
        return user

    @staticmethod
    async def delete_user(db: AsyncSession, admin_id: int, user_id: int) -> dict[str, str]:
        if admin_id == user_id:
            raise HTTPException(status_code=400, detail="Khong the tu xoa tai khoan cua chinh minh.")

        user = await AdminService._get_user_or_404(db, user_id)
        user_label = user.ho_ten or user.email
        await db.delete(user)
        await db.commit()

        await AdminService.log_admin_action(db, admin_id, "Xoa nguoi dung", f"Nguoi dung: {user_label}")
        return {"message": "Da xoa nguoi dung thanh cong."}

    @staticmethod
    async def reset_user_password(db: AsyncSession, admin_id: int, user_id: int) -> dict[str, str]:
        user = await AdminService._get_user_or_404(db, user_id)

        alphabet = string.ascii_letters + string.digits + "!@#$%"
        new_password = "".join(secrets.choice(alphabet) for _ in range(10))

        user.mat_khau = get_password_hash(new_password)
        db.add(user)
        await db.commit()

        await AdminService.log_admin_action(
            db,
            admin_id,
            "Khoi phuc mat khau",
            f"Nguoi dung: {user.ho_ten or user.email}",
        )
        return {"message": "Mat khau da duoc reset", "new_password": new_password}

    @staticmethod
    async def update_category(db: AsyncSession, category_id: int, request: CategoryUpdate) -> Category:
        category = await AdminService._get_category_or_404(db, category_id)
        if request.ten_danh_muc is not None:
            category.ten_danh_muc = request.ten_danh_muc
        if request.mo_ta is not None:
            category.mo_ta = request.mo_ta

        db.add(category)
        await db.commit()
        await db.refresh(category)
        await clear_categories_cache()
        return category

    @staticmethod
    async def delete_category(db: AsyncSession, category_id: int) -> dict[str, str]:
        category = await AdminService._get_category_or_404(db, category_id)
        await db.delete(category)
        await db.commit()
        await clear_categories_cache()
        return {"status": "success", "message": "Da xoa danh muc thanh cong."}

    @staticmethod
    async def approve_course(db: AsyncSession, admin_id: int, course_id: int) -> Course:
        course = await AdminService._get_course_or_404(db, course_id)
        course.trang_thai_phe_duyet = "approved"
        course.da_xuat_ban = True
        db.add(course)

        await db.execute(
            update(Lesson)
            .where(
                Lesson.ma_chuong_hoc.in_(
                    select(Section.id).where(Section.ma_khoa_hoc == course_id)
                )
            )
            .values(trang_thai_phe_duyet="approved", da_xuat_ban=True)
        )
        await db.commit()

        result = await db.execute(
            select(Course)
            .options(selectinload(Course.dang_ky_hoc), selectinload(Course.giang_vien))
            .where(Course.id == course_id)
        )
        approved_course = result.scalars().one()
        await AdminService.log_admin_action(
            db,
            admin_id,
            "Duyet khoa hoc",
            f"Khoa hoc: {approved_course.tieu_de}",
        )
        return approved_course

    @staticmethod
    async def reject_course(db: AsyncSession, admin_id: int, course_id: int) -> Course:
        course = await AdminService._get_course_or_404(db, course_id)
        course.trang_thai_phe_duyet = "rejected"
        course.da_xuat_ban = False
        db.add(course)
        await db.commit()

        result = await db.execute(
            select(Course)
            .options(selectinload(Course.dang_ky_hoc), selectinload(Course.giang_vien))
            .where(Course.id == course_id)
        )
        rejected_course = result.scalars().one()
        await AdminService.log_admin_action(
            db,
            admin_id,
            "Tu choi khoa hoc",
            f"Khoa hoc: {rejected_course.tieu_de}",
        )
        return rejected_course

    @staticmethod
    async def get_pending_lessons(db: AsyncSession) -> list[dict[str, object]]:
        result = await db.execute(
            select(Lesson)
            .options(selectinload(Lesson.chuong_hoc).selectinload(Section.khoa_hoc))
            .where(Lesson.trang_thai_phe_duyet == "pending")
        )
        return [
            {
                "id": lesson.id,
                "tieu_de": lesson.tieu_de,
                "ma_chuong_hoc": lesson.ma_chuong_hoc,
                "trang_thai_phe_duyet": lesson.trang_thai_phe_duyet,
                "ten_chuong": lesson.chuong_hoc.tieu_de if lesson.chuong_hoc else "",
                "ma_khoa_hoc": lesson.chuong_hoc.ma_khoa_hoc if lesson.chuong_hoc else 0,
                "ten_khoa_hoc": lesson.chuong_hoc.khoa_hoc.tieu_de
                if lesson.chuong_hoc and lesson.chuong_hoc.khoa_hoc
                else "",
            }
            for lesson in result.scalars().all()
        ]

    @staticmethod
    async def approve_lesson(db: AsyncSession, admin_id: int, lesson_id: int) -> Lesson:
        lesson = await AdminService._get_lesson_or_404(db, lesson_id)
        lesson.trang_thai_phe_duyet = "approved"
        lesson.da_xuat_ban = True
        db.add(lesson)
        await db.commit()
        db_lesson = await AdminService._get_lesson_detail(db, lesson_id)
        await AdminService.log_admin_action(db, admin_id, "Duyet bai hoc", f"Bai hoc: {db_lesson.tieu_de}")
        return db_lesson

    @staticmethod
    async def reject_lesson(db: AsyncSession, admin_id: int, lesson_id: int) -> Lesson:
        lesson = await AdminService._get_lesson_or_404(db, lesson_id)
        lesson.trang_thai_phe_duyet = "rejected"
        lesson.da_xuat_ban = False
        db.add(lesson)
        await db.commit()
        db_lesson = await AdminService._get_lesson_detail(db, lesson_id)
        await AdminService.log_admin_action(db, admin_id, "Tu choi bai hoc", f"Bai hoc: {db_lesson.tieu_de}")
        return db_lesson

    @staticmethod
    async def get_courses(db: AsyncSession, skip: int = 0, limit: int = 100) -> list[Course]:
        result = await db.execute(
            select(Course)
            .options(selectinload(Course.dang_ky_hoc), selectinload(Course.giang_vien))
            .order_by(Course.id.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all())

    @staticmethod
    async def delete_course(db: AsyncSession, admin_id: int, course_id: int) -> dict[str, str]:
        course = await AdminService._get_course_or_404(db, course_id)
        title = course.tieu_de
        await db.delete(course)
        await db.commit()
        await AdminService.log_admin_action(db, admin_id, "Xoa khoa hoc", f"Khoa hoc: {title}")
        return {"status": "success", "message": "Da xoa khoa hoc thanh cong."}

    @staticmethod
    async def get_coupons(db: AsyncSession, skip: int = 0, limit: int = 100) -> list[Coupon]:
        result = await db.execute(select(Coupon).order_by(Coupon.id.desc()).offset(skip).limit(limit))
        return list(result.scalars().all())

    @staticmethod
    async def update_coupon(db: AsyncSession, coupon_id: int, request: CouponUpdate) -> Coupon:
        coupon = await AdminService._get_coupon_or_404(db, coupon_id)
        for field in [
            "loai_giam_gia",
            "gia_tri_giam",
            "gia_tri_don_toi_thieu",
            "so_luot_dung_toi_da",
            "ngay_het_han",
        ]:
            value = getattr(request, field, None)
            if value is not None:
                setattr(coupon, field, value)

        db.add(coupon)
        await db.commit()
        await db.refresh(coupon)
        return coupon

    @staticmethod
    async def delete_coupon(db: AsyncSession, coupon_id: int) -> dict[str, str]:
        coupon = await AdminService._get_coupon_or_404(db, coupon_id)
        await db.delete(coupon)
        await db.commit()
        return {"status": "success", "message": "Da xoa ma giam gia thanh cong."}

    @staticmethod
    async def get_reviews(db: AsyncSession, skip: int = 0, limit: int = 100) -> list[CourseReview]:
        result = await db.execute(
            select(CourseReview)
            .options(selectinload(CourseReview.nguoi_dung), selectinload(CourseReview.khoa_hoc))
            .order_by(CourseReview.id.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all())

    @staticmethod
    async def delete_review(db: AsyncSession, review_id: int) -> dict[str, str]:
        result = await db.execute(select(CourseReview).where(CourseReview.id == review_id))
        review = result.scalars().first()
        if not review:
            raise HTTPException(status_code=404, detail="Khong tim thay danh gia.")

        course_id = review.ma_khoa_hoc
        await db.delete(review)
        await db.flush()

        average_res = await db.execute(
            select(func.avg(CourseReview.so_sao)).where(CourseReview.ma_khoa_hoc == course_id)
        )
        course_res = await db.execute(select(Course).where(Course.id == course_id))
        course = course_res.scalars().first()
        if course:
            average = average_res.scalar()
            course.danh_gia_trung_binh = Decimal(str(round(float(average), 2))) if average else Decimal("0.00")

        await db.commit()
        return {"status": "success", "message": "Da xoa danh gia vi pham thanh cong."}

    @staticmethod
    async def get_quizzes(db: AsyncSession, skip: int = 0, limit: int = 100) -> list[Quiz]:
        result = await db.execute(
            select(Quiz).options(selectinload(Quiz.khoa_hoc)).order_by(Quiz.id.desc()).offset(skip).limit(limit)
        )
        return list(result.scalars().all())

    @staticmethod
    async def get_quiz_detail(db: AsyncSession, quiz_id: int) -> Quiz:
        result = await db.execute(
            select(Quiz)
            .options(
                selectinload(Quiz.khoa_hoc),
                selectinload(Quiz.cau_hoi).selectinload(Question.lua_chon_cau_hoi),
            )
            .where(Quiz.id == quiz_id)
        )
        quiz = result.scalars().first()
        if not quiz:
            raise HTTPException(status_code=404, detail="Khong tim thay bai kiem tra.")
        return quiz

    @staticmethod
    async def delete_quiz(db: AsyncSession, quiz_id: int) -> dict[str, str]:
        quiz = await AdminService._get_quiz_or_404(db, quiz_id)
        await db.delete(quiz)
        await db.commit()
        return {"status": "success", "message": "Da xoa bai kiem tra thanh cong."}

    @staticmethod
    async def get_enrollments(db: AsyncSession, skip: int = 0, limit: int = 100) -> list[Enrollment]:
        result = await db.execute(
            select(Enrollment)
            .options(selectinload(Enrollment.nguoi_dung), selectinload(Enrollment.khoa_hoc))
            .order_by(Enrollment.id.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all())

    @staticmethod
    async def create_enrollment(db: AsyncSession, admin_id: int, request: EnrollmentCreate) -> Enrollment:
        user_res = await db.execute(select(User).where(User.id == request.ma_nguoi_dung))
        if not user_res.scalars().first():
            raise HTTPException(status_code=404, detail="Khong tim thay nguoi dung.")

        course_res = await db.execute(select(Course).where(Course.id == request.ma_khoa_hoc))
        if not course_res.scalars().first():
            raise HTTPException(status_code=404, detail="Khong tim thay khoa hoc.")

        try:
            new_enrollment = Enrollment(
                ma_nguoi_dung=request.ma_nguoi_dung,
                ma_khoa_hoc=request.ma_khoa_hoc,
            )
            db.add(new_enrollment)
            await db.commit()
            await db.refresh(new_enrollment)

            result = await db.execute(
                select(Enrollment)
                .options(selectinload(Enrollment.nguoi_dung), selectinload(Enrollment.khoa_hoc))
                .where(Enrollment.id == new_enrollment.id)
            )

            await AdminService.log_admin_action(
                db,
                admin_id,
                "Cap quyen ghi danh",
                f"Cap quyen cho User ID {request.ma_nguoi_dung} vao khoa hoc ID {request.ma_khoa_hoc}",
            )
            return result.scalars().one()
        except IntegrityError:
            await db.rollback()
            raise HTTPException(status_code=400, detail="Hoc vien da duoc cap quyen khoa hoc nay roi.")

    @staticmethod
    async def delete_enrollment(db: AsyncSession, admin_id: int, enrollment_id: int) -> dict[str, str]:
        result = await db.execute(select(Enrollment).where(Enrollment.id == enrollment_id))
        enrollment = result.scalars().first()
        if not enrollment:
            raise HTTPException(status_code=404, detail="Khong tim thay ban ghi danh nay.")

        await db.delete(enrollment)
        await db.commit()
        await AdminService.log_admin_action(db, admin_id, "Thu hoi ghi danh", f"Thu hoi quyen ghi danh ID {enrollment_id}")
        return {"status": "success", "message": "Da thu hoi quyen truy cap khoa hoc thanh cong."}

    @staticmethod
    async def get_certificates(db: AsyncSession, skip: int = 0, limit: int = 100) -> list[Certificate]:
        result = await db.execute(
            select(Certificate)
            .options(selectinload(Certificate.nguoi_dung), selectinload(Certificate.khoa_hoc))
            .order_by(Certificate.id.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all())

    @staticmethod
    async def delete_certificate(db: AsyncSession, admin_id: int, certificate_id: int) -> dict[str, str]:
        result = await db.execute(select(Certificate).where(Certificate.id == certificate_id))
        certificate = result.scalars().first()
        if not certificate:
            raise HTTPException(status_code=404, detail="Khong tim thay chung chi.")

        await db.delete(certificate)
        await db.commit()
        await AdminService.log_admin_action(db, admin_id, "Thu hoi chung chi", f"Chung chi ID {certificate_id}")
        return {"status": "success", "message": "Da thu hoi chung chi thanh cong."}

    @staticmethod
    async def get_orders(db: AsyncSession, skip: int = 0, limit: int = 100) -> list[Order]:
        result = await db.execute(
            select(Order)
            .options(
                selectinload(Order.chi_tiet_don_hang)
                .selectinload(OrderItem.khoa_hoc)
                .selectinload(Course.giang_vien)
            )
            .order_by(Order.id.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all())

    @staticmethod
    async def approve_order_refund(db: AsyncSession, admin_id: int, order_id: int) -> Order:
        order = await OrderService.approve_refund(db, order_id)
        await AdminService.log_admin_action(db, admin_id, "Duyet hoan tien", f"Don hang: #{order_id}")
        return order

    @staticmethod
    async def reject_order_refund(db: AsyncSession, admin_id: int, order_id: int) -> Order:
        order = await OrderService.reject_refund(db, order_id)
        await AdminService.log_admin_action(db, admin_id, "Tu choi hoan tien", f"Don hang: #{order_id}")
        return order

    @staticmethod
    async def get_logs(db: AsyncSession, skip: int = 0, limit: int = 100) -> list[AdminLog]:
        result = await db.execute(
            select(AdminLog)
            .options(selectinload(AdminLog.admin))
            .order_by(AdminLog.id.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all())

    @staticmethod
    async def get_settings(db: AsyncSession) -> list[Setting]:
        result = await db.execute(select(Setting).order_by(Setting.group, Setting.key))
        return list(result.scalars().all())

    @staticmethod
    async def update_settings_bulk(db: AsyncSession, admin_id: int, request: SettingUpdateBulk) -> dict[str, str]:
        updates = 0
        for setting_update in request.settings:
            result = await db.execute(select(Setting).where(Setting.key == setting_update.key))
            db_setting = result.scalars().first()
            if db_setting:
                db_setting.value = setting_update.value
                updates += 1

        await db.commit()
        await AdminService.log_admin_action(
            db,
            admin_id,
            "Cap nhat cai dat",
            f"Cap nhat {updates} muc he thong",
        )
        return {"message": f"Da cap nhat {updates} muc cau hinh thanh cong"}

    @staticmethod
    async def _get_user_or_404(db: AsyncSession, user_id: int) -> User:
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalars().first()
        if not user:
            raise HTTPException(status_code=404, detail="Khong tim thay nguoi dung.")
        return user

    @staticmethod
    async def _get_category_or_404(db: AsyncSession, category_id: int) -> Category:
        result = await db.execute(select(Category).where(Category.id == category_id))
        category = result.scalars().first()
        if not category:
            raise HTTPException(status_code=404, detail="Khong tim thay danh muc.")
        return category

    @staticmethod
    async def _get_course_or_404(db: AsyncSession, course_id: int) -> Course:
        result = await db.execute(select(Course).where(Course.id == course_id))
        course = result.scalars().first()
        if not course:
            raise HTTPException(status_code=404, detail="Khong tim thay khoa hoc.")
        return course

    @staticmethod
    async def _get_lesson_or_404(db: AsyncSession, lesson_id: int) -> Lesson:
        result = await db.execute(
            select(Lesson).options(selectinload(Lesson.chuong_hoc)).where(Lesson.id == lesson_id)
        )
        lesson = result.scalars().first()
        if not lesson:
            raise HTTPException(status_code=404, detail="Khong tim thay bai hoc.")
        return lesson

    @staticmethod
    async def _get_lesson_detail(db: AsyncSession, lesson_id: int) -> Lesson:
        result = await db.execute(
            select(Lesson)
            .options(selectinload(Lesson.chuong_hoc), selectinload(Lesson.noi_dung))
            .where(Lesson.id == lesson_id)
        )
        return result.scalars().one()

    @staticmethod
    async def _get_coupon_or_404(db: AsyncSession, coupon_id: int) -> Coupon:
        result = await db.execute(select(Coupon).where(Coupon.id == coupon_id))
        coupon = result.scalars().first()
        if not coupon:
            raise HTTPException(status_code=404, detail="Khong tim thay ma giam gia.")
        return coupon

    @staticmethod
    async def _get_quiz_or_404(db: AsyncSession, quiz_id: int) -> Quiz:
        result = await db.execute(select(Quiz).where(Quiz.id == quiz_id))
        quiz = result.scalars().first()
        if not quiz:
            raise HTTPException(status_code=404, detail="Khong tim thay bai kiem tra.")
        return quiz
