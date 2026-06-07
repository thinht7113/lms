import uuid
from fastapi import APIRouter, Depends, File, UploadFile, HTTPException, status
from fastapi.concurrency import run_in_threadpool
from app.api.deps import get_current_user
from app.core.security_guards import can_upload_content
from app.models.user import User
from app.services.storage_service import StorageService

router = APIRouter()

# Max file size: 50MB for general uploads (videos can be larger, but this is a reasonable default constraint)
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB

@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    summary="Tải lên tài liệu, hình ảnh hoặc bài giảng video (Lưu trữ MinIO S3)",
    description="Cho phép tất cả người dùng tải lên tài nguyên (VD: ảnh đại diện, bài giảng). Định dạng được hỗ trợ: PDF, Video, Hình ảnh."
)
async def upload_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    # 1. Kiểm tra kích thước file
    # file.size exists in starlette UploadFile
    if file.size and file.size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Kích thước tệp vượt quá giới hạn tối đa cho phép (50MB)."
        )

    # 2. Kiểm tra loại tệp
    content_type = file.content_type or ""

    if not can_upload_content(current_user.vai_tro, content_type):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Vai trò hoặc định dạng tệp không được phép tải lên."
        )

    # 3. Tạo tên tệp duy nhất để tránh trùng lặp
    file_ext = file.filename.split(".")[-1] if "." in file.filename else ""
    unique_filename = f"{uuid.uuid4()}"
    if file_ext:
        unique_filename = f"{unique_filename}.{file_ext}"

    try:
        # 4. Thực thi tải lên đồng bộ trong Threadpool để không chặn Event Loop
        public_url = await run_in_threadpool(
            StorageService.upload_fileobj,
            file.file,
            unique_filename,
            file.content_type or "application/octet-stream"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi hệ thống khi tải tệp lên bộ lưu trữ đối tượng: {str(e)}"
        )

    return {
        "status": "success",
        "message": "Tải tệp lên thành công.",
        "filename": unique_filename,
        "original_name": file.filename,
        "url": public_url
    }
