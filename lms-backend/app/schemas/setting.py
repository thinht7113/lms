from pydantic import BaseModel, Field
from typing import Optional, List

class SettingBase(BaseModel):
    key: str
    value: Optional[str] = None
    data_type: str = Field(default="string", description="string, boolean, integer, json")
    group: str = Field(default="general")
    description: Optional[str] = None

class SettingCreate(SettingBase):
    pass

class SettingUpdate(BaseModel):
    key: str
    value: Optional[str] = None

class SettingUpdateBulk(BaseModel):
    settings: List[SettingUpdate]

class SettingResponse(SettingBase):
    id: int

    class Config:
        from_attributes = True

class SettingPublicResponse(BaseModel):
    key: str
    value: Optional[str] = None
    data_type: str
