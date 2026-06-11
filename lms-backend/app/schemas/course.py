from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import Optional, List
from decimal import Decimal
from datetime import datetime
from urllib.parse import urlparse

ALLOWED_LESSON_CONTENT_TYPES = {"video", "pdf", "text", "code", "image"}


def validate_lesson_file_url(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    normalized = value.strip()
    if not normalized:
        return None
    parsed = urlparse(normalized)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise ValueError("Link file phải là URL http/https hợp lệ.")
    return normalized


def validate_lesson_content_type(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    normalized = value.strip().lower()
    if normalized not in ALLOWED_LESSON_CONTENT_TYPES:
        raise ValueError("Loại nội dung chỉ được là video, pdf, text, code hoặc image.")
    return normalized

# ==================== CATEGORY SCHEMAS ====================
class CategoryCreate(BaseModel):
    ten_danh_muc: str = Field(..., min_length=2, description="Tên danh mục")
    mo_ta: Optional[str] = Field(None, description="Mô tả danh mục")

class CategoryUpdate(BaseModel):
    ten_danh_muc: Optional[str] = Field(None, min_length=2, description="Tên danh mục")
    mo_ta: Optional[str] = Field(None, description="Mô tả danh mục")

class CategoryResponse(BaseModel):
    id: int
    ten_danh_muc: str
    mo_ta: Optional[str]

    model_config = ConfigDict(from_attributes=True)


# ==================== LESSON CONTENT SCHEMAS ====================
class LessonContentCreate(BaseModel):
    ma_bai_hoc: Optional[int] = Field(None, description="ID Bài học")
    loai_noi_dung: str = Field(..., description="Loại: video, pdf, text, code, image")
    noi_dung_text: Optional[str] = Field(None, description="Mã HTML/Markdown dài")
    duong_dan_file: Optional[str] = Field(None, description="Link file nếu có")
    thu_tu: int = Field(0, description="Thứ tự hiển thị block")

    _validate_type = field_validator("loai_noi_dung")(validate_lesson_content_type)
    _validate_url = field_validator("duong_dan_file")(validate_lesson_file_url)

class LessonContentUpdate(BaseModel):
    ma_bai_hoc: Optional[int] = None
    loai_noi_dung: Optional[str] = None
    noi_dung_text: Optional[str] = None
    duong_dan_file: Optional[str] = None
    thu_tu: Optional[int] = None

    _validate_type = field_validator("loai_noi_dung")(validate_lesson_content_type)
    _validate_url = field_validator("duong_dan_file")(validate_lesson_file_url)

class LessonContentResponse(BaseModel):
    id: int
    ma_bai_hoc: int
    loai_noi_dung: str
    noi_dung_text: Optional[str]
    duong_dan_file: Optional[str]
    thu_tu: int

    model_config = ConfigDict(from_attributes=True)


# ==================== LESSON SCHEMAS ====================
class LessonCreate(BaseModel):
    ma_chuong_hoc: Optional[int] = Field(None, description="ID Chương học")
    tieu_de: str = Field(..., min_length=2, description="Tiêu đề bài học")
    noi_dung: List[LessonContentCreate] = Field(default_factory=list, description="Danh sách các block nội dung")
    thoi_luong: int = Field(0, ge=0, description="Thời lượng bài học tính bằng giây")
    thu_tu: int = Field(0, description="Thứ tự hiển thị bài học")
    xem_truoc: bool = Field(False, description="Cho phép xem thử trước khi mua")
    da_xuat_ban: Optional[bool] = Field(False, description="Đánh dấu xuất bản bài học")

class LessonUpdate(BaseModel):
    ma_chuong_hoc: Optional[int] = None
    tieu_de: Optional[str] = None
    thoi_luong: Optional[int] = None
    thu_tu: Optional[int] = None
    xem_truoc: Optional[bool] = None
    da_xuat_ban: Optional[bool] = None
    trang_thai_phe_duyet: Optional[str] = None

class LessonResponse(BaseModel):
    id: int
    ma_chuong_hoc: Optional[int]
    tieu_de: str
    noi_dung: List[LessonContentResponse] = []
    thoi_luong: int
    thu_tu: int
    xem_truoc: bool
    da_xuat_ban: bool
    trang_thai_phe_duyet: str


    model_config = ConfigDict(from_attributes=True)

class LessonAdminResponse(BaseModel):
    id: int
    ma_chuong_hoc: Optional[int]
    tieu_de: str
    thoi_luong: int
    thu_tu: int
    xem_truoc: bool
    da_xuat_ban: bool
    trang_thai_phe_duyet: str

    model_config = ConfigDict(from_attributes=True)


# ==================== SECTION SCHEMAS ====================
class SectionCreate(BaseModel):
    ma_khoa_hoc: int = Field(..., description="ID Khóa học")
    tieu_de: str = Field(..., min_length=2, description="Tiêu đề chương học")
    thu_tu: int = Field(0, description="Thứ tự hiển thị")

class SectionUpdate(BaseModel):
    ma_khoa_hoc: Optional[int] = None
    tieu_de: Optional[str] = None
    thu_tu: Optional[int] = None

class SectionResponse(BaseModel):
    id: int
    ma_khoa_hoc: int
    tieu_de: str
    thu_tu: int
    bai_hoc: List[LessonResponse] = []

    model_config = ConfigDict(from_attributes=True)

class SectionAdminResponse(BaseModel):
    id: int
    ma_khoa_hoc: int
    tieu_de: str
    thu_tu: int

    model_config = ConfigDict(from_attributes=True)


# ==================== COURSE SCHEMAS ====================
class CourseCreate(BaseModel):
    tieu_de: str = Field(..., min_length=2, description="Tiêu đề khóa học")
    gia_tien: Decimal = Field(Decimal("0.00"), description="Giá khóa học")
    mo_ta: Optional[str] = Field(None, description="Mô tả khóa học")
    ma_danh_muc: Optional[int] = Field(None, description="ID Danh mục")
    trinh_do: str = Field("beginner", description="Trình độ: beginner, intermediate, advanced")
    anh_dai_dien: Optional[str] = Field(None, description="Ảnh thu nhỏ khóa học")

    model_config = ConfigDict(from_attributes=True)

class CourseUpdate(BaseModel):
    tieu_de: Optional[str] = None
    gia_tien: Optional[Decimal] = None
    mo_ta: Optional[str] = None
    ma_danh_muc: Optional[int] = None
    trinh_do: Optional[str] = None
    anh_dai_dien: Optional[str] = None
    da_xuat_ban: Optional[bool] = None
    trang_thai_phe_duyet: Optional[str] = None

class UserMinimalResponse(BaseModel):
    id: int
    ho_ten: str

    model_config = ConfigDict(from_attributes=True)

class CourseResponse(BaseModel):
    id: int
    ma_giang_vien: Optional[int]
    giang_vien: Optional[UserMinimalResponse] = None
    ma_danh_muc: Optional[int]
    tieu_de: str
    mo_ta: Optional[str]
    gia_tien: Decimal
    trinh_do: str
    anh_dai_dien: Optional[str] = None
    da_xuat_ban: bool
    trang_thai_phe_duyet: str
    danh_gia_trung_binh: Decimal
    ngay_tao: datetime
    so_luong_hoc_vien: int = Field(0, description="Số lượng học viên")

    model_config = ConfigDict(from_attributes=True)

class ReviewCreate(BaseModel):
    so_sao: int = Field(..., ge=1, le=5, description="Số sao đánh giá (1-5)")
    binh_luan: Optional[str] = Field(None, max_length=1000, description="Bình luận/Nhận xét (Tối đa 1000 ký tự)")

class CourseMinimalResponse(BaseModel):
    id: int
    tieu_de: str

    model_config = ConfigDict(from_attributes=True)

class ReviewResponse(BaseModel):
    id: int
    ma_nguoi_dung: int
    ma_khoa_hoc: int
    so_sao: int
    binh_luan: Optional[str]
    ngay_tao: datetime
    nguoi_dung: Optional[UserMinimalResponse] = None
    khoa_hoc: Optional[CourseMinimalResponse] = None

    model_config = ConfigDict(from_attributes=True)

class CourseDetailResponse(CourseResponse):
    chuong_hoc: List[SectionResponse] = []
    danh_gia_khoa_hoc: List[ReviewResponse] = []

class WishlistResponse(BaseModel):
    id: int
    ma_nguoi_dung: int
    ma_khoa_hoc: int
    ngay_them: datetime
    khoa_hoc: CourseResponse

    model_config = ConfigDict(from_attributes=True)


# ==================== ENROLLMENT SCHEMAS ====================
class EnrollmentCreate(BaseModel):
    ma_nguoi_dung: int = Field(..., description="ID Học viên")
    ma_khoa_hoc: int = Field(..., description="ID Khóa học")

class EnrollmentResponse(BaseModel):
    id: int
    ma_nguoi_dung: int
    ma_khoa_hoc: int
    ngay_dang_ky: datetime
    nguoi_dung: Optional[UserMinimalResponse] = None
    khoa_hoc: Optional[CourseMinimalResponse] = None

    model_config = ConfigDict(from_attributes=True)

# ==================== CERTIFICATE SCHEMAS ====================
class CertificateResponse(BaseModel):
    id: int
    ma_nguoi_dung: int
    ma_khoa_hoc: int
    uuid: Optional[str]
    duong_dan_chung_chi: str
    ngay_cap: datetime
    nguoi_dung: Optional[UserMinimalResponse] = None
    khoa_hoc: Optional[CourseMinimalResponse] = None

    model_config = ConfigDict(from_attributes=True)
