from pydantic import BaseModel, Field, ConfigDict
from typing import Optional

class BannerBase(BaseModel):
    hinh_anh_url: str = Field(..., description="Link hình ảnh của banner")
    tieu_de: Optional[str] = Field(None, description="Tiêu đề banner")
    duong_dan: Optional[str] = Field(None, description="Link khi click vào banner")
    trang_thai: bool = Field(True, description="Trạng thái hiển thị (True: hiển thị)")
    thu_tu: int = Field(0, description="Thứ tự hiển thị (càng nhỏ càng hiện trước)")

class BannerCreate(BannerBase):
    pass

class BannerUpdate(BaseModel):
    hinh_anh_url: Optional[str] = None
    tieu_de: Optional[str] = None
    duong_dan: Optional[str] = None
    trang_thai: Optional[bool] = None
    thu_tu: Optional[int] = None

class BannerResponse(BannerBase):
    id: int

    model_config = ConfigDict(from_attributes=True)
