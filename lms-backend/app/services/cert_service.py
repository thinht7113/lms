from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status
from app.models.course import Course, Section, Lesson, Enrollment, Progress
from app.models.quiz import Quiz, QuizAttempt
from app.models.certificate import Certificate
from app.schemas.certificate import ProgressUpdate
from app.core.config import settings
import uuid
from typing import List, Optional
from datetime import datetime

class CertService:
    # ==================== PROGRESS SERVICES ====================
    @staticmethod
    async def update_lesson_progress(db: AsyncSession, user_id: int, lesson_id: int, progress_in: ProgressUpdate) -> Progress:
        # 1. Tìm bài học kèm chương học
        lesson_result = await db.execute(
            select(Lesson)
            .options(selectinload(Lesson.chuong_hoc))
            .where(Lesson.id == lesson_id)
        )
        lesson = lesson_result.scalars().first()
        if not lesson:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Bài học không tồn tại."
            )

        # 2. Kiểm tra ghi danh của học viên trong khóa học
        enroll_result = await db.execute(
            select(Enrollment).where(
                and_(
                    Enrollment.ma_nguoi_dung == user_id,
                    Enrollment.ma_khoa_hoc == lesson.chuong_hoc.ma_khoa_hoc
                )
            )
        )
        enrollment = enroll_result.scalars().first()
        if not enrollment:
            # Nếu chưa mua (giảng viên xem thử), không lưu tiến trình mà trả về giả
            return Progress(
                id=0,
                ma_dang_ky_hoc=0,
                ma_bai_hoc=lesson_id,
                da_hoan_thanh=False,
                video_resume_seconds=0
            )

        # 2b. Kiểm tra tuần tự bài học (Drip Content) khi học viên đánh dấu hoàn thành
        if progress_in.is_completed:
            lessons_result = await db.execute(
                select(Lesson)
                .join(Section, Lesson.ma_chuong_hoc == Section.id)
                .where(
                    and_(
                        Section.ma_khoa_hoc == lesson.chuong_hoc.ma_khoa_hoc,
                        Lesson.da_xuat_ban == True
                    )
                )
                .order_by(Section.thu_tu.asc(), Lesson.thu_tu.asc())
            )

            all_lessons = lessons_result.scalars().all()
            
            curr_index = -1
            for idx, l in enumerate(all_lessons):
                if l.id == lesson_id:
                    curr_index = idx
                    break
                    
            if curr_index > 0:
                prev_lesson = all_lessons[curr_index - 1]
                progress_res = await db.execute(
                    select(Progress).where(
                        and_(
                            Progress.ma_dang_ky_hoc == enrollment.id,
                            Progress.ma_bai_hoc == prev_lesson.id,
                            Progress.da_hoan_thanh == True
                        )
                    )
                )
                if not progress_res.scalars().first():
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Bạn phải hoàn thành bài học trước đó ({prev_lesson.tieu_de}) trước khi cập nhật bài học này."
                    )


        # 3. Tìm hoặc tạo bản ghi tiến độ
        progress_result = await db.execute(
            select(Progress).where(
                and_(
                    Progress.ma_dang_ky_hoc == enrollment.id,
                    Progress.ma_bai_hoc == lesson_id
                )
            )
        )
        db_progress = progress_result.scalars().first()

        if not db_progress:
            db_progress = Progress(
                ma_dang_ky_hoc=enrollment.id,
                ma_bai_hoc=lesson_id,
                da_hoan_thanh=bool(progress_in.is_completed),
                ngay_hoan_thanh=datetime.now() if progress_in.is_completed else None,
                video_resume_seconds=progress_in.video_resume_seconds or 0,
            )
            db.add(db_progress)
        else:
            if progress_in.is_completed is not None:
                db_progress.da_hoan_thanh = progress_in.is_completed
                db_progress.ngay_hoan_thanh = datetime.now() if progress_in.is_completed else None
            if progress_in.video_resume_seconds is not None:
                db_progress.video_resume_seconds = progress_in.video_resume_seconds
            db.add(db_progress)

        await db.commit()
        await db.refresh(db_progress)

        # 4. TỰ ĐỘNG KÍCH HOẠT KIỂM TRA & CẤP CHỨNG CHỈ
        await CertService.check_and_issue_certificate(db, user_id, lesson.chuong_hoc.ma_khoa_hoc)

        return db_progress

    @staticmethod
    async def get_lesson_progress(db: AsyncSession, user_id: int, lesson_id: int) -> Progress:
        lesson_result = await db.execute(
            select(Lesson)
            .options(selectinload(Lesson.chuong_hoc))
            .where(Lesson.id == lesson_id)
        )
        lesson = lesson_result.scalars().first()
        if not lesson:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Bài học không tồn tại.",
            )

        enroll_result = await db.execute(
            select(Enrollment).where(
                and_(
                    Enrollment.ma_nguoi_dung == user_id,
                    Enrollment.ma_khoa_hoc == lesson.chuong_hoc.ma_khoa_hoc,
                )
            )
        )
        enrollment = enroll_result.scalars().first()
        if not enrollment:
            # Nếu chưa mua (giảng viên xem thử), trả về tiến độ giả (0) thay vì lỗi 403
            return Progress(
                id=0,
                ma_dang_ky_hoc=0,
                ma_bai_hoc=lesson_id,
                da_hoan_thanh=False,
                video_resume_seconds=0
            )

        progress_result = await db.execute(
            select(Progress)
            .where(
                and_(
                    Progress.ma_dang_ky_hoc == enrollment.id,
                    Progress.ma_bai_hoc == lesson_id,
                )
            )
        )
        progress = progress_result.scalars().first()
        if not progress:
            progress = Progress(
                ma_dang_ky_hoc=enrollment.id,
                ma_bai_hoc=lesson_id,
                da_hoan_thanh=False,
                ngay_hoan_thanh=None,
                video_resume_seconds=0,
            )
            db.add(progress)
            await db.commit()
            await db.refresh(progress)
        return progress

    @staticmethod
    async def get_course_progress(db: AsyncSession, user_id: int, course_id: int) -> dict:
        # Lấy Enrollment
        enroll_result = await db.execute(
            select(Enrollment).where(
                and_(
                    Enrollment.ma_nguoi_dung == user_id,
                    Enrollment.ma_khoa_hoc == course_id
                )
            )
        )
        enrollment = enroll_result.scalars().first()
        if not enrollment:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn chưa đăng ký khóa học này."
            )

        # Đếm tổng số bài học thông qua join với Section (Chỉ tính các bài học đã xuất bản)
        total_lessons_res = await db.execute(
            select(func.count(Lesson.id))
            .join(Section, Lesson.ma_chuong_hoc == Section.id)
            .where(
                and_(
                    Section.ma_khoa_hoc == course_id,
                    Lesson.da_xuat_ban == True
                )
            )
        )
        total_lessons = total_lessons_res.scalar() or 0

        # Đếm số bài đã hoàn thành (Chỉ tính các bài học đã xuất bản)
        completed_lessons_res = await db.execute(
            select(func.count(Progress.id))
            .join(Enrollment, Progress.ma_dang_ky_hoc == Enrollment.id)
            .join(Lesson, Progress.ma_bai_hoc == Lesson.id)
            .where(
                and_(
                    Enrollment.ma_nguoi_dung == user_id,
                    Enrollment.ma_khoa_hoc == course_id,
                    Progress.da_hoan_thanh == True,
                    Lesson.da_xuat_ban == True
                )
            )
        )
        completed_lessons = completed_lessons_res.scalar() or 0


        # Đếm tổng số bài kiểm tra (Quiz) của khóa học
        total_quizzes_res = await db.execute(
            select(func.count(Quiz.id)).where(Quiz.ma_khoa_hoc == course_id)
        )
        total_quizzes = total_quizzes_res.scalar() or 0

        # Đếm số bài kiểm tra đã đỗ (đạt điểm tối thiểu) của học viên này
        passed_quizzes_res = await db.execute(
            select(func.count(func.distinct(QuizAttempt.ma_bai_kiem_tra)))
            .join(Quiz, QuizAttempt.ma_bai_kiem_tra == Quiz.id)
            .where(
                and_(
                    QuizAttempt.ma_nguoi_dung == user_id,
                    Quiz.ma_khoa_hoc == course_id,
                    QuizAttempt.da_qua_mon == True
                )
            )
        )
        passed_quizzes = passed_quizzes_res.scalar() or 0

        # Tính phần trăm tiến độ tự động gộp cả bài học và bài thi đạt chuẩn nghiệp vụ
        progress_percentage = 0.0
        total_items = total_lessons + total_quizzes
        completed_items = completed_lessons + passed_quizzes
        if total_items > 0:
            progress_percentage = round((completed_items / total_items) * 100.0, 2)

        return {
            "course_id": course_id,
            "total_lessons": total_lessons,
            "completed_lessons": completed_lessons,
            "total_quizzes": total_quizzes,
            "passed_quizzes": passed_quizzes,
            "progress_percentage": progress_percentage
        }

    # ==================== CERTIFICATE SERVICES ====================
    @staticmethod
    async def check_and_issue_certificate(db: AsyncSession, user_id: int, course_id: int) -> Optional[Certificate]:
        # 1. Kiểm tra tiến độ học có đạt 100% không
        progress_data = await CertService.get_course_progress(db, user_id, course_id)
        if progress_data["total_lessons"] == 0 or progress_data["completed_lessons"] < progress_data["total_lessons"]:
            # Chưa hoàn thành tất cả các bài học
            return None

        # 2. Kiểm tra xem khóa học có bài kiểm tra (Quiz) nào không
        quiz_result = await db.execute(select(Quiz).where(Quiz.ma_khoa_hoc == course_id))
        quizzes = quiz_result.scalars().all()
        if quizzes:
            # Học viên bắt buộc phải đỗ TẤT CẢ các bài kiểm tra trong khóa học
            for quiz in quizzes:
                attempt_res = await db.execute(
                    select(QuizAttempt).where(
                        and_(
                            QuizAttempt.ma_nguoi_dung == user_id,
                            QuizAttempt.ma_bai_kiem_tra == quiz.id,
                            QuizAttempt.da_qua_mon == True
                        )
                    )
                )
                if not attempt_res.scalars().first():
                    # Nếu có bất kỳ bài kiểm tra nào chưa thi đỗ, không cấp chứng chỉ
                    return None

        # 3. Kiểm tra xem chứng chỉ đã được cấp trước đó chưa (Tránh cấp trùng lặp)
        cert_result = await db.execute(
            select(Certificate).where(
                and_(
                    Certificate.ma_nguoi_dung == user_id,
                    Certificate.ma_khoa_hoc == course_id
                )
            )
        )
        existing_cert = cert_result.scalars().first()
        if existing_cert:
            return existing_cert

        # 4. Tiến hành cấp chứng chỉ mới
        cert_uuid = str(uuid.uuid4())
        certificate_url = (
            f"{settings.API_PUBLIC_URL.rstrip('/')}"
            f"/api/v1/certificates/public/{cert_uuid}/pdf"
        )

        new_cert = Certificate(
            ma_nguoi_dung=user_id,
            ma_khoa_hoc=course_id,
            uuid=cert_uuid,
            duong_dan_chung_chi=certificate_url
        )
        db.add(new_cert)
        await db.commit()
        await db.refresh(new_cert)
        return new_cert

    @staticmethod
    async def get_my_certificates(db: AsyncSession, user_id: int) -> List[Certificate]:
        result = await db.execute(
            select(Certificate)
            .options(selectinload(Certificate.khoa_hoc))
            .where(Certificate.ma_nguoi_dung == user_id)
        )
        return list(result.scalars().all())

    @staticmethod
    async def verify_certificate(db: AsyncSession, cert_uuid: str) -> dict:
        result = await db.execute(
            select(Certificate)
            .options(selectinload(Certificate.khoa_hoc), selectinload(Certificate.nguoi_dung))
            .where(Certificate.uuid == cert_uuid)
        )
        cert = result.scalars().first()
        if not cert:
            return {
                "valid": False,
                "message": "Không tìm thấy chứng chỉ tương ứng hoặc mã UUID không hợp lệ."
            }

        # Trả về thông tin chứng chỉ xác thực hợp lệ
        from app.schemas.certificate import CertificateResponse
        return {
            "valid": True,
            "message": "Xác thực thành công. Chứng chỉ số hoàn toàn hợp lệ.",
            "certificate": cert
        }
