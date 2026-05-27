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

# 3. Schema thông tin chi tiết người dùng trả về (Response) - Bảo mật, không trả về mật khẩu!
class UserResponse(BaseModel):
    id: int
    email: EmailStr
    ho_ten: str
    vai_tro: str
    ngay_tao: datetime

    class Config:
        # Cho phép Pydantic đọc dữ liệu trực tiếp từ SQLAlchemy ORM Model
        from_attributes = True

# 4. Schema trả về kèm Token sau khi đăng nhập thành công
class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
