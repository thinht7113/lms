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
from app.core.security import create_access_token
from app.core.config import settings
from app.core.security_guards import auth_cookie_secure, mock_feature_enabled
from app.models.user import User

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
    )


# 1. API Đăng ký tài khoản mới
@router.post(
    "/register", 
    response_model=UserResponse, 
    status_code=status.HTTP_201_CREATED,
    summary="Đăng ký tài khoản học viên hoặc giảng viên"
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
    summary="Đăng nhập nhận Token JWT truy cập hệ thống"
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
    set_auth_cookie(response, access_token)
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

# 2b. API Đăng nhập dành riêng cho Swagger UI (Form Data để tương thích nút Authorize)
@router.post(
    "/login/swagger",
    response_model=TokenResponse,
    include_in_schema=False,
    summary="Đăng nhập dành riêng cho Swagger UI"
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
    summary="Đăng nhập hoặc đăng ký bằng tài khoản mạng xã hội (Google/Facebook)"
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
async def logout(response: Response):
    response.delete_cookie(
        key=settings.AUTH_COOKIE_NAME,
        path="/",
        secure=auth_cookie_secure(settings.APP_ENV),
        httponly=True,
        samesite="lax",
    )


# 4. API Lấy thông tin cá nhân (Đòi hỏi đăng nhập)
@router.get(
    "/profile", 
    response_model=UserResponse, 
    summary="Lấy thông tin tài khoản đang đăng nhập"
)
async def get_profile(
    current_user: User = Depends(get_current_user)
):
    return current_user

# 5. API Sửa thông tin cá nhân (Đòi hỏi đăng nhập)
@router.put(
    "/profile", 
    response_model=UserResponse, 
    summary="Cập nhật thông tin tài khoản đang đăng nhập"
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
    summary="Yêu cầu gửi mã khôi phục mật khẩu qua Email"
)
async def forgot_password(
    request: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db)
):
    await AuthService.forgot_password(db, request.email)
    return {"message": "Nếu email hợp lệ, hệ thống đã gửi một mã khôi phục tới email của bạn."}

@router.post(
    "/reset-password",
    summary="Đặt lại mật khẩu mới bằng mã khôi phục"
)
async def reset_password(
    request: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db)
):
    await AuthService.reset_password(db, request.token, request.mat_khau_moi)
    return {"message": "Mật khẩu đã được khôi phục thành công. Vui lòng đăng nhập lại."}

