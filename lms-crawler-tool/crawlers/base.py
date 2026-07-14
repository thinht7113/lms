import html
import re
import unicodedata
from abc import ABC, abstractmethod
from typing import Any, Awaitable, Callable, Dict, List, Optional, Set, TypedDict
from urllib.parse import urlparse


class LessonContentDraft(TypedDict, total=False):
    """Quy định cấu trúc 1 phần tử nội dung trong bài học (Video, PDF, Hình ảnh hoặc Văn bản)."""
    type: str           # Bắt buộc: "video", "pdf", "image", "text", "code"
    url: Optional[str]  # Link tải media (mp4, youtube, pdf, image)
    text: Optional[str] # Nội dung văn bản / mã nguồn (nếu type = text/code)
    sort_order: int     # Thứ tự sắp xếp tài liệu trong bài học


class LessonDraft(TypedDict, total=False):
    """Quy định cấu trúc 1 bài học thuộc chương."""
    title: str          # Tên bài học
    duration_seconds: int # Thời lượng bài học (giây)
    source_url: str     # Đường dẫn URL trang bài học trên web gốc
    contents: List[LessonContentDraft] # Danh sách các tài liệu/video trong bài học


class SectionDraft(TypedDict, total=False):
    """Quy định cấu trúc 1 chương  của khóa học."""
    title: str          # Tên chương học
    lessons: List[LessonDraft] # Danh sách bài học thuộc chương


class CourseDraft(TypedDict, total=False):
    """Quy định cấu trúc gói dữ liệu 1 khóa học hoàn chỉnh cần trả về để Import"""
    title: str          # Tên khóa học
    description: str    # Mô tả giới thiệu khóa học
    thumbnail: str      # Link ảnh đại diện (giữ cho tương thích)
    thumbnail_url: str  # Link ảnh đại diện ưu tiên
    level: str          # Trình độ: "beginner", "intermediate", "advanced"
    category: str       # Tên danh mục khóa học
    instructor_name: str # Tên giảng viên phụ trách
    source_url: str     # URL trang khóa học gốc
    sections: List[SectionDraft] # Danh sách các chương học


class BaseCourseCrawler(ABC):
    """Lớp trừu tượng định nghĩa hợp đồng chuẩn hóa và kho tiện ích cho tất cả module cào khóa học."""

    @abstractmethod
    async def crawl(
        self,
        source_url: str,
        limit: int = 5,
        checkout_free: bool = False,
        on_draft: Optional[Callable[[CourseDraft], Awaitable[None]]] = None,
        existing_titles: Optional[Set[str]] = None,
    ) -> List[CourseDraft]:
        """Thực hiện thu thập dữ liệu và bắt buộc trả về danh sách các gói cấu trúc CourseDraft."""
        raise NotImplementedError

    @classmethod
    def _normalize_for_match(cls, value: Optional[str]) -> str:
        """Chuẩn hóa chuỗi về tiếng Việt không dấu, chữ thường để so sánh chống cào trùng lặp."""
        raw = (value or "").strip().lower()
        raw = unicodedata.normalize("NFD", raw)
        raw = "".join(ch for ch in raw if unicodedata.category(ch) != "Mn")
        raw = raw.replace("đ", "d")
        return re.sub(r"\s+", " ", raw)

    @classmethod
    def _normalize_title_key(cls, value: Optional[str]) -> str:
        """Tạo khóa định danh từ tiêu đề khóa học."""
        return cls._normalize_for_match(value)

    @classmethod
    def _clean_html_str(cls, val: str, is_html: bool = False) -> str:
        """Làm sạch các ký tự zero-byte ẩn hoặc thẻ HTML rác trong tài liệu."""
        if not val:
            return ""
        cleaned = val.replace("\x00", "")
        cleaned = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", "", cleaned)
        if is_html:
            return cleaned.strip()
        text = re.sub(r"<[^>]+>", " ", cleaned)
        text = html.unescape(text)
        return re.sub(r"\s+", " ", text).strip()

    @classmethod
    def _clean_description_text(cls, value: str) -> str:
        """Làm sạch và chuẩn hóa các đoạn văn bản giới thiệu khóa học."""
        if not value:
            return ""
        lines = [line.strip() for line in value.splitlines()]
        filtered = [
            line
            for line in lines
            if line and line not in {"+ Xem thêm", "Xem thêm", "Tổng quan khóa học"}
        ]
        return "\n\n".join(filtered).strip()

    @classmethod
    def _is_youtube_like_url(cls, url: str) -> bool:
        """Kiểm tra đường dẫn có phải video Youtube/Vimeo hay không."""
        parsed = urlparse(url)
        host = parsed.netloc.lower()
        return "youtube.com" in host or "youtube-nocookie.com" in host or "youtu.be" in host

    @classmethod
    def _is_direct_video_file_url(cls, url: str) -> bool:
        """Kiểm tra đường dẫn có phải file video trực tiếp (.mp4, .webm, .mov) hay không."""
        parsed = urlparse(url)
        path = parsed.path.lower()
        return path.endswith((".mp4", ".webm", ".mov", ".mpeg", ".mpg"))
