from __future__ import annotations

import mimetypes
import uuid
from io import BytesIO
from pathlib import Path
from typing import Optional
from urllib.parse import urlparse

import httpx
from fastapi.concurrency import run_in_threadpool

from app.services.storage_service import StorageService


MAX_EXTERNAL_ASSET_SIZE = {
    "image": 5 * 1024 * 1024,
    "pdf": 25 * 1024 * 1024,
    "video": 200 * 1024 * 1024,
}

EXTERNAL_ASSET_RULES = {
    "image": {
        "content_types": {"image/png", "image/jpeg", "image/gif", "image/webp"},
        "extensions": {".png", ".jpg", ".jpeg", ".gif", ".webp"},
        "folder": "crawler/images",
    },
    "pdf": {
        "content_types": {"application/pdf"},
        "extensions": {".pdf"},
        "folder": "crawler/pdfs",
    },
    "video": {
        "content_types": {"video/mp4", "video/webm", "video/quicktime", "video/mpeg"},
        "extensions": {".mp4", ".webm", ".mov", ".mpeg", ".mpg"},
        "folder": "crawler/videos",
    },
}


class ExternalAssetError(Exception):
    pass


class ExternalAssetService:
    @staticmethod
    async def mirror_url(url: Optional[str], asset_type: str) -> Optional[str]:
        if not url:
            return None
        if ExternalAssetService.is_youtube_url(url):
            return url

        normalized_asset_type = asset_type.strip().lower()
        if normalized_asset_type not in EXTERNAL_ASSET_RULES:
            raise ExternalAssetError(f"Unsupported external asset type: {asset_type}")

        rules = EXTERNAL_ASSET_RULES[normalized_asset_type]
        content, content_type, extension = await ExternalAssetService._download_and_validate(url, normalized_asset_type)
        filename = f"{rules['folder']}/{uuid.uuid4()}{extension}"

        return await run_in_threadpool(
            StorageService.upload_fileobj,
            BytesIO(content),
            filename,
            content_type,
            "inline",
        )

    @staticmethod
    def is_youtube_url(url: str) -> bool:
        parsed = urlparse(url)
        host = parsed.netloc.lower()
        return "youtube.com" in host or "youtube-nocookie.com" in host or "youtu.be" in host

    @staticmethod
    async def _download_and_validate(url: str, asset_type: str) -> tuple[bytes, str, str]:
        rules = EXTERNAL_ASSET_RULES[asset_type]
        max_size = MAX_EXTERNAL_ASSET_SIZE[asset_type]
        timeout = httpx.Timeout(connect=15.0, read=120.0, write=15.0, pool=15.0)

        async with httpx.AsyncClient(follow_redirects=True, timeout=timeout) as client:
            async with client.stream("GET", url, headers={"User-Agent": ExternalAssetService._user_agent()}) as response:
                response.raise_for_status()

                content_type = ExternalAssetService._normalize_content_type(response.headers.get("content-type"))
                extension = ExternalAssetService._extension_from_url(url) or mimetypes.guess_extension(content_type) or ""

                if content_type not in rules["content_types"]:
                    raise ExternalAssetError(f"Unexpected content type {content_type!r} for {url}")
                if extension.lower() not in rules["extensions"]:
                    raise ExternalAssetError(f"Unexpected extension {extension!r} for {url}")

                content_length = response.headers.get("content-length")
                if content_length and int(content_length) > max_size:
                    raise ExternalAssetError(f"External asset exceeds {max_size} bytes: {url}")

                chunks: list[bytes] = []
                total = 0
                async for chunk in response.aiter_bytes():
                    total += len(chunk)
                    if total > max_size:
                        raise ExternalAssetError(f"External asset exceeds {max_size} bytes while downloading: {url}")
                    chunks.append(chunk)

        content = b"".join(chunks)
        if not ExternalAssetService._matches_magic(asset_type, content_type, content[:512]):
            raise ExternalAssetError(f"External asset content does not match declared type: {url}")
        return content, content_type, extension.lower()

    @staticmethod
    def _normalize_content_type(value: Optional[str]) -> str:
        return (value or "").split(";", 1)[0].strip().lower()

    @staticmethod
    def _extension_from_url(url: str) -> str:
        return Path(urlparse(url).path).suffix.lower()

    @staticmethod
    def _matches_magic(asset_type: str, content_type: str, header: bytes) -> bool:
        if asset_type == "image":
            return (
                header.startswith(b"\x89PNG\r\n\x1a\n")
                or header.startswith(b"\xff\xd8\xff")
                or header.startswith(b"GIF87a")
                or header.startswith(b"GIF89a")
                or (len(header) >= 12 and header[:4] == b"RIFF" and header[8:12] == b"WEBP")
            )
        if asset_type == "pdf":
            return header.startswith(b"%PDF-")
        if asset_type == "video":
            if content_type in {"video/mp4", "video/quicktime"}:
                return b"ftyp" in header[:32]
            if content_type == "video/webm":
                return header.startswith(b"\x1a\x45\xdf\xa3")
            if content_type == "video/mpeg":
                return header.startswith(b"\x00\x00\x01\xba") or header.startswith(b"\x00\x00\x01\xb3")
        return False

    @staticmethod
    def _user_agent() -> str:
        return (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/120.0.0.0 Safari/537.36"
        )
