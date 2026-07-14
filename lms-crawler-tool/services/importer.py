import asyncio
import re
import unicodedata
from decimal import Decimal
from typing import Any, Dict, List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from config import settings
from crawlers.base import CourseDraft, LessonContentDraft, LessonDraft
from models import Course, Section, Lesson, LessonContent, Category, User
from services.uploader import MinioUploader

class CourseImporter:
    @staticmethod
    def normalize_title_key(text: Optional[str]) -> str:
        cleaned = CourseImporter.clean_text(text) or ""
        cleaned = unicodedata.normalize("NFD", cleaned.strip().lower())
        cleaned = "".join(ch for ch in cleaned if unicodedata.category(ch) != "Mn")
        cleaned = cleaned.replace("đ", "d")
        return re.sub(r"\s+", " ", cleaned)

    @classmethod
    async def load_existing_course_title_keys(cls, db: AsyncSession) -> set[str]:
        rows = await db.execute(select(Course.tieu_de))
        return {cls.normalize_title_key(title) for title in rows.scalars().all() if title}

    @staticmethod
    def clean_text(text: Optional[str], is_html: bool = False) -> Optional[str]:
        if not text:
            return None
        cleaned = str(text).strip()
        if not is_html:
            cleaned = re.sub(r"<[^>]+>", "", cleaned)
        cleaned = re.sub(r"\s+", " ", cleaned).strip()
        return cleaned if cleaned else None

    @staticmethod
    def extract_video_duration_or_default(draft_lesson: LessonDraft) -> int:
        val = draft_lesson.get("duration_seconds", 0)
        return int(val) if isinstance(val, (int, float)) and val > 0 else 0

    @staticmethod
    def normalize_content_type(raw_type: Optional[str]) -> str:
        t = str(raw_type or "").strip().lower()
        if t in {"video", "mp4", "youtube"}:
            return "video"
        if t in {"pdf", "doc", "docx"}:
            return "pdf"
        if t in {"code", "snippet"}:
            return "code"
        if t in {"image", "img", "png", "jpg", "jpeg"}:
            return "image"
        return "text"

    @classmethod
    async def import_course_to_db(
        cls,
        db: AsyncSession,
        draft: CourseDraft,
        publish: bool = True,
        approve: bool = True,
        instructor_id: Optional[int] = None,
        category_name: Optional[str] = "Học tập giá rẻ"
    ) -> int:
        course_title = (cls.clean_text(draft.get("title")) or "Khóa học chưa đặt tên")[0:255]
        
        # Kiểm tra trùng lặp khóa học (không phân biệt hoa/thường và khoảng trắng thừa)
        course_title_clean = cls.normalize_title_key(course_title)
        res_exist = await db.execute(select(Course))
        existing_course = next(
            (
                course
                for course in res_exist.scalars().all()
                if cls.normalize_title_key(course.tieu_de) == course_title_clean
            ),
            None,
        )
        if existing_course:
            print(f"⚠️ [Trùng lặp] Khóa học '{course_title}' đã tồn tại trong CSDL (ID = {existing_course.id}). Bỏ qua import để tránh trùng lặp!")
            return existing_course.id

        # 0. Tự động gán giảng viên mặc định nếu không truyền vào (lấy giảng viên hoặc admin đầu tiên trong DB)
        if instructor_id is None:
            res_user = await db.execute(
                select(User).where(User.vai_tro.in_(["instructor", "admin"])).order_by(User.id).limit(1)
            )
            inst = res_user.scalars().first()
            if not inst:
                res_any = await db.execute(select(User).order_by(User.id).limit(1))
                inst = res_any.scalars().first()
            if inst:
                instructor_id = inst.id
                print(f"👤 Tự động gán Giảng viên phụ trách: {inst.ho_ten} [ID: {inst.id}]")

        # 1. Resolve Category
        category_id = None
        if category_name:
            res = await db.execute(select(Category).where(Category.ten_danh_muc == category_name))
            cat = res.scalars().first()
            if not cat:
                cat = Category(ten_danh_muc=category_name, mo_ta="Danh mục import tự động từ tool cào dữ liệu")
                db.add(cat)
                await db.flush()
            category_id = cat.id

        # 2. Mirror Thumbnail (Ưu tiên thumbnail_url trước, sau đó tới thumbnail)
        thumbnail_url = draft.get("thumbnail_url") or draft.get("thumbnail")
        if thumbnail_url:
            print(f"📥 Đang tải ảnh đại diện: {thumbnail_url[:60]}...")
            thumbnail_url = await MinioUploader.mirror_url(thumbnail_url, "image")

        # 3. Mirror media file song song trước khi ghi vào CSDL
        sections = draft.get("sections") or []
        if not sections:
            sections = [{"title": "Nội dung khóa học", "lessons": []}]

        media_jobs = []
        for sec_data in sections:
            for les_data in (sec_data.get("lessons") or []):
                for cnt_data in (les_data.get("contents") or []):
                    cnt_type = cls.normalize_content_type(cnt_data.get("type"))
                    file_url = cnt_data.get("url")
                    if cnt_type in {"video", "pdf", "image"} and file_url:
                        if cnt_type == "video" and MinioUploader.is_youtube_url(file_url):
                            continue
                        if cnt_type == "video" and not settings.CRAWLER_MIRROR_VIDEO_FILES:
                            continue
                        media_jobs.append((cnt_data, file_url, cnt_type))

        if media_jobs:
            print(f"  ⚡ [Đa luồng MinIO] Đang tải song song {len(media_jobs)} file media lên MinIO (S3)...")
            semaphore = asyncio.Semaphore(12)
            async def mirror_job(cnt: LessonContentDraft, url: str, c_type: str):
                async with semaphore:
                    try:
                        mirrored = await MinioUploader.mirror_url(url, c_type)
                        if mirrored:
                            cnt["url"] = mirrored
                        else:
                            cnt["url"] = None
                    except Exception as exc:
                        print(f"    ⚠️ Lỗi mirror {c_type}: {exc}")
                        cnt["url"] = None

            await asyncio.gather(*(mirror_job(c, u, t) for c, u, t in media_jobs))
            print("  ✅ Đã tải thành công toàn bộ media lên MinIO!")

        # Lọc bỏ các nội dung lỗi / không tải được và kiểm tra khóa học có dữ liệu hợp lệ không
        total_valid_contents = 0
        valid_sections = []
        for sec_data in sections:
            valid_lessons = []
            for les_data in (sec_data.get("lessons") or []):
                valid_contents = []
                for cnt_data in (les_data.get("contents") or []):
                    c_type = cls.normalize_content_type(cnt_data.get("type"))
                    if c_type in {"video", "pdf", "image"}:
                        if cnt_data.get("url"):
                            valid_contents.append(cnt_data)
                    elif c_type in {"text", "code"}:
                        if cnt_data.get("text"):
                            valid_contents.append(cnt_data)
                
                if valid_contents:
                    les_data["contents"] = valid_contents
                    valid_lessons.append(les_data)
                    total_valid_contents += len(valid_contents)
            
            if valid_lessons:
                sec_data["lessons"] = valid_lessons
                valid_sections.append(sec_data)

        if not valid_sections or total_valid_contents == 0:
            print(f"⚠️ [Bỏ qua Import] Khóa học '{course_title}' không có bài học hợp lệ hoặc không tải được video/media nào!")
            return None

        # 4. Create Course
        course = Course(
            ma_giang_vien=instructor_id,
            ma_danh_muc=category_id,
            tieu_de=course_title,
            mo_ta=cls.clean_text(draft.get("description"), is_html=False),
            gia_tien=Decimal("0.00"),
            trinh_do=draft.get("level") or "beginner",
            anh_dai_dien=thumbnail_url,
            da_xuat_ban=publish,
            trang_thai_phe_duyet="approved" if approve else "draft",
        )
        db.add(course)
        await db.flush()
        print(f"✅ Đã tạo Khóa học [ID: {course.id}] '{course.tieu_de}'")

        # 5. Create Sections & Lessons
        for sec_idx, sec_data in enumerate(valid_sections):
            sec_title = (cls.clean_text(sec_data.get("title")) or f"Chương {sec_idx + 1}")[0:255]
            section = Section(
                ma_khoa_hoc=course.id,
                tieu_de=sec_title,
                thu_tu=sec_idx,
            )
            db.add(section)
            await db.flush()
            print(f"  📂 Chương {sec_idx + 1}: {sec_title}")

            lessons = sec_data.get("lessons") or []
            for les_idx, les_data in enumerate(lessons):
                les_title = (cls.clean_text(les_data.get("title")) or f"Bài {les_idx + 1}")[0:255]
                lesson = Lesson(
                    ma_chuong_hoc=section.id,
                    tieu_de=les_title,
                    thoi_luong=int(les_data.get("duration_seconds") or 0),
                    thu_tu=les_idx,
                    xem_truoc=False,
                    da_xuat_ban=publish,
                    trang_thai_phe_duyet="approved" if approve else "draft",
                )
                db.add(lesson)
                await db.flush()

                contents = les_data.get("contents") or []
                for cnt_idx, cnt_data in enumerate(contents):
                    cnt_type = cls.normalize_content_type(cnt_data.get("type"))
                    text_content = cls.clean_text(cnt_data.get("text"), is_html=True) if cnt_type in {"text", "code"} else None
                    file_url = cnt_data.get("url")

                    db.add(
                        LessonContent(
                            ma_bai_hoc=lesson.id,
                            loai_noi_dung=cnt_type,
                            noi_dung_text=text_content,
                            duong_dan_file=file_url,
                            thu_tu=int(cnt_data.get("sort_order") if cnt_data.get("sort_order") is not None else cnt_idx),
                        )
                    )
                print(f"    📄 Bài {les_idx + 1}: {les_title} ({len(contents)} nội dung)")

        await db.commit()
        return course.id
