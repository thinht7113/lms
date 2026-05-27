from pydantic import BaseModel, Field
from typing import List, Optional, Any
from decimal import Decimal
from datetime import datetime

# ==================== OPTION SCHEMAS ====================
class OptionSchema(BaseModel):
    text: str = Field(..., description="Nội dung lựa chọn")
    is_correct: bool = Field(..., description="Lựa chọn này có đúng hay không")

class OptionResponse(BaseModel):
    text: str = Field(..., description="Nội dung lựa chọn")

    class Config:
        from_attributes = True

class OptionDetailResponse(BaseModel):
    text: str = Field(..., description="Nội dung lựa chọn")
    is_correct: bool = Field(..., description="Lựa chọn này có đúng hay không")

    class Config:
        from_attributes = True

# ==================== QUESTION SCHEMAS ====================
class QuestionCreate(BaseModel):
    content: str = Field(..., alias="noi_dung", description="Nội dung câu hỏi")
    options: List[OptionSchema] = Field(..., alias="cac_lua_chon", description="Danh sách các lựa chọn")
    explanation: Optional[str] = Field(None, alias="giai_thich", description="Giải thích đáp án")

    class Config:
        populate_by_name = True

class QuestionResponse(BaseModel):
    id: int
    ma_bai_kiem_tra: int
    noi_dung: str
    cac_lua_chon: List[OptionResponse]

    class Config:
        from_attributes = True

class QuestionDetailResponse(BaseModel):
    id: int
    ma_bai_kiem_tra: int
    noi_dung: str
    cac_lua_chon: List[OptionDetailResponse]
    dap_an_dung: str
    explanation: Optional[str] = Field(None, alias="giai_thich")

    class Config:
        from_attributes = True
        populate_by_name = True


# ==================== QUIZ SCHEMAS ====================
class QuizCreate(BaseModel):
    title: str = Field(..., alias="tieu_de", description="Tiêu đề bài kiểm tra")
    passing_score: Decimal = Field(Decimal("8.00"), alias="diem_dat", description="Điểm đạt để qua môn (thường thang 10)")
    time_limit: Optional[int] = Field(None, alias="thoi_gian_lam_bai", description="Thời gian làm bài (phút)")
    max_attempts: Optional[int] = Field(None, alias="so_luot_lam_toi_da", description="Lượt làm tối đa")

    class Config:
        populate_by_name = True

class QuizResponse(BaseModel):
    id: int
    ma_khoa_hoc: int
    tieu_de: str
    diem_dat: Decimal
    thoi_gian_lam_bai: Optional[int] = None
    so_luot_lam_toi_da: int = 3
    ngay_tao: datetime

    class Config:
        from_attributes = True
        populate_by_name = True

class QuizDetailResponse(QuizResponse):
    cau_hoi: List[QuestionResponse] = []


# ==================== ATTEMPT & SUBMISSION SCHEMAS ====================
class AnswerSubmit(BaseModel):
    question_id: int
    chosen_answer: str # Ví dụ: 'A', 'B', 'C' hoặc nội dung text trùng khớp lựa chọn đúng

class QuizSubmitRequest(BaseModel):
    answers: List[AnswerSubmit]

class QuizSubmitResponse(BaseModel):
    attempt_id: int
    score: Decimal
    passed: bool
    correct_count: int
    total_count: int

class QuizAttemptResponse(BaseModel):
    id: int
    ma_nguoi_dung: int
    ma_bai_kiem_tra: int
    diem_dat_duoc: Decimal
    da_qua_mon: bool
    ngay_lam_bai: datetime
    bai_kiem_tra: Optional[QuizResponse] = None

    class Config:
        from_attributes = True
