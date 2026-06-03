from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status
from app.models.quiz import Quiz, Question, QuizAttempt, QuestionOption, QuizAttemptAnswer
from app.models.course import Course, Enrollment
from app.schemas.quiz import QuizCreate, QuestionCreate, QuizSubmitRequest
from typing import List, Optional
from decimal import Decimal

class QuizService:
    # ==================== QUIZ SERVICES ====================
    @staticmethod
    async def create_quiz(db: AsyncSession, course_id: int, quiz_in: QuizCreate, instructor_id: int) -> Quiz:
        # Kiểm tra khóa học tồn tại và giảng viên sở hữu
        course_result = await db.execute(select(Course).where(Course.id == course_id))
        course = course_result.scalars().first()
        if not course:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Khóa học không tồn tại."
            )
        if course.ma_giang_vien != instructor_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn không có quyền thêm bài kiểm tra vào khóa học này."
            )

        db_quiz = Quiz(
            ma_khoa_hoc=course_id,
            tieu_de=quiz_in.title,
            diem_dat=quiz_in.passing_score,
            thoi_gian_lam_bai=quiz_in.time_limit,
            so_luot_lam_toi_da=quiz_in.max_attempts if quiz_in.max_attempts is not None else 3
        )
        db.add(db_quiz)
        await db.commit()
        await db.refresh(db_quiz)
        return db_quiz

    @staticmethod
    async def get_quiz(db: AsyncSession, quiz_id: int, user_id: int) -> Quiz:
        # Lấy bài kiểm tra và kiểm tra ghi danh của học viên
        result = await db.execute(
            select(Quiz)
            .options(selectinload(Quiz.cau_hoi).selectinload(Question.lua_chon_cau_hoi))
            .where(Quiz.id == quiz_id)
        )
        quiz = result.scalars().first()
        if not quiz:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Bài kiểm tra không tồn tại."
            )

        # Kiểm tra ghi danh của học viên
        enrolled = await db.execute(
            select(Enrollment).where(
                and_(
                    Enrollment.ma_nguoi_dung == user_id,
                    Enrollment.ma_khoa_hoc == quiz.ma_khoa_hoc
                )
            )
        )
        if not enrolled.scalars().first():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn phải đăng ký khóa học này mới được xem bài kiểm tra."
            )

        # Trả về quiz. Ta sẽ ẩn đáp án đúng trong các API endpoint bằng cách chuyển đổi options
        return quiz

    @staticmethod
    async def get_quiz_by_course(db: AsyncSession, course_id: int, user_id: int) -> List[Quiz]:
        # Kiểm tra ghi danh
        enrolled = await db.execute(
            select(Enrollment).where(
                and_(
                    Enrollment.ma_nguoi_dung == user_id,
                    Enrollment.ma_khoa_hoc == course_id
                )
            )
        )

        if not enrolled.scalars().first():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn phải đăng ký khóa học này mới được xem bài kiểm tra."
            )

        result = await db.execute(
            select(Quiz)
            .options(selectinload(Quiz.cau_hoi).selectinload(Question.lua_chon_cau_hoi))
            .where(Quiz.ma_khoa_hoc == course_id)
        )
        return list(result.scalars().all())

    # ==================== QUESTION SERVICES ====================
    @staticmethod
    async def create_question(db: AsyncSession, quiz_id: int, question_in: QuestionCreate, instructor_id: int) -> Question:
        # Kiểm tra bài kiểm tra và khóa học thuộc về giảng viên
        result = await db.execute(
            select(Quiz)
            .options(selectinload(Quiz.khoa_hoc))
            .where(Quiz.id == quiz_id)
        )
        quiz = result.scalars().first()
        if not quiz:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Bài kiểm tra không tồn tại."
            )
        if quiz.khoa_hoc.ma_giang_vien != instructor_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn không có quyền chỉnh sửa bài kiểm tra này."
            )

        # Kiểm tra và xác định đáp án đúng
        has_correct = any(opt.is_correct for opt in question_in.options)
        if not has_correct:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Phải có ít nhất một lựa chọn là đáp án đúng."
            )

        # Lưu câu hỏi trước
        db_question = Question(
            ma_bai_kiem_tra=quiz_id,
            noi_dung=question_in.content,
            diem_so=1,
            giai_thich=question_in.explanation
        )
        db.add(db_question)
        await db.commit()
        await db.refresh(db_question)

        # Lưu các lựa chọn vào bảng QuestionOption (lua_chon_cau_hoi)
        options_list = []
        for opt in question_in.options:
            db_opt = QuestionOption(
                ma_cau_hoi=db_question.id,
                noi_dung_lua_chon=opt.text,
                la_dap_an_dung=opt.is_correct
            )
            db.add(db_opt)
            options_list.append(db_opt)

        await db.commit()
        
        # Load lại câu hỏi kèm các lựa chọn vừa tạo để trả về
        final_res = await db.execute(
            select(Question)
            .options(selectinload(Question.lua_chon_cau_hoi))
            .where(Question.id == db_question.id)
        )
        return final_res.scalars().one()

    # ==================== ATTEMPT & SUBMISSION SERVICES ====================
    @staticmethod
    async def submit_quiz(db: AsyncSession, quiz_id: int, submit_in: QuizSubmitRequest, user_id: int):
        # 1. Lấy quiz kèm các câu hỏi và các lựa chọn đáp án
        result = await db.execute(
            select(Quiz)
            .options(selectinload(Quiz.cau_hoi).selectinload(Question.lua_chon_cau_hoi))
            .where(Quiz.id == quiz_id)
        )
        quiz = result.scalars().first()
        if not quiz:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Bài kiểm tra không tồn tại."
            )

        # 2. Kiểm tra ghi danh của học viên
        enrolled_res = await db.execute(
            select(Enrollment).where(
                and_(
                    Enrollment.ma_nguoi_dung == user_id,
                    Enrollment.ma_khoa_hoc == quiz.ma_khoa_hoc
                )
            )
        )
        if not enrolled_res.scalars().first():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn chưa ghi danh khóa học chứa bài kiểm tra này."
            )

        # 3. Kiểm tra số lần làm bài trắc nghiệm tối đa
        attempts_res = await db.execute(
            select(func.count(QuizAttempt.id)).where(
                and_(
                    QuizAttempt.ma_nguoi_dung == user_id,
                    QuizAttempt.ma_bai_kiem_tra == quiz_id
                )
            )
        )
        attempts_count = attempts_res.scalar() or 0
        if attempts_count >= quiz.so_luot_lam_toi_da:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Bạn đã vượt quá số lượt làm bài tối đa cho phép ({quiz.so_luot_lam_toi_da} lượt)."
            )

        # 3. Chấm điểm bài thi
        total_questions = len(quiz.cau_hoi)
        if total_questions == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Bài kiểm tra hiện chưa có câu hỏi nào."
            )

        # Chuyển đổi submission sang dạng dict để tra cứu nhanh
        user_answers = {ans.question_id: ans.chosen_option_id for ans in submit_in.answers}

        correct_count = 0
        answer_logs = []
        for q in quiz.cau_hoi:
            chosen_opt_id = user_answers.get(q.id)
            if chosen_opt_id:
                # Tìm phương án trong các lựa chọn của câu hỏi
                chosen_opt = next((opt for opt in q.lua_chon_cau_hoi if opt.id == chosen_opt_id), None)
                if not chosen_opt:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Lựa chọn ID {chosen_opt_id} không hợp lệ cho câu hỏi ID {q.id}."
                    )
                answer_logs.append((q.id, chosen_opt_id))
                if chosen_opt.la_dap_an_dung:
                    correct_count += 1

        # Tính điểm hệ số 10
        score = Decimal(str(round((correct_count / total_questions) * 10.0, 2)))
        passed = score >= quiz.diem_dat

        # 4. Lưu kết quả lượt làm bài
        db_attempt = QuizAttempt(
            ma_nguoi_dung=user_id,
            ma_bai_kiem_tra=quiz_id,
            diem_dat_duoc=score,
            da_qua_mon=passed
        )
        db.add(db_attempt)
        await db.commit()
        await db.refresh(db_attempt)

        # 5. Lưu chi tiết các câu trả lời học viên đã chọn
        for q_id, opt_id in answer_logs:
            db_ans_log = QuizAttemptAnswer(
                ma_luot_lam=db_attempt.id,
                ma_cau_hoi=q_id,
                ma_lua_chon=opt_id
            )
            db.add(db_ans_log)
        await db.commit()

        # 6. KÍCH HOẠT TỰ ĐỘNG CẤP CHỨNG CHỈ (Chạy kiểm tra ngầm)
        # Import CertService ngay tại đây để tránh vòng lặp circular dependency
        from app.services.cert_service import CertService
        await CertService.check_and_issue_certificate(db, user_id, quiz.ma_khoa_hoc)

        return {
            "attempt_id": db_attempt.id,
            "score": score,
            "passed": passed,
            "correct_count": correct_count,
            "total_count": total_questions
        }

    @staticmethod
    async def get_attempt(db: AsyncSession, attempt_id: int, user_id: int) -> QuizAttempt:
        result = await db.execute(
            select(QuizAttempt)
            .options(
                selectinload(QuizAttempt.bai_kiem_tra).selectinload(Quiz.cau_hoi).selectinload(Question.lua_chon_cau_hoi),
                selectinload(QuizAttempt.cau_tra_loi_chi_tiet)
            )
            .where(QuizAttempt.id == attempt_id)
        )
        attempt = result.scalars().first()
        if not attempt:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy lịch sử bài làm."
            )

        if attempt.ma_nguoi_dung != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn không có quyền xem lịch sử bài làm này."
            )

        return attempt
