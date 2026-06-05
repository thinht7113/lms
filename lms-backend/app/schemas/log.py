from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class AdminLogResponse(BaseModel):
    id: int
    ma_admin: int
    hanh_dong: str
    chi_tiet: Optional[str]
    ngay_thuc_hien: datetime

    class Config:
        from_attributes = True
