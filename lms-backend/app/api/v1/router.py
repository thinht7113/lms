from fastapi import APIRouter
from app.api.v1.endpoints import auth, courses, cart, orders, progress, quizzes, certificates, upload, admin, instructors, banners, settings, dynamic_admin

# Khởi tạo Router V1 chính
api_router = APIRouter()

# Đăng ký tiểu router xác thực và người dùng vào tiền tố /auth
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])

# Đăng ký các router nghiệp vụ mới
api_router.include_router(banners.router, prefix="/banners", tags=["Banners & Sliders"])
api_router.include_router(instructors.router, prefix="/instructors", tags=["Instructors"])
api_router.include_router(courses.router, prefix="", tags=["Courses & Content"])
api_router.include_router(cart.router, prefix="/cart", tags=["Shopping Cart"])
api_router.include_router(orders.router, prefix="", tags=["Checkout & Payments"])
api_router.include_router(progress.router, prefix="", tags=["Learning & Progress"])
api_router.include_router(quizzes.router, prefix="", tags=["Quizzes & Grading"])
api_router.include_router(certificates.router, prefix="/certificates", tags=["Certificates & Verification"])
api_router.include_router(upload.router, prefix="/upload", tags=["File Storage"])
api_router.include_router(admin.router, prefix="/admin", tags=["Admin Dashboard"])
api_router.include_router(dynamic_admin.dynamic_router, prefix="/dynamic-admin", tags=["Dynamic Admin API"])
api_router.include_router(settings.router, prefix="/settings", tags=["System Settings"])



