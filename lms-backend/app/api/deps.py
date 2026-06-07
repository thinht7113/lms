from fastapi import Cookie, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import jwt
from typing import AsyncGenerator, Optional
from app.core.config import settings
from app.core.database import async_session_maker
from app.models.user import User

# Thư viện bảo mật lấy Token từ HTTP Header Authorization: Bearer <token>
oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/api/v1/auth/login/swagger",
    auto_error=False,
)

# 1. Dependency lấy Database Session bất đồng bộ
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_maker() as session:
        try:
            yield session
        finally:
            await session.close()

# 2. Dependency lấy thông tin Người dùng hiện tại từ JWT Token (Dùng để bảo mật API)
async def get_current_user(
    db: AsyncSession = Depends(get_db),
    token: Optional[str] = Depends(oauth2_scheme),
    session_token: Optional[str] = Cookie(default=None, alias=settings.AUTH_COOKIE_NAME),
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Không thể xác thực danh tính. Vui lòng đăng nhập lại.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    auth_token = token or session_token
    if not auth_token:
        raise credentials_exception

    try:
        # Giải mã mã JWT Token bằng Secret Key
        payload = jwt.decode(
            auth_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except (jwt.PyJWTError, TypeError, ValueError):
        raise credentials_exception

    # Truy vấn dữ liệu người dùng từ ID lấy trong token
    result = await db.execute(select(User).where(User.id == int(user_id)))
    user = result.scalars().first()
    if user is None or not user.trang_thai_hoat_dong:
        raise credentials_exception
        
    return user

# 3. Dependency lấy thông tin Người dùng tùy chọn (Cho phép truy cập công khai nhưng nhận biết User nếu có)
async def get_current_user_optional(
    db: AsyncSession = Depends(get_db),
    token: Optional[str] = Depends(oauth2_scheme),
    session_token: Optional[str] = Cookie(default=None, alias=settings.AUTH_COOKIE_NAME),
) -> Optional[User]:
    auth_token = token or session_token
    if not auth_token:
        return None
    try:
        payload = jwt.decode(
            auth_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        user_id: str = payload.get("sub")
        if user_id is None:
            return None
        result = await db.execute(select(User).where(User.id == int(user_id)))
        user = result.scalars().first()
        if user is None or not user.trang_thai_hoat_dong:
            return None
        return user
    except (jwt.PyJWTError, TypeError, ValueError):
        return None

# 4. Dependency lấy thông tin Admin
async def get_current_admin_user(
    current_user: User = Depends(get_current_user)
) -> User:
    if current_user.vai_tro != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền truy cập vào chức năng quản trị.",
        )
    return current_user
