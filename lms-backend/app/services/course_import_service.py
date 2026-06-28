from decimal import Decimal
from typing import Any, List, Optional

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.crawlers.exceptions import CrawlerError
from app.crawlers.hoctapgiare_crawler import HocTapGiaReCrawler
from app.models.course import Course, Lesson, LessonContent, Section
from app.models.course_import import CourseImportJob
from app.repositories.course_import_repository import CourseImportRepository
from app.schemas.course_import import CourseImportCreate, CourseImportImportRequest
from app.services.external_asset_service import ExternalAssetError, ExternalAssetService


class CourseImportService:
    @staticmethod
    async def create_hoctapgiare_job(
        db: AsyncSession,
        request: CourseImportCreate,
        admin_id: int,
    ) -> CourseImportJob:
        repo = CourseImportRepository(db)
        job = CourseImportJob(
            source="hoctapgiare",
            source_url=str(request.source_url),
            status="pending",
            created_by=admin_id,
        )
        await repo.add(job)
        await db.commit()
        await repo.refresh(job)

        job.status = "running"
        await db.commit()

        try:
            crawler = HocTapGiaReCrawler(headless=request.headless)
            drafts = await crawler.crawl(
                source_url=str(request.source_url),
                limit=request.limit,
                checkout_free=request.checkout_free,
            )
            job.draft_data = {
                "courses": drafts,
                "errors": crawler.errors,
                "summary": {
                    "requested_limit": request.limit,
                    "success_count": len(drafts),
                    "error_count": len(crawler.errors),
                    "checkout_free": request.checkout_free,
                },
            }
            job.status = "completed" if drafts else "failed"
            if not drafts:
                first_error = crawler.errors[0] if crawler.errors else None
                job.error_message = (
                    first_error.get("message")
                    if isinstance(first_error, dict) and first_error.get("message")
                    else "Khong lay duoc khoa hoc nao tu nguon crawl."
                )
        except CrawlerError as exc:
            job.status = "failed"
            job.error_message = exc.message
            job.draft_data = {
                "courses": [],
                "errors": [exc.to_dict()],
                "summary": {
                    "requested_limit": request.limit,
                    "success_count": 0,
                    "error_count": 1,
                    "checkout_free": request.checkout_free,
                },
            }
        except Exception as exc:
            job.status = "failed"
            job.error_message = str(exc)
            job.draft_data = {
                "courses": [],
                "errors": [
                    {
                        "code": "unexpected_error",
                        "stage": "course_import_job",
                        "message": "Loi he thong khong xac dinh khi chay crawler.",
                        "details": {"error": str(exc)},
                    }
                ],
            }

        await db.commit()
        await repo.refresh(job)
        return job

    @staticmethod
    async def list_jobs(db: AsyncSession, limit: int = 50) -> List[CourseImportJob]:
        return await CourseImportRepository(db).list_recent(limit=limit)

    @staticmethod
    async def get_job(db: AsyncSession, job_id: int) -> CourseImportJob:
        job = await CourseImportRepository(db).get_by_id(job_id)
        if not job:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Khong tim thay job import.")
        return job

    @staticmethod
    async def import_job(
        db: AsyncSession,
        job_id: int,
        request: CourseImportImportRequest,
        admin_id: int,
    ) -> CourseImportJob:
        repo = CourseImportRepository(db)
        job = await repo.get_by_id(job_id)
        if not job:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Khong tim thay job import.")
        if job.status == "imported":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Job nay da duoc import truoc do.")
        if job.status != "completed" or not job.draft_data:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Job chua co draft hop le de import.")
        if not request.confirmed_preview:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Can xac nhan da xem ban nhap khoa hoc truoc khi import vao CSDL.",
            )

        courses = job.draft_data.get("courses", []) if isinstance(job.draft_data, dict) else []
        if not courses:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Draft khong co khoa hoc nao.")

        instructor_id = request.instructor_id or admin_id
        imported_ids: list[int] = []
        asset_mirror_errors: list[dict[str, Any]] = []

        try:
            for draft in courses:
                thumbnail_url = await CourseImportService._mirror_external_asset(
                    draft.get("thumbnail_url"),
                    "image",
                    asset_mirror_errors,
                    context={"course_title": draft.get("title"), "field": "thumbnail_url"},
                )
                course = Course(
                    ma_giang_vien=instructor_id,
                    ma_danh_muc=request.category_id,
                    tieu_de=(draft.get("title") or "Khoa hoc crawl")[0:255],
                    mo_ta=draft.get("description"),
                    gia_tien=Decimal("0.00"),
                    trinh_do=draft.get("level") or "beginner",
                    anh_dai_dien=thumbnail_url,
                    da_xuat_ban=request.publish,
                    trang_thai_phe_duyet="approved" if request.approve else "draft",
                )
                db.add(course)
                await db.flush()
                imported_ids.append(course.id)

                sections = draft.get("sections") or []
                if not sections:
                    sections = [{"title": "Noi dung khoa hoc", "lessons": []}]

                for section_index, section_data in enumerate(sections):
                    section = Section(
                        ma_khoa_hoc=course.id,
                        tieu_de=(section_data.get("title") or f"Chuong {section_index + 1}")[0:255],
                        thu_tu=section_index,
                    )
                    db.add(section)
                    await db.flush()

                    lessons = section_data.get("lessons") or []
                    if not lessons:
                        lessons = [{"title": "Bai hoc dau tien", "duration_seconds": 0, "contents": []}]

                    for lesson_index, lesson_data in enumerate(lessons):
                        lesson = Lesson(
                            ma_chuong_hoc=section.id,
                            tieu_de=(lesson_data.get("title") or f"Bai {lesson_index + 1}")[0:255],
                            thoi_luong=int(lesson_data.get("duration_seconds") or 0),
                            thu_tu=lesson_index,
                            xem_truoc=False,
                            da_xuat_ban=request.publish,
                            trang_thai_phe_duyet="approved" if request.approve else "draft",
                        )
                        db.add(lesson)
                        await db.flush()

                        contents = lesson_data.get("contents") or []
                        for content_index, content_data in enumerate(contents):
                            content_type = CourseImportService._normalize_content_type(content_data.get("type"))
                            text_content = content_data.get("text") if content_type in {"text", "code"} else None
                            file_url = await CourseImportService._resolve_content_file_url(
                                content_data,
                                content_type,
                                asset_mirror_errors,
                                context={
                                    "course_title": draft.get("title"),
                                    "lesson_title": lesson_data.get("title"),
                                    "content_index": content_index,
                                },
                            )
                            db.add(
                                LessonContent(
                                    ma_bai_hoc=lesson.id,
                                    loai_noi_dung=content_type,
                                    noi_dung_text=text_content,
                                    duong_dan_file=file_url,
                                    thu_tu=int(content_data.get("sort_order") if content_data.get("sort_order") is not None else content_index),
                                )
                            )

            job.status = "imported"
            job.imported_course_id = imported_ids[0] if imported_ids else None
            job.draft_data = {
                **job.draft_data,
                "imported_course_ids": imported_ids,
                "asset_mirror_errors": asset_mirror_errors,
            }
            await db.commit()
            await repo.refresh(job)
            return job
        except Exception:
            await db.rollback()
            raise

    @staticmethod
    def _normalize_content_type(value: str | None) -> str:
        normalized = (value or "text").strip().lower()
        if normalized in {"video", "pdf", "text", "code", "image"}:
            return normalized
        return "text"

    @staticmethod
    async def _resolve_content_file_url(
        content_data: dict[str, Any],
        content_type: str,
        errors: list[dict[str, Any]],
        *,
        context: dict[str, Any],
    ) -> Optional[str]:
        source_url = content_data.get("url")
        if content_type not in {"video", "pdf", "image"} or not source_url:
            return None

        if content_type == "video" and ExternalAssetService.is_youtube_url(source_url):
            return source_url

        return await CourseImportService._mirror_external_asset(
            source_url,
            content_type,
            errors,
            context=context,
        )

    @staticmethod
    async def _mirror_external_asset(
        source_url: Optional[str],
        asset_type: str,
        errors: list[dict[str, Any]],
        *,
        context: dict[str, Any],
    ) -> Optional[str]:
        if not source_url:
            return None
        try:
            return await ExternalAssetService.mirror_url(source_url, asset_type)
        except ExternalAssetError as exc:
            errors.append(
                {
                    "source_url": source_url,
                    "asset_type": asset_type,
                    "message": str(exc),
                    "context": context,
                }
            )
            return None
        except Exception as exc:
            errors.append(
                {
                    "source_url": source_url,
                    "asset_type": asset_type,
                    "message": str(exc),
                    "context": context,
                }
            )
            return None
