from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

DEFAULT_SECRET_KEY = "YOUR_SUPER_SECRET_KEY_FOR_JWT_SIGNING_1234567890"
DEFAULT_MINIO_SECRET_KEY = "minioadminpassword"

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
    SECRET_KEY: str = DEFAULT_SECRET_KEY  # Đổi trong .env thực tế
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 1 ngày
    AUTH_COOKIE_NAME: str = "lms_session"
    AUTH_COOKIE_DOMAIN: Optional[str] = None
    ENABLE_MOCK_AUTH: bool = False
    ENABLE_MOCK_PAYMENTS: bool = False
    PAYMENT_WEBHOOK_SECRET: Optional[str] = None
    API_PUBLIC_URL: str = "http://localhost:8000"
    CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"
    
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/lms_database"
    REDIS_URL: str = "redis://localhost:6379/0"

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
    MINIO_SECRET_KEY: str = DEFAULT_MINIO_SECRET_KEY
    MINIO_BUCKET_NAME: str = "lms-storage"
    MINIO_PUBLIC_URL: str = "http://localhost:9000"

    def model_post_init(self, __context) -> None:
        if self.APP_ENV.lower() not in {"production", "prod"}:
            return

        insecure_values = []
        if self.SECRET_KEY == DEFAULT_SECRET_KEY or len(self.SECRET_KEY) < 32:
            insecure_values.append("SECRET_KEY")
        if self.MINIO_SECRET_KEY == DEFAULT_MINIO_SECRET_KEY:
            insecure_values.append("MINIO_SECRET_KEY")
        if self.ENABLE_MOCK_AUTH or self.ENABLE_MOCK_PAYMENTS:
            insecure_values.append("MOCK_FEATURES")

        if insecure_values:
            raise ValueError(
                "Production environment is using insecure defaults: "
                + ", ".join(insecure_values)
                + ". Configure safe values in .env before starting the API."
            )

# Khởi tạo instance duy nhất để import dùng chung toàn dự án
settings = Settings()
