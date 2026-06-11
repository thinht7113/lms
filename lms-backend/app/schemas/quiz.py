from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Any
from decimal import Decimal
from datetime import datetime

# ==================== OPTION SCHEMAS ====================
class OptionSchema(BaseModel):
    text: str = Field(..., description="Nội dung lựa chọn")
    is_correct: bool = Field(..., description="Lựa chọn này có đúng hay không")

class OptionResponse(BaseModel):
    id: int
    text: str = Field(..., description="Nội dung lựa chọn")

    model_config = ConfigDict(from_attributes=True)

class OptionDetailResponse(BaseModel):
    id: int
    text: str = Field(..., description="Nội dung lựa chọn")
    is_correct: bool = Field(..., description="Lựa chọn này có đúng hay không")

    model_config = ConfigDict(from_attributes=True)

# ==================== QUESTION SCHEMAS ====================
class QuestionCreate(BaseModel):
    content: str = Field(..., alias="noi_dung", description="Nội dung câu hỏi")
    options: List[OptionSchema] = Field(..., alias="cac_lua_chon", description="Danh sách các lựa chọn")
    explanation: Optional[str] = Field(None, alias="giai_thich", description="Giải thích đáp án")

    model_config = ConfigDict(populate_by_name=True)

class QuestionUpdate(BaseModel):
    noi_dung: Optional[str] = None
    giai_thich: Optional[str] = None

class QuestionResponse(BaseModel):
    id: int
    ma_bai_kiem_tra: int
    noi_dung: str
    cac_lua_chon: List[OptionResponse]

    model_config = ConfigDict(from_attributes=True)

class QuestionDetailResponse(BaseModel):
    id: int
    ma_bai_kiem_tra: int
    noi_dung: str
    cac_lua_chon: List[OptionDetailResponse]
    dap_an_dung: str
    explanation: Optional[str] = Field(None, alias="giai_thich")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


# ==================== QUIZ SCHEMAS ====================
class QuizCreate(BaseModel):
    title: str = Field(..., alias="tieu_de", description="Tiêu đề bài kiểm tra")
    passing_score: Decimal = Field(Decimal("8.00"), alias="diem_dat", description="Điểm đạt để qua môn (thường thang 10)")
    time_limit: Optional[int] = Field(None, alias="thoi_gian_lam_bai", description="Thời gian làm bài (phút)")
    max_attempts: Optional[int] = Field(None, alias="so_luot_lam_toi_da", description="Lượt làm tối đa")

    model_config = ConfigDict(populate_by_name=True)

class QuizUpdate(BaseModel):
    tieu_de: Optional[str] = None
    diem_dat: Optional[Decimal] = None
    thoi_gian_lam_bai: Optional[int] = None
    so_luot_lam_toi_da: Optional[int] = None

from app.schemas.course import CourseMinimalResponse

class QuizResponse(BaseModel):
    id: int
    ma_khoa_hoc: int
    tieu_de: str
    diem_dat: Decimal
    thoi_gian_lam_bai: Optional[int] = None
    so_luot_lam_toi_da: int = 3
    ngay_tao: datetime
    khoa_hoc: Optional[CourseMinimalResponse] = None
    
    attempts_count: Optional[int] = 0
    highest_score: Optional[Decimal] = None
    passed: Optional[bool] = False
    
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

class QuizDetailResponse(QuizResponse):
    cau_hoi: List[QuestionResponse] = []

class AdminQuizDetailResponse(QuizResponse):
    cau_hoi: List[QuestionDetailResponse] = []


# ==================== ATTEMPT & SUBMISSION SCHEMAS ====================
class AnswerSubmit(BaseModel):
    question_id: int
    chosen_option_id: int

class QuizSubmitRequest(BaseModel):
    attempt_id: int
    answers: List[AnswerSubmit]

class QuizSubmitResponse(BaseModel):
    attempt_id: int
    score: Decimal
    passed: bool
    correct_count: int
    total_count: int
    message: Optional[str] = None

class QuizAttemptAnswerResponse(BaseModel):
    id: int
    ma_luot_lam: int
    ma_cau_hoi: int
    ma_lua_chon: int

    model_config = ConfigDict(from_attributes=True)

class QuizAttemptResponse(BaseModel):
    id: int
    ma_nguoi_dung: int
    ma_bai_kiem_tra: int
    diem_dat_duoc: Optional[Decimal] = None
    da_qua_mon: Optional[bool] = None
    ngay_bat_dau: Optional[datetime] = None
    ngay_lam_bai: Optional[datetime] = None
    trang_thai: Optional[str] = "started"
    bai_kiem_tra: Optional[QuizResponse] = None
    cau_tra_loi_chi_tiet: List[QuizAttemptAnswerResponse] = []

    model_config = ConfigDict(from_attributes=True)


class QuizReviewOptionResponse(BaseModel):
    id: int
    text: str
    is_correct: bool


class QuizReviewQuestionResponse(BaseModel):
    id: int
    ma_bai_kiem_tra: int
    noi_dung: str
    giai_thich: Optional[str] = None
    cac_lua_chon: List[QuizReviewOptionResponse]
    user_option_id: Optional[int] = None
    correct_option_id: Optional[int] = None
    is_user_correct: bool = False


class QuizAttemptReviewResponse(BaseModel):
    id: int
    ma_nguoi_dung: int
    ma_bai_kiem_tra: int
    diem_dat_duoc: Optional[Decimal] = None
    da_qua_mon: Optional[bool] = None
    ngay_bat_dau: Optional[datetime] = None
    ngay_lam_bai: Optional[datetime] = None
    trang_thai: Optional[str] = "completed"
    bai_kiem_tra: QuizResponse
    cau_hoi_review: List[QuizReviewQuestionResponse]
