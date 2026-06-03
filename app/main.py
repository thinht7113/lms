from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import uvicorn
from app.api.v1.router import api_router
from app.core.database import engine
from app.models.base import Base

# Import toàn bộ models để Base.metadata biết tất cả bảng cần tạo
import app.models  # noqa: F401


# Startup & Shutdown lifespan handler
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Tự động tạo bảng trong DB nếu chưa tồn tại
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    # Shutdown: Đóng kết nối engine
    await engine.dispose()


# Cấu hình Metadata các phân hệ API dành cho tài liệu OpenAPI/Swagger
tags_metadata = [
    {
        "name": "Health Check",
        "description": "Kiểm tra trạng thái hoạt động của hệ thống.",
    },
    {
        "name": "Authentication",
        "description": "Quản lý tài khoản, đăng nhập và phân quyền người dùng.",
    },
    {
        "name": "Courses & Content",
        "description": "Quản lý danh mục, khóa học, chương học và bài học.",
    },
    {
        "name": "Shopping Cart",
        "description": "Quản lý giỏ hàng trực tuyến của học viên.",
    },
    {
        "name": "Checkout & Payments",
        "description": "Tạo đơn hàng, áp dụng mã coupon giảm giá và thanh toán.",
    },
    {
        "name": "Learning & Progress",
        "description": "Theo dõi tiến trình học tập của học viên.",
    },
    {
        "name": "Quizzes & Grading",
        "description": "Thiết lập đề thi trắc nghiệm, làm bài và chấm điểm tự động.",
    },
    {
        "name": "Certificates & Verification",
        "description": "Cấp phát và kiểm tra tính hợp lệ của chứng chỉ số hoàn thành khóa học.",
    },
]

api_description = "Hệ thống API backend cho ứng dụng học trực tuyến LMS (Learning Management System)."

# Khởi tạo ứng dụng FastAPI
app = FastAPI(
    title="LMS API Documentation",
    description=api_description,
    version="1.0.0", 
    openapi_tags=tags_metadata,
    docs_url="/docs",
    redoc_url="/redoc",
    swagger_ui_parameters={
        "filter": True,
        "operationsSorter": "alpha"
    },
    lifespan=lifespan
)

# Cấu hình Middleware CORS (cho phép Frontend kết nối)
origins = [
    "http://localhost:3000",      # React/Next.js mặc định
    "http://localhost:5173",      # Vite mặc định
    "*"                           # Cho phép tất cả trong môi trường phát triển
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Đăng ký V1 API Router hệ thống
app.include_router(api_router, prefix="/api/v1")

# Route kiểm tra sức khỏe hệ thống (Health Check)
@app.get("/", tags=["Health Check"])
async def root():
    return {
        "status": "healthy",
        "message": "Chào mừng đến với API Hệ thống Khóa học Trực tuyến",
        "version": "1.0.0"
    }

if __name__ == "__main__":
    # Chạy cục bộ bằng Uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
