from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from typing import AsyncGenerator
from app.core.config import settings

# 1. Khởi tạo Async Engine kết nối database bất đồng bộ (Asyncpg)
# echo=True dùng để hiển thị các câu lệnh SQL log ra terminal khi dev
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    future=True,
    pool_pre_ping=True,  # Tự kiểm tra kết nối sống trước khi truy vấn
    pool_size=20,         # Tăng pool kết nối
    max_overflow=10,      # Cho phép thêm 10 kết nối khi tải cao
    pool_recycle=1800,    # Tái tạo kết nối cũ sau 30 phút
)

# 2. Khởi tạo Factory tạo Session bất đồng bộ
async_session_maker = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False  # Giữ dữ liệu thực thể sau commit
)

# 3. Dependency Generator: Cung cấp Session DB cho mỗi request API và đóng session tự động khi xong
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_maker() as session:
        try:
            yield session
        finally:
            await session.close()
