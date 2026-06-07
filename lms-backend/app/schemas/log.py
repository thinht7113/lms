from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional

class AdminLogResponse(BaseModel):
    id: int
    ma_admin: int
    hanh_dong: str
    chi_tiet: Optional[str]
    ngay_thuc_hien: datetime

    model_config = ConfigDict(from_attributes=True)
