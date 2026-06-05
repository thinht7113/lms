from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    # Cấu hình nạp biến môi trường từ file .env
    model_config = SettingsConfigDict(
        env_file=".env", 
        env_file_encoding="utf-8", 
        extra="ignore"
    )

    # 1. System Config
    APP_NAME: str = "LMS Backend API"
    APP_ENV: str = "development"
    PORT: int = 8000
    
    # 2. Security (JWT)
    SECRET_KEY: str = "YOUR_SUPER_SECRET_KEY_FOR_JWT_SIGNING_1234567890"  # Đổi trong .env thực tế
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 1 ngày
    
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/lms_database"

    MOMO_PARTNER_CODE: Optional[str] = None
    MOMO_ACCESS_KEY: Optional[str] = None
    MOMO_SECRET_KEY: Optional[str] = None
    MOMO_ENDPOINT: Optional[str] = "https://test-payment.momo.vn/v2/gateway/api/create"
    
    VNPAY_TMN_CODE: Optional[str] = None
    VNPAY_HASH_SECRET: Optional[str] = None
    VNPAY_URL: Optional[str] = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html"

    # 3. MinIO Config
    MINIO_ENDPOINT_URL: str = "http://localhost:9000"
    MINIO_ACCESS_KEY: str = "minioadmin"
    MINIO_SECRET_KEY: str = "minioadminpassword"
    MINIO_BUCKET_NAME: str = "lms-storage"
    MINIO_PUBLIC_URL: str = "http://localhost:9000"

# Khởi tạo instance duy nhất để import dùng chung toàn dự án
settings = Settings()

