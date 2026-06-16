from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload
from app.api.deps import get_db, get_current_user
from app.modules.identity.models import User
from app.modules.learning.models import Certificate
from app.modules.learning.schemas import CertificateResponse, CertificateVerifyResponse
from app.modules.learning.services import CertService, build_certificate_pdf
from typing import List

router = APIRouter()


@router.get(
    "/public/{certificate_uuid}/pdf",
    response_class=Response,
    summary="Download public PDF of verified certificate"
)
async def get_public_certificate_pdf(
    certificate_uuid: str,
    db: AsyncSession = Depends(get_db)
):
    verification = await CertService.verify_certificate(db, certificate_uuid)
    cert = verification.get("certificate")
    if not verification["valid"] or cert is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chứng chỉ không tồn tại hoặc đã bị thu hồi."
        )

    pdf = build_certificate_pdf(
        student_name=cert.nguoi_dung.ho_ten,
        course_title=cert.khoa_hoc.tieu_de,
        certificate_uuid=certificate_uuid,
        issued_date=cert.ngay_cap.strftime("%Y-%m-%d"),
    )
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={
            "Content-Disposition": (
                f'inline; filename="certificate-{certificate_uuid}.pdf"'
            ),
            "X-Content-Type-Options": "nosniff",
        },
    )


@router.get(
    "/my-certificates",
    response_model=List[CertificateResponse],
    summary="Student gets list of issued digital certificates"
)
async def get_my_certificates(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await CertService.get_my_certificates(db, current_user.id)

@router.get(
    "/{course_id}/download",
    response_model=CertificateResponse,
    summary="Student downloads digital certificate PDF (Only for passed and completed students)"
)
async def download_certificate(
    course_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from app.modules.catalog.models import Course
    result = await db.execute(
        select(Certificate)
        .options(
            selectinload(Certificate.khoa_hoc).selectinload(Course.giang_vien),
            selectinload(Certificate.nguoi_dung)
        )
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
    summary="Employer looks up and verifies the legality of digital certificate via UUID"
)
async def verify_certificate(
    certificate_uuid: str,
    db: AsyncSession = Depends(get_db)
):
    return await CertService.verify_certificate(db, certificate_uuid)
