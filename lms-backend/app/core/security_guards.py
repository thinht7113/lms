import hashlib
import hmac
from typing import Optional


def auth_cookie_secure(app_env: str) -> bool:
    return app_env.lower() in {"production", "prod"}


def mock_feature_enabled(app_env: str, enabled: bool) -> bool:
    return enabled and app_env.lower() not in {"production", "prod"}


def verify_webhook_signature(
    payload: bytes,
    signature: Optional[str],
    secret: Optional[str],
) -> bool:
    if not signature or not secret:
        return False

    expected = hmac.new(secret.encode("utf-8"), payload, hashlib.sha256).hexdigest()
    normalized = signature.removeprefix("sha256=").strip()
    return hmac.compare_digest(expected, normalized)


def can_upload_content(role: str, content_type: str) -> bool:
    image_types = {"image/png", "image/jpeg", "image/gif", "image/webp"}
    lesson_asset_types = image_types | {
        "application/pdf",
        "video/mp4",
        "video/mpeg",
        "video/quicktime",
        "video/webm",
    }
    if role in {"instructor", "admin"}:
        return content_type in lesson_asset_types
    return role == "student" and content_type in image_types
