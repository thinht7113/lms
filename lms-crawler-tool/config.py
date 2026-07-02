import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/lms_db"
    
    MINIO_ENDPOINT: str = "localhost:9000"
    MINIO_ACCESS_KEY: str = "minioadmin"
    MINIO_SECRET_KEY: str = "minioadmin"
    MINIO_BUCKET_NAME: str = "lms-storage"
    MINIO_USE_SSL: bool = False
    MINIO_PUBLIC_URL_PREFIX: str = "http://localhost:9000/lms-storage"
    
    CRAWLER_DEFAULT_HEADLESS: bool = True
    CRAWLER_HOCTAPGIARE_STORAGE_STATE_PATH: str = "./storage_states/hoctapgiare.json"
    CRAWLER_HOCTAPGIARE_EMAIL: str | None = None
    CRAWLER_HOCTAPGIARE_PASSWORD: str | None = None
    CRAWLER_COURSE_TIMEOUT_SECONDS: int = 420
    CRAWLER_JOB_TIMEOUT_SECONDS: int = 1800


    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

settings = Settings()
