import asyncio
import uuid
import mimetypes
from urllib.parse import urlparse
from io import BytesIO
from typing import Optional
import httpx
import boto3
from botocore.client import Config
from config import settings

class MinioUploader:
    _s3_client = None

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
        parsed = urlparse(url)
        host = parsed.netloc.lower()
        return "youtube.com" in host or "youtube-nocookie.com" in host or "youtu.be" in host

    @classmethod
    async def mirror_url(cls, url: Optional[str], asset_type: str) -> Optional[str]:
        if not url:
            return None

        # YouTube: always keep original URL (embed via iframe on frontend)
        if cls.is_youtube_url(url):
            return url

        # Check if already a minio storage URL
        if "lms-storage" in url or "minio" in url or settings.MINIO_ENDPOINT in url:
            return url

        folder_map = {
            "video": "crawler/videos",
            "image": "crawler/images",
            "pdf": "crawler/pdfs"
        }
        folder = folder_map.get(asset_type, "crawler/others")

        timeout = httpx.Timeout(connect=15.0, read=300.0, write=15.0, pool=15.0)
        async with httpx.AsyncClient(follow_redirects=True, timeout=timeout) as client:
            try:
                async with client.stream("GET", url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}) as response:
                    response.raise_for_status()
                    content_type = response.headers.get("content-type", "").split(";")[0].strip().lower()
                    
                    extension = ""
                    parsed_path = urlparse(url).path.lower()
                    for ext in (".mp4", ".webm", ".mov", ".png", ".jpg", ".jpeg", ".pdf"):
                        if parsed_path.endswith(ext):
                            extension = ext
                            break
                    if not extension:
                        extension = mimetypes.guess_extension(content_type) or (".mp4" if asset_type == "video" else ".bin")
                    
                    if asset_type == "video" and not content_type.startswith("video/"):
                        content_type = "video/mp4"
                        if not extension:
                            extension = ".mp4"

                    chunks = []
                    async for chunk in response.aiter_bytes():
                        chunks.append(chunk)
                    content_bytes = b"".join(chunks)

                    filename = f"{folder}/{uuid.uuid4()}{extension}"
                    
                    s3 = cls.get_client()
                    def _upload():
                        s3.upload_fileobj(
                            BytesIO(content_bytes),
                            settings.MINIO_BUCKET_NAME,
                            filename,
                            ExtraArgs={
                                "ContentType": content_type,
                                "ContentDisposition": "inline"
                            }
                        )
                    await asyncio.to_thread(_upload)
                    return f"{settings.MINIO_PUBLIC_URL_PREFIX}/{filename}"
            except Exception as e:
                print(f"Error mirroring {url}: {e}")
                return url
