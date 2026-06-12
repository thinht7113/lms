from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_db, get_current_user
from app.modules.identity.models import User
from app.modules.learning.schemas import (
    QuizCreate, QuizResponse, QuizDetailResponse,
    QuestionCreate, QuestionResponse,
    QuizSubmitRequest, QuizSubmitResponse, QuizAttemptResponse,
    QuizAttemptReviewResponse
)
from app.modules.learning.services import QuizService
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
    summary="Instructor creates a new quiz for the course"
)
async def create_quiz(
    course_id: int,
    quiz_in: QuizCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_instructor)
):
    return await QuizService.create_quiz(db, course_id, quiz_in, current_user.id)

@router.delete(
    "/courses/{course_id}/quizzes/{quiz_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Instructor deletes a quiz"
)
async def delete_quiz(
    course_id: int,
    quiz_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_instructor)
):
    await QuizService.delete_quiz(db, course_id, quiz_id, current_user)
    return None

@router.post(
    "/quizzes/{quiz_id}/questions",
    response_model=QuestionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Instructor adds questions and options to the quiz"
)
async def create_question(
    quiz_id: int,
    question_in: QuestionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_instructor)
):
    return await QuizService.create_question(db, quiz_id, question_in, current_user)

@router.delete(
    "/questions/{question_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Instructor deletes a question"
)
async def delete_question(
    question_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_instructor)
):
    await QuizService.delete_question(db, question_id, current_user)
    return None


# ==================== STUDENT QUIZ ENDPOINTS ====================
@router.get(
    "/courses/{course_id}/quizzes",
    response_model=List[QuizResponse],
    summary="Student gets all quizzes of a purchased course"
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
    summary="Student gets quiz content (Auto-hide correct answers to prevent cheating)"
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
    summary="Student starts a quiz"
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
    summary="Student submits quiz and gets auto-graded result"
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
    summary="Student views details of a past quiz attempt"
)
async def get_attempt(
    attempt_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await QuizService.get_attempt(db, attempt_id, current_user.id)


@router.get(
    "/quizzes/attempts/{attempt_id}/review",
    response_model=QuizAttemptReviewResponse,
    summary="Student views quiz correction after submission"
)
async def get_attempt_review(
    attempt_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await QuizService.get_attempt_review(db, attempt_id, current_user.id)
