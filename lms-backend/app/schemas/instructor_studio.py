from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class InstructorStats(BaseModel):
    total_courses: int
    total_students: int
    total_revenue: float
    average_rating: float
    revenue_this_month: float
    new_students_this_month: int


class StudentEnrollmentResponse(BaseModel):
    student_id: int
    ho_ten: str
    email: str
    avatar_url: Optional[str]
    course_title: str
    ngay_dang_ky: datetime


class TransactionResponse(BaseModel):
    id: int
    order_id: int
    course_title: str
    student_name: str
    amount: float
    date: datetime


class PayoutCreate(BaseModel):
    amount: float
    bank_name: str
    account_number: str
    account_name: str


class PayoutResponse(BaseModel):
    id: str
    amount: float
    bank: str
    account_number: str
    account_name: str
    status: str
    reason: Optional[str]
    date: datetime
