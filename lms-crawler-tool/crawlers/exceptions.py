from typing import Any, Optional

class CrawlerError(Exception):
    def __init__(
        self,
        message: str,
        *,
        stage: str,
        code: str = "crawler_error",
        url: Optional[str] = None,
        details: Optional[dict[str, Any]] = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.stage = stage
        self.code = code
        self.url = url
        self.details = details or {}

    def to_dict(self) -> dict[str, Any]:
        return {
            "code": self.code,
            "stage": self.stage,
            "message": self.message,
            "url": self.url,
            "details": self.details,
        }

class CrawlerLoginError(CrawlerError):
    def __init__(self, message: str, *, url: Optional[str] = None, details: Optional[dict[str, Any]] = None) -> None:
        super().__init__(message, stage="login", code="login_failed", url=url, details=details)

class CrawlerBrowserError(CrawlerError):
    def __init__(self, message: str, *, details: Optional[dict[str, Any]] = None) -> None:
        super().__init__(message, stage="browser_start", code="browser_start_failed", details=details)

class CrawlerConfigError(CrawlerError):
    def __init__(self, message: str, *, details: Optional[dict[str, Any]] = None) -> None:
        super().__init__(message, stage="configuration", code="invalid_crawler_config", details=details)

class CrawlerAccessDeniedError(CrawlerError):
    def __init__(self, message: str, *, url: Optional[str] = None, details: Optional[dict[str, Any]] = None) -> None:
        super().__init__(message, stage="access", code="access_denied", url=url, details=details)

class CrawlerListingError(CrawlerError):
    def __init__(self, message: str, *, url: Optional[str] = None, details: Optional[dict[str, Any]] = None) -> None:
        super().__init__(message, stage="listing", code="listing_failed", url=url, details=details)

class CrawlerSelectorError(CrawlerError):
    def __init__(
        self,
        message: str,
        *,
        stage: str,
        url: Optional[str] = None,
        details: Optional[dict[str, Any]] = None,
    ) -> None:
        super().__init__(message, stage=stage, code="selector_not_found", url=url, details=details)

class CrawlerCourseError(CrawlerError):
    def __init__(self, message: str, *, url: Optional[str] = None, details: Optional[dict[str, Any]] = None) -> None:
        super().__init__(message, stage="course_detail", code="course_crawl_failed", url=url, details=details)

class CrawlerCheckoutError(CrawlerError):
    def __init__(self, message: str, *, url: Optional[str] = None, details: Optional[dict[str, Any]] = None) -> None:
        super().__init__(message, stage="checkout", code="checkout_failed", url=url, details=details)

class CrawlerContentError(CrawlerError):
    def __init__(self, message: str, *, url: Optional[str] = None, details: Optional[dict[str, Any]] = None) -> None:
        super().__init__(message, stage="learning_content", code="content_crawl_failed", url=url, details=details)
