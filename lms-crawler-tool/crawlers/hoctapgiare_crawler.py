from __future__ import annotations

import asyncio
import html
import re
import unicodedata
from pathlib import Path
from typing import Any, Awaitable, Callable, Dict, List, Optional
from urllib.parse import parse_qsl, urlencode, urljoin, urlparse, urlunparse

from playwright.async_api import Error as PlaywrightError
from playwright.async_api import Page, TimeoutError as PlaywrightTimeoutError, async_playwright

from crawlers.base import (
    BaseCourseCrawler,
    CourseDraft,
    LessonContentDraft,
    LessonDraft,
    SectionDraft,
)
from crawlers.exceptions import (
    CrawlerAccessDeniedError,
    CrawlerBrowserError,
    CrawlerConfigError,
    CrawlerContentError,
    CrawlerCourseError,
    CrawlerError,
    CrawlerListingError,
    CrawlerLoginError,
    CrawlerSelectorError,
)
from config import TOOL_ROOT, settings


class HocTapGiaReCrawler(BaseCourseCrawler):
    base_url = "https://hoctapgiare.top"
    login_url = "https://hoctapgiare.top/login"
    free_courses_url = (
        "https://hoctapgiare.top/home/courses?"
        "category=all&price=free&level=all&language=all&rating=all&sort_by=newest"
    )

    def __init__(self,email: Optional[str] = None,password: Optional[str] = None,headless: bool = True,storage_state_path: Optional[str] = None,max_concurrency: int = 8) -> None:
        self.email = email or settings.CRAWLER_HOCTAPGIARE_EMAIL
        self.password = password or settings.CRAWLER_HOCTAPGIARE_PASSWORD
        self.headless = headless
        self.storage_state_path = storage_state_path or settings.CRAWLER_HOCTAPGIARE_STORAGE_STATE_PATH
        self.max_concurrency = max(1, min(int(max_concurrency or 1), 32))
        self.errors: List[Dict[str, Any]] = []


    async def crawl(self,source_url: str,limit: int = 5,checkout_free: bool = False,on_draft: Optional[Callable[[CourseDraft], Awaitable[None]]] = None,existing_titles: Optional[set[str]] = None,) -> List[CourseDraft]:
        self.errors = []
        playwright_context = async_playwright()
        playwright = None
        browser = None
        try:
            playwright = await playwright_context.start()
            browser = await playwright.chromium.launch(headless=self.headless)
        except Exception as exc:
            raise CrawlerBrowserError(
                "Khong khoi dong duoc Chromium/Playwright.",
                details={"error": str(exc)},
            ) from exc

        assert browser is not None
        try:
            context_options: Dict[str, Any] = {
                "locale": "vi-VN",
                "viewport": {"width": 1440, "height": 1000},
                "user_agent": self._user_agent(),
            }
            storage_state = self._get_storage_state_path()
            if storage_state:
                context_options["storage_state"] = str(storage_state)

            context = await browser.new_context(**context_options)
            await context.route("**/*", self._route_lightweight_resources)
            page = await context.new_page()
            page.set_default_timeout(10000)
            page.set_default_navigation_timeout(15000)
            try:
                session_ready = False
                if storage_state:
                    session_ready = await self._activate_stored_session(page)

                if not session_ready and self.email and self.password:
                    await self._login(page, self.email, self.password)
                    await self._save_storage_state(context)

                course_urls = await self._resolve_course_urls(page, source_url, limit, existing_titles)
                drafts: List[CourseDraft] = []
                total_courses = len(course_urls[:limit])
                for course_index, course_url in enumerate(course_urls[:limit], 1):
                    try:
                        print(f"  -> Crawling course {course_index}/{total_courses}: {course_url}", flush=True)
                        draft = await asyncio.wait_for(
                            self._crawl_course(page, course_url, checkout_free=checkout_free),
                            timeout=max(60, settings.CRAWLER_COURSE_TIMEOUT_SECONDS),
                        )
                        drafts.append(draft)
                        raw = draft.get("raw", {})
                        print(
                            "     Done: "
                            f"{draft.get('title')} | lessons={raw.get('lesson_count', 0)} "
                            f"videos={raw.get('video_count', 0)} youtube={raw.get('youtube_count', 0)} "
                            f"mp4={raw.get('mp4_count', 0)} external={raw.get('external_video_count', 0)}",
                            flush=True,
                        )
                        if on_draft is not None:
                            await on_draft(draft)
                    except asyncio.TimeoutError:
                        self.errors.append(
                            CrawlerCourseError(
                                "Qua thoi gian toi da khi crawl chi tiet khoa hoc, da bo qua khoa nay de tiep tuc khoa khac.",
                                url=course_url,
                                details={"timeout_seconds": settings.CRAWLER_COURSE_TIMEOUT_SECONDS},
                            ).to_dict()
                        )
                    except CrawlerError as exc:
                        self.errors.append(exc.to_dict())
                    except Exception as exc:
                        self.errors.append(
                            CrawlerCourseError(
                                "Loi khong xac dinh khi crawl chi tiet khoa hoc.",
                                url=course_url,
                                details={"error": str(exc)},
                            ).to_dict()
                        )
                return drafts
            finally:
                await context.close()
                await browser.close()
        finally:
            if playwright is not None:
                await playwright.stop()

    async def _login(self, page: Page, email: str, password: str) -> None:
        try:
            await page.goto(self.login_url, wait_until="domcontentloaded")
            await self._wait(page, networkidle_timeout=6000)
            await self._raise_if_blocked(page, self.login_url)
            if not await self._is_login_page(page) and await self._has_authenticated_session(page):
                return

            login_form = page.locator("form[action*='validate_login']").first
            if not await login_form.count():
                login_form = page.locator("form:has(#login-email), form:has(input[name='email'])").first
            if not await login_form.count():
                raise CrawlerLoginError(
                    "Khong tim thay form dang nhap hoctapgiare.top.",
                    url=self.login_url,
                    details={"current_url": page.url, **await self._page_diagnostics(page)},
                )
            await login_form.locator("#login-email, input[name='email']").first.fill(email)
            await login_form.locator("#login-password, input[name='password']").first.fill(password)
            await login_form.locator("button[type='submit'], input[type='submit']").first.click()
            await self._wait(page, networkidle_timeout=6000)
        except PlaywrightTimeoutError as exc:
            raise CrawlerLoginError(
                "Het thoi gian cho khi dang nhap hoctapgiare.top.",
                url=self.login_url,
                details={"error": str(exc)},
            ) from exc
        except PlaywrightError as exc:
            raise CrawlerLoginError(
                "Khong thao tac duoc form dang nhap hoctapgiare.top.",
                url=self.login_url,
                details={"error": str(exc)},
            ) from exc

        if await self._is_login_page(page) or not await self._has_authenticated_session(page):
            error_text = await self._text(page, ".alert, .toast-message, .form-message, body")
            raise CrawlerLoginError(
                "Dang nhap hoctapgiare.top khong tao duoc phien hop le.",
                url=self.login_url,
                details={
                    "current_url": page.url,
                    "site_message": error_text[:500],
                    "hint": "Kiem tra lai CRAWLER_HOCTAPGIARE_EMAIL va CRAWLER_HOCTAPGIARE_PASSWORD.",
                },
            )

    async def _activate_stored_session(self, page: Page) -> bool:
        try:
            await page.goto(f"{self.base_url}/home", wait_until="domcontentloaded")
            await self._wait(page, networkidle_timeout=3000)
            await self._raise_if_blocked(page, page.url)
            return await self._has_authenticated_session(page)
        except Exception:
            return False

    async def _resolve_course_urls(self, page: Page, source_url: str, limit: int, existing_titles: Optional[set[str]] = None) -> List[str]:
        normalized = self._normalize_source_url(source_url)
        if self._is_course_url(normalized):
            return [normalized]
        return await self._collect_course_urls(page, normalized, limit, existing_titles)

    async def _collect_course_urls(self, page: Page, listing_url: str, limit: int, existing_titles: Optional[set[str]] = None) -> List[str]:
        urls: List[str] = []
        next_url: Optional[str] = listing_url

        while next_url and len(urls) < limit:
            try:
                await page.goto(next_url, wait_until="domcontentloaded")
                await self._wait(page, networkidle_timeout=4000)
                await self._raise_if_blocked(page, next_url)

                if "price=free" not in page.url:
                    await self._click_first(page, ["#price_free", "input[name='price'][value='free']"])
                    await self._wait(page, networkidle_timeout=4000)

                boxes = page.locator("li .course-box-2, .course-box-2")
                count = await boxes.count()
                for index in range(count):
                    box = boxes.nth(index)
                    price_text = await self._safe_inner_text(box.locator(".current-price").first)
                    normalized_price = self._normalize_for_match(price_text)
                    if price_text and not any(token in normalized_price for token in ("mien phi", "free", "0 d", "0d", "0 dong")):
                        continue
                        
                    title_text = await self._safe_inner_text(box.locator("a.course-title").first)
                    if existing_titles and self._normalize_title_key(title_text) in existing_titles:
                        continue

                    href = await self._safe_attr(
                        box.locator("a.course-title, .course-image a, a[href*='/home/course/']").first,
                        "href",
                    )
                    clean = self._clean_url(href)
                    if clean and clean not in urls and self._is_course_url(clean):
                        urls.append(clean)
                        if len(urls) >= limit:
                            break
            except CrawlerError:
                raise
            except Exception as exc:
                diagnostics = await self._page_diagnostics(page)
                raise CrawlerListingError(
                    "Khong lay duoc danh sach khoa hoc mien phi tu hoctapgiare.top.",
                    url=next_url,
                    details={"error": str(exc), **diagnostics},
                ) from exc

            next_url = await self._next_listing_url(page, next_url, urls, limit)

        if not urls:
            print("Không còn khóa học miễn phí mới nào cần cào (tất cả đã tồn tại trong CSDL hoặc không có khóa miễn phí mới).", flush=True)
            return []
        return urls

    async def _crawl_course(self, page: Page, course_url: str, checkout_free: bool = False) -> CourseDraft:
        try:
            await page.goto(course_url, wait_until="domcontentloaded")
            await self._wait(page, networkidle_timeout=6000)
            await self._raise_if_blocked(page, course_url)
        except Exception as exc:
            if isinstance(exc, CrawlerError):
                raise
            diagnostics = await self._page_diagnostics(page)
            raise CrawlerCourseError(
                "Khong mo duoc trang chi tiet khoa hoc.",
                url=course_url,
                details={"error": str(exc), **diagnostics},
            ) from exc

        title = await self._text(page, "h1.title, h1.course-title, .course-title h1, h1")
        if not title:
            diagnostics = await self._page_diagnostics(page)
            raise CrawlerSelectorError(
                "Khong tim thay tieu de khoa hoc.",
                stage="course_detail",
                url=course_url,
                details={"selector": "h1.title, h1.course-title, h1", **diagnostics},
            )

        description_html = await self._html(
            page,
            ".description-box .description-content, .description-box, .course-description",
        )
        description_text = await self._text(
            page,
            ".description-box .description-content, .description-box, .course-description",
        )
        description_text = self._clean_description_text(description_text)
        thumbnail_url = await self._first_attr(
            page,
            [
                ".course-preview-video-box img",
                ".course-thumbnail img",
                ".course-image img",
                "meta[property='og:image']",
            ],
            "content",
            fallback_attr="src",
        )
        price_text = await self._text(page, ".current-price, .course-price, .price")
        level_text = await self._text(page, ".course-badge, .badge.badge-primary, .course-level, .level")

        if checkout_free:
            await self._enroll_free_course(page, course_url)

        course_id, course_slug = self._extract_course_identity(course_url)
        sections = await self._extract_curriculum(page, course_id, course_slug)
        lesson_count = 0
        video_count = 0
        youtube_count = 0
        mp4_count = 0
        external_video_count = 0
        pdf_count = 0
        lesson_jobs: List[tuple[LessonDraft, str]] = []

        for section in sections:
            for lesson in section["lessons"]:
                lesson_count += 1
                lesson_url = lesson.pop("source_url", None)
                if not lesson_url:
                    lesson["contents"] = self._fallback_lesson_contents(description_html or description_text)
                    continue
                lesson_jobs.append((lesson, lesson_url))

        if lesson_jobs:
            print(f"     Lessons: {len(lesson_jobs)} items with concurrency={self.max_concurrency}", flush=True)
            semaphore = asyncio.Semaphore(self.max_concurrency)

            async def crawl_lesson_job(lesson: LessonDraft, lesson_url: str) -> tuple[LessonDraft, Optional[LessonDraft], Optional[CrawlerError]]:

                async with semaphore:
                    lesson_page = await page.context.new_page()
                    lesson_page.set_default_timeout(8000)
                    lesson_page.set_default_navigation_timeout(7000)
                    try:
                        lesson_content = await asyncio.wait_for(
                            self._crawl_lesson(lesson_page, lesson_url),
                            timeout=max(10, settings.CRAWLER_LESSON_TIMEOUT_SECONDS),
                        )
                        return lesson, lesson_content, None
                    except asyncio.TimeoutError:
                        return (
                            lesson,
                            None,
                            CrawlerContentError(
                                "Qua thoi gian toi da khi crawl bai hoc, da dung fallback text de tranh treo job.",
                                url=lesson_url,
                                details={"timeout_seconds": settings.CRAWLER_LESSON_TIMEOUT_SECONDS},
                            ),
                        )
                    except CrawlerError as exc:
                        return lesson, None, exc
                    except Exception as exc:
                        return (
                            lesson,
                            None,
                            CrawlerContentError(
                                "Loi khong xac dinh khi crawl noi dung bai hoc.",
                                url=lesson_url,
                                details={"error": str(exc)},
                            ),
                        )
                    finally:
                        await lesson_page.close()

            lesson_results = await asyncio.gather(
                *(crawl_lesson_job(lesson, lesson_url) for lesson, lesson_url in lesson_jobs)
            )

            for lesson, lesson_content, lesson_error in lesson_results:
                if lesson_error is not None:
                    self.errors.append(lesson_error.to_dict())
                    lesson["contents"] = self._fallback_lesson_contents(description_html or description_text)
                    continue

                if lesson_content is None:
                    lesson["contents"] = self._fallback_lesson_contents(description_html or description_text)
                    continue

                try:
                    lesson["contents"] = lesson_content["contents"]
                    video_count += lesson_content["video_count"]
                    youtube_count += lesson_content["youtube_count"]
                    mp4_count += lesson_content["mp4_count"]
                    external_video_count += lesson_content["external_video_count"]
                    pdf_count += lesson_content["pdf_count"]
                    lesson["duration_seconds"] = lesson_content["duration_seconds"]
                except KeyError as exc:
                    self.errors.append(
                        CrawlerContentError(
                            "Du lieu noi dung bai hoc crawl ve khong hop le.",
                            details={"missing_key": str(exc)},
                        ).to_dict()
                    )
                    lesson["contents"] = self._fallback_lesson_contents(description_html or description_text)

        if not sections:
            sections = [
                {
                    "title": "Noi dung khoa hoc",
                    "lessons": [
                        {
                            "title": title,
                            "duration_seconds": 0,
                            "contents": self._fallback_lesson_contents(description_html or description_text),
                        }
                    ],
                }
            ]

        return {
            "source": "hoctapgiare",
            "source_url": course_url,
            "title": title,
            "description": description_text or self._clean_html_str(description_html, is_html=False),
            "thumbnail_url": thumbnail_url,
            "price": 0,
            "level": self._normalize_level(level_text),
            "sections": sections,
            "raw": {
                "price_text": price_text,
                "course_id": course_id,
                "course_slug": course_slug,
                "lesson_count": lesson_count,
                "video_count": video_count,
                "mp4_count": mp4_count,
                "youtube_count": youtube_count,
                "external_video_count": external_video_count,
                "pdf_count": pdf_count,
            },
        }

    async def _enroll_free_course(self, page: Page, course_url: str) -> None:
        button = page.locator(".buy-btns a.btn-buy-now, a[href*='get_enrolled_to_free_course'], button:has-text('Đăng ký ngay'), a:has-text('Đăng ký ngay')").first
        if not await button.count():
            already_purchased = await page.locator(".buy-btns .already_purchased, .course-sidebar .already_purchased, div.already_purchased, button.already_purchased").first.count()
            if already_purchased:
                return
            raise CrawlerSelectorError(
                "Khong tim thay nut dang ky khoa hoc mien phi.",
                stage="enroll_free_course",
                url=course_url,
                details={"selector": ".buy-btns a.btn-buy-now, a[href*='get_enrolled_to_free_course']"},
            )

        href = await self._safe_attr(button, "href")
        clean_href = self._clean_url(href)
        try:
            if clean_href and not clean_href.lower().startswith("javascript:"):
                await page.goto(clean_href, wait_until="domcontentloaded")
                await self._wait(page, networkidle_timeout=4000)
            else:
                await button.click()
                await self._wait(page, networkidle_timeout=6000)

            if await self._is_login_page(page):
                raise CrawlerAccessDeniedError(
                    "Trang nguon yeu cau dang nhap lai khi dang ky khoa hoc mien phi.",
                    url=course_url,
                    details={"enroll_url": href, **await self._page_diagnostics(page)},
                )

            try:
                await page.goto(course_url, wait_until="domcontentloaded")
            except PlaywrightError as exc:
                if "ERR_ABORTED" not in str(exc):
                    raise
            await self._wait(page, networkidle_timeout=4000)
            if await self._is_login_page(page):
                raise CrawlerAccessDeniedError(
                    "Khong the quay lai khoa hoc sau dang ky vi phien dang nhap khong hop le.",
                    url=course_url,
                    details={"enroll_url": href, **await self._page_diagnostics(page)},
                )

            purchased = await page.locator(".buy-btns .already_purchased, .course-sidebar .already_purchased, div.already_purchased, a[href*='/home/lesson/']").first.count()
            if not purchased:
                raise CrawlerAccessDeniedError(
                    "Da goi dang ky mien phi nhung trang khoa hoc chua hien thi trang thai da mua.",
                    url=course_url,
                    details={"enroll_url": href, **await self._page_diagnostics(page)},
                )
        except Exception as exc:
            if isinstance(exc, CrawlerError):
                raise
            raise CrawlerCourseError(
                "Da goi dang ky mien phi nhung khong quay lai duoc trang khoa hoc.",
                url=course_url,
                details={"error": str(exc), "enroll_url": href},
            ) from exc

    async def _extract_curriculum(self, page: Page, course_id: str, course_slug: str) -> List[SectionDraft]:
        sections: List[SectionDraft] = []
        groups = page.locator(".course-curriculum-box .lecture-group-wrapper, .lecture-group-wrapper")
        group_count = await groups.count()

        if group_count == 0:
            lessons = await self._extract_lessons_from_page(page, course_id, course_slug)
            if lessons:
                return [{"title": "Noi dung khoa hoc", "lessons": lessons}]
            return []

        for group_index in range(group_count):
            group = groups.nth(group_index)
            title = await self._safe_inner_text(group.locator(".lecture-group-title .title").first)
            lessons = await self._extract_lessons_from_locator(group, course_id, course_slug)
            sections.append(
                {
                    "title": title or f"Phan {group_index + 1}",
                    "lessons": lessons,
                }
            )
        return sections

    async def _extract_lessons_from_page(self, page: Page, course_id: str, course_slug: str) -> List[LessonDraft]:
        return await self._extract_lessons_from_locator(page.locator("body"), course_id, course_slug)

    async def _extract_lessons_from_locator(self, locator: Any, course_id: str, course_slug: str) -> List[LessonDraft]:
        lessons: List[LessonDraft] = []
        lesson_nodes = locator.locator("li.lecture .lecture-title, a[href*='/home/lesson/']")
        count = await lesson_nodes.count()
        for index in range(count):
            node = lesson_nodes.nth(index)
            title = (await self._safe_attr(node, "title")) or await self._safe_inner_text(node)
            onclick = await self._safe_attr(node, "onclick")
            href = await self._safe_attr(node, "href")
            lesson_url = self._lesson_url_from_values(href, onclick, course_id, course_slug)
            lessons.append(
                {
                    "title": self._clean_lesson_title(title) or f"Bai {index + 1}",
                    "duration_seconds": 0,
                    "contents": [],
                    "source_url": lesson_url,
                }
            )
        return lessons

    async def _crawl_lesson(self, page: Page, lesson_url: str) -> LessonDraft:
        captured_media_urls: List[str] = []

        def capture_media_request(request: Any) -> None:
            url = request.url
            lower_url = url.lower()
            is_media_request = request.resource_type == "media"
            is_video_url = any(ext in lower_url for ext in (".mp4", ".webm", ".mov", ".mpeg", ".mpg", ".m3u8"))
            if not is_media_request and not is_video_url:
                return
            clean_url = self._clean_url(url)
            if clean_url:
                captured_media_urls.append(clean_url)

        page.on("request", capture_media_request)
        try:
            try:
                await page.goto(lesson_url, wait_until="commit", timeout=5000)
            except PlaywrightTimeoutError:
                if urlparse(page.url).path != urlparse(lesson_url).path:
                    raise
            await page.wait_for_timeout(1400)
            await self._raise_if_blocked(page, lesson_url)
        except Exception as exc:
            if isinstance(exc, CrawlerError):
                raise
            diagnostics = await self._page_diagnostics(page)
            raise CrawlerContentError(
                "Khong mo duoc trang bai hoc.",
                url=lesson_url,
                details={"error": str(exc), **diagnostics},
            ) from exc
        finally:
            try:
                page.remove_listener("request", capture_media_request)
            except Exception:
                pass

        contents: List[LessonContentDraft] = []
        seen_urls: set[str] = set()
        sort_order = 0

        def add_url_content(content_type: str, link: str) -> None:
            nonlocal sort_order
            if link in seen_urls:
                return
            seen_urls.add(link)
            contents.append({"type": content_type, "url": link, "sort_order": sort_order})
            sort_order += 1

        embedded_video_selector = (
            "#player iframe, "
            ".playing-box iframe, "
            ".video-player iframe, "
            ".embed-responsive iframe, "
            "iframe[src*='youtube.com'], "
            "iframe[src*='youtube-nocookie.com'], "
            "iframe[src*='youtu.be'], "
            "iframe[src*='drive.google.com'], "
            "iframe[src*='player.vimeo.com'], "
            "iframe[src*='rumble.com'], "
            "iframe[src*='dailymotion.com'], "
            "iframe[src*='ok.ru'], "
            "iframe[data-src*='youtube.com'], "
            "iframe[data-src*='youtu.be'], "
            "iframe[data-src*='drive.google.com']"
        )
        for link in await self._links(page, embedded_video_selector, attr="src"):
            add_url_content("video", link)

        direct_video_selector = (
            "video source[src], "
            "video[src], "
            "source[src*='.mp4'], "
            "source[src*='.webm'], "
            "source[src*='.mov'], "
            "a[href*='.mp4'], "
            "a[href*='.webm'], "
            "a[href*='.mov'], "
            "a[href*='drive.google.com']"
        )
        for link in await self._links(page, direct_video_selector, attr="src"):
            add_url_content("video", link)

        for link in captured_media_urls:
            add_url_content("video", link)

        for link in await self._links(page, "a[href$='.pdf'], a[href*='.pdf?']"):
            add_url_content("pdf", link)

        for content_type, link in await self._extract_media_urls_from_page_source(page):
            add_url_content(content_type, link)

        text_html = await self._html(page, "#lesson-summary .card-body, .lesson-summary, .lesson-content", timeout=350)
        text_plain = await self._text(page, "#lesson-summary .card-body, .lesson-summary, .lesson-content", timeout=350)
        if text_html and "không tìm thấy tóm tắt" not in text_plain.lower():
            contents.append({"type": "text", "text": text_html, "sort_order": sort_order})

        if not contents:
            contents.append(
                {
                    "type": "text",
                    "text": "Bai hoc duoc crawl tu nguon ngoai nhung khong tim thay noi dung hien thi phu hop.",
                    "sort_order": 0,
                }
            )

        # --- Resolve embed URLs to real downloadable video URLs ---
        for item in contents:
            if item.get("type") != "video" or not item.get("url"):
                continue
            url = item["url"]
            if self._is_youtube_like_url(url) or self._is_direct_video_file_url(url):
                continue
            if self._is_probably_downloadable_video_url(url):
                continue
            # This is an embed URL (Rumble, Vimeo, etc.) - try to extract real .mp4.
            try:
                real_url = await asyncio.wait_for(
                    self._extract_real_video_url(page.context, url),
                    timeout=max(5, settings.CRAWLER_RESOLVE_VIDEO_TIMEOUT_SECONDS),
                )
            except asyncio.TimeoutError:
                real_url = None
            if real_url:
                item["url"] = real_url

        video_urls = [
            item.get("url", "")
            for item in contents
            if item.get("type") == "video" and item.get("url")
        ]
        youtube_count = sum(1 for url in video_urls if self._is_youtube_like_url(str(url)))
        mp4_count = sum(1 for url in video_urls if self._is_direct_video_file_url(str(url)))

        return {
            "contents": contents,
            "duration_seconds": 0,
            "video_count": len(video_urls),
            "youtube_count": youtube_count,
            "mp4_count": mp4_count,
            "external_video_count": max(len(video_urls) - youtube_count - mp4_count, 0),
            "pdf_count": sum(1 for item in contents if item.get("type") == "pdf"),
        }

    async def _wait(self, page: Page, *, networkidle_timeout: int = 6000) -> None:
        await page.wait_for_load_state("domcontentloaded")
        try:
            await page.wait_for_load_state("networkidle", timeout=networkidle_timeout)
        except Exception:
            pass

    async def _extract_real_video_url(self, context: Any, embed_url: str) -> Optional[str]:
        """Open an embed iframe URL in a fresh browser context (without media
        blocking), intercept network requests and inspect the DOM to capture
        the real downloadable video URL (.mp4/.webm)."""
        browser = context.browser
        if browser is None:
            return None

        captured_urls: List[str] = []

        def _on_request(request: Any) -> None:
            url = request.url
            resource_type = request.resource_type
            parsed_path = urlparse(url).path.lower()
            is_video_resource = resource_type == "media"
            is_video_extension = any(parsed_path.endswith(ext) for ext in (".mp4", ".webm", ".mov", ".m3u8"))
            if is_video_resource or is_video_extension:
                captured_urls.append(url)

        # Create a clean context without any resource-blocking routes
        clean_context = await browser.new_context()
        page = await clean_context.new_page()
        try:
            page.on("request", _on_request)
            try:
                await page.goto(embed_url, wait_until="domcontentloaded", timeout=20000)
            except PlaywrightTimeoutError:
                pass
            await page.wait_for_timeout(min(8000, max(1000, settings.CRAWLER_RESOLVE_VIDEO_TIMEOUT_SECONDS * 500)))

            # Strategy 1: Check <video> and <source> tags in the DOM
            try:
                dom_srcs = await page.evaluate("""() => {
                    const results = [];
                    document.querySelectorAll('video, source, video source').forEach(el => {
                        const src = el.src || el.getAttribute('src');
                        if (src) results.push(src);
                    });
                    return results;
                }""")
                captured_urls.extend(dom_srcs)
            except Exception:
                pass

            # Strategy 2: Regex search page source for .mp4/.webm URLs
            try:
                html = await page.content()
                import re as _re
                video_urls_in_html = _re.findall(r'(https?://[^\s"\'<>&]+\.(?:mp4|webm|mov)[^\s"\'<>&]*)', html)
                captured_urls.extend(video_urls_in_html)
            except Exception:
                pass

            # Return the first valid video file URL from all strategies
            for url in captured_urls:
                lower = url.lower()
                if any(ext in lower for ext in (".mp4", ".webm", ".mov")):
                    return url
            return None
        except Exception:
            return None
        finally:
            try:
                page.remove_listener("request", _on_request)
            except Exception:
                pass
            try:
                await page.close()
            except Exception:
                pass
            try:
                await clean_context.close()
            except Exception:
                pass

    async def _route_lightweight_resources(self, route: Any) -> None:
        if route.request.resource_type in {"font", "image", "media"}:
            await route.abort()
            return
        await route.continue_()

    def _clean_html_str(self, val: str, is_html: bool = False) -> str:
        if not val:
            return ""
        cleaned = val.replace("\x00", "")
        cleaned = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", "", cleaned)
        if is_html:
            cleaned = re.sub(r'<div[^>]*class="[^"]*view-more[^"]*"[^>]*>.*?</div>', "", cleaned, flags=re.IGNORECASE | re.DOTALL)
            cleaned = re.sub(r'<div[^>]*class="[^"]*description-title[^"]*"[^>]*>.*?</div>', "", cleaned, flags=re.IGNORECASE | re.DOTALL)
            cleaned = re.sub(r'<span[^>]*xss="removed"[^>]*>.*?</span>', "", cleaned, flags=re.IGNORECASE | re.DOTALL)
            cleaned = re.sub(r'<(script|style)[^>]*>.*?</\1>', "", cleaned, flags=re.IGNORECASE | re.DOTALL)
            cleaned = re.sub(r'\s+(onclick|onerror|onload|xss)=("[^"]*"|\'[^\']*\'|[^\s>]+)', "", cleaned, flags=re.IGNORECASE)
        else:
            cleaned = re.sub(r'<(script|style)[^>]*>.*?</\1>', "", cleaned, flags=re.IGNORECASE | re.DOTALL)
            cleaned = re.sub(r'<div[^>]*class="[^"]*view-more[^"]*"[^>]*>.*?</div>', "", cleaned, flags=re.IGNORECASE | re.DOTALL)
            cleaned = re.sub(r'<div[^>]*class="[^"]*description-title[^"]*"[^>]*>.*?</div>', "", cleaned, flags=re.IGNORECASE | re.DOTALL)
            cleaned = re.sub(r'<br\s*/?>|</p>|</div>', "\n", cleaned, flags=re.IGNORECASE)
            cleaned = re.sub(r'<[^>]+>', " ", cleaned)
            cleaned = re.sub(r'[ \t]+', ' ', cleaned)
            cleaned = re.sub(r'\n\s*\n+', '\n\n', cleaned)
        return cleaned.strip()

    async def _text(self, page: Page, selector: str, timeout: int = 5000) -> str:
        try:
            val = await page.locator(selector).first.inner_text(timeout=timeout)
            return self._clean_html_str(val, is_html=False)
        except Exception:
            return ""

    async def _html(self, page: Page, selector: str, timeout: int = 5000) -> str:
        try:
            val = await page.locator(selector).first.inner_html(timeout=timeout)
            return self._clean_html_str(val, is_html=True)
        except Exception:
            return ""

    async def _attr(self, page: Page, selector: str, attr: str) -> Optional[str]:
        try:
            return await page.locator(selector).first.get_attribute(attr, timeout=5000)
        except Exception:
            return None

    async def _first_attr(
        self,
        page: Page,
        selectors: List[str],
        attr: str,
        *,
        fallback_attr: Optional[str] = None,
    ) -> Optional[str]:
        for selector in selectors:
            value = await self._attr(page, selector, attr)
            if not value and fallback_attr:
                value = await self._attr(page, selector, fallback_attr)
            if value:
                return self._clean_url(value)
        return None

    async def _links(self, page: Page, selector: str, attr: str = "href") -> List[str]:
        try:
            links = await page.locator(selector).evaluate_all(
                """(els, attr) => els.map(e =>
                    e.getAttribute(attr) ||
                    e.getAttribute('src') ||
                    e.getAttribute('href') ||
                    e.getAttribute('data-src') ||
                    e.getAttribute('data-lazy-src') ||
                    e.getAttribute('data-url')
                ).filter(Boolean)""",
                attr,
            )
            return [clean for link in links if (clean := self._clean_url(str(link)))]
        except Exception:
            return []

    async def _click_first(self, page: Page, selectors: List[str]) -> bool:
        for selector in selectors:
            locator = page.locator(selector).first
            try:
                if await locator.count() > 0:
                    await locator.click()
                    return True
            except Exception:
                continue
        return False

    async def _safe_inner_text(self, locator: Any) -> str:
        try:
            return (await locator.inner_text(timeout=3000)).strip()
        except Exception:
            return ""

    async def _safe_attr(self, locator: Any, attr: str) -> Optional[str]:
        try:
            return await locator.get_attribute(attr, timeout=3000)
        except Exception:
            return None

    async def _page_diagnostics(self, page: Page) -> Dict[str, Any]:
        diagnostics: Dict[str, Any] = {"current_url": page.url}
        try:
            diagnostics["title"] = await page.title()
        except Exception:
            diagnostics["title"] = ""
        for key, selector in {
            "course_box_count": ".course-box-2",
            "course_title_count": "a.course-title",
            "curriculum_count": ".course-curriculum-box .lecture-title",
            "login_form_count": "#login-email, input[name='email']",
        }.items():
            try:
                diagnostics[key] = await page.locator(selector).count()
            except Exception:
                diagnostics[key] = None
        try:
            body_text = await page.locator("body").inner_text(timeout=3000)
            diagnostics["body_preview"] = body_text[:500]
        except Exception:
            diagnostics["body_preview"] = ""
        return diagnostics

    async def _looks_blocked(self, page: Page) -> bool:
        try:
            body_text = (await page.locator("body").inner_text(timeout=3000)).lower()
        except Exception:
            return False
        blocked_terms = [
            "cloudflare",
            "checking your browser",
            "just a moment",
            "access denied",
            "verify you are human",
            "attention required",
        ]
        return any(term in body_text for term in blocked_terms)

    async def _raise_if_blocked(self, page: Page, url: str) -> None:
        if await self._looks_blocked(page):
            diagnostics = await self._page_diagnostics(page)
            raise CrawlerAccessDeniedError(
                "Trang nguon co dau hieu chan crawler hoac yeu cau xac minh nguoi dung.",
                url=url,
                details=diagnostics,
            )

    async def _is_login_page(self, page: Page) -> bool:
        if "/login" in page.url:
            return True
        try:
            return await page.locator("#login-email, input[name='email']").first.is_visible(timeout=1200)
        except Exception:
            return False

    async def _has_authenticated_session(self, page: Page) -> bool:
        authenticated_selectors = [
            "a[href*='/home/my_courses']",
            "a[href*='logout']",
            "a[href*='log_out']",
            ".user-dropdown",
            ".user-box",
            ".logged-in-user",
            ".dropdown-user",
            ".user-menu",
        ]
        for selector in authenticated_selectors:
            try:
                if await page.locator(selector).first.count():
                    return True
            except Exception:
                continue

        try:
            login_link_count = await page.locator("a[href*='/login'], a[href*='login']").count()
        except Exception:
            login_link_count = 0
        return login_link_count == 0

    async def _next_listing_url(self, page: Page, current_url: str, urls: List[str], limit: int) -> Optional[str]:
        if len(urls) >= limit:
            return None
        try:
            hrefs = await page.locator(".pagination a[href*='/home/courses']").evaluate_all(
                "(els) => els.map(e => e.href).filter(Boolean)"
            )
        except Exception:
            hrefs = []

        current_offset = self._listing_offset(current_url)
        candidates: List[tuple[int, str]] = []
        for href in hrefs:
            clean = self._clean_url(str(href))
            if not clean:
                continue
            offset = self._listing_offset(clean)
            if offset > current_offset:
                candidates.append((offset, clean))

        if candidates:
            candidates.sort(key=lambda item: item[0])
            return candidates[0][1]

        for selector in [
            "a[rel='next']",
            ".pagination a:has-text('›')",
            ".pagination a:has-text('»')",
            ".pagination a:has-text('Next')",
            ".pagination li:not(.disabled) a.page-link[aria-label*='Next']",
        ]:
            href = await self._attr(page, selector, "href")
            clean = self._clean_url(href)
            if clean and clean != current_url:
                return clean
        return None

    def _listing_offset(self, url: str) -> int:
        parsed = urlparse(url)
        match = re.search(r"/home/courses/(\d+)$", parsed.path.rstrip("/"))
        if match:
            return int(match.group(1))
        return 0

    def _normalize_source_url(self, source_url: str) -> str:
        source_url = source_url.strip() if source_url else self.free_courses_url
        parsed = urlparse(source_url)
        if not parsed.netloc:
            source_url = urljoin(self.base_url, source_url)
            parsed = urlparse(source_url)
        if parsed.path.rstrip("/") == "/home/courses":
            query = dict(parse_qsl(parsed.query))
            query.update(
                {
                    "category": query.get("category", "all"),
                    "price": "free",
                    "level": query.get("level", "all"),
                    "language": query.get("language", "all"),
                    "rating": query.get("rating", "all"),
                    "sort_by": query.get("sort_by", "newest"),
                }
            )
            return urlunparse(parsed._replace(query=urlencode(query)))
        return source_url

    def _clean_url(self, value: Optional[str]) -> Optional[str]:
        if not value:
            return None
        decoded = html.unescape(str(value))
        return urljoin(self.base_url, decoded.split("#", 1)[0].strip())

    def _is_course_url(self, url: str) -> bool:
        parsed = urlparse(url)
        return "hoctapgiare.top" in parsed.netloc and "/home/course/" in parsed.path

    def _is_probably_downloadable_video_url(self, url: str) -> bool:
        if self._is_direct_video_file_url(url):
            return True
        parsed = urlparse(url)
        host = parsed.netloc.lower()
        path = parsed.path.lower()
        query = parsed.query.lower()
        if "dl.dropboxusercontent.com" in host:
            return True
        if "drive.google.com" in host and path.endswith("/uc") and "export=download" in query:
            return True
        return False

    async def _extract_media_urls_from_page_source(self, page: Page) -> List[tuple[str, str]]:
        try:
            html = await page.content()
        except Exception:
            return []

        patterns = [
            ("video", r"https?://[^\s\"'<>()]+(?:youtube\.com|youtube-nocookie\.com|youtu\.be)[^\s\"'<>()]*"),
            ("video", r"https?://[^\s\"'<>()]+\.(?:mp4|webm|mov|mpeg|mpg)(?:\?[^\s\"'<>()]*)?"),
            ("pdf", r"https?://[^\s\"'<>()]+\.pdf(?:\?[^\s\"'<>()]*)?"),
        ]
        results: List[tuple[str, str]] = []
        for content_type, pattern in patterns:
            for match in re.findall(pattern, html, flags=re.IGNORECASE):
                clean = self._clean_url(match)
                if clean:
                    results.append((content_type, clean))
        return results

    def _extract_course_identity(self, course_url: str) -> tuple[str, str]:
        parsed = urlparse(course_url)
        match = re.search(r"/home/course/([^/]+)/(\d+)", parsed.path)
        if not match:
            return "", ""
        return match.group(2), match.group(1)

    def _lesson_url_from_values(self, href: Optional[str], onclick: Optional[str], course_id: str, course_slug: str) -> Optional[str]:
        clean_href = self._clean_url(href)
        if clean_href and "/home/lesson/" in urlparse(clean_href).path:
            return clean_href

        if onclick:
            match = re.search(r"go_course_playing_page\(['\"](?P<course_id>\d+)['\"],\s*['\"](?P<lesson_id>\d+)['\"]\)", onclick)
            if match:
                resolved_course_id = match.group("course_id") or course_id
                lesson_id = match.group("lesson_id")
                if resolved_course_id and lesson_id and course_slug:
                    return f"{self.base_url}/home/lesson/{course_slug}/{resolved_course_id}/{lesson_id}"
        return None

    def _fallback_lesson_contents(self, text: Optional[str]) -> List[LessonContentDraft]:
        return [{"type": "text", "text": text or "Bai hoc chua co noi dung cu the.", "sort_order": 0}]

    def _clean_lesson_title(self, value: Optional[str]) -> str:
        return re.sub(r"\s+", " ", (value or "").strip())

    def _normalize_level(self, value: str) -> str:
        lowered = value.lower()
        if "trung" in lowered or "intermediate" in lowered:
            return "intermediate"
        if "cao" in lowered or "advanced" in lowered:
            return "advanced"
        return "beginner"

    def _get_storage_state_path(self) -> Optional[Path]:
        if not self.storage_state_path:
            return None

        path = Path(self.storage_state_path)
        if not path.is_absolute():
            path = TOOL_ROOT / path

        if not path.exists():
            if self.email and self.password:
                return None
            raise CrawlerConfigError(
                "Da cau hinh storage_state nhung file khong ton tai.",
                details={
                    "storage_state_path": str(path),
                    "hint": "Chay python -m main --login --email ... --password ... trong thu muc lms-crawler-tool de tao file session.",
                },
            )
        return path

    async def _save_storage_state(self, context: Any) -> None:
        if not self.storage_state_path:
            return
        path = Path(self.storage_state_path)
        if not path.is_absolute():
            path = TOOL_ROOT / path
        path.parent.mkdir(parents=True, exist_ok=True)
        await context.storage_state(path=str(path))

    def _user_agent(self) -> str:
        return (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/120.0.0.0 Safari/537.36"
        )
