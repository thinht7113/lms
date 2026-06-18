from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict


class ChartDataPoint(BaseModel):
    name: str
    revenue: float
    students: int


class PendingCourse(BaseModel):
    id: int
    tieu_de: str
    giang_vien: str


class PendingRefund(BaseModel):
    id: int
    nguoi_yeu_cau: str
    so_tien: float
    ngay_yeu_cau: datetime


class TopCourse(BaseModel):
    id: int
    tieu_de: str
    so_hoc_vien: int
    doanh_thu: float


class RecentActivity(BaseModel):
    id: int
    hanh_dong: str
    chi_tiet: Optional[str]
    ngay_thuc_hien: datetime
    nguoi_thuc_hien: str


class SystemStats(BaseModel):
    total_users: int
    total_students: int
    total_instructors: int
    total_courses: int
    total_orders: int
    total_revenue: float
    instructor_revenue: float
    platform_revenue: float
    revenue_this_month: float
    completion_rate: float
    chart_data: List[ChartDataPoint]
    pending_courses: List[PendingCourse]
    pending_refunds: List[PendingRefund]
    top_courses: List[TopCourse]
    recent_activities: List[RecentActivity]


class UserResponse(BaseModel):
    id: int
    ho_ten: str
    email: str
    vai_tro: str
    trang_thai_hoat_dong: bool
    ngay_tao: datetime

    model_config = ConfigDict(from_attributes=True)


class RoleUpdateRequest(BaseModel):
    vai_tro: str


class StatusUpdateRequest(BaseModel):
    trang_thai_hoat_dong: bool
