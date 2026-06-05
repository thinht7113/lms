from fastapi import APIRouter, Depends, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_db, get_current_user
from app.schemas.user import UserRegister, UserLogin, UserResponse, TokenResponse, UserUpdate
from app.services.auth_service import AuthService
from app.core.security import create_access_token
from app.models.user import User

router = APIRouter()

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
    db: AsyncSession = Depends(get_db)
):
    # Xác thực tài khoản mật khẩu
    user = await AuthService.authenticate(db, login_data.email, login_data.mat_khau)
    # Tạo mã JWT bảo mật chứa ID người dùng
    access_token = create_access_token(subject=user.id)
    
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
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db)
):
    # form_data.username đóng vai trò là email trong hệ thống
    user = await AuthService.authenticate(db, form_data.username, form_data.password)
    access_token = create_access_token(subject=user.id)
    
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
    social_data: dict, # Trong thực tế sẽ dùng SocialLoginRequest, tạm dùng dict để dễ test mock
    db: AsyncSession = Depends(get_db)
):
    # Gọi service xử lý logic tự động tạo mới hoặc liên kết tài khoản
    user = await AuthService.social_login(db, social_data)
    
    # Tạo mã JWT bảo mật chứa ID người dùng
    access_token = create_access_token(subject=user.id)
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

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
