from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from typing import Optional

# 1. Schema dữ liệu gửi lên khi Đăng ký tài khoản (Register Request)
class UserRegister(BaseModel):
    email: EmailStr = Field(..., description="Địa chỉ email đăng ký")
    mat_khau: str = Field(..., min_length=6, description="Mật khẩu tối thiểu 6 ký tự")
    ho_ten: str = Field(..., min_length=2, description="Họ và tên của người dùng")
    vai_tro: Optional[str] = Field("student", description="Vai trò: student hoặc instructor")

# 2. Schema dữ liệu gửi lên khi Đăng nhập (Login Request)
class UserLogin(BaseModel):
    email: EmailStr = Field(..., description="Email đăng nhập")
    mat_khau: str = Field(..., description="Mật khẩu đăng nhập")

# 3. Schema Đăng nhập Mạng xã hội (Social Login Request)
class SocialLoginRequest(BaseModel):
    email: EmailStr = Field(..., description="Email từ mạng xã hội")
    ho_ten: str = Field(..., description="Tên từ mạng xã hội")
    provider: str = Field(..., description="Nền tảng: google hoặc facebook")
    provider_id: str = Field(..., description="ID định danh từ mạng xã hội")
    avatar_url: Optional[str] = Field(None, description="Ảnh đại diện")

# 4. Schema thông tin chi tiết người dùng trả về (Response) - Bảo mật, không trả về mật khẩu!
class UserResponse(BaseModel):
    id: int
    email: EmailStr
    ho_ten: str
    vai_tro: str
    ngay_tao: datetime
    avatar_url: Optional[str] = None

    class Config:
        # Cho phép Pydantic đọc dữ liệu trực tiếp từ SQLAlchemy ORM Model
        from_attributes = True

# 5. Schema trả về kèm Token sau khi đăng nhập thành công
class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
