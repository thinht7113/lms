from typing import List

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.certificate import CertificateResponse, CertificateVerifyResponse
from app.services.cert_service import CertService
from app.services.certificate_pdf import build_certificate_pdf


router = APIRouter()


@router.get(
    "/public/{certificate_uuid}/pdf",
    response_class=Response,
    summary="Download public PDF of verified certificate",
)
async def get_public_certificate_pdf(
    certificate_uuid: str,
    db: AsyncSession = Depends(get_db),
):
    verification = await CertService.verify_certificate(db, certificate_uuid)
    cert = verification.get("certificate")
    if not verification["valid"] or cert is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chung chi khong ton tai hoac da bi thu hoi.",
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
            "Content-Disposition": f'inline; filename="certificate-{certificate_uuid}.pdf"',
            "X-Content-Type-Options": "nosniff",
        },
    )


@router.get(
    "/my-certificates",
    response_model=List[CertificateResponse],
    summary="Student gets list of issued digital certificates",
)
async def get_my_certificates(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await CertService.get_my_certificates(db, current_user.id)


@router.get(
    "/{course_id}/download",
    response_model=CertificateResponse,
    summary="Student downloads digital certificate PDF (Only for passed and completed students)",
)
async def download_certificate(
    course_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await CertService.get_or_issue_certificate(db, current_user.id, course_id)


@router.get(
    "/verify/{certificate_uuid}",
    response_model=CertificateVerifyResponse,
    summary="Employer looks up and verifies the legality of digital certificate via UUID",
)
async def verify_certificate(
    certificate_uuid: str,
    db: AsyncSession = Depends(get_db),
):
    return await CertService.verify_certificate(db, certificate_uuid)
