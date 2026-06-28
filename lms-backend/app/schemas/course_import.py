from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field, HttpUrl


class CrawledLessonContent(BaseModel):
    type: str = Field(..., description="text, video, pdf, image, code")
    text: Optional[str] = None
    url: Optional[str] = None
    sort_order: int = 0


class CrawledLesson(BaseModel):
    title: str
    duration_seconds: int = 0
    contents: List[CrawledLessonContent] = Field(default_factory=list)


class CrawledSection(BaseModel):
    title: str
    lessons: List[CrawledLesson] = Field(default_factory=list)


class CrawledCourseDraft(BaseModel):
    source: str = "hoctapgiare"
    source_url: str
    title: str
    description: Optional[str] = None
    thumbnail_url: Optional[str] = None
    price: float = 0
    level: str = "beginner"
    sections: List[CrawledSection] = Field(default_factory=list)
    raw: Dict[str, Any] = Field(default_factory=dict)


class CourseImportCreate(BaseModel):
    source_url: HttpUrl = Field(..., description="Trang danh sach hoac trang chi tiet khoa hoc can crawl")
    limit: int = Field(5, ge=1, le=50)
    checkout_free: bool = True
    headless: bool = True


class CourseImportJobResponse(BaseModel):
    id: int
    source: str
    source_url: str
    status: str
    draft_data: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    imported_course_id: Optional[int] = None
    created_by: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CourseImportImportRequest(BaseModel):
    confirmed_preview: bool = Field(False, description="Bat buoc true sau khi admin da xem ban nhap crawl")
    publish: bool = Field(False, description="Neu true thi khoa hoc duoc xuat ban sau khi import")
    approve: bool = Field(True, description="Neu true thi trang thai phe duyet la approved")
    category_id: Optional[int] = None
    instructor_id: Optional[int] = Field(None, description="Mac dinh la admin hien tai")
