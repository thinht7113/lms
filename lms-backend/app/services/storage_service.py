import json
import boto3
from botocore.client import Config
from app.core.config import settings

class StorageService:
    _s3_client = None

    @classmethod
    def get_client(cls):
        if cls._s3_client is None:
            # 1. Khởi tạo S3 client
            client = boto3.client(
                "s3",
                endpoint_url=settings.MINIO_ENDPOINT_URL,
                aws_access_key_id=settings.MINIO_ACCESS_KEY,
                aws_secret_access_key=settings.MINIO_SECRET_KEY,
                config=Config(signature_version="s3v4", s3={'addressing_style': 'path'}),
                region_name="us-east-1"
            )
            # 2. Gán client cho thuộc tính class trước khi thực hiện các thiết lập khác
            cls._s3_client = client
            
            # 3. Đảm bảo bucket đã tồn tại bằng cách truyền client trực tiếp vào hàm helper
            cls._ensure_bucket_exists(client)
            
        return cls._s3_client

    @classmethod
    def _ensure_bucket_exists(cls, s3):
        if s3 is None:
            return
            
        bucket = settings.MINIO_BUCKET_NAME
        try:
            s3.head_bucket(Bucket=bucket)
            # Remove any existing policy
            try:
                s3.delete_bucket_policy(Bucket=bucket)
            except Exception:
                pass
        except Exception:
            print(f"Bucket '{bucket}' not found. Creating bucket...")
            try:
                s3.create_bucket(Bucket=bucket)
            except Exception as e:
                print(f"Warning: Could not create bucket '{bucket}': {e}. S3 server might be down or unreachable.")
                return

        # Apply restricted bucket policy allowing public read ONLY for images, pdfs, and videos
        policy = {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Effect": "Allow",
                    "Principal": "*",
                    "Action": ["s3:GetObject"],
                    "Resource": [
                        f"arn:aws:s3:::{bucket}/*.png",
                        f"arn:aws:s3:::{bucket}/*.jpg",
                        f"arn:aws:s3:::{bucket}/*.jpeg",
                        f"arn:aws:s3:::{bucket}/*.gif",
                        f"arn:aws:s3:::{bucket}/*.webp",
                        f"arn:aws:s3:::{bucket}/*.pdf",
                        f"arn:aws:s3:::{bucket}/*.mp4",
                        f"arn:aws:s3:::{bucket}/*.webm",
                        f"arn:aws:s3:::{bucket}/*.mov",
                        f"arn:aws:s3:::{bucket}/*.mpeg",
                        f"arn:aws:s3:::{bucket}/*.mpg"
                    ]
                }
            ]
        }
        try:
            s3.put_bucket_policy(Bucket=bucket, Policy=json.dumps(policy))
            print(f"Bucket '{bucket}' configured with restricted public read access (images, pdfs, videos).")
        except Exception as e:
            print(f"Warning: Could not configure bucket policy '{bucket}': {e}.")

    @classmethod
    def upload_fileobj(cls, fileobj, filename: str, content_type: str, content_disposition: str = "inline") -> str:
        s3 = cls.get_client()
        bucket = settings.MINIO_BUCKET_NAME
        
        # Upload using boto3 S3 client
        s3.upload_fileobj(
            fileobj,
            bucket,
            filename,
            ExtraArgs={"ContentType": content_type, "ContentDisposition": content_disposition}
        )
        
        # Build the access URL (it points to S3 but requires signed URLs or proxy for private assets)
        # Note: We still return this format so it's stored in DB, but when serving, we will sign it.
        public_base = settings.MINIO_PUBLIC_URL.rstrip('/')
        return f"{public_base}/{bucket}/{filename}"

    @classmethod
    def generate_presigned_url(cls, file_url: str, expiration=3600) -> str:
        """
        Takes a stored DB URL (which might look like http://localhost:9000/lms-storage/...)
        and generates a pre-signed URL for direct S3 access if it belongs to our bucket.
        """
        public_base = settings.MINIO_PUBLIC_URL.rstrip('/')
        bucket = settings.MINIO_BUCKET_NAME
        prefix = f"{public_base}/{bucket}/"

        if not file_url.startswith(prefix):
            return file_url # Return as-is if it's an external URL (e.g. youtube or external host)

        # Extract the object key
        object_key = file_url[len(prefix):]
        
        s3 = cls.get_client()
        try:
            response = s3.generate_presigned_url('get_object',
                                                Params={'Bucket': bucket,
                                                        'Key': object_key},
                                                ExpiresIn=expiration)
            # The S3 client generates URLs using MINIO_ENDPOINT_URL (Docker internal: http://minio:9000).
            # Replace with MINIO_PUBLIC_URL so the URL is accessible from the host/browser.
            internal_base = settings.MINIO_ENDPOINT_URL.rstrip('/')
            response = response.replace(internal_base, public_base)
            return response
        except Exception as e:
            print(f"Error generating presigned url: {e}")
            return file_url

