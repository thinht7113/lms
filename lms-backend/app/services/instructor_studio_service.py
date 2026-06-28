from datetime import datetime
from typing import List, Optional, cast

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.course import CourseReview
from app.models.payout import PayoutRequest
from app.repositories.instructor_studio_repository import InstructorStudioRepository, PayoutRepository
from app.schemas.instructor_studio import (
    InstructorStats,
    PayoutCreate,
    PayoutResponse,
    StudentEnrollmentResponse,
    TransactionResponse,
)


class InstructorStudioService:
    @staticmethod
    def to_payout_response(payout: PayoutRequest) -> PayoutResponse:
        return PayoutResponse(
            id=f"WD-{cast(int, payout.id)}",
            amount=float(cast(float, payout.so_tien)),
            bank=cast(str, payout.ngan_hang),
            account_number=cast(str, payout.so_tai_khoan),
            account_name=cast(str, payout.ten_chu_tai_khoan),
            status=cast(str, payout.trang_thai),
            reason=cast(Optional[str], payout.ly_do_tu_choi),
            date=cast(datetime, payout.ngay_yeu_cau),
        )

    @staticmethod
    async def get_stats(db: AsyncSession, instructor_id: int) -> InstructorStats:
        repo = InstructorStudioRepository(db)
        now = datetime.now()
        first_of_month = datetime(now.year, now.month, 1)

        return InstructorStats(
            total_courses=await repo.count_courses(instructor_id),
            total_students=await repo.count_students(instructor_id),
            total_revenue=await repo.sum_revenue(instructor_id),
            average_rating=await repo.average_rating(instructor_id),
            revenue_this_month=await repo.sum_revenue_since(instructor_id, first_of_month),
            new_students_this_month=await repo.count_students_since(instructor_id, first_of_month),
        )

    @staticmethod
    async def get_students(db: AsyncSession, instructor_id: int) -> List[StudentEnrollmentResponse]:
        repo = InstructorStudioRepository(db)
        rows = await repo.list_students(instructor_id)
        return [
            StudentEnrollmentResponse(
                student_id=row[0],
                ho_ten=row[1],
                email=row[2],
                avatar_url=row[3],
                course_title=row[4],
                ngay_dang_ky=row[5],
            )
            for row in rows
        ]

    @staticmethod
    async def get_reviews(db: AsyncSession, instructor_id: int) -> List[CourseReview]:
        repo = InstructorStudioRepository(db)
        return await repo.list_reviews(instructor_id)

    @staticmethod
    async def get_transactions(db: AsyncSession, instructor_id: int) -> List[TransactionResponse]:
        repo = InstructorStudioRepository(db)
        rows = await repo.list_transactions(instructor_id)
        return [
            TransactionResponse(
                id=row.id,
                order_id=row.order_id,
                course_title=row.course_title,
                student_name=row.student_name,
                amount=float(row.amount),
                date=row.date,
            )
            for row in rows
        ]

    @staticmethod
    async def create_payout_request(
        db: AsyncSession,
        instructor_id: int,
        payout_in: PayoutCreate,
    ) -> PayoutResponse:
        repo = InstructorStudioRepository(db)
        payout_repo = PayoutRepository(db)

        total_revenue = await repo.sum_revenue(instructor_id)
        total_withdrawn = await repo.sum_requested_payouts(instructor_id)
        available_balance = (total_revenue * 0.7) - total_withdrawn

        if payout_in.amount > available_balance:
            raise HTTPException(status_code=400, detail="So du kha dung khong du.")

        if payout_in.amount < 100000:
            raise HTTPException(status_code=400, detail="So tien rut toi thieu la 100.000 d.")

        payout = PayoutRequest(
            ma_giang_vien=instructor_id,
            so_tien=payout_in.amount,
            ngan_hang=payout_in.bank_name,
            so_tai_khoan=payout_in.account_number,
            ten_chu_tai_khoan=payout_in.account_name,
        )
        await payout_repo.add(payout)
        await db.commit()
        await payout_repo.refresh(payout)
        return InstructorStudioService.to_payout_response(payout)

    @staticmethod
    async def get_payouts(db: AsyncSession, instructor_id: int) -> List[PayoutResponse]:
        repo = InstructorStudioRepository(db)
        payouts = await repo.list_payouts(instructor_id)
        return [InstructorStudioService.to_payout_response(payout) for payout in payouts]
