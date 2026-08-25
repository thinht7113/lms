from fastapi import APIRouter, Depends, HTTPException, Response, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_db, get_current_user
from app.schemas.user import (
    SocialLoginRequest,
    TokenResponse,
    UserLogin,
    UserRegister,
    UserResponse,
    UserUpdate,
    ForgotPasswordRequest,
    ResetPasswordRequest
)
from app.services.auth_service import AuthService
from app.core.security import create_access_token,create_refresh_token
from app.core.config import settings
from app.core.security_guards import auth_cookie_secure, mock_feature_enabled
from app.core.redis import redis_client
from app.models.user import User
from fastapi import Cookie
from app.api.deps import oauth2_scheme
from app.core.redis import redis_client
import jwt
from datetime import datetime, timezone
from typing import Optional
router = APIRouter()


def set_auth_cookie(response: Response, access_token: str) -> None:
    response.set_cookie(
        key=settings.AUTH_COOKIE_NAME,
        value=access_token,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        httponly=True,
        secure=auth_cookie_secure(settings.APP_ENV),
        samesite="lax",
        path="/",
        domain=settings.AUTH_COOKIE_DOMAIN,
    )

def set_refresh_cookies(response: Response, refresh_token: str) -> None:
    response.set_cookie(
        key=settings.REFRESH_COOKIES_NAME,
        value=refresh_token,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        httponly=True,
        secure=auth_cookie_secure(settings.APP_ENV),
        samesite="lax",
        path="/api/v1/auth/refresh",
        domain=settings.AUTH_COOKIE_DOMAIN,
    )
    
# 1. API Đăng ký tài khoản mới
@router.post(
    "/register", 
    response_model=UserResponse, 
    status_code=status.HTTP_201_CREATED,
    summary="Register student or instructor account"
)
async def register(
    user_in: UserRegister, 
    db: AsyncSession = Depends(get_db)
):
    new_user = await AuthService.register(db, user_in)
    return new_user

# 2. API Đăng nhập nhận Token JWT
@router.post(
    "/login", 
    response_model=TokenResponse, 
    summary="Login to get JWT access token"
)
async def login(
    login_data: UserLogin,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    # Xác thực tài khoản mật khẩu
    user = await AuthService.authenticate(db, login_data.email, login_data.mat_khau)
    # Tạo mã JWT bảo mật chứa ID người dùng
    access_token = create_access_token(subject=user.id)
    refresh_token = create_refresh_token(subject=user.id)

    set_refresh_cookies(response, refresh_token)
    set_auth_cookie(response, access_token)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@router.post("/refresh", summary="Update Access Token")
async def refresh_token_enpoint(response: Response,db: AsyncSession = Depends(get_db),refresh_token: Optional[str] = Cookie(default=None,alias=settings.REFRESH_COOKIES_NAME),):
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Vui lòng đăng nhập lại"
        )
    try:
        # Giải mã và xác thực Token
        payload = jwt.decode(
            refresh_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        user_id: str = payload.get("sub")
        token_type: str = payload.get("type")
        if not user_id or token_type != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Lỗi không hợp lệ."
            )
        is_blacklisted = await redis_client.get(f"blacklist:{refresh_token}")
        if is_blacklisted:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Phiên đăng nhập đã bị vô hiệu hóa."
            )
        user = await AuthService.get_user_by_id(db, int(user_id))
        if not user or not user.trang_thai:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Tài khoản không tồn tại hoặc đã bị khóa."
            )
        new_access_token = create_access_token(subject=user.id)
        set_auth_cookie(response, new_access_token)
        return {
            "access_token": new_access_token,
            "token_type": "bearer"
        }
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."
        )
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Xác thực thất bại."
        )

@router.post(
    "/login/swagger",
    response_model=TokenResponse,
    include_in_schema=False,
    summary="Login exclusively for Swagger UI"
)
async def login_swagger(
    response: Response,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
):
    # form_data.username đóng vai trò là email trong hệ thống
    user = await AuthService.authenticate(db, form_data.username, form_data.password)
    access_token = create_access_token(subject=user.id)
    set_auth_cookie(response, access_token)
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

# 3. API Đăng nhập Mạng xã hội (Google / Facebook)
@router.post(
    "/social",
    response_model=TokenResponse,
    summary="Login or register using social media account (Google/Facebook)"
)
async def social_login(
    social_data: SocialLoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    if not mock_feature_enabled(settings.APP_ENV, settings.ENABLE_MOCK_AUTH):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Đăng nhập mạng xã hội thử nghiệm chưa được bật."
        )

    # Gọi service xử lý logic tự động tạo mới hoặc liên kết tài khoản
    user = await AuthService.social_login(db, social_data.model_dump())
    
    # Tạo mã JWT bảo mật chứa ID người dùng
    access_token = create_access_token(subject=user.id)
    set_auth_cookie(response, access_token)
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    response: Response,
    refresh_token: Optional[str] = Cookie(default=None, alias=settings.REFRESH_COOKIES_NAME),
):
    if refresh_token:
        await redis_client.setex(
            f"blacklist:{refresh_token}",
            settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
            "true"
        )
    response.delete_cookie(key=settings.AUTH_COOKIE_NAME, path="/")
    response.delete_cookie(key=settings.REFRESH_COOKIES_NAME, path="/api/v1/auth/refresh")



# 4. API Lấy thông tin cá nhân (Đòi hỏi đăng nhập)
@router.get(
    "/profile", 
    response_model=UserResponse, 
    summary="Get current logged-in account info"
)
async def get_profile(
    current_user: User = Depends(get_current_user)
):
    return current_user

# 5. API Sửa thông tin cá nhân (Đòi hỏi đăng nhập)
@router.put(
    "/profile", 
    response_model=UserResponse, 
    summary="Update current logged-in account info"
)
async def update_profile(
    update_in: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    updated_user = await AuthService.update_profile(db, current_user, update_in)
    return updated_user

@router.post(
    "/forgot-password",
    summary="Request password recovery code via Email"
)
async def forgot_password(
    request: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db)
):
    await AuthService.forgot_password(db, request.email)
    return {"message": "Nếu email hợp lệ, hệ thống đã gửi một mã khôi phục tới email của bạn."}

@router.post(
    "/reset-password",
    summary="Reset password using recovery code"
)
async def reset_password(
    request: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db)
):
    await AuthService.reset_password(db, request.token, request.mat_khau_moi)
    return {"message": "Mật khẩu đã được khôi phục thành công. Vui lòng đăng nhập lại."}
