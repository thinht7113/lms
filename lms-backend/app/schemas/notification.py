from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class NotificationCreate(BaseModel):
    ma_nguoi_dung: int
    tieu_de: str
    noi_dung: str
    loai: Optional[str] = "system"


class NotificationResponse(BaseModel):
    id: int
    ma_nguoi_dung: int
    tieu_de: str
    noi_dung: str
    loai: Optional[str] = None
    da_doc: bool
    ngay_tao: datetime

    model_config = ConfigDict(from_attributes=True)
