from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func, delete
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status
from app.models.quiz import Quiz, Question, QuizAttempt, QuestionOption, QuizAttemptAnswer
from app.models.course import Course, Enrollment
from app.models.user import User
from app.schemas.quiz import QuizCreate, QuestionCreate, QuizSubmitRequest
from typing import List, Optional
from decimal import Decimal
from datetime import datetime, timezone

class QuizService:
    @staticmethod
    async def _can_manage_course(db: AsyncSession, user_id: int, course_id: int) -> bool:
        result = await db.execute(
            select(Course, User)
            .join(User, User.id == user_id)
            .where(Course.id == course_id)
        )
        row = result.first()
        if not row:
            return False

        course, user = row
        return user.vai_tro == "admin" or course.ma_giang_vien == user_id

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
        can_manage = await QuizService._can_manage_course(db, instructor_id, course_id)
        if not can_manage:
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

        # Load khoa_hoc to prevent MissingGreenlet in QuizResponse
        final_res = await db.execute(
            select(Quiz).options(selectinload(Quiz.khoa_hoc)).where(Quiz.id == db_quiz.id)
        )
        return final_res.scalars().one()

    @staticmethod
    async def delete_quiz(db: AsyncSession, course_id: int, quiz_id: int, current_user: User):
        result = await db.execute(
            select(Quiz).options(selectinload(Quiz.khoa_hoc)).where(and_(Quiz.id == quiz_id, Quiz.ma_khoa_hoc == course_id))
        )
        quiz = result.scalars().first()
        if not quiz:
            raise HTTPException(status_code=404, detail="Bài kiểm tra không tồn tại.")
            
        if current_user.vai_tro != "admin" and quiz.khoa_hoc.ma_giang_vien != current_user.id:
            raise HTTPException(status_code=403, detail="Không có quyền xóa bài kiểm tra này.")
            
        await db.delete(quiz)
        await db.commit()

    @staticmethod
    async def get_quiz(db: AsyncSession, quiz_id: int, user_id: int) -> Quiz:
        # Lấy bài kiểm tra và kiểm tra ghi danh của học viên
        result = await db.execute(
            select(Quiz)
            .options(
                selectinload(Quiz.khoa_hoc),
                selectinload(Quiz.cau_hoi).selectinload(Question.lua_chon_cau_hoi)
            )
            .where(Quiz.id == quiz_id)
        )
        quiz = result.scalars().first()
        if not quiz:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Bài kiểm tra không tồn tại."
            )

        # Kiểm tra ghi danh của học viên
        can_manage = await QuizService._can_manage_course(db, user_id, quiz.ma_khoa_hoc)
        if not can_manage:
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

        # Lấy các attempts của người dùng này cho bài quiz này
        attempts_res = await db.execute(
            select(QuizAttempt).where(
                and_(
                    QuizAttempt.ma_nguoi_dung == user_id,
                    QuizAttempt.ma_bai_kiem_tra == quiz_id,
                    QuizAttempt.trang_thai == "completed"
                )
            )
        )
        q_attempts = list(attempts_res.scalars().all())
        quiz.attempts_count = len(q_attempts)
        if q_attempts:
            scores = [att.diem_dat_duoc for att in q_attempts if att.diem_dat_duoc is not None]
            quiz.highest_score = max(scores) if scores else None
            quiz.passed = any(att.da_qua_mon for att in q_attempts)
        else:
            quiz.highest_score = None
            quiz.passed = False

        # Trả về quiz. Ta sẽ ẩn đáp án đúng trong các API endpoint bằng cách chuyển đổi options
        return quiz

    @staticmethod
    async def get_quiz_by_course(db: AsyncSession, course_id: int, user_id: int) -> List[Quiz]:
        # Kiểm tra ghi danh
        can_manage = await QuizService._can_manage_course(db, user_id, course_id)
        if not can_manage:
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
            .options(selectinload(Quiz.khoa_hoc), selectinload(Quiz.cau_hoi).selectinload(Question.lua_chon_cau_hoi))
            .where(Quiz.ma_khoa_hoc == course_id)
        )
        quizzes = list(result.scalars().all())

        # Lấy các attempts của người dùng này cho các bài quiz này
        quiz_ids = [q.id for q in quizzes]
        if quiz_ids:
            attempts_res = await db.execute(
                select(QuizAttempt).where(
                    and_(
                        QuizAttempt.ma_nguoi_dung == user_id,
                        QuizAttempt.ma_bai_kiem_tra.in_(quiz_ids),
                        QuizAttempt.trang_thai == "completed"
                    )
                )
            )
            attempts = list(attempts_res.scalars().all())
        else:
            attempts = []

        from collections import defaultdict
        attempts_by_quiz = defaultdict(list)
        for att in attempts:
            attempts_by_quiz[att.ma_bai_kiem_tra].append(att)

        for quiz in quizzes:
            q_attempts = attempts_by_quiz[quiz.id]
            quiz.attempts_count = len(q_attempts)
            if q_attempts:
                scores = [att.diem_dat_duoc for att in q_attempts if att.diem_dat_duoc is not None]
                quiz.highest_score = max(scores) if scores else None
                quiz.passed = any(att.da_qua_mon for att in q_attempts)
            else:
                quiz.highest_score = None
                quiz.passed = False

        return quizzes

    # ==================== QUESTION SERVICES ====================
    @staticmethod
    async def create_question(db: AsyncSession, quiz_id: int, question_in: QuestionCreate, current_user: User) -> Question:
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
        if current_user.vai_tro != "admin" and quiz.khoa_hoc.ma_giang_vien != current_user.id:
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
        await db.flush()

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

    @staticmethod
    async def delete_question(db: AsyncSession, question_id: int, current_user: User):
        result = await db.execute(
            select(Question)
            .options(selectinload(Question.bai_kiem_tra).selectinload(Quiz.khoa_hoc))
            .where(Question.id == question_id)
        )
        question = result.scalars().first()
        if not question:
            raise HTTPException(status_code=404, detail="Câu hỏi không tồn tại")
        
        if current_user.vai_tro != "admin" and question.bai_kiem_tra.khoa_hoc.ma_giang_vien != current_user.id:
            raise HTTPException(status_code=403, detail="Không có quyền xóa câu hỏi này")
        
        # Xóa các option trước
        await db.execute(delete(QuestionOption).where(QuestionOption.ma_cau_hoi == question_id))
        
        # Xóa câu hỏi
        await db.execute(delete(Question).where(Question.id == question_id))
        await db.commit()

    # ==================== ATTEMPT & SUBMISSION SERVICES ====================
    @staticmethod
    async def start_quiz(db: AsyncSession, quiz_id: int, user_id: int) -> QuizAttempt:
        # 1. Lấy quiz
        result = await db.execute(select(Quiz).where(Quiz.id == quiz_id))
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

        # 3. Kiểm tra xem học viên có lượt làm bài nào đang ở trạng thái 'started' không
        active_attempt_res = await db.execute(
            select(QuizAttempt)
            .options(
                selectinload(QuizAttempt.bai_kiem_tra).selectinload(Quiz.khoa_hoc),
                selectinload(QuizAttempt.cau_tra_loi_chi_tiet)
            )
            .where(
                and_(
                    QuizAttempt.ma_nguoi_dung == user_id,
                    QuizAttempt.ma_bai_kiem_tra == quiz_id,
                    QuizAttempt.trang_thai == "started"
                )
            )
        )
        active_attempt = active_attempt_res.scalars().first()
        if active_attempt:
            return active_attempt

        # 4. Đếm tổng số lượt đã làm thành công ('completed')
        attempts_res = await db.execute(
            select(func.count(QuizAttempt.id)).where(
                and_(
                    QuizAttempt.ma_nguoi_dung == user_id,
                    QuizAttempt.ma_bai_kiem_tra == quiz_id,
                    QuizAttempt.trang_thai == "completed"
                )
            )
        )
        completed_count = attempts_res.scalar() or 0
        if completed_count >= quiz.so_luot_lam_toi_da:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Bạn đã vượt quá số lượt làm bài tối đa cho phép ({quiz.so_luot_lam_toi_da} lượt)."
            )

        # 5. Tạo lượt làm bài mới
        db_attempt = QuizAttempt(
            ma_nguoi_dung=user_id,
            ma_bai_kiem_tra=quiz_id,
            trang_thai="started",
            ngay_bat_dau=datetime.utcnow()
        )
        db.add(db_attempt)
        await db.commit()
        
        # Load lại đầy đủ các quan hệ để trả về chuẩn Schema
        res_attempt = await db.execute(
            select(QuizAttempt)
            .options(
                selectinload(QuizAttempt.bai_kiem_tra).selectinload(Quiz.khoa_hoc),
                selectinload(QuizAttempt.cau_tra_loi_chi_tiet)
            )
            .where(QuizAttempt.id == db_attempt.id)
        )
        return res_attempt.scalars().one()

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

        # 2. Lấy QuizAttempt theo attempt_id
        attempt_res = await db.execute(
            select(QuizAttempt).where(
                and_(
                    QuizAttempt.id == submit_in.attempt_id,
                    QuizAttempt.ma_nguoi_dung == user_id,
                    QuizAttempt.ma_bai_kiem_tra == quiz_id
                )
            )
        )
        attempt = attempt_res.scalars().first()
        if not attempt:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy lượt làm bài tương ứng."
            )
            
        if attempt.trang_thai != "started":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Lượt làm bài này đã được nộp hoặc không ở trạng thái làm bài."
            )

        # 3. Kiểm tra thời gian làm bài
        duration = datetime.utcnow() - attempt.ngay_bat_dau
        is_timeout = False
        if quiz.thoi_gian_lam_bai and quiz.thoi_gian_lam_bai > 0:
            # Thêm 60 giây thời gian ân hạn (grace period)
            limit_seconds = (quiz.thoi_gian_lam_bai * 60) + 60
            if duration.total_seconds() > limit_seconds:
                is_timeout = True

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
        if is_timeout:
            score = Decimal("0.00")
            passed = False
        else:
            score = Decimal(str(round((correct_count / total_questions) * 10.0, 2)))
            passed = score >= quiz.diem_dat

        # 4. Cập nhật kết quả lượt làm bài
        attempt.diem_dat_duoc = score
        attempt.da_qua_mon = passed
        attempt.trang_thai = "completed"
        attempt.ngay_lam_bai = datetime.utcnow()
        db.add(attempt)

        # 5. Lưu chi tiết các câu trả lời học viên đã chọn
        for q_id, opt_id in answer_logs:
            db_ans_log = QuizAttemptAnswer(
                ma_luot_lam=attempt.id,
                ma_cau_hoi=q_id,
                ma_lua_chon=opt_id
            )
            db.add(db_ans_log)
        await db.commit()

        # 6. KÍCH HOẠT TỰ ĐỘNG CẤP CHỨNG CHỈ (Chạy kiểm tra ngầm nếu qua môn)
        if passed:
            from app.services.cert_service import CertService
            await CertService.check_and_issue_certificate(db, user_id, quiz.ma_khoa_hoc)

        # 7. LOGIC RESET TIẾN ĐỘ KHI TRƯỢT 3 LẦN
        completed_attempts_res = await db.execute(
            select(QuizAttempt).where(
                and_(
                    QuizAttempt.ma_nguoi_dung == user_id,
                    QuizAttempt.ma_bai_kiem_tra == quiz_id,
                    QuizAttempt.trang_thai == "completed"
                )
            )
        )
        completed_attempts = completed_attempts_res.scalars().all()
        completed_count = len(completed_attempts)
        any_passed = any(att.da_qua_mon for att in completed_attempts)

        warning_msg = None
        if completed_count >= quiz.so_luot_lam_toi_da and not any_passed:
            from app.models.course import Progress
            # Tìm bản ghi Enrollment liên kết
            enroll_res = await db.execute(
                select(Enrollment).where(
                    and_(
                        Enrollment.ma_nguoi_dung == user_id,
                        Enrollment.ma_khoa_hoc == quiz.ma_khoa_hoc
                    )
                )
            )
            enrollment = enroll_res.scalars().first()
            if enrollment:
                from sqlalchemy import update
                # Cập nhật tất cả bài học trong tiến độ học tập về chưa hoàn thành (da_hoan_thanh = False)
                await db.execute(
                    update(Progress)
                    .where(Progress.ma_dang_ky_hoc == enrollment.id)
                    .values(da_hoan_thanh=False, ngay_hoan_thanh=None)
                )
                # Lưu trữ các lượt làm bài cũ (đổi trạng thái sang 'archived' thay vì xóa cứng)
                await db.execute(
                    update(QuizAttempt)
                    .where(
                        and_(
                            QuizAttempt.ma_nguoi_dung == user_id,
                            QuizAttempt.ma_bai_kiem_tra == quiz_id,
                            QuizAttempt.trang_thai == "completed"
                        )
                    )
                    .values(trang_thai="archived")
                )
                # Đổi trạng thái lượt hiện tại sang archived để không tính vào lượt làm mới
                attempt.trang_thai = "archived"
                await db.commit()
            
            warning_msg = "Bạn đã thi trượt cả 3 lần. Tiến trình học của bạn đã bị reset về 0%. Vui lòng học lại toàn bộ nội dung khóa học để được thi lại."

        return {
            "attempt_id": attempt.id,
            "score": score,
            "passed": passed,
            "correct_count": correct_count,
            "total_count": total_questions,
            "message": warning_msg
        }

    @staticmethod
    async def get_attempt(db: AsyncSession, attempt_id: int, user_id: int) -> QuizAttempt:
        result = await db.execute(
            select(QuizAttempt)
            .options(
                selectinload(QuizAttempt.bai_kiem_tra).selectinload(Quiz.cau_hoi).selectinload(Question.lua_chon_cau_hoi),
                selectinload(QuizAttempt.bai_kiem_tra).selectinload(Quiz.khoa_hoc),
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

    @staticmethod
    async def get_attempt_review(db: AsyncSession, attempt_id: int, user_id: int) -> dict:
        attempt = await QuizService.get_attempt(db, attempt_id, user_id)
        if attempt.trang_thai != "completed":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Bài làm này chưa được nộp nên chưa thể xem bảng sửa bài."
            )

        selected_options = {
            answer.ma_cau_hoi: answer.ma_lua_chon
            for answer in attempt.cau_tra_loi_chi_tiet
        }

        review_questions = []
        for question in attempt.bai_kiem_tra.cau_hoi:
            correct_option = next(
                (option for option in question.lua_chon_cau_hoi if option.la_dap_an_dung),
                None
            )
            user_option_id = selected_options.get(question.id)
            correct_option_id = correct_option.id if correct_option else None

            review_questions.append({
                "id": question.id,
                "ma_bai_kiem_tra": question.ma_bai_kiem_tra,
                "noi_dung": question.noi_dung,
                "giai_thich": question.giai_thich,
                "cac_lua_chon": [
                    {
                        "id": option.id,
                        "text": option.noi_dung_lua_chon,
                        "is_correct": option.la_dap_an_dung,
                    }
                    for option in question.lua_chon_cau_hoi
                ],
                "user_option_id": user_option_id,
                "correct_option_id": correct_option_id,
                "is_user_correct": bool(user_option_id and user_option_id == correct_option_id),
            })

        quiz = attempt.bai_kiem_tra
        return {
            "id": attempt.id,
            "ma_nguoi_dung": attempt.ma_nguoi_dung,
            "ma_bai_kiem_tra": attempt.ma_bai_kiem_tra,
            "diem_dat_duoc": attempt.diem_dat_duoc,
            "da_qua_mon": attempt.da_qua_mon,
            "ngay_bat_dau": attempt.ngay_bat_dau,
            "ngay_lam_bai": attempt.ngay_lam_bai,
            "trang_thai": attempt.trang_thai,
            "bai_kiem_tra": {
                "id": quiz.id,
                "ma_khoa_hoc": quiz.ma_khoa_hoc,
                "tieu_de": quiz.tieu_de,
                "diem_dat": quiz.diem_dat,
                "thoi_gian_lam_bai": quiz.thoi_gian_lam_bai,
                "so_luot_lam_toi_da": quiz.so_luot_lam_toi_da,
                "ngay_tao": quiz.ngay_tao,
                "khoa_hoc": None,
            },
            "cau_hoi_review": review_questions,
        }
