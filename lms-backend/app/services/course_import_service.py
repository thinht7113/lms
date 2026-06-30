import asyncio
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Any, List, Optional
from sqlalchemy import select, func

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.crawlers.exceptions import CrawlerError
from app.crawlers.hoctapgiare_crawler import HocTapGiaReCrawler
from app.core.config import settings
from app.core.database import async_session_maker
from app.models.course import Course, Lesson, LessonContent, Section
from app.models.course_import import CourseImportJob
from app.repositories.course_import_repository import CourseImportRepository
from app.schemas.course_import import CourseImportConfigStatus, CourseImportCreate, CourseImportImportRequest
from app.services.external_asset_service import ExternalAssetError, ExternalAssetService


class CourseImportService:
    @staticmethod
    def get_hoctapgiare_config_status() -> CourseImportConfigStatus:
        has_login = bool(settings.CRAWLER_HOCTAPGIARE_EMAIL and settings.CRAWLER_HOCTAPGIARE_PASSWORD)
        has_session = bool(settings.CRAWLER_HOCTAPGIARE_STORAGE_STATE_PATH)
        return CourseImportConfigStatus(
            source="hoctapgiare",
            has_login_credentials=has_login,
            has_storage_state=has_session,
            can_checkout_free=has_login or has_session,
            headless_default=settings.CRAWLER_DEFAULT_HEADLESS,
        )

    @staticmethod
    async def create_hoctapgiare_job(db: AsyncSession,request: CourseImportCreate,admin_id: int,) -> CourseImportJob:
        repo = CourseImportRepository(db)
        job = CourseImportJob(
            source="hoctapgiare",
            source_url=str(request.source_url),
            status="running",
            created_by=admin_id,
        )
        await repo.add(job)
        await db.commit()
        await repo.refresh(job)

        if CourseImportService._missing_checkout_credentials(request):
            job.status = "failed"
            job.error_message = (
                "Chưa cấu hình tài khoản hoctapgiare.top hoặc storage_state. "
                "Hãy điền CRAWLER_HOCTAPGIARE_EMAIL và CRAWLER_HOCTAPGIARE_PASSWORD, "
                "hoặc CRAWLER_HOCTAPGIARE_STORAGE_STATE_PATH, sau đó khởi động lại backend."
            )
            job.draft_data = {
                "courses": [],
                "errors": [
                    {
                        "code": "missing_crawler_credentials",
                        "stage": "crawler_config",
                        "message": job.error_message,
                    }
                ],
                "summary": {
                    "requested_limit": request.limit,
                    "success_count": 0,
                    "error_count": 1,
                    "checkout_free": request.checkout_free,
                },
            }
            await db.commit()
            await repo.refresh(job)
        return job

    @staticmethod
    async def run_hoctapgiare_job(job_id: int, request: CourseImportCreate) -> None:
        async with async_session_maker() as db:
            repo = CourseImportRepository(db)
            job = await repo.get_by_id(job_id)
            if not job or job.status != "running":
                return
            try:
                await asyncio.wait_for(
                    CourseImportService._execute_hoctapgiare_crawl(db, repo, job, request),
                    timeout=CourseImportService._job_timeout_seconds(),
                )
            except asyncio.TimeoutError:
                job = await repo.get_by_id(job_id)
                if job and job.status == "running":
                    CourseImportService._mark_job_failed(
                        job,
                        "Job crawler da vuot qua thoi gian xu ly toi da nen bi dung lai.",
                        code="crawler_job_timeout",
                        stage="course_import_job",
                        details={"timeout_seconds": CourseImportService._job_timeout_seconds()},
                    )
                    await db.commit()

    @staticmethod
    def _missing_checkout_credentials(request: CourseImportCreate) -> bool:
        if not request.checkout_free:
            return False
        return not CourseImportService.get_hoctapgiare_config_status().can_checkout_free

    @staticmethod
    async def _execute_hoctapgiare_crawl(
        db: AsyncSession,
        repo: CourseImportRepository,
        job: CourseImportJob,
        request: CourseImportCreate,
    ) -> CourseImportJob:
        try:
            from sqlalchemy import select
            from app.models.course import Course
            
            stmt = select(Course.tieu_de)
            result = await db.execute(stmt)
            existing_titles = {row[0].strip().lower() for row in result.all() if row[0]}

            crawler = HocTapGiaReCrawler(headless=request.headless)
            partial_drafts: list[dict[str, Any]] = []

            async def save_partial_draft(draft: dict[str, Any]) -> None:
                partial_drafts.append(draft)
                job.draft_data = {
                    "courses": partial_drafts,
                    "errors": crawler.errors,
                    "summary": {
                        "requested_limit": request.limit,
                        "success_count": len(partial_drafts),
                        "error_count": len(crawler.errors),
                        "checkout_free": request.checkout_free,
                    },
                }
                await db.commit()

            drafts = await crawler.crawl(
                source_url=str(request.source_url),
                limit=request.limit,
                checkout_free=request.checkout_free,
                on_draft=save_partial_draft,
                existing_titles=existing_titles,
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
        repo = CourseImportRepository(db)
        jobs = await repo.list_recent(limit=limit)
        if CourseImportService._expire_stale_running_jobs(jobs):
            await db.commit()
            jobs = await repo.list_recent(limit=limit)
        return jobs

    @staticmethod
    async def get_job(db: AsyncSession, job_id: int) -> CourseImportJob:
        job = await CourseImportRepository(db).get_by_id(job_id)
        if not job:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Khong tim thay job import.")
        if CourseImportService._expire_stale_running_jobs([job]):
            await db.commit()
        return job

    @staticmethod
    def _job_timeout_seconds() -> int:
        return max(300, settings.CRAWLER_JOB_TIMEOUT_SECONDS)

    @staticmethod
    def _expire_stale_running_jobs(jobs: list[CourseImportJob]) -> bool:
        changed = False
        for job in jobs:
            if not CourseImportService._is_stale_running_job(job):
                continue

            CourseImportService._mark_job_failed(
                job,
                "Job crawler da qua han xu ly. Neu backend bi restart hoac Playwright bi dung giua chung, job se khong the tu hoan tat.",
                code="crawler_job_stale",
                stage="course_import_job",
                details={"timeout_seconds": CourseImportService._job_timeout_seconds()},
            )
            changed = True
        return changed

    @staticmethod
    def _is_stale_running_job(job: CourseImportJob) -> bool:
        if job.status != "running" or not job.updated_at:
            return False

        updated_at = job.updated_at
        if updated_at.tzinfo is not None:
            updated_at = updated_at.astimezone(timezone.utc).replace(tzinfo=None)

        return datetime.utcnow() - updated_at > timedelta(seconds=CourseImportService._job_timeout_seconds())

    @staticmethod
    def _mark_job_failed(
        job: CourseImportJob,
        message: str,
        *,
        code: str,
        stage: str,
        details: dict[str, Any] | None = None,
    ) -> None:
        job.status = "failed"
        job.error_message = message

        draft_data = job.draft_data if isinstance(job.draft_data, dict) else {}
        courses = list(draft_data.get("courses") or [])
        errors = list(draft_data.get("errors") or [])
        if not any(isinstance(error, dict) and error.get("code") == code for error in errors):
            errors.append(
                {
                    "code": code,
                    "stage": stage,
                    "message": message,
                    "details": details or {},
                }
            )

        summary = dict(draft_data.get("summary") or {})
        summary["success_count"] = len(courses)
        summary["error_count"] = len(errors)
        job.draft_data = {
            **draft_data,
            "courses": courses,
            "errors": errors,
            "summary": summary,
        }

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
        if job.status not in {"completed", "failed"} or not job.draft_data:
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
                course_title = (draft.get("title") or "Khoa hoc crawl")[0:255]
                stmt = select(Course.id).where(func.lower(func.trim(Course.tieu_de)) == course_title.strip().lower())
                existing = await db.execute(stmt)
                if existing.scalar_one_or_none():
                    continue

                thumbnail_url = await CourseImportService._mirror_external_asset(
                    draft.get("thumbnail_url"),
                    "image",
                    asset_mirror_errors,
                    context={"course_title": draft.get("title"), "field": "thumbnail_url"},
                )
                course_category_id = CourseImportService._resolve_draft_category_id(draft, request)
                course = Course(
                    ma_giang_vien=instructor_id,
                    ma_danh_muc=course_category_id,
                    tieu_de=course_title,
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
    def _resolve_draft_category_id(draft: dict[str, Any], request: CourseImportImportRequest) -> Optional[int]:
        category_map = request.course_category_map or {}
        source_url = draft.get("source_url")
        title = draft.get("title")

        if isinstance(source_url, str) and source_url in category_map:
            return category_map[source_url]
        if isinstance(title, str) and title in category_map:
            return category_map[title]
        return request.category_id

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

