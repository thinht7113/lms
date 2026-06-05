from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from typing import Optional, List, TYPE_CHECKING

if TYPE_CHECKING:
    pass

# 1. Schema dữ liệu gửi lên khi Đăng ký tài khoản (Register Request)
class UserRegister(BaseModel):
    email: EmailStr = Field(..., description="Địa chỉ email đăng ký")
    mat_khau: str = Field(..., min_length=6, description="Mật khẩu tối thiểu 6 ký tự")
    ho_ten: str = Field(..., min_length=2, description="Họ và tên của người dùng")
    so_dien_thoai: Optional[str] = Field(None, description="Số điện thoại")
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

# 4. Schema Cập nhật thông tin cá nhân (Update Request)
class UserUpdate(BaseModel):
    ho_ten: Optional[str] = Field(None, min_length=2, description="Họ và tên mới")
    so_dien_thoai: Optional[str] = Field(None, description="Số điện thoại")
    avatar_url: Optional[str] = Field(None, description="URL ảnh đại diện mới")
    mat_khau_cu: Optional[str] = Field(None, description="Mật khẩu cũ (để xác nhận đổi mật khẩu)")
    mat_khau_moi: Optional[str] = Field(None, min_length=6, description="Mật khẩu mới")

# 5. Schema thông tin chi tiết người dùng trả về (Response) - Bảo mật, không trả về mật khẩu!
class UserResponse(BaseModel):
    id: int
    email: EmailStr
    ho_ten: str
    vai_tro: str
    ngay_tao: datetime
    so_dien_thoai: Optional[str] = None
    avatar_url: Optional[str] = None

    class Config:
        # Cho phép Pydantic đọc dữ liệu trực tiếp từ SQLAlchemy ORM Model
        from_attributes = True

# 5. Schema trả về kèm Token sau khi đăng nhập thành công
class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# 6. Schema dành riêng cho danh sách Giảng viên công khai
class InstructorResponse(BaseModel):
    id: int
    ho_ten: str
    avatar_url: Optional[str] = None
    so_luong_khoa_hoc: int = Field(0, description="Tổng số khóa học đang dạy")
    so_luong_hoc_vien: int = Field(0, description="Tổng số học viên")

    class Config:
        from_attributes = True

# 7. Schema chi tiết Giảng viên kèm danh sách khóa học
class InstructorDetailResponse(InstructorResponse):
    khoa_hoc: List = Field(default_factory=list, description="Danh sách khóa học của giảng viên")

