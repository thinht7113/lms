from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload
from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.certificate import Certificate
from app.schemas.certificate import CertificateResponse, CertificateVerifyResponse
from app.services.cert_service import CertService
from typing import List

router = APIRouter()

@router.get(
    "/my-certificates",
    response_model=List[CertificateResponse],
    summary="Học viên lấy danh sách các chứng chỉ số đã được cấp"
)
async def get_my_certificates(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await CertService.get_my_certificates(db, current_user.id)

@router.get(
    "/{course_id}/download",
    response_model=CertificateResponse,
    summary="Học viên tải xuống tệp PDF chứng chỉ số (Chỉ dành cho học viên đã thi đỗ và hoàn thành)"
)
async def download_certificate(
    course_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Certificate)
        .options(selectinload(Certificate.khoa_hoc))
        .where(
            and_(
                Certificate.ma_nguoi_dung == current_user.id,
                Certificate.ma_khoa_hoc == course_id
            )
        )
    )
    cert = result.scalars().first()
    if not cert:
        # Nếu chưa được cấp, thử chạy check và cấp tự động xem học viên đã đủ điều kiện chưa
        cert = await CertService.check_and_issue_certificate(db, current_user.id, course_id)
        if not cert:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Bạn chưa đủ điều kiện nhận chứng chỉ cho khóa học này (phải hoàn thành 100% bài học và thi đỗ bài kiểm tra)."
            )
    return cert

@router.get(
    "/verify/{certificate_uuid}",
    response_model=CertificateVerifyResponse,
    summary="Nhà tuyển dụng tra cứu và xác thực tính pháp lý của chứng chỉ số qua mã UUID"
)
async def verify_certificate(
    certificate_uuid: str,
    db: AsyncSession = Depends(get_db)
):
    return await CertService.verify_certificate(db, certificate_uuid)
