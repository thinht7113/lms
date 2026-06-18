from fastapi import APIRouter
from sqlalchemy.orm import selectinload
from app.api.v1.dynamic_crud import create_crud_router
from app.models.user import User
from app.schemas.user import UserResponse, UserRegister as UserCreate, UserUpdate, AdminUserUpdate
from app.models.course import Category, Course, Section, Lesson, LessonContent
from app.models.banner import Banner
from app.schemas.banner import BannerCreate, BannerResponse, BannerUpdate
from app.schemas.course import (
    CategoryCreate,
    CategoryResponse,
    CategoryUpdate,
    CertificateResponse as CourseCertificateResponse,
    CourseCreate,
    CourseResponse,
    CourseUpdate,
    LessonAdminResponse,
    LessonContentCreate,
    LessonContentResponse,
    LessonContentUpdate,
    LessonCreate,
    LessonResponse,
    LessonUpdate,
    SectionAdminResponse,
    SectionCreate,
    SectionResponse,
    SectionUpdate,
)
CertificateResponse = CourseCertificateResponse
CertificateCreate = CourseCertificateResponse
CertificateUpdate = CourseCertificateResponse
from app.models.order import Order, Coupon
from app.schemas.order import (
    CheckoutRequest as OrderCreate,
    CheckoutRequest as OrderUpdate,
    CouponCreate,
    CouponResponse,
    CouponUpdate,
    OrderAdminResponse,
    OrderResponse,
)
from app.models.quiz import Quiz, Question
from app.models.certificate import Certificate
from app.schemas.quiz import QuizCreate, QuizResponse, QuizUpdate, QuestionCreate, QuestionResponse, QuestionUpdate
from app.models.setting import Setting
from app.models.log import AdminLog
from app.schemas.setting import SettingResponse, SettingCreate, SettingUpdate
from app.schemas.log import AdminLogResponse

# Create a simplified Order schema for Admin CRUD just to satisfy the router generator
from pydantic import BaseModel
class AdminGenericCreate(BaseModel):
    pass
class AdminGenericUpdate(BaseModel):
    pass

dynamic_router = APIRouter()

# 1. Users
dynamic_router.include_router(
    create_crud_router(model=User, response_schema=UserResponse, create_schema=UserCreate, update_schema=AdminUserUpdate, prefix="/users", tags=["Dynamic Admin - Users"], search_columns=["email", "ho_ten", "so_dien_thoai"])
)

# 2. Categories
dynamic_router.include_router(
    create_crud_router(model=Category, response_schema=CategoryResponse, create_schema=CategoryCreate, update_schema=CategoryUpdate, prefix="/categories", tags=["Dynamic Admin - Categories"], search_columns=["ten_danh_muc", "mo_ta"])
)

# 3. Courses
dynamic_router.include_router(
    create_crud_router(
        model=Course,
        response_schema=CourseResponse,
        create_schema=CourseCreate,
        update_schema=CourseUpdate,
        prefix="/courses",
        tags=["Dynamic Admin - Courses"],
        search_columns=["tieu_de"],
        options=[selectinload(Course.dang_ky_hoc), selectinload(Course.giang_vien)]
    )
)

# 4. Orders
dynamic_router.include_router(
    create_crud_router(
        model=Order,
        response_schema=OrderAdminResponse,
        create_schema=AdminGenericCreate,
        update_schema=AdminGenericUpdate,
        prefix="/orders",
        tags=["Dynamic Admin - Orders"],
        search_columns=["ma_giao_dich", "trang_thai"],
        options=[selectinload(Order.ma_giam_gia)]
    )
)

# 5. Coupons
dynamic_router.include_router(
    create_crud_router(model=Coupon, response_schema=CouponResponse, create_schema=CouponCreate, update_schema=CouponUpdate, prefix="/coupons", tags=["Dynamic Admin - Coupons"], search_columns=["ma_code"])
)

# 6. Sections
dynamic_router.include_router(
    create_crud_router(model=Section, response_schema=SectionAdminResponse, create_schema=SectionCreate, update_schema=SectionUpdate, prefix="/sections", tags=["Dynamic Admin - Sections"], search_columns=["tieu_de"])
)

# 7. Lessons
dynamic_router.include_router(
    create_crud_router(model=Lesson, response_schema=LessonAdminResponse, create_schema=LessonCreate, update_schema=LessonUpdate, prefix="/lessons", tags=["Dynamic Admin - Lessons"], search_columns=["tieu_de"])
)

# 7.1 Lesson Contents
dynamic_router.include_router(
    create_crud_router(model=LessonContent, response_schema=LessonContentResponse, create_schema=LessonContentCreate, update_schema=LessonContentUpdate, prefix="/lesson-contents", tags=["Dynamic Admin - Lesson Contents"], search_columns=["loai_noi_dung"])
)

# 8. Banners
dynamic_router.include_router(
    create_crud_router(model=Banner, response_schema=BannerResponse, create_schema=BannerCreate, update_schema=BannerUpdate, prefix="/banners", tags=["Dynamic Admin - Banners"], search_columns=["tieu_de"])
)

# 9. Settings
dynamic_router.include_router(
    create_crud_router(model=Setting, response_schema=SettingResponse, create_schema=SettingCreate, update_schema=SettingUpdate, prefix="/settings", tags=["Dynamic Admin - Settings"], search_columns=["key", "group"])
)

# 10. Admin Logs
dynamic_router.include_router(
    create_crud_router(model=AdminLog, response_schema=AdminLogResponse, create_schema=AdminGenericCreate, update_schema=AdminGenericUpdate, prefix="/logs", tags=["Dynamic Admin - Logs"], search_columns=["hanh_dong", "chi_tiet"])
)
