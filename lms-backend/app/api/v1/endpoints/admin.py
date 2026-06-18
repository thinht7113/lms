from typing import List, Optional

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_admin_user, get_db
from app.models.user import User
from app.schemas.admin import (
    RoleUpdateRequest,
    StatusUpdateRequest,
    SystemStats,
    UserResponse,
)
from app.schemas.course import (
    CategoryResponse,
    CategoryUpdate,
    CertificateResponse,
    CourseResponse,
    EnrollmentCreate,
    EnrollmentResponse,
    LessonResponse,
    ReviewResponse,
)
from app.schemas.log import AdminLogResponse
from app.schemas.order import CouponResponse, CouponUpdate, OrderResponse
from app.schemas.quiz import AdminQuizDetailResponse, QuizResponse
from app.schemas.setting import SettingResponse, SettingUpdateBulk
from app.services.admin_service import AdminService

router = APIRouter()


@router.get("/stats", response_model=SystemStats)
async def get_system_stats(
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
):
    return await AdminService.get_system_stats(db)


@router.get("/users", response_model=List[UserResponse])
async def get_all_users(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    role: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
):
    return await AdminService.get_users(db, skip=skip, limit=limit, search=search, role=role)


@router.put("/users/{user_id}/role", response_model=UserResponse)
async def update_user_role(
    user_id: int,
    request: RoleUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
):
    return await AdminService.update_user_role(db, current_admin.id, user_id, request.vai_tro)


@router.put("/users/{user_id}/status", response_model=UserResponse)
async def update_user_status(
    user_id: int,
    request: StatusUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
):
    return await AdminService.update_user_status(
        db,
        current_admin.id,
        user_id,
        request.trang_thai_hoat_dong,
    )


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
):
    return await AdminService.delete_user(db, current_admin.id, user_id)


@router.post("/users/{user_id}/reset-password")
async def reset_user_password(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
):
    return await AdminService.reset_user_password(db, current_admin.id, user_id)


@router.put("/categories/{category_id}", response_model=CategoryResponse)
async def update_category(
    category_id: int,
    request: CategoryUpdate,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
):
    return await AdminService.update_category(db, category_id, request)


@router.delete("/categories/{category_id}")
async def delete_category(
    category_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
):
    return await AdminService.delete_category(db, category_id)


@router.put("/courses/{course_id}/approve", response_model=CourseResponse)
async def approve_course(
    course_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
):
    return await AdminService.approve_course(db, current_admin.id, course_id)


@router.put("/courses/{course_id}/reject", response_model=CourseResponse)
async def reject_course(
    course_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
):
    return await AdminService.reject_course(db, current_admin.id, course_id)


@router.get("/lessons/pending")
async def get_pending_lessons(
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
):
    return await AdminService.get_pending_lessons(db)


@router.put("/lessons/{lesson_id}/approve", response_model=LessonResponse)
async def approve_lesson(
    lesson_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
):
    return await AdminService.approve_lesson(db, current_admin.id, lesson_id)


@router.put("/lessons/{lesson_id}/reject", response_model=LessonResponse)
async def reject_lesson(
    lesson_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
):
    return await AdminService.reject_lesson(db, current_admin.id, lesson_id)


@router.get("/courses", response_model=List[CourseResponse])
async def get_all_courses_admin(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
):
    return await AdminService.get_courses(db, skip=skip, limit=limit)


@router.delete("/courses/{course_id}")
async def delete_course_admin(
    course_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
):
    return await AdminService.delete_course(db, current_admin.id, course_id)


@router.get("/coupons", response_model=List[CouponResponse])
async def get_all_coupons_admin(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
):
    return await AdminService.get_coupons(db, skip=skip, limit=limit)


@router.put("/coupons/{coupon_id}", response_model=CouponResponse)
async def update_coupon_admin(
    coupon_id: int,
    request: CouponUpdate,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
):
    return await AdminService.update_coupon(db, coupon_id, request)


@router.delete("/coupons/{coupon_id}")
async def delete_coupon_admin(
    coupon_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
):
    return await AdminService.delete_coupon(db, coupon_id)


@router.get("/reviews", response_model=List[ReviewResponse])
async def get_all_reviews_admin(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
):
    return await AdminService.get_reviews(db, skip=skip, limit=limit)


@router.delete("/reviews/{review_id}")
async def delete_review_admin(
    review_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
):
    return await AdminService.delete_review(db, review_id)


@router.get("/quizzes", response_model=List[QuizResponse])
async def get_all_quizzes_admin(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
):
    return await AdminService.get_quizzes(db, skip=skip, limit=limit)


@router.get("/quizzes/{quiz_id}", response_model=AdminQuizDetailResponse)
async def get_quiz_detail_admin(
    quiz_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
):
    return await AdminService.get_quiz_detail(db, quiz_id)


@router.delete("/quizzes/{quiz_id}")
async def delete_quiz_admin(
    quiz_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
):
    return await AdminService.delete_quiz(db, quiz_id)


@router.get("/enrollments", response_model=List[EnrollmentResponse])
async def get_all_enrollments_admin(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
):
    return await AdminService.get_enrollments(db, skip=skip, limit=limit)


@router.post("/enrollments", response_model=EnrollmentResponse)
async def create_enrollment_admin(
    request: EnrollmentCreate,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
):
    return await AdminService.create_enrollment(db, current_admin.id, request)


@router.delete("/enrollments/{enrollment_id}")
async def delete_enrollment_admin(
    enrollment_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
):
    return await AdminService.delete_enrollment(db, current_admin.id, enrollment_id)


@router.get("/certificates", response_model=List[CertificateResponse])
async def get_all_certificates_admin(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
):
    return await AdminService.get_certificates(db, skip=skip, limit=limit)


@router.delete("/certificates/{certificate_id}")
async def delete_certificate_admin(
    certificate_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
):
    return await AdminService.delete_certificate(db, current_admin.id, certificate_id)


@router.get("/orders", response_model=List[OrderResponse])
async def get_all_orders(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
):
    return await AdminService.get_orders(db, skip=skip, limit=limit)


@router.post(
    "/orders/{order_id}/approve-refund",
    response_model=OrderResponse,
    summary="Admin approves course refund request",
)
async def approve_order_refund(
    order_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
):
    return await AdminService.approve_order_refund(db, current_admin.id, order_id)


@router.post(
    "/orders/{order_id}/reject-refund",
    response_model=OrderResponse,
    summary="Admin rejects course refund request",
)
async def reject_order_refund(
    order_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
):
    return await AdminService.reject_order_refund(db, current_admin.id, order_id)


@router.get("/logs", response_model=List[AdminLogResponse])
async def get_admin_logs(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
):
    return await AdminService.get_logs(db, skip=skip, limit=limit)


@router.get("/settings", response_model=List[SettingResponse])
async def get_all_settings(
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
):
    return await AdminService.get_settings(db)


@router.put("/settings")
async def update_settings_bulk(
    request: SettingUpdateBulk,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
):
    return await AdminService.update_settings_bulk(db, current_admin.id, request)
