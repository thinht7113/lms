# CẤU TRÚC DỰ ÁN LUMINALMS

## 1. Cấu Trúc Thư Mục Cấp Gốc

```text
D:\BT\LMS
├── lms-backend
├── lms-frontend
├── BAO_CAO_CAU_TRUC_DU_AN.md
├── README.md
├── .gitignore
└── pyrefly.toml
```

`lms-backend` chứa mã nguồn server FastAPI, cơ chế xác thực, nghiệp vụ, model cơ sở dữ liệu, schema, service, migration Alembic, cấu hình Docker, Redis và MinIO.

`lms-frontend` chứa mã nguồn giao diện Next.js, route theo App Router, component dùng chung, middleware kiểm soát quyền và service gọi API backend.

## 2. Cấu Trúc Backend

```text
lms-backend
├── alembic
│   ├── env.py
│   └── versions
├── app
│   ├── api
│   │   ├── deps.py
│   │   └── v1
│   │       ├── router.py
│   │       ├── dynamic_crud.py
│   │       └── endpoints
│   ├── assets
│   │   └── fonts
│   ├── core
│   ├── models
│   ├── schemas
│   ├── services
│   └── main.py
├── scripts
├── scratch
├── Dockerfile
├── docker-compose.yml
├── alembic.ini
├── requirements.txt
├── .env
└── .env.example
```

## 3. Backend app/main.py

File `lms-backend/app/main.py` là điểm khởi tạo ứng dụng FastAPI.

Code đang sử dụng:

```python
app = FastAPI(
    title="LMS API Documentation",
    description=api_description,
    version="1.0.0",
    openapi_tags=tags_metadata,
    docs_url=None if is_production else "/docs",
    redoc_url=None if is_production else "/redoc",
    swagger_ui_parameters={
        "filter": True,
        "operationsSorter": "alpha"
    },
    lifespan=lifespan
)
```

Đăng ký CORS:

```python
origins = [origin.strip() for origin in settings.CORS_ORIGINS.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

Đăng ký GZip và router chính:

```python
from starlette.middleware.gzip import GZipMiddleware
app.add_middleware(GZipMiddleware, minimum_size=500)

app.include_router(api_router, prefix="/api/v1")
```

Health check:

```python
@app.get("/", tags=["Health Check"])
async def root():
    return {
        "status": "healthy",
        "message": "Chào mừng đến với API Hệ thống Khóa học Trực tuyến",
        "version": "1.0.0"
    }
```

## 4. Backend app/core

```text
core
├── config.py
├── database.py
├── redis.py
├── security.py
└── security_guards.py
```

### 4.1. app/core/database.py

File `database.py` tạo engine bất đồng bộ cho PostgreSQL và session dùng trong API.

Code đang sử dụng:

```python
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    future=True,
    pool_pre_ping=True,
    pool_size=20,
    max_overflow=10,
    pool_recycle=1800,
)
```

Session factory:

```python
async_session_maker = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False
)
```

Dependency cấp session:

```python
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_maker() as session:
        try:
            yield session
        finally:
            await session.close()
```

Các tham số thật trong file:

`settings.DATABASE_URL` là chuỗi kết nối PostgreSQL.

`pool_pre_ping=True` kiểm tra kết nối trước khi truy vấn.

`pool_size=20` giữ tối đa 20 kết nối chính trong pool.

`max_overflow=10` cho phép mở thêm 10 kết nối tạm thời khi tải tăng.

`pool_recycle=1800` tái tạo kết nối sau 1800 giây.

`expire_on_commit=False` giữ dữ liệu ORM object sau khi commit.

### 4.2. app/core/redis.py

File `redis.py` tạo Redis client dùng cho cache và blacklist token.

Trong `app/api/deps.py`, Redis được gọi trực tiếp để kiểm tra token đã logout:

```python
from app.core.redis import redis_client
if await redis_client.get(f"blacklist:{auth_token}"):
    raise credentials_exception
```

### 4.3. app/core/security.py

File `security.py` chứa các hàm bảo mật phục vụ đăng nhập và xác thực JWT:

```text
verify_password
get_password_hash
create_access_token
```

## 5. Backend app/api

```text
api
├── deps.py
└── v1
    ├── router.py
    ├── dynamic_crud.py
    └── endpoints
```

### 5.1. app/api/deps.py

File `deps.py` chứa dependency dùng chung cho các endpoint.

Dependency lấy token từ header:

```python
oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/api/v1/auth/login/swagger",
    auto_error=False,
)
```

Dependency lấy user hiện tại:

```python
async def get_current_user(
    db: AsyncSession = Depends(get_db),
    token: Optional[str] = Depends(oauth2_scheme),
    session_token: Optional[str] = Cookie(default=None, alias=settings.AUTH_COOKIE_NAME),
) -> User:
```

Đoạn giải mã JWT thật:

```python
payload = jwt.decode(
    auth_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
)
user_id: str = payload.get("sub")
```

Truy vấn user từ cơ sở dữ liệu:

```python
result = await db.execute(select(User).where(User.id == int(user_id)))
user = result.scalars().first()
if user is None or not user.trang_thai_hoat_dong:
    raise credentials_exception
```

Dependency kiểm tra admin:

```python
async def get_current_admin_user(
    current_user: User = Depends(get_current_user)
) -> User:
    if current_user.vai_tro != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền truy cập vào chức năng quản trị.",
        )
    return current_user
```

### 5.2. app/api/v1/router.py

File `router.py` gom toàn bộ router nghiệp vụ.

Code đang sử dụng:

```python
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
```

### 5.3. app/api/v1/dynamic_crud.py

File `dynamic_crud.py` chứa hàm tạo router CRUD động.

Chữ ký hàm thật:

```python
def create_crud_router(
    model: Type[Any],
    response_schema: Type[BaseModel],
    create_schema: Type[BaseModel],
    update_schema: Type[BaseModel],
    prefix: str,
    tags: Sequence[str | Enum] | None = None,
    search_columns: Optional[List[str]] = None,
    options: Optional[List[Any]] = None
) -> APIRouter:
    router = APIRouter(prefix=prefix, tags=list(tags) if tags is not None else None)
```

Ý nghĩa tham số đang dùng:

`model` là SQLAlchemy model được CRUD.

`response_schema` là Pydantic schema trả về.

`create_schema` là Pydantic schema khi tạo bản ghi.

`update_schema` là Pydantic schema khi cập nhật bản ghi.

`prefix` là đường dẫn API.

`tags` là nhóm hiển thị trên OpenAPI.

`search_columns` là danh sách cột được tìm kiếm.

`options` là danh sách cấu hình bổ sung cho router động.

## 6. Backend endpoints

```text
endpoints
├── admin.py
├── auth.py
├── banners.py
├── cart.py
├── certificates.py
├── courses.py
├── dynamic_admin.py
├── instructor_studio.py
├── instructors.py
├── notifications.py
├── orders.py
├── progress.py
├── quizzes.py
├── settings.py
└── upload.py
```

`auth.py` xử lý đăng ký, đăng nhập, đăng xuất, hồ sơ, đổi mật khẩu và quên mật khẩu.

`courses.py` xử lý danh mục, khóa học, chương học, bài học, nội dung bài học và đánh giá.

`cart.py` xử lý giỏ hàng.

`orders.py` xử lý coupon, checkout, đơn hàng, thanh toán và hoàn tiền.

`progress.py` xử lý khóa học của tôi, quyền mở bài học và tiến độ học tập.

`quizzes.py` xử lý quiz, câu hỏi, lựa chọn, lượt làm bài và chấm điểm.

`certificates.py` xử lý chứng chỉ, xuất PDF và xác thực chứng chỉ.

`banners.py` xử lý banner trang chủ.

`instructors.py` xử lý danh sách và chi tiết giảng viên.

`instructor_studio.py` xử lý dashboard giảng viên, doanh thu, học viên và rút tiền.

`notifications.py` xử lý thông báo.

`settings.py` xử lý cấu hình công khai.

`upload.py` xử lý upload ảnh, PDF và video.

`admin.py` xử lý dashboard admin và nghiệp vụ quản trị.

`dynamic_admin.py` xử lý CRUD động cho admin.

## 7. Backend app/schemas

```text
schemas
├── admin.py
├── banner.py
├── certificate.py
├── course.py
├── log.py
├── order.py
├── quiz.py
├── setting.py
├── user.py
└── __init__.py
```

### 7.1. app/schemas/admin.py

File `admin.py` trong schemas đang chứa schema cho dashboard admin và quản trị người dùng.

Code thật:

```python
class ChartDataPoint(BaseModel):
    name: str
    revenue: float
    students: int


class PendingCourse(BaseModel):
    id: int
    tieu_de: str
    giang_vien: str


class PendingRefund(BaseModel):
    id: int
    nguoi_yeu_cau: str
    so_tien: float
    ngay_yeu_cau: datetime
```

Schema thống kê admin:

```python
class SystemStats(BaseModel):
    total_users: int
    total_students: int
    total_instructors: int
    total_courses: int
    total_orders: int
    total_revenue: float
    instructor_revenue: float
    platform_revenue: float
    revenue_this_month: float
    completion_rate: float
    chart_data: List[ChartDataPoint]
    pending_courses: List[PendingCourse]
    pending_refunds: List[PendingRefund]
    top_courses: List[TopCourse]
    recent_activities: List[RecentActivity]
```

Schema user admin:

```python
class UserResponse(BaseModel):
    id: int
    ho_ten: str
    email: str
    vai_tro: str
    trang_thai_hoat_dong: bool
    ngay_tao: datetime

    model_config = ConfigDict(from_attributes=True)
```

Endpoint admin import schema thật từ `app.schemas.admin`:

```python
from app.schemas.admin import (
    ChartDataPoint,
    PendingCourse,
    PendingRefund,
    RecentActivity,
    RoleUpdateRequest,
    StatusUpdateRequest,
    SystemStats,
    TopCourse,
    UserResponse,
)
```

### 7.2. Các file schema khác

`user.py` chứa schema đăng ký, đăng nhập, user response và cập nhật hồ sơ.

`course.py` chứa schema danh mục, khóa học, chương học, bài học, nội dung bài học, ghi danh và đánh giá.

`order.py` chứa schema giỏ hàng, coupon, đơn hàng, checkout, thanh toán và hoàn tiền.

`quiz.py` chứa schema quiz, câu hỏi, lựa chọn, lượt làm bài và kết quả.

`certificate.py` chứa schema chứng chỉ.

`banner.py` chứa schema banner.

`setting.py` chứa schema cấu hình hệ thống.

`log.py` chứa schema nhật ký admin.

## 8. Backend app/models

```text
models
├── base.py
├── banner.py
├── cart.py
├── certificate.py
├── course.py
├── log.py
├── notification.py
├── order.py
├── payout.py
├── quiz.py
├── setting.py
├── user.py
└── __init__.py
```

### 8.1. app/models/course.py

Các bảng thật trong file:

```text
danh_muc
khoa_hoc
chuong_hoc
bai_hoc
noi_dung_bai_hoc
dang_ky_hoc
tien_do_hoc_tap
danh_gia_khoa_hoc
```

Model `Course`:

```python
class Course(Base):
    __tablename__ = "khoa_hoc"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    ma_giang_vien: Mapped[Optional[int]] = mapped_column(ForeignKey("nguoi_dung.id", ondelete="SET NULL"), nullable=True, index=True)
    ma_danh_muc: Mapped[Optional[int]] = mapped_column(ForeignKey("danh_muc.id", ondelete="SET NULL"), nullable=True, index=True)
    tieu_de: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    mo_ta: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    gia_tien: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0.00, nullable=False, index=True)
    trinh_do: Mapped[str] = mapped_column(String(50), default="beginner", nullable=False, index=True)
    anh_dai_dien: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    da_xuat_ban: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    trang_thai_phe_duyet: Mapped[str] = mapped_column(String(50), default="draft", nullable=False, index=True)
    danh_gia_trung_binh: Mapped[Decimal] = mapped_column(Numeric(3, 2), default=0.00, nullable=False, index=True)
    ngay_tao: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False, index=True)
```

Quan hệ của `Course`:

```python
giang_vien = relationship("User", back_populates="khoa_hoc")
danh_muc = relationship("Category", back_populates="khoa_hoc")
chuong_hoc = relationship("Section", back_populates="khoa_hoc", cascade="all, delete-orphan", order_by="Section.thu_tu")
dang_ky_hoc = relationship("Enrollment", back_populates="khoa_hoc", cascade="all, delete-orphan")
chi_tiet_gio_hang = relationship("CartItem", back_populates="khoa_hoc", cascade="all, delete-orphan")
chi_tiet_don_hang = relationship("OrderItem", back_populates="khoa_hoc")
bai_kiem_tra = relationship("Quiz", back_populates="khoa_hoc", cascade="all, delete-orphan")
chung_chi = relationship("Certificate", back_populates="khoa_hoc", cascade="all, delete-orphan")
danh_gia_khoa_hoc = relationship("CourseReview", back_populates="khoa_hoc", cascade="all, delete-orphan")
```

Model `LessonContent`:

```python
class LessonContent(Base):
    __tablename__ = "noi_dung_bai_hoc"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    ma_bai_hoc: Mapped[int] = mapped_column(ForeignKey("bai_hoc.id", ondelete="CASCADE"), nullable=False, index=True)
    loai_noi_dung: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    noi_dung_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    duong_dan_file: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    thu_tu: Mapped[int] = mapped_column(default=0, nullable=False, index=True)

    __table_args__ = (
        CheckConstraint(loai_noi_dung.in_(["video", "pdf", "text", "code", "image"]), name="cc_lesson_content_type"),
    )
```

Model `Progress`:

```python
class Progress(Base):
    __tablename__ = "tien_do_hoc_tap"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    ma_dang_ky_hoc: Mapped[int] = mapped_column(ForeignKey("dang_ky_hoc.id", ondelete="CASCADE"), nullable=False, index=True)
    ma_bai_hoc: Mapped[int] = mapped_column(ForeignKey("bai_hoc.id", ondelete="CASCADE"), nullable=False, index=True)
    da_hoan_thanh: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    ngay_hoan_thanh: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    video_resume_seconds: Mapped[int] = mapped_column(default=0, nullable=False)
```

Ràng buộc tiến độ:

```python
__table_args__ = (
    UniqueConstraint("ma_dang_ky_hoc", "ma_bai_hoc", name="uq_progress_enrollment_lesson"),
    Index("ix_progress_enrollment_completed", "ma_dang_ky_hoc", "da_hoan_thanh"),
)
```

### 8.2. app/models/order.py

Các bảng thật trong file:

```text
ma_giam_gia
don_hang
chi_tiet_don_hang
```

Model `Coupon`:

```python
class Coupon(Base):
    __tablename__ = "ma_giam_gia"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    ma_code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    loai_giam_gia: Mapped[str] = mapped_column(String(20), default="PERCENTAGE", nullable=False)
    gia_tri_giam: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0.00, nullable=False)
    gia_tri_don_toi_thieu: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0.00, nullable=False)
    so_luot_dung_toi_da: Mapped[Optional[int]] = mapped_column(nullable=True)
    so_luot_da_dung: Mapped[int] = mapped_column(default=0, nullable=False)
    ngay_het_han: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True, index=True)
```

Model `Order`:

```python
class Order(Base):
    __tablename__ = "don_hang"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    ma_nguoi_dung: Mapped[Optional[int]] = mapped_column(ForeignKey("nguoi_dung.id", ondelete="SET NULL"), nullable=True, index=True)
    ma_giam_gia_id: Mapped[Optional[int]] = mapped_column(ForeignKey("ma_giam_gia.id", ondelete="SET NULL"), nullable=True, index=True)
    tong_tien: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    trang_thai: Mapped[str] = mapped_column(String(50), default="pending", nullable=False, index=True)
    ngay_tao: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False, index=True)
    phuong_thuc_thanh_toan: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, index=True)
    ma_giao_dich: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, index=True)
    ngay_thanh_toan: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True, index=True)
```

### 8.3. app/models/quiz.py

Các bảng thật trong file:

```text
bai_kiem_tra
cau_hoi
lua_chon_cau_hoi
lich_su_lam_bai
chi_tiet_bai_lam
```

Model `Quiz`:

```python
class Quiz(Base):
    __tablename__ = "bai_kiem_tra"
    __allow_unmapped__ = True

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    ma_khoa_hoc: Mapped[int] = mapped_column(ForeignKey("khoa_hoc.id", ondelete="CASCADE"), nullable=False)
    tieu_de: Mapped[str] = mapped_column(String(255), nullable=False)
    diem_dat: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    thoi_gian_lam_bai: Mapped[Optional[int]] = mapped_column(nullable=True)
    so_luot_lam_toi_da: Mapped[int] = mapped_column(default=3, nullable=False)
    ngay_tao: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
```

Trường runtime phục vụ response:

```python
attempts_count: int = 0
highest_score: Optional[Decimal] = None
passed: bool = False
```

Model `QuizAttempt`:

```python
class QuizAttempt(Base):
    __tablename__ = "lich_su_lam_bai"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    ma_nguoi_dung: Mapped[int] = mapped_column(ForeignKey("nguoi_dung.id", ondelete="CASCADE"), nullable=False)
    ma_bai_kiem_tra: Mapped[int] = mapped_column(ForeignKey("bai_kiem_tra.id", ondelete="CASCADE"), nullable=False)
    diem_dat_duoc: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 2), nullable=True)
    da_qua_mon: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    ngay_bat_dau: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    ngay_lam_bai: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    trang_thai: Mapped[str] = mapped_column(String(50), default="started", nullable=False)
```

## 9. Backend app/services

```text
services
├── admin_service.py
├── auth_service.py
├── cert_service.py
├── certificate_pdf.py
├── course_service.py
├── order_service.py
├── quiz_service.py
└── storage_service.py
```

`admin_service.py` xử lý thống kê quản trị, quản lý người dùng, duyệt khóa học, duyệt bài học, coupon, ghi danh, chứng chỉ, đơn hàng, log và cấu hình hệ thống.

`auth_service.py` xử lý đăng ký, đăng nhập, hồ sơ và mật khẩu.

`course_service.py` xử lý khóa học, chương, bài học, nội dung, đăng ký học và đánh giá.

`order_service.py` xử lý giỏ hàng, coupon, checkout, đơn hàng, thanh toán và hoàn tiền.

`quiz_service.py` xử lý quiz, câu hỏi, lượt làm bài, đáp án và điểm.

`cert_service.py` xử lý cấp chứng chỉ và xác thực chứng chỉ.

`certificate_pdf.py` tạo file PDF chứng chỉ.

`storage_service.py` xử lý lưu trữ file trên MinIO.

## 10. Backend alembic

```text
alembic
├── env.py
└── versions
```

`alembic.ini` là file cấu hình Alembic.

`alembic/env.py` là file runtime để Alembic đọc metadata từ model.

`alembic/versions` là thư mục chứa các file migration.

Các lệnh Alembic đang phù hợp với cấu trúc này:

```bash
alembic revision --autogenerate -m "message"
alembic upgrade head
```

## 11. Cấu Trúc Frontend

```text
lms-frontend
├── public
├── src
│   ├── app
│   ├── components
│   ├── contexts
│   ├── hooks
│   ├── services
│   └── utils
├── middleware.ts
├── next.config.ts
├── package.json
├── tsconfig.json
└── eslint.config.mjs
```

## 12. Frontend src/app

```text
src/app
├── page.tsx
├── layout.tsx
├── globals.css
├── about
├── admin
├── become-instructor
├── cart
├── certificates
├── checkout
├── courses
├── forgot-password
├── instructor
├── instructors
├── learn
├── login
├── my-courses
├── notifications
├── orders
├── payment-result
├── profile
├── quiz
├── settings
├── terms
└── verify-certificate
```

Route thật theo thư mục:

`/` dùng `src/app/page.tsx`.

`/about` dùng `src/app/about`.

`/courses` dùng `src/app/courses`.

`/cart` dùng `src/app/cart`.

`/checkout` dùng `src/app/checkout`.

`/my-courses` dùng `src/app/my-courses`.

`/learn/[courseId]` dùng `src/app/learn`.

`/quiz/[quizId]` dùng `src/app/quiz`.

`/certificates` dùng `src/app/certificates`.

`/instructor/*` dùng `src/app/instructor`.

`/admin/*` dùng `src/app/admin`.

`/settings` dùng `src/app/settings`.

`/notifications` dùng `src/app/notifications`.

## 13. Frontend src/components

```text
components
├── admin
│   ├── DynamicForm.tsx
│   └── DynamicTable.tsx
├── ui
│   └── Breadcrumbs.tsx
├── AuthModal.tsx
├── CKEditorWrapper.tsx
├── CourseCard.tsx
├── Footer.tsx
├── Navbar.tsx
├── PdfViewer.tsx
└── SystemLogo.tsx
```

`Navbar.tsx` là thanh điều hướng.

`Footer.tsx` là chân trang.

`CourseCard.tsx` là thẻ khóa học.

`AuthModal.tsx` là modal xác thực.

`CKEditorWrapper.tsx` là trình soạn thảo nội dung.

`PdfViewer.tsx` là component hiển thị PDF.

`SystemLogo.tsx` là component logo hệ thống.

`DynamicForm.tsx` là form động trong admin.

`DynamicTable.tsx` là bảng động trong admin.

`Breadcrumbs.tsx` là breadcrumb.

## 14. Frontend src/services/api.ts

File `api.ts` khai báo base URL, hàm fetch, helper phiên đăng nhập và interface TypeScript.

Code thật:

```typescript
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
const PUBLIC_FETCH_TIMEOUT_MS = 8000;
const publicCache = new Map<string, { expiresAt: number; data: unknown }>();
```

Fetch có timeout:

```typescript
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = PUBLIC_FETCH_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: options.signal || controller.signal,
    });
  } finally {
    globalThis.clearTimeout(timeout);
  }
}
```

Fetch public có cache:

```typescript
async function getCachedJson<T>(url: string, ttlMs = 30_000): Promise<T> {
  const now = Date.now();
  const cached = publicCache.get(url);
  if (cached && cached.expiresAt > now) {
    return cached.data as T;
  }

  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}`);
  const data = await res.json();
  publicCache.set(url, { data, expiresAt: now + ttlMs });
  return data as T;
}
```

Fetch gửi cookie xác thực:

```typescript
export async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = new Headers(options.headers || {});

  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: "include",
  });

  if (response.status === 401) {
    tokenHelper.removeCurrentUser();
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  }

  return response;
}
```

Interface khóa học:

```typescript
export interface Course {
  id: number;
  ma_giang_vien?: number;
  ma_danh_muc?: number;
  tieu_de: string;
  mo_ta?: string;
  gia_tien: number;
  trinh_do: string;
  anh_dai_dien?: string;
  da_xuat_ban: boolean;
  trang_thai_phe_duyet: string;
  danh_gia_trung_binh: number;
  ngay_tao: string;
  so_luong_hoc_vien: number;
}
```

Payload nội dung bài học:

```typescript
export interface LessonContentPayload {
  ma_bai_hoc?: number;
  loai_noi_dung: "video" | "pdf" | "text" | "code" | "image";
  noi_dung_text?: string;
  duong_dan_file?: string;
  thu_tu: number;
}
```

## 15. Frontend middleware.ts

File `middleware.ts` kiểm tra quyền trước khi render route được bảo vệ.

Code thật:

```typescript
const AUTH_COOKIE_NAME = "lms_session";
const ROLE_COOKIE_NAME = "lumina_role";

const AUTH_REQUIRED_ROUTES = [
  "/cart",
  "/checkout",
  "/orders",
  "/payment-result",
  "/my-courses",
  "/certificates",
  "/wishlist",
  "/profile",
  "/settings",
  "/notifications",
];
```

Chặn route admin:

```typescript
if (isRoutePrefix(pathname, "/admin")) {
  if (!hasSession) {
    return rewriteToNotFound(request);
  }

  if (role !== "admin") {
    return rewriteToNotFound(request);
  }

  return NextResponse.next();
}
```

Chặn route instructor:

```typescript
if (isRoutePrefix(pathname, "/instructor")) {
  if (!hasSession) {
    return redirectToLogin(request);
  }

  if (role !== "instructor" && role !== "admin") {
    return NextResponse.redirect(new URL("/become-instructor", request.url));
  }

  return NextResponse.next();
}
```

Cấu hình matcher:

```typescript
export const config = {
  matcher: [
    "/admin/:path*",
    "/instructor/:path*",
    "/cart",
    "/checkout",
    "/orders",
    "/payment-result",
    "/my-courses",
    "/certificates",
    "/wishlist",
    "/profile",
    "/settings",
    "/notifications",
    "/learn/:path*",
    "/quiz/:path*",
  ],
};
```

## 16. Luồng Xử Lý Theo Code Thật

### 16.1. Đăng nhập

```text
src/app/login
-> src/services/api.ts
-> POST http://localhost:8000/api/v1/auth/login
-> app/api/v1/endpoints/auth.py
-> app/schemas/user.py
-> app/services/auth_service.py
-> app/core/security.py
-> app/models/user.py
-> PostgreSQL
```

### 16.2. Truy cập API cần đăng nhập

```text
Request từ frontend
-> fetchWithAuth(..., credentials: "include")
-> Cookie lms_session gửi về backend
-> app/api/deps.py đọc cookie
-> jwt.decode(...)
-> select(User).where(User.id == int(user_id))
-> endpoint nhận current_user
```

### 16.3. Truy cập trang admin

```text
/admin
-> lms-frontend/middleware.ts
-> kiểm tra cookie lms_session
-> kiểm tra cookie lumina_role
-> role khác admin thì rewrite /_not-found với status 404
-> role admin thì NextResponse.next()
```

### 16.4. Khóa học và nội dung bài học

```text
src/app/courses
-> src/services/api.ts
-> app/api/v1/endpoints/courses.py
-> app/schemas/course.py
-> app/services/course_service.py
-> app/models/course.py
-> bảng khoa_hoc, chuong_hoc, bai_hoc, noi_dung_bai_hoc
```

### 16.5. Giỏ hàng và thanh toán

```text
src/app/cart
-> src/services/api.ts
-> app/api/v1/endpoints/cart.py
-> app/services/order_service.py
-> app/models/cart.py
-> app/models/order.py
-> bảng chi_tiet_gio_hang, don_hang, chi_tiet_don_hang, ma_giam_gia
```

### 16.6. Học bài và tiến độ

```text
src/app/learn
-> src/services/api.ts
-> app/api/v1/endpoints/progress.py
-> app/models/course.py
-> bảng dang_ky_hoc, tien_do_hoc_tap, bai_hoc, noi_dung_bai_hoc
```

### 16.7. Quiz và chứng chỉ

```text
src/app/quiz
-> src/services/api.ts
-> app/api/v1/endpoints/quizzes.py
-> app/services/quiz_service.py
-> app/models/quiz.py
-> bảng bai_kiem_tra, cau_hoi, lua_chon_cau_hoi, lich_su_lam_bai, chi_tiet_bai_lam
```

```text
src/app/certificates
-> src/services/api.ts
-> app/api/v1/endpoints/certificates.py
-> app/services/cert_service.py
-> app/services/certificate_pdf.py
-> app/models/certificate.py
```

## 17. Vai Trò Của Các Tầng Trong Mã Nguồn Hiện Tại

`api/endpoints` nhận request HTTP, gắn dependency, gọi schema, gọi service hoặc truy vấn cần thiết.

`schemas` định nghĩa dữ liệu request và response bằng Pydantic.

`services` chứa logic nghiệp vụ chính.

`models` ánh xạ bảng cơ sở dữ liệu bằng SQLAlchemy ORM.

`core` chứa cấu hình, database, Redis, bảo mật và guard hệ thống.

`middleware.ts` của frontend kiểm soát quyền truy cập route trước khi render trang.

`services/api.ts` của frontend là lớp gọi API tập trung từ giao diện sang backend.
