from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from app.schemas.course import CourseResponse
from app.schemas.user import UserResponse

# ==================== PROGRESS SCHEMAS ====================
class ProgressUpdate(BaseModel):
    is_completed: bool = Field(True, alias="da_hoan_thanh", description="Đánh dấu bài học đã hoàn thành")
    video_resume_seconds: Optional[int] = Field(0, description="Vị trí phát video hiện tại (giây)")

    class Config:
        populate_by_name = True

class ProgressResponse(BaseModel):
    id: int
    ma_dang_ky_hoc: int
    ma_bai_hoc: int
    da_hoan_thanh: bool
    ngay_hoan_thanh: Optional[datetime]

    class Config:
        from_attributes = True

class CourseProgressResponse(BaseModel):
    course_id: int
    total_lessons: int
    completed_lessons: int
    progress_percentage: float

# ==================== CERTIFICATE SCHEMAS ====================
class CertificateResponse(BaseModel):
    id: int
    ma_nguoi_dung: int
    ma_khoa_hoc: int
    uuid: Optional[str] = None
    duong_dan_chung_chi: str
    ngay_cap: datetime
    khoa_hoc: Optional[CourseResponse] = None
    nguoi_dung: Optional[UserResponse] = None

    class Config:
        from_attributes = True

class CertificateVerifyResponse(BaseModel):
    valid: bool
    certificate: Optional[CertificateResponse] = None
    message: str
