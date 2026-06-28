from fastapi import APIRouter

from app.api.v1.endpoints import (
    admin,
    auth,
    banners,
    cart,
    certificates,
    course_imports,
    courses,
    dynamic_admin,
    instructor_studio,
    instructors,
    notifications,
    orders,
    progress,
    quizzes,
    settings,
    upload,
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["Notifications"])

api_router.include_router(banners.router, prefix="/banners", tags=["Banners & Sliders"])
api_router.include_router(instructors.router, prefix="/instructors", tags=["Instructors"])
api_router.include_router(courses.router, prefix="", tags=["Courses & Content"])

api_router.include_router(cart.router, prefix="/cart", tags=["Shopping Cart"])
api_router.include_router(orders.router, prefix="", tags=["Checkout & Payments"])

api_router.include_router(progress.router, prefix="", tags=["Learning & Progress"])
api_router.include_router(quizzes.router, prefix="", tags=["Quizzes & Grading"])
api_router.include_router(certificates.router, prefix="/certificates", tags=["Certificates & Verification"])

api_router.include_router(instructor_studio.router, prefix="/instructor-studio", tags=["Instructor Studio Dashboard"])

api_router.include_router(admin.router, prefix="/admin", tags=["Admin Dashboard"])
api_router.include_router(dynamic_admin.dynamic_router, prefix="/dynamic-admin", tags=["Dynamic Admin API"])
api_router.include_router(settings.router, prefix="/settings", tags=["System Settings"])

api_router.include_router(upload.router, prefix="/upload", tags=["File Storage"])
api_router.include_router(course_imports.router, prefix="/admin/course-imports", tags=["Admin Course Imports"])
