from typing import List

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.course import Course, Lesson
from app.models.user import User
from app.repositories.learning_repository import LearningRepository
from app.services.storage_service import StorageService


class LearningService:
    @staticmethod
    async def get_my_courses(db: AsyncSession, user_id: int) -> List[Course]:
        learning_repo = LearningRepository(db)
        return await learning_repo.list_enrolled_courses(user_id)

    @staticmethod
    def _sign_lesson_content(lesson: Lesson) -> Lesson:
        if lesson.noi_dung:
            for content in lesson.noi_dung:
                if content.duong_dan_file:
                    if content.loai_noi_dung and content.loai_noi_dung.lower() in ["image", "video", "pdf"]:
                        continue
                    content.duong_dan_file = StorageService.generate_presigned_url(content.duong_dan_file)
        return lesson

    @staticmethod
    async def get_lesson_learning_content(
        db: AsyncSession,
        course_id: int,
        lesson_id: int,
        current_user: User,
    ) -> Lesson:
        learning_repo = LearningRepository(db)
        lesson = await learning_repo.get_lesson_in_course(course_id, lesson_id)
        if not lesson:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Bai hoc khong ton tai hoac khong thuoc khoa hoc nay.",
            )

        is_owner = current_user.vai_tro == "admin" or lesson.chuong_hoc.khoa_hoc.ma_giang_vien == current_user.id
        if not lesson.da_xuat_ban and not is_owner:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bai hoc nay chua duoc xuat ban.",
            )

        if lesson.xem_truoc and lesson.da_xuat_ban:
            lesson_with_content = await learning_repo.get_lesson_with_content(lesson.id)
            return LearningService._sign_lesson_content(lesson_with_content)

        if is_owner:
            lesson_with_content = await learning_repo.get_lesson_with_content(lesson.id)
            return LearningService._sign_lesson_content(lesson_with_content)

        enrollment = await learning_repo.get_enrollment(current_user.id, course_id)
        if not enrollment:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Ban chua mua khoa hoc nay. Hay thanh toan de bat dau hoc bai giang.",
            )

        published_lessons = await learning_repo.list_published_lessons(course_id)
        current_index = next(
            (index for index, published_lesson in enumerate(published_lessons) if published_lesson.id == lesson_id),
            -1,
        )

        if current_index > 0:
            previous_lesson = published_lessons[current_index - 1]
            previous_progress = await learning_repo.get_completed_progress(enrollment.id, previous_lesson.id)
            if previous_progress is None:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Ban phai hoan thanh bai giang truoc: {previous_lesson.tieu_de}.",
                )

        lesson_with_content = await learning_repo.get_lesson_with_content(lesson.id)
        return LearningService._sign_lesson_content(lesson_with_content)
