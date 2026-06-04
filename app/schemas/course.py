from pydantic import BaseModel, Field
from typing import Optional, List
from decimal import Decimal
from datetime import datetime

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

    class Config:
        from_attributes = True


# ==================== LESSON CONTENT SCHEMAS ====================
class LessonContentCreate(BaseModel):
    loai_noi_dung: str = Field(..., description="Loại: video, pdf, text, code, image")
    noi_dung_text: Optional[str] = Field(None, description="Mã HTML/Markdown dài")
    duong_dan_file: Optional[str] = Field(None, description="Link file nếu có")
    thu_tu: int = Field(0, description="Thứ tự hiển thị block")

class LessonContentUpdate(BaseModel):
    loai_noi_dung: Optional[str] = None
    noi_dung_text: Optional[str] = None
    duong_dan_file: Optional[str] = None
    thu_tu: Optional[int] = None

class LessonContentResponse(BaseModel):
    id: int
    ma_bai_hoc: int
    loai_noi_dung: str
    noi_dung_text: Optional[str]
    duong_dan_file: Optional[str]
    thu_tu: int

    class Config:
        from_attributes = True


# ==================== LESSON SCHEMAS ====================
class LessonCreate(BaseModel):
    tieu_de: str = Field(..., min_length=2, description="Tiêu đề bài học")
    noi_dung: List[LessonContentCreate] = Field(default_factory=list, description="Danh sách các block nội dung")
    thoi_luong: int = Field(0, ge=0, description="Thời lượng bài học tính bằng giây")
    thu_tu: int = Field(0, description="Thứ tự hiển thị bài học")
    xem_truoc: bool = Field(False, description="Cho phép xem thử trước khi mua")
    da_xuat_ban: Optional[bool] = Field(False, description="Đánh dấu xuất bản bài học")

class LessonUpdate(BaseModel):
    tieu_de: Optional[str] = None
    thoi_luong: Optional[int] = None
    thu_tu: Optional[int] = None
    xem_truoc: Optional[bool] = None
    da_xuat_ban: Optional[bool] = None

class LessonResponse(BaseModel):
    id: int
    ma_khoa_hoc: int
    ma_chuong_hoc: Optional[int]
    tieu_de: str
    noi_dung: List[LessonContentResponse] = []
    thoi_luong: int
    thu_tu: int
    xem_truoc: bool
    da_xuat_ban: bool


    class Config:
        from_attributes = True


# ==================== SECTION SCHEMAS ====================
class SectionCreate(BaseModel):
    tieu_de: str = Field(..., min_length=2, description="Tiêu đề chương học")
    sort_order: int = Field(0, alias="thu_tu", description="Thứ tự hiển thị")

    class Config:
        populate_by_name = True

class SectionResponse(BaseModel):
    id: int
    ma_khoa_hoc: int
    tieu_de: str
    thu_tu: int
    bai_hoc: List[LessonResponse] = []

    class Config:
        from_attributes = True


# ==================== COURSE SCHEMAS ====================
class CourseCreate(BaseModel):
    title: str = Field(..., min_length=2, alias="tieu_de", description="Tiêu đề khóa học")
    price: Decimal = Field(Decimal("0.00"), alias="gia_tien", description="Giá khóa học")
    description: Optional[str] = Field(None, alias="mo_ta", description="Mô tả khóa học")
    category_id: Optional[int] = Field(None, alias="ma_danh_muc", description="ID Danh mục")
    level: str = Field("beginner", alias="trinh_do", description="Trình độ: beginner, intermediate, advanced")
    thumbnail: Optional[str] = Field(None, description="Ảnh thu nhỏ khóa học")

    class Config:
        populate_by_name = True

class CourseUpdate(BaseModel):
    tieu_de: Optional[str] = None
    gia_tien: Optional[Decimal] = None
    mo_ta: Optional[str] = None
    ma_danh_muc: Optional[int] = None
    trinh_do: Optional[str] = None
    da_xuat_ban: Optional[bool] = None

class CourseResponse(BaseModel):
    id: int
    ma_giang_vien: Optional[int]
    ma_danh_muc: Optional[int]
    tieu_de: str
    mo_ta: Optional[str]
    gia_tien: Decimal
    trinh_do: str
    da_xuat_ban: bool
    danh_gia_trung_binh: Decimal
    ngay_tao: datetime

    class Config:
        from_attributes = True

# ==================== COURSE REVIEW SCHEMAS ====================
class UserMinimalResponse(BaseModel):
    id: int
    ho_ten: str

    class Config:
        from_attributes = True

class ReviewCreate(BaseModel):
    so_sao: int = Field(..., ge=1, le=5, description="Số sao đánh giá (1-5)")
    binh_luan: Optional[str] = Field(None, max_length=1000, description="Bình luận/Nhận xét (Tối đa 1000 ký tự)")

class CourseMinimalResponse(BaseModel):
    id: int
    tieu_de: str

    class Config:
        from_attributes = True

class ReviewResponse(BaseModel):
    id: int
    ma_nguoi_dung: int
    ma_khoa_hoc: int
    so_sao: int
    binh_luan: Optional[str]
    ngay_tao: datetime
    nguoi_dung: Optional[UserMinimalResponse] = None
    khoa_hoc: Optional[CourseMinimalResponse] = None

    class Config:
        from_attributes = True

class CourseDetailResponse(CourseResponse):
    chuong_hoc: List[SectionResponse] = []
    danh_gia_khoa_hoc: List[ReviewResponse] = []
    dieu_kien_tien_quyet: List["CoursePrerequisiteResponse"] = []

class WishlistResponse(BaseModel):
    id: int
    ma_nguoi_dung: int
    ma_khoa_hoc: int
    ngay_them: datetime
    khoa_hoc: CourseResponse

    class Config:
        from_attributes = True

class CoursePrerequisiteResponse(BaseModel):
    id: int
    ma_khoa_hoc_chinh: int
    ma_khoa_hoc_tien_quyet: int
    khoa_hoc_tien_quyet: CourseResponse

    class Config:
        from_attributes = True

class CoursePrerequisiteCreate(BaseModel):
    ma_khoa_hoc_tien_quyet: int


