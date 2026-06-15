import uuid
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.concurrency import run_in_threadpool

from app.api.deps import get_current_user
from app.modules.identity.models import User
from app.modules.storage.services import StorageService

router = APIRouter()

MAX_FILE_SIZE_BY_ASSET = {
    "image": 5 * 1024 * 1024,
    "lesson-image": 5 * 1024 * 1024,
    "avatar": 5 * 1024 * 1024,
    "pdf": 25 * 1024 * 1024,
    "video": 200 * 1024 * 1024,
}

UPLOAD_RULES = {
    "image": {
        "content_types": {"image/png", "image/jpeg", "image/gif", "image/webp"},
        "extensions": {".png", ".jpg", ".jpeg", ".gif", ".webp"},
    },
    "lesson-image": {
        "content_types": {"image/png", "image/jpeg", "image/gif", "image/webp"},
        "extensions": {".png", ".jpg", ".jpeg", ".gif", ".webp"},
    },
    "avatar": {
        "content_types": {"image/png", "image/jpeg", "image/gif", "image/webp"},
        "extensions": {".png", ".jpg", ".jpeg", ".gif", ".webp"},
    },
    "pdf": {
        "content_types": {"application/pdf"},
        "extensions": {".pdf"},
    },
    "video": {
        "content_types": {"video/mp4", "video/webm", "video/quicktime", "video/mpeg"},
        "extensions": {".mp4", ".webm", ".mov", ".mpeg", ".mpg"},
    },
}

ROLE_ALLOWED_ASSETS = {
    "student": {"image", "avatar"},
    "instructor": {"image", "lesson-image", "avatar", "pdf", "video"},
    "admin": {"image", "lesson-image", "avatar", "pdf", "video"},
}


def _infer_asset_type(content_type: str) -> Optional[str]:
    if content_type in UPLOAD_RULES["pdf"]["content_types"]:
        return "pdf"
    if content_type in UPLOAD_RULES["video"]["content_types"]:
        return "video"
    if content_type in UPLOAD_RULES["image"]["content_types"]:
        return "image"
    return None


def _matches_magic(asset_type: str, content_type: str, header: bytes) -> bool:
    if asset_type in {"image", "lesson-image", "avatar"}:
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


async def _validate_upload(file: UploadFile, current_user: User, requested_asset_type: Optional[str]) -> tuple[str, str]:
    content_type = file.content_type or ""
    asset_type = (requested_asset_type or _infer_asset_type(content_type) or "").strip().lower()

    if asset_type not in UPLOAD_RULES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Loại upload không hợp lệ. Chỉ hỗ trợ image, avatar, lesson-image, pdf hoặc video.",
        )

    if asset_type not in ROLE_ALLOWED_ASSETS.get(current_user.vai_tro, set()):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Vai trò hiện tại không được phép tải loại tài nguyên này.",
        )

    rules = UPLOAD_RULES[asset_type]
    if content_type not in rules["content_types"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Định dạng MIME {content_type or 'không xác định'} không khớp với loại upload {asset_type}.",
        )

    extension = Path(file.filename or "").suffix.lower()
    if extension not in rules["extensions"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Phần mở rộng {extension or 'không có'} không được phép cho loại upload {asset_type}.",
        )

    max_size = MAX_FILE_SIZE_BY_ASSET[asset_type]
    if file.size and file.size > max_size:
        max_mb = max_size // (1024 * 1024)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Kích thước tệp vượt quá giới hạn tối đa cho {asset_type} ({max_mb}MB).",
        )

    header = await file.read(512)
    await file.seek(0)
    if not _matches_magic(asset_type, content_type, header):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nội dung tệp không khớp với định dạng đã khai báo.",
        )

    return asset_type, extension


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    summary="Securely upload resource",
    description="Chỉ cho phép đúng loại file theo ngữ cảnh upload: ảnh, PDF hoặc video.",
)
async def upload_file(
    file: UploadFile = File(...),
    asset_type: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
):
    validated_asset_type, file_ext = await _validate_upload(file, current_user, asset_type)
    unique_filename = f"{uuid.uuid4()}{file_ext}"

    try:
        public_url = await run_in_threadpool(
            StorageService.upload_fileobj,
            file.file,
            unique_filename,
            file.content_type or "application/octet-stream",
            "inline",
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi hệ thống khi tải tệp lên bộ lưu trữ: {str(exc)}",
        ) from exc

    return {
        "status": "success",
        "message": "Tải tệp lên thành công.",
        "filename": unique_filename,
        "original_name": file.filename,
        "url": public_url,
        "content_type": file.content_type,
        "asset_type": validated_asset_type,
    }
