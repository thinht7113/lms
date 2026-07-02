import re
from decimal import Decimal
from typing import Any, Dict, List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from models import Course, Section, Lesson, LessonContent, Category
from services.uploader import MinioUploader

class CourseImporter:
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
        draft: Dict[str, Any],
        publish: bool = True,
        approve: bool = True,
        instructor_id: Optional[int] = None,
        category_name: Optional[str] = "Học tập giá rẻ"
    ) -> int:
        course_title = (cls.clean_text(draft.get("title")) or "Khóa học chưa đặt tên")[0:255]
        
        # Kiểm tra trùng lặp khóa học
        res_exist = await db.execute(select(Course).where(Course.tieu_de == course_title))
        existing_course = res_exist.scalars().first()
        if existing_course:
            print(f"⚠️ [Trùng lặp] Khóa học '{course_title}' đã tồn tại trong CSDL (ID = {existing_course.id}). Bỏ qua import để tránh trùng lặp!")
            return existing_course.id

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

        # 2. Mirror Thumbnail
        thumbnail_url = draft.get("thumbnail")
        if thumbnail_url:
            print(f"📥 Đang tải ảnh đại diện: {thumbnail_url[:60]}...")
            thumbnail_url = await MinioUploader.mirror_url(thumbnail_url, "image")

        # 3. Create Course
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

        # 4. Create Sections & Lessons
        sections = draft.get("sections") or []
        if not sections:
            sections = [{"title": "Nội dung khóa học", "lessons": []}]

        for sec_idx, sec_data in enumerate(sections):
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
                    if cnt_type in {"video", "pdf", "image"} and file_url:
                        if cnt_type == "video" and MinioUploader.is_youtube_url(file_url):
                            pass # Keep YouTube iframe
                        else:
                            print(f"    📥 Đang tải {cnt_type} lên MinIO: {file_url[:60]}...")
                            file_url = await MinioUploader.mirror_url(file_url, cnt_type)

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
