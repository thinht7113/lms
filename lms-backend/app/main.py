import logging
import traceback
import time

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import uvicorn
from app.api.v1.router import api_router
from app.core.database import engine
from app.core.config import settings
from app.core.logging_config import setup_logging
from app.models.base import Base

setup_logging()
logger = logging.getLogger(__name__)

import app.models  


@asynccontextmanager
async def lifespan(app: FastAPI):
    if settings.APP_ENV.lower() in {"development", "test"}:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    logger.info(
        "LMS Backend started | env=%s | port=%s",
        settings.APP_ENV,
        settings.PORT,
    )
    yield
    await engine.dispose()
    logger.info("LMS Backend shutdown complete")


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

is_production = settings.APP_ENV.lower() in {"production", "prod"}

# Khởi tạo ứng dụng FastAPI
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

@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    logger.info(f"Process Time: {process_time:.4f}s | {request.method} {request.url.path}")
    return response

# Global exception handler — bắt tất cả lỗi không xử lý
@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.error(
        "Unhandled exception on %s %s: %s\n%s",
        request.method,
        request.url.path,
        exc,
        traceback.format_exc(),
    )
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.",
            "error_code": "INTERNAL_SERVER_ERROR",
        },
    )


# Cấu hình Middleware CORS (cho phép Frontend kết nối)
origins = [origin.strip() for origin in settings.CORS_ORIGINS.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Nén Gzip response (giảm 60-80% kích thước JSON payload)
from starlette.middleware.gzip import GZipMiddleware
app.add_middleware(GZipMiddleware, minimum_size=500)

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
