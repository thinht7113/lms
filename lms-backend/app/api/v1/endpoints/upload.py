import uuid
from fastapi import APIRouter, Depends, File, UploadFile, HTTPException, status
from fastapi.concurrency import run_in_threadpool
from app.api.deps import get_current_user
from app.models.user import User
from app.services.storage_service import StorageService

router = APIRouter()

# Helper validation for allowed roles
def require_instructor_or_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.vai_tro not in ["instructor", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Yêu cầu quyền giảng viên hoặc quản trị viên để tải lên tài liệu."
        )
    return current_user

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
    allowed_types = ["application/pdf", "image/png", "image/jpeg", "image/jpg", "image/gif", "video/mp4", "video/mpeg", "video/quicktime"]
    content_type = file.content_type or ""
    
    # Allow all images, videos, and pdfs
    is_valid_type = (
        content_type.startswith("image/") or
        content_type.startswith("video/") or
        content_type == "application/pdf"
    )
    
    if not is_valid_type:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Định dạng tệp không được hỗ trợ. Vui lòng chỉ tải lên tài liệu PDF, hình ảnh hoặc video bài giảng."
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
