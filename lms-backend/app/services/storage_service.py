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
        except Exception:
            print(f"Bucket '{bucket}' not found. Creating bucket...")
            try:
                s3.create_bucket(Bucket=bucket)
                # Thiết lập bucket policy cho phép truy cập đọc công khai (Anonymous Read)
                policy = {
                    "Version": "2012-10-17",
                    "Statement": [
                        {
                            "Effect": "Allow",
                            "Principal": "*",
                            "Action": ["s3:GetObject"],
                            "Resource": [f"arn:aws:s3:::{bucket}/*"]
                        }
                    ]
                }
                s3.put_bucket_policy(Bucket=bucket, Policy=json.dumps(policy))
                print(f"Bucket '{bucket}' created and configured with public read access.")
            except Exception as e:
                print(f"Warning: Could not create or configure bucket '{bucket}': {e}. S3 server might be down or unreachable.")

    @classmethod
    def upload_fileobj(cls, fileobj, filename: str, content_type: str) -> str:
        s3 = cls.get_client()
        bucket = settings.MINIO_BUCKET_NAME
        
        # Upload using boto3 S3 client
        s3.upload_fileobj(
            fileobj,
            bucket,
            filename,
            ExtraArgs={"ContentType": content_type}
        )
        
        # Build the public access URL
        public_base = settings.MINIO_PUBLIC_URL.rstrip('/')
        return f"{public_base}/{bucket}/{filename}"
