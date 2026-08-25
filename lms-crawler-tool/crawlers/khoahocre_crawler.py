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


class KhoaHoCreCrawler(BaseCourseCrawler):
    """Crawler thu thập dữ liệu khóa học từ khoahocre.com (dựa trên LearnPress & Elementor)."""

    base_url = "https://khoahocre.com"
    login_url = "https://khoahocre.com/join/"
    free_courses_url = "https://khoahocre.com/shop-khoa-hoc/?sort_by=on_free"

    def __init__(
        self,
        email: Optional[str] = None,
        password: Optional[str] = None,
        headless: bool = True,
        storage_state_path: Optional[str] = None,
        max_concurrency: int = 8,
    ) -> None:
        self.email = email or getattr(settings, "CRAWLER_KHOAHOCRE_EMAIL", None)
        self.password = password or getattr(settings, "CRAWLER_KHOAHOCRE_PASSWORD", None)
        self.headless = headless
        self.storage_state_path = (
            storage_state_path
            or getattr(settings, "CRAWLER_KHOAHOCRE_STORAGE_STATE_PATH", "./storage_states/khoahocre.json")
        )
        self.max_concurrency = max(1, min(int(max_concurrency or 1), 32))
        self.errors: List[Dict[str, Any]] = []

    async def crawl(
        self,
        source_url: str,
        limit: int = 5,
        checkout_free: bool = False,
        on_draft: Optional[Callable[[CourseDraft], Awaitable[None]]] = None,
        existing_titles: Optional[set[str]] = None,
    ) -> List[CourseDraft]:
        self.errors = []
        playwright_context = async_playwright()
        playwright = None
        browser = None
        try:
            playwright = await playwright_context.start()
            browser = await playwright.chromium.launch(headless=self.headless)
        except Exception as exc:
            raise CrawlerBrowserError(
                "Không khởi động được Chromium/Playwright.",
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
                        print(f"  -> Crawling khoahocre course {course_index}/{total_courses}: {course_url}", flush=True)
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
                                "Quá thời gian tối đa khi crawl chi tiết khóa học, đã bỏ qua khóa này để tiếp tục khóa khác.",
                                url=course_url,
                                details={"timeout_seconds": settings.CRAWLER_COURSE_TIMEOUT_SECONDS},
                            ).to_dict()
                        )
                    except CrawlerError as exc:
                        self.errors.append(exc.to_dict())
                    except Exception as exc:
                        self.errors.append(
                            CrawlerCourseError(
                                "Lỗi không xác định khi crawl chi tiết khóa học khoahocre.",
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

            # Form login trên WordPress / LearnPress / khoahocre
            login_form = page.locator("form#khrLoginForm, form#loginform, form.learn-press-form-login, form[action*='wp-login.php'], form:has(input[name='user_login']), form:has(input[name='username']), #khrUser").first
            if not await login_form.count():
                raise CrawlerLoginError(
                    "Không tìm thấy form đăng nhập trên khoahocre.com.",
                    url=page.url,
                    details=await self._page_diagnostics(page),
                )

            await page.fill("#khrUser, input[name='log'], input[name='user_login'], input[name='username'], input[type='email']", email)
            await page.fill("#khrPass, input[name='pwd'], input[name='user_password'], input[name='password'], input[type='password']", password)
            await page.click("button.khr-join-submit, button[name='wp-submit'], button[type='submit'], input[type='submit'], button:has-text('Đăng nhập'), button:has-text('Login')")
            await self._wait(page, networkidle_timeout=6000)

            if await self._is_login_page(page) or not await self._has_authenticated_session(page):
                error_text = await self._text(page, "#khrJoinMsg, .khr-join-msg, .login-error, #login_error, .learn-press-message.error, .alert, .toast-message, body")
                raise CrawlerLoginError(
                    "Đăng nhập thất bại (sai tài khoản/mật khẩu hoặc bị chặn bởi Captcha/Cloudflare).",
                    url=page.url,
                    details={
                        "site_message": error_text[:500],
                        **await self._page_diagnostics(page),
                    },
                )
        except Exception as exc:
            if isinstance(exc, CrawlerError):
                raise
            raise CrawlerLoginError(
                "Lỗi ngoại lệ khi thực hiện đăng nhập khoahocre.com.",
                url=page.url,
                details={"error": str(exc), **await self._page_diagnostics(page)},
            ) from exc

    async def _activate_stored_session(self, page: Page) -> bool:
        try:
            await page.goto(self.base_url, wait_until="domcontentloaded")
            await self._wait(page, networkidle_timeout=4000)
            if await self._has_authenticated_session(page):
                return True
        except Exception:
            return False
        return False

    async def _has_authenticated_session(self, page: Page) -> bool:
        if await self._is_login_page(page):
            return False
        try:
            # Kiểm tra profile widget (#khrProfileWidget) hoặc link hồ sơ
            is_logged_in = await page.locator("#khrProfileWidget[data-logged='1'], .khrPW-user, .profile-info, a[href*='/ho-so/'], a[href*='/profile/'], .logout").first.count() > 0
            return is_logged_in
        except Exception:
            return False

    async def _resolve_course_urls(
        self,
        page: Page,
        source_url: str,
        limit: int,
        existing_titles: Optional[set[str]] = None,
    ) -> List[str]:
        # Nếu url là đường dẫn trực tiếp đến 1 khóa học (/khoa-hoc/abc/)
        if "/khoa-hoc/" in source_url and "/shop-khoa-hoc/" not in source_url:
            return [self._clean_url(source_url)]

        course_urls: List[str] = []
        visited_pages: set[str] = set()
        current_url = source_url

        try:
            while current_url and len(course_urls) < limit:
                if current_url in visited_pages:
                    break
                visited_pages.add(current_url)

                await page.goto(current_url, wait_until="domcontentloaded")
                await self._wait(page, networkidle_timeout=4000)
                await self._raise_if_blocked(page, current_url)

                boxes = page.locator(".thim-ekits-course__item, .lp_course, .course-item").all()
                box_list = await boxes
                if not box_list:
                    # Kiểm tra thử nếu không thấy item nào
                    pass

                for box in box_list:
                    if len(course_urls) >= limit:
                        break

                    # Kiểm tra giá khóa học nếu cần chỉ cào free
                    price_text = await self._safe_inner_text(box.locator(".course-price, .thim-ekits-course__price").first)
                    normalized_price = self._normalize_for_match(price_text)
                    is_free_query = "sort_by=on_free" in current_url.lower() or "free" in current_url.lower()
                    if not is_free_query and price_text and not any(token in normalized_price for token in ("mien phi", "free", "0 d", "0d", "0 dong", "0")):
                        continue

                    title_text = await self._safe_inner_text(box.locator(".elementor-heading-title a, .thim-ekits-course__title a, a.course-title").first)
                    if existing_titles and self._normalize_title_key(title_text) in existing_titles:
                        print(f"     [Skip] Bỏ qua khóa học đã tồn tại trong CSDL: '{title_text}'")
                        continue

                    link_el = box.locator(".elementor-heading-title a, .thim-ekits-course__title a, a.thim-ekits-course__thumbnail, a.course-title").first
                    href = await self._safe_attr(link_el, "href")
                    if not href:
                        href = await self._safe_attr(box.locator("a[href*='/khoa-hoc/']").first, "href")

                    if href:
                        clean = self._clean_url(href)
                        if clean and clean not in course_urls and "/khoa-hoc/" in clean:
                            course_urls.append(clean)

                if len(course_urls) >= limit:
                    break

                # Trang tiếp theo (next page)
                next_page_link = await self._first_attr(
                    page,
                    [
                        "a.next.page-numbers",
                        "a.next",
                        ".pagination a.next",
                        ".page-numbers a.next"
                    ],
                    "href",
                )
                current_url = next_page_link if next_page_link and next_page_link not in visited_pages else ""

        except Exception as exc:
            if isinstance(exc, CrawlerError):
                raise
            raise CrawlerListingError(
                "Lỗi khi thu thập danh sách khóa học từ trang danh mục khoahocre.",
                url=source_url,
                details={"error": str(exc), **await self._page_diagnostics(page)},
            ) from exc

        if not course_urls:
            raise CrawlerListingError(
                "Không tìm thấy URL khóa học nào phù hợp từ trang danh mục.",
                url=source_url,
                details=await self._page_diagnostics(page),
            )

        return course_urls[:limit]

    async def _crawl_course(self, page: Page, course_url: str, checkout_free: bool = False) -> CourseDraft:
        try:
            await page.goto(course_url, wait_until="domcontentloaded")
            await self._wait(page, networkidle_timeout=5000)
            await self._raise_if_blocked(page, course_url)
        except Exception as exc:
            if isinstance(exc, CrawlerError):
                raise
            raise CrawlerCourseError(
                "Không truy cập được trang chi tiết khóa học.",
                url=course_url,
                details={"error": str(exc), **await self._page_diagnostics(page)},
            ) from exc

        # Lấy tiêu đề từ thẻ H1 hoặc og:title
        title = await self._text(page, ".thim-ekit-single-course__title__content, .thim-ekit-single-course__title h1, h1.course-title, h1")
        if not title:
            og_title = await self._attr(page, "meta[property='og:title']", "content")
            if og_title:
                title = og_title.replace(" - Shop Khóa Học Rẻ", "").strip()

        if not title:
            raise CrawlerCourseError(
                "Không đọc được tiêu đề khóa học.",
                url=course_url,
                details=await self._page_diagnostics(page),
            )

        # Thumbnail từ meta og:image (chính xác và chất lượng cao trên WordPress)
        thumbnail_url = await self._first_attr(
            page,
            [
                "meta[property='og:image']",
                "meta[name='twitter:image']",
                ".thim-ekits-course__thumbnail img",
                ".elementor-widget-container img.attachment-large",
            ],
            "content",
            fallback_attr="src",
        ) or ""

        # Mô tả khóa học
        description_html = await self._html(
            page,
            "#panel-overview .course-description, #panel-overview, .thim-course-content, .learn-press-course-description, #learn-press-course-description",
        )
        description_text = await self._text(
            page,
            "#panel-overview .course-description, #panel-overview, .thim-course-content, .learn-press-course-description, #learn-press-course-description",
        )
        description_text = self._clean_description_text(description_text)

        # Giá và trình độ
        price_text = await self._text(page, ".course-price, .thim-ekit-single-course__price, .price")
        level_text = "All levels" # LearnPress mặc định thường là mọi cấp độ, có thể đọc thêm từ .thim-ekit-single-course__meta

        # Định danh
        course_id = (
            await self._attr(page, "input[name='course-id'], input[name='item-id'], form[name='form-add-item-to-cart'] input[name='item-id']", "value")
            or await self._attr(page, "body", "data-course-id")
            or ""
        )
        course_slug = urlparse(course_url).path.strip("/").split("/")[-1]

        # Kiểm tra trạng thái đã đăng ký (enrolled) hay cần bấm đăng ký (nếu checkout_free=True)
        if checkout_free:
            try:
                enroll_btn_count = await page.locator("form[name='form-add-item-to-cart'] button, .lp-btn-add-item-to-cart, button.lp-button:has-text('Đăng ký'), a.lp-button:has-text('Đăng ký'), button:has-text('Học ngay')").first.count()
                if enroll_btn_count > 0:
                    await self._enroll_free_course(page, course_url)
            except Exception as exc:
                print(f"     [Warning] Cảnh báo khi thử đăng ký khóa học: {exc}")

        # Bóc tách danh sách chương và bài học
        sections: List[SectionDraft] = []
        lesson_jobs: List[tuple[LessonDraft, str]] = []

        # Xổ ra toàn bộ các section nếu bị thu gọn (Collapse/Expand)
        try:
            expand_btn = page.locator(".course-toggle-all-sections:not(.lp-collapse)").first
            if await expand_btn.count() > 0 and await expand_btn.is_visible():
                await expand_btn.click()
                await self._wait(page, networkidle_timeout=1500)
        except Exception:
            pass

        section_nodes = await page.locator(".lp-course-curriculum .course-sections .course-section").all()
        for s_idx, section_node in enumerate(section_nodes, 1):
            s_title = await self._safe_inner_text(section_node.locator(".course-section__title").first)
            if not s_title:
                s_title = f"Chương {s_idx}"

            lessons_in_section: List[LessonDraft] = []
            lesson_nodes = await section_node.locator(".course-section__items .course-item").all()

            for lesson_node in lesson_nodes:
                # Chỉ lấy bài học (lp_lesson), bỏ qua quiz nếu có
                item_type = await self._safe_attr(lesson_node, "data-item-type")
                if item_type and item_type != "lp_lesson":
                    continue

                l_title = await self._safe_inner_text(lesson_node.locator(".course-item-title").first)
                link_node = lesson_node.locator("a.course-item__link").first
                l_href = await self._safe_attr(link_node, "href")
                if not l_href:
                    l_href = await self._safe_attr(lesson_node.locator("a").first, "href")

                clean_l_url = self._clean_url(l_href) if l_href else ""
                lesson_draft: LessonDraft = {
                    "title": l_title or "Bài học không tên",
                    "duration_seconds": 300, # mặc định
                    "source_url": clean_l_url,
                    "contents": [],
                }
                lessons_in_section.append(lesson_draft)

                if clean_l_url and clean_l_url != course_url:
                    lesson_jobs.append((lesson_draft, clean_l_url))

            if lessons_in_section:
                sections.append({"title": s_title, "lessons": lessons_in_section})

        # Tiến hành cào chi tiết từng bài học (song song theo semaphore concurrency)
        lesson_count = len(lesson_jobs)
        video_count = 0
        mp4_count = 0
        youtube_count = 0
        external_video_count = 0
        pdf_count = 0

        if lesson_jobs:
            semaphore = asyncio.Semaphore(self.max_concurrency)

            async def crawl_lesson_job(lesson: LessonDraft, lesson_url: str) -> tuple[LessonDraft, Optional[Dict[str, Any]], Optional[CrawlerError]]:
                async with semaphore:
                    lesson_page = await page.context.new_page()
                    try:
                        lesson_content = await asyncio.wait_for(
                            self._crawl_lesson(lesson_page, lesson_url),
                            timeout=max(30, settings.CRAWLER_LESSON_TIMEOUT_SECONDS),
                        )
                        return lesson, lesson_content, None
                    except asyncio.TimeoutError:
                        return (
                            lesson,
                            None,
                            CrawlerContentError(
                                "Quá thời gian tối đa khi cào nội dung bài học.",
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
                                "Lỗi ngoại lệ không xác định khi cào nội dung bài học khoahocre.",
                                url=lesson_url,
                                details={"error": str(exc)},
                            ),
                        )
                    finally:
                        await lesson_page.close()

            lesson_results = await asyncio.gather(
                *(crawl_lesson_job(lesson, l_url) for lesson, l_url in lesson_jobs)
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
                    if lesson_content["duration_seconds"] > 0:
                        lesson["duration_seconds"] = lesson_content["duration_seconds"]
                except KeyError as exc:
                    self.errors.append(
                        CrawlerContentError(
                            "Dữ liệu nội dung bài học trả về không hợp lệ.",
                            details={"missing_key": str(exc)},
                        ).to_dict()
                    )
                    lesson["contents"] = self._fallback_lesson_contents(description_html or description_text)

        if not sections:
            sections = [
                {
                    "title": "Nội dung khóa học",
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
            "source": "khoahocre",
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
        button = page.locator("form[name='form-add-item-to-cart'] button, .lp-btn-add-item-to-cart, button.lp-button:has-text('Đăng ký'), a.lp-button:has-text('Đăng ký'), button:has-text('Học ngay')").first
        if not await button.count():
            return

        try:
            await button.click()
            await self._wait(page, networkidle_timeout=5000)

            if await self._is_login_page(page):
                raise CrawlerAccessDeniedError(
                    "Trang yêu cầu đăng nhập khi thực hiện đăng ký khóa học miễn phí.",
                    url=course_url,
                    details=await self._page_diagnostics(page),
                )
        except Exception as exc:
            print(f"     [Enroll Notice] {exc}")

    async def _crawl_lesson(self, page: Page, lesson_url: str) -> Dict[str, Any]:
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
            await page.wait_for_timeout(1500)
            await self._raise_if_blocked(page, lesson_url)
        except Exception as exc:
            if isinstance(exc, CrawlerError):
                raise
            diagnostics = await self._page_diagnostics(page)
            raise CrawlerContentError(
                "Không mở được trang bài học khoahocre.",
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

        # Cào video embed từ iframe
        embedded_video_selector = (
            ".learn-press-video-intro iframe, "
            ".video-content iframe, "
            ".responsive-iframe iframe, "
            "#player iframe, "
            "iframe[src*='abyssplayer.com'], "
            "iframe[src*='youtube.com'], "
            "iframe[src*='youtube-nocookie.com'], "
            "iframe[src*='youtu.be'], "
            "iframe[src*='drive.google.com'], "
            "iframe[src*='vimeo.com'], "
            "iframe[data-src]"
        )
        for link in await self._links(page, embedded_video_selector, attr="src"):
            add_url_content("video", link)

        # Cào video trực tiếp từ thẻ video / source / m3u8
        direct_video_selector = (
            "video source[src], "
            "video[src], "
            "source[src*='.mp4'], "
            "source[src*='.webm'], "
            "source[src*='.m3u8'], "
            "a[href*='.mp4'], "
            "a[href*='drive.google.com']"
        )
        for link in await self._links(page, direct_video_selector, attr="src"):
            add_url_content("video", link)

        for link in captured_media_urls:
            add_url_content("video", link)

        # Cào PDF
        for link in await self._links(page, "a[href$='.pdf'], a[href*='.pdf?']"):
            add_url_content("pdf", link)

        # Cào nội dung text / ghi chú của bài học
        text_html = await self._html(page, ".learn-press-content-item-summary, .learn-press-message, .lesson-content, #lesson-summary")
        text_plain = await self._text(page, ".learn-press-content-item-summary, .learn-press-message, .lesson-content, #lesson-summary")
        if text_html and "chưa có nội dung" not in text_plain.lower():
            contents.append({"type": "text", "text": text_html, "sort_order": sort_order})

        if not contents:
            contents.append(
                {
                    "type": "text",
                    "text": "Bài học từ khoahocre nhưng không tìm thấy video hoặc tài liệu đính kèm cụ thể.",
                    "sort_order": 0,
                }
            )

        video_count = sum(1 for item in contents if item.get("type") == "video")
        pdf_count = sum(1 for item in contents if item.get("type") == "pdf")
        youtube_count = sum(
            1 for item in contents if item.get("type") == "video" and self._is_youtube_like_url(str(item.get("url") or ""))
        )
        mp4_count = sum(
            1 for item in contents if item.get("type") == "video" and self._is_direct_video_file_url(str(item.get("url") or ""))
        )
        external_video_count = max(0, video_count - youtube_count - mp4_count)

        return {
            "contents": contents,
            "video_count": video_count,
            "youtube_count": youtube_count,
            "mp4_count": mp4_count,
            "external_video_count": external_video_count,
            "pdf_count": pdf_count,
            "duration_seconds": 300,
        }

    def _fallback_lesson_contents(self, course_description: str) -> List[LessonContentDraft]:
        return [
            {
                "type": "text",
                "text": (
                    "Nội dung bài học đang được đồng bộ hoặc bảo vệ quyền truy cập trên trang gốc.\n\n"
                    "Tham khảo tóm tắt khóa học:\n"
                    f"{course_description or 'Chưa có thông tin tóm tắt.'}"
                ),
                "sort_order": 0,
            }
        ]

    def _normalize_level(self, val: str) -> str:
        lower = (val or "").strip().lower()
        if "co ban" in lower or "beginner" in lower or "nhap mon" in lower:
            return "beginner"
        if "nang cao" in lower or "advanced" in lower or "chuyen sau" in lower:
            return "advanced"
        if "trung cap" in lower or "intermediate" in lower:
            return "intermediate"
        return "beginner"

    def _user_agent(self) -> str:
        return (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
            "(KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36"
        )

    def _get_storage_state_path(self) -> Optional[Path]:
        if not self.storage_state_path:
            return None
        path = Path(self.storage_state_path)
        return path if path.is_absolute() else TOOL_ROOT / path

    async def _save_storage_state(self, context: Any) -> None:
        target = self._get_storage_state_path()
        if not target:
            return
        target.parent.mkdir(parents=True, exist_ok=True)
        try:
            await context.storage_state(path=str(target))
        except Exception:
            pass

    async def _wait(self, page: Page, networkidle_timeout: int = 4000) -> None:
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=4000)
        except Exception:
            pass
        try:
            await page.wait_for_load_state("networkidle", timeout=networkidle_timeout)
        except Exception:
            pass

    async def _route_lightweight_resources(self, route: Any) -> None:
        if route.request.resource_type in {"font", "image", "media"}:
            await route.abort()
            return
        await route.continue_()

    def _clean_url(self, url: Optional[str]) -> str:
        if not url:
            return ""
        val = url.strip()
        if val.startswith("//"):
            val = "https:" + val
        elif val.startswith("/"):
            val = urljoin(self.base_url, val)
        return val if val.startswith(("http://", "https://")) else ""

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
            "course_box_count": ".thim-ekits-course__item, .lp_course",
            "course_title_count": ".elementor-heading-title a, a.course-title",
            "curriculum_count": ".course-item-title",
            "login_form_count": "form#khrLoginForm, form#loginform, #khrUser, input[name='user_login']",
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
                "Trang nguồn có dấu hiệu chặn crawler hoặc yêu cầu xác minh Cloudflare/Captcha.",
                url=url,
                details=diagnostics,
            )

    async def _is_login_page(self, page: Page) -> bool:
        if "/join" in page.url or "/dang-nhap" in page.url or "/login" in page.url or "wp-login.php" in page.url:
            return True
        try:
            return await page.locator("form#khrLoginForm, form#loginform, #khrUser, input[name='user_login']").first.is_visible(timeout=1200)
        except Exception:
            return False
