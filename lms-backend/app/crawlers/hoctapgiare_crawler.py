from __future__ import annotations

import re
from pathlib import Path
from typing import Any, Dict, List, Optional
from urllib.parse import parse_qsl, urlencode, urljoin, urlparse, urlunparse

from playwright.async_api import Error as PlaywrightError
from playwright.async_api import Page, TimeoutError as PlaywrightTimeoutError, async_playwright

from app.crawlers.base import BaseCourseCrawler
from app.crawlers.exceptions import (
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
from app.core.config import settings


class HocTapGiaReCrawler(BaseCourseCrawler):
    base_url = "https://hoctapgiare.top"
    login_url = "https://hoctapgiare.top/login"
    free_courses_url = (
        "https://hoctapgiare.top/home/courses?"
        "category=all&price=free&level=all&language=all&rating=all&sort_by=newest"
    )

    def __init__(
        self,
        email: Optional[str] = None,
        password: Optional[str] = None,
        headless: bool = True,
        storage_state_path: Optional[str] = None,
    ) -> None:
        self.email = email or settings.CRAWLER_HOCTAPGIARE_EMAIL
        self.password = password or settings.CRAWLER_HOCTAPGIARE_PASSWORD
        self.headless = headless
        self.storage_state_path = storage_state_path or settings.CRAWLER_HOCTAPGIARE_STORAGE_STATE_PATH
        self.errors: List[Dict[str, Any]] = []

    async def crawl(self, source_url: str, limit: int = 5, checkout_free: bool = False) -> List[Dict[str, Any]]:
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
            page = await context.new_page()
            try:
                if self.email is not None and self.password is not None:
                    await self._login(page, self.email, self.password)

                course_urls = await self._resolve_course_urls(page, source_url, limit)
                drafts: List[Dict[str, Any]] = []
                for course_url in course_urls[:limit]:
                    try:
                        drafts.append(await self._crawl_course(page, course_url, checkout_free=checkout_free))
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
            await page.locator("#login-email, input[name='email']").first.fill(email)
            await page.locator("#login-password, input[name='password']").first.fill(password)
            await page.locator("button[type='submit'], .btn-login, .btn-primary").first.click()
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

        try:
            login_form_visible = await page.locator("#login-email, input[name='email']").first.is_visible(timeout=2000)
        except Exception:
            login_form_visible = False
        if login_form_visible or "/login" in page.url:
            error_text = await self._text(page, ".alert, .toast-message, .form-message, body")
            raise CrawlerLoginError(
                "Dang nhap hoctapgiare.top khong thanh cong.",
                url=self.login_url,
                details={"site_message": error_text[:500]},
            )

    async def _resolve_course_urls(self, page: Page, source_url: str, limit: int) -> List[str]:
        normalized = self._normalize_source_url(source_url)
        if self._is_course_url(normalized):
            return [normalized]
        return await self._collect_course_urls(page, normalized, limit)

    async def _collect_course_urls(self, page: Page, listing_url: str, limit: int) -> List[str]:
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
                    price_text = (await self._safe_inner_text(box.locator(".current-price").first)).lower()
                    if price_text and "miễn phí" not in price_text and "mien phi" not in price_text:
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
            diagnostics = await self._page_diagnostics(page)
            raise CrawlerListingError(
                "Khong tim thay khoa hoc mien phi nao trong trang danh sach.",
                url=listing_url,
                details={
                    "limit": limit,
                    "selectors": ["li .course-box-2", ".course-box-2", "a.course-title"],
                    **diagnostics,
                },
            )
        return urls

    async def _crawl_course(self, page: Page, course_url: str, checkout_free: bool = False) -> Dict[str, Any]:
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
        level_text = await self._text(page, ".badge.badge-primary, .course-level, .level")

        if checkout_free:
            await self._enroll_free_course(page, course_url)

        course_id, course_slug = self._extract_course_identity(course_url)
        sections = await self._extract_curriculum(page, course_id, course_slug)
        lesson_count = 0
        youtube_count = 0
        mp4_count = 0
        pdf_count = 0

        for section in sections:
            for lesson in section["lessons"]:
                lesson_count += 1
                lesson_url = lesson.pop("source_url", None)
                if not lesson_url:
                    lesson["contents"] = self._fallback_lesson_contents(description_html or description_text)
                    continue
                try:
                    lesson_content = await self._crawl_lesson(page, lesson_url)
                    lesson["contents"] = lesson_content["contents"]
                    youtube_count += lesson_content["youtube_count"]
                    mp4_count += lesson_content["mp4_count"]
                    pdf_count += lesson_content["pdf_count"]
                    lesson["duration_seconds"] = lesson_content["duration_seconds"]
                except CrawlerError as exc:
                    self.errors.append(exc.to_dict())
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
            "description": description_html or description_text,
            "thumbnail_url": thumbnail_url,
            "price": 0,
            "level": self._normalize_level(level_text),
            "sections": sections,
            "raw": {
                "price_text": price_text,
                "course_id": course_id,
                "course_slug": course_slug,
                "lesson_count": lesson_count,
                "mp4_count": mp4_count,
                "youtube_count": youtube_count,
                "pdf_count": pdf_count,
            },
        }

    async def _enroll_free_course(self, page: Page, course_url: str) -> None:
        already_purchased = await page.locator(".already_purchased a, a[href*='/home/my_courses']").first.count()
        if already_purchased:
            return

        href = await self._attr(page, ".buy-btns a.btn-buy-now, a[href*='get_enrolled_to_free_course']", "href")
        if not href:
            raise CrawlerSelectorError(
                "Khong tim thay nut dang ky khoa hoc mien phi.",
                stage="enroll_free_course",
                url=course_url,
                details={"selector": ".buy-btns a.btn-buy-now, a[href*='get_enrolled_to_free_course']"},
            )

        try:
            await page.goto(self._clean_url(href), wait_until="domcontentloaded")
            await self._wait(page, networkidle_timeout=4000)
            await page.goto(course_url, wait_until="domcontentloaded")
            await self._wait(page, networkidle_timeout=4000)
            purchased = await page.locator(".already_purchased a, a[href*='/home/my_courses']").first.count()
            if not purchased:
                raise CrawlerAccessDeniedError(
                    "Dang ky khoa hoc mien phi khong thanh cong. Hay cau hinh tai khoan hoctapgiare hoac storage_state hop le.",
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

    async def _extract_curriculum(self, page: Page, course_id: str, course_slug: str) -> List[Dict[str, Any]]:
        sections: List[Dict[str, Any]] = []
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

    async def _extract_lessons_from_page(self, page: Page, course_id: str, course_slug: str) -> List[Dict[str, Any]]:
        return await self._extract_lessons_from_locator(page.locator("body"), course_id, course_slug)

    async def _extract_lessons_from_locator(self, locator: Any, course_id: str, course_slug: str) -> List[Dict[str, Any]]:
        lessons: List[Dict[str, Any]] = []
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

    async def _crawl_lesson(self, page: Page, lesson_url: str) -> Dict[str, Any]:
        try:
            await page.goto(lesson_url, wait_until="domcontentloaded")
            await self._wait(page, networkidle_timeout=3000)
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

        contents: List[Dict[str, Any]] = []
        sort_order = 0

        for link in await self._links(page, "iframe[src*='youtube.com'], iframe[src*='youtube-nocookie.com'], iframe[src*='youtu.be']", attr="src"):
            contents.append({"type": "video", "url": link, "sort_order": sort_order})
            sort_order += 1

        for link in await self._links(page, "video source[src], video[src], source[src$='.mp4'], a[href$='.mp4']", attr="src"):
            contents.append({"type": "video", "url": link, "sort_order": sort_order})
            sort_order += 1

        for link in await self._links(page, "a[href$='.pdf'], a[href*='.pdf?']"):
            contents.append({"type": "pdf", "url": link, "sort_order": sort_order})
            sort_order += 1

        text_html = await self._html(page, "#lesson-summary .card-body, .lesson-summary, .lesson-content")
        text_plain = await self._text(page, "#lesson-summary .card-body, .lesson-summary, .lesson-content")
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

        return {
            "contents": contents,
            "duration_seconds": 0,
            "youtube_count": sum(1 for item in contents if item.get("type") == "video" and item.get("url") and "youtu" in item["url"]),
            "mp4_count": sum(1 for item in contents if item.get("type") == "video" and item.get("url") and ".mp4" in item["url"]),
            "pdf_count": sum(1 for item in contents if item.get("type") == "pdf"),
        }

    async def _wait(self, page: Page, *, networkidle_timeout: int = 6000) -> None:
        await page.wait_for_load_state("domcontentloaded")
        try:
            await page.wait_for_load_state("networkidle", timeout=networkidle_timeout)
        except Exception:
            pass

    async def _text(self, page: Page, selector: str) -> str:
        try:
            return (await page.locator(selector).first.inner_text(timeout=5000)).strip()
        except Exception:
            return ""

    async def _html(self, page: Page, selector: str) -> str:
        try:
            return (await page.locator(selector).first.inner_html(timeout=5000)).strip()
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
                "(els, attr) => els.map(e => e.getAttribute(attr) || e.getAttribute('src') || e.getAttribute('href')).filter(Boolean)",
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

    async def _next_listing_url(self, page: Page, current_url: str, urls: List[str], limit: int) -> Optional[str]:
        if len(urls) >= limit:
            return None
        for selector in ["a[rel='next']", ".pagination a:has-text('›')", ".pagination a:has-text('Next')"]:
            href = await self._attr(page, selector, "href")
            clean = self._clean_url(href)
            if clean and clean != current_url:
                return clean
        return None

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
        return urljoin(self.base_url, value.split("#", 1)[0].strip())

    def _is_course_url(self, url: str) -> bool:
        parsed = urlparse(url)
        return "hoctapgiare.top" in parsed.netloc and "/home/course/" in parsed.path

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

    def _fallback_lesson_contents(self, text: Optional[str]) -> List[Dict[str, Any]]:
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
            path = Path.cwd() / path

        if not path.exists():
            raise CrawlerConfigError(
                "Da cau hinh storage_state nhung file khong ton tai.",
                details={
                    "storage_state_path": str(path),
                    "hint": "Chay python -m app.crawlers.save_hoctapgiare_session de tao file session.",
                },
            )
        return path

    def _user_agent(self) -> str:
        return (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/120.0.0.0 Safari/537.36"
        )
