from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.schemas.quiz import (
    QuizCreate, QuizResponse, QuizDetailResponse,
    QuestionCreate, QuestionResponse,
    QuizSubmitRequest, QuizSubmitResponse, QuizAttemptResponse
)
from app.services.quiz_service import QuizService
import copy
from typing import List

router = APIRouter()

# Helper xác thực quyền Giảng viên
def require_instructor(current_user: User = Depends(get_current_user)) -> User:
    if current_user.vai_tro not in ["instructor", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Yêu cầu quyền giảng viên hoặc admin."
        )
    return current_user


# ==================== INSTRUCTOR ENDPOINTS ====================
@router.post(
    "/courses/{course_id}/quizzes",
    response_model=QuizResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Giảng viên tạo bài kiểm tra mới cho khóa học"
)
async def create_quiz(
    course_id: int,
    quiz_in: QuizCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_instructor)
):
    return await QuizService.create_quiz(db, course_id, quiz_in, current_user.id)

@router.post(
    "/quizzes/{quiz_id}/questions",
    response_model=QuestionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Giảng viên thêm câu hỏi và bộ đáp án trắc nghiệm vào bài kiểm tra"
)
async def create_question(
    quiz_id: int,
    question_in: QuestionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_instructor)
):
    return await QuizService.create_question(db, quiz_id, question_in, current_user.id)


# ==================== STUDENT QUIZ ENDPOINTS ====================
@router.get(
    "/courses/{course_id}/quizzes",
    response_model=List[QuizResponse],
    summary="Học viên lấy danh sách toàn bộ bài kiểm tra của khóa học đã mua"
)
async def get_course_quizzes(
    course_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await QuizService.get_quiz_by_course(db, course_id, current_user.id)

@router.get(
    "/quizzes/{quiz_id}",
    response_model=QuizDetailResponse,
    summary="Học viên lấy nội dung bài thi trắc nghiệm (Tự động ẩn đáp án đúng để chống gian lận)"
)
async def get_quiz(
    quiz_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await QuizService.get_quiz(db, quiz_id, current_user.id)

@router.post(
    "/quizzes/{quiz_id}/start",
    response_model=QuizAttemptResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Học viên bắt đầu làm bài kiểm tra trắc nghiệm"
)
async def start_quiz(
    quiz_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await QuizService.start_quiz(db, quiz_id, current_user.id)

@router.post(
    "/quizzes/{quiz_id}/submit",
    response_model=QuizSubmitResponse,
    summary="Học viên nộp bài kiểm tra và nhận kết quả chấm điểm tự động"
)
async def submit_quiz(
    quiz_id: int,
    submit_in: QuizSubmitRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await QuizService.submit_quiz(db, quiz_id, submit_in, current_user.id)

@router.get(
    "/quizzes/attempts/{attempt_id}",
    response_model=QuizAttemptResponse,
    summary="Học viên xem lại chi tiết lịch sử một lượt làm bài đã qua"
)
async def get_attempt(
    attempt_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await QuizService.get_attempt(db, attempt_id, current_user.id)
