import asyncio
import uuid
import mimetypes
import ipaddress
import socket
import tempfile
from urllib.parse import urlparse
from typing import Optional

import httpx
import boto3
from botocore.client import Config

from config import settings

class MinioUploader:
    _s3_client = None
    _allowed_extensions = {
        "image": {".jpg", ".jpeg", ".png", ".webp", ".gif"},
        "pdf": {".pdf"},
        "video": {".mp4", ".webm", ".mov", ".mpeg", ".mpg"},
    }
    _content_type_prefixes = {
        "image": ("image/",),
        "pdf": ("application/pdf",),
        "video": ("video/",),
    }

    @classmethod
    def get_client(cls):
        if cls._s3_client is None:
            endpoint_url = settings.MINIO_ENDPOINT
            if not endpoint_url.startswith("http://") and not endpoint_url.startswith("https://"):
                protocol = "https://" if settings.MINIO_USE_SSL else "http://"
                endpoint_url = f"{protocol}{endpoint_url}"

            client = boto3.client(
                "s3",
                endpoint_url=endpoint_url,
                aws_access_key_id=settings.MINIO_ACCESS_KEY,
                aws_secret_access_key=settings.MINIO_SECRET_KEY,
                config=Config(signature_version="s3v4", s3={'addressing_style': 'path'}),
                region_name="us-east-1"
            )
            cls._s3_client = client
            try:
                client.head_bucket(Bucket=settings.MINIO_BUCKET_NAME)
            except Exception:
                try:
                    client.create_bucket(Bucket=settings.MINIO_BUCKET_NAME)
                except Exception as e:
                    print(f"Warning: Could not create bucket: {e}")
        return cls._s3_client

    @staticmethod
    def is_youtube_url(url: str) -> bool:
        return MinioUploader.is_embed_video_url(url)

    @staticmethod
    def is_embed_video_url(url: str) -> bool:
        parsed = urlparse(url)
        host = parsed.netloc.lower()
        path = parsed.path.lower()
        embed_domains = ("youtube.com", "youtube-nocookie.com", "youtu.be", "rumble.com", "vimeo.com", "dailymotion.com", "wistia.com", "bitchute.com")
        return any(domain in host for domain in embed_domains) or "/embed/" in path

    @classmethod
    def _max_bytes_for(cls, asset_type: str) -> int:
        limits = {
            "image": settings.CRAWLER_IMAGE_MAX_MB,
            "pdf": settings.CRAWLER_PDF_MAX_MB,
            "video": settings.CRAWLER_VIDEO_MAX_MB,
        }
        return int(limits.get(asset_type, 20)) * 1024 * 1024

    @classmethod
    def _extension_from(cls, url: str, content_type: str, asset_type: str) -> str:
        parsed_path = urlparse(url).path.lower()
        allowed = cls._allowed_extensions.get(asset_type, set())
        for ext in allowed:
            if parsed_path.endswith(ext):
                return ext
        guessed = mimetypes.guess_extension(content_type or "")
        if guessed in allowed:
            return guessed
        fallback = {
            "image": ".jpg",
            "pdf": ".pdf",
            "video": ".mp4",
        }
        return fallback.get(asset_type, ".bin")

    @classmethod
    def _is_allowed_type(cls, url: str, content_type: str, asset_type: str) -> bool:
        parsed_path = urlparse(url).path.lower()
        allowed_ext = cls._allowed_extensions.get(asset_type, set())
        if any(parsed_path.endswith(ext) for ext in allowed_ext):
            return True
        allowed_prefixes = cls._content_type_prefixes.get(asset_type, tuple())
        return any(content_type.startswith(prefix) for prefix in allowed_prefixes)

    @staticmethod
    def _ensure_public_http_url(url: str) -> None:
        parsed = urlparse(url)
        if parsed.scheme not in {"http", "https"} or not parsed.hostname:
            raise ValueError("URL file nguồn phải là HTTP/HTTPS hợp lệ.")
        if settings.CRAWLER_ALLOW_PRIVATE_ASSET_URLS:
            return

        try:
            addresses = socket.getaddrinfo(parsed.hostname, None)
        except socket.gaierror as exc:
            raise ValueError(f"Không phân giải được host file nguồn: {parsed.hostname}") from exc

        for address in addresses:
            ip = ipaddress.ip_address(address[4][0])
            if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_multicast:
                raise ValueError(f"Chặn URL trỏ tới IP nội bộ: {ip}")

    @classmethod
    async def mirror_url(cls, url: Optional[str], asset_type: str) -> Optional[str]:
        if not url:
            return None

        # Embed video URLs (YouTube, Rumble, Vimeo, etc.): always keep original URL for iframe embedding on frontend
        if asset_type == "video" and cls.is_embed_video_url(url):
            return url

        # Check if already a minio storage URL
        if "lms-storage" in url or "minio" in url or settings.MINIO_ENDPOINT in url:
            return url

        try:
            cls._ensure_public_http_url(url)
        except Exception as e:
            print(f"⚠️ Không mirror được {asset_type} từ {url}: {e}")
            return None

        folder_map = {
            "video": "crawler/videos",
            "image": "crawler/images",
            "pdf": "crawler/pdfs"
        }
        folder = folder_map.get(asset_type, "crawler/others")

        timeout = httpx.Timeout(
            connect=float(settings.CRAWLER_DOWNLOAD_CONNECT_TIMEOUT_SECONDS),
            read=float(settings.CRAWLER_DOWNLOAD_READ_TIMEOUT_SECONDS),
            write=15.0,
            pool=15.0,
        )
        async with httpx.AsyncClient(follow_redirects=True, timeout=timeout) as client:
            try:
                async with client.stream("GET", url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}) as response:
                    response.raise_for_status()
                    content_type = response.headers.get("content-type", "").split(";")[0].strip().lower()
                    if not cls._is_allowed_type(url, content_type, asset_type):
                        raise ValueError(f"Loại file không khớp asset_type={asset_type}, content-type={content_type or 'unknown'}")

                    max_bytes = cls._max_bytes_for(asset_type)
                    content_length = response.headers.get("content-length")
                    if content_length and int(content_length) > max_bytes:
                        raise ValueError(f"File vượt giới hạn {max_bytes // (1024 * 1024)}MB")

                    extension = cls._extension_from(url, content_type, asset_type)
                    temp = tempfile.SpooledTemporaryFile(max_size=16 * 1024 * 1024)
                    try:
                        total_bytes = 0
                        async for chunk in response.aiter_bytes():
                            total_bytes += len(chunk)
                            if total_bytes > max_bytes:
                                raise ValueError(f"File vượt giới hạn {max_bytes // (1024 * 1024)}MB")
                            temp.write(chunk)
                        temp.seek(0)

                        filename = f"{folder}/{uuid.uuid4()}{extension}"

                        s3 = cls.get_client()

                        def _upload():
                            s3.upload_fileobj(
                                temp,
                                settings.MINIO_BUCKET_NAME,
                                filename,
                                ExtraArgs={
                                    "ContentType": content_type,
                                    "ContentDisposition": "inline",
                                },
                            )

                        await asyncio.to_thread(_upload)
                        return f"{settings.MINIO_PUBLIC_URL_PREFIX.rstrip('/')}/{filename}"
                    finally:
                        temp.close()
            except Exception as e:
                print(f"⚠️ Không mirror được {asset_type} từ {url}: {e}")
                return None
