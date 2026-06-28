from typing import List

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.course import Course
from app.models.user import User
from app.repositories.instructor_repository import InstructorRepository
from app.schemas.course import CourseResponse
from app.schemas.user import InstructorDetailResponse, InstructorResponse


class InstructorService:
    @staticmethod
    def _published_courses(instructor: User) -> List[Course]:
        return [course for course in instructor.khoa_hoc if course.da_xuat_ban]

    @staticmethod
    def _count_students(courses: List[Course]) -> int:
        return sum(len(course.dang_ky_hoc) for course in courses)

    @staticmethod
    async def list_public_instructors(db: AsyncSession) -> List[InstructorResponse]:
        instructor_repo = InstructorRepository(db)
        instructors = await instructor_repo.list_public_instructors()
        response: List[InstructorResponse] = []

        for instructor in instructors:
            published_courses = InstructorService._published_courses(instructor)
            response.append(
                InstructorResponse(
                    id=instructor.id,
                    ho_ten=instructor.ho_ten,
                    avatar_url=instructor.avatar_url,
                    so_luong_khoa_hoc=len(published_courses),
                    so_luong_hoc_vien=InstructorService._count_students(published_courses),
                )
            )

        return response

    @staticmethod
    async def get_instructor_detail(db: AsyncSession, instructor_id: int) -> InstructorDetailResponse:
        instructor_repo = InstructorRepository(db)
        instructor = await instructor_repo.get_public_instructor(instructor_id)
        if instructor is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Khong tim thay giang vien.",
            )

        published_courses = InstructorService._published_courses(instructor)
        courses_response = [
            CourseResponse(
                id=course.id,
                ma_giang_vien=course.ma_giang_vien,
                giang_vien=None,
                ma_danh_muc=course.ma_danh_muc,
                tieu_de=course.tieu_de,
                mo_ta=course.mo_ta,
                gia_tien=course.gia_tien,
                trinh_do=course.trinh_do,
                anh_dai_dien=course.anh_dai_dien,
                da_xuat_ban=course.da_xuat_ban,
                trang_thai_phe_duyet=course.trang_thai_phe_duyet,
                danh_gia_trung_binh=course.danh_gia_trung_binh,
                ngay_tao=course.ngay_tao,
                so_luong_hoc_vien=len(course.dang_ky_hoc),
            )
            for course in published_courses
        ]

        return InstructorDetailResponse(
            id=instructor.id,
            ho_ten=instructor.ho_ten,
            avatar_url=instructor.avatar_url,
            so_luong_khoa_hoc=len(published_courses),
            so_luong_hoc_vien=InstructorService._count_students(published_courses),
            khoa_hoc=courses_response,
        )
