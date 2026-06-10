from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List

from app.core.database import get_db
from app.modules.identity.models import User
from app.modules.identity.schemas import InstructorResponse, InstructorDetailResponse
from app.modules.catalog.models import Course
from app.modules.catalog.schemas import CourseResponse

router = APIRouter()

@router.get(
    "",
    response_model=List[InstructorResponse],
    summary="Lấy danh sách Giảng viên công khai"
)
async def get_public_instructors(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(User)
        .options(
            selectinload(User.khoa_hoc).selectinload(Course.dang_ky_hoc)
        )
        .where(User.vai_tro == "instructor")
    )
    instructors = result.scalars().all()
    
    response_list = []
    for instructor in instructors:
        # Tính số lượng khóa học đã xuất bản
        published_courses = [c for c in instructor.khoa_hoc if c.da_xuat_ban]
        so_luong_khoa_hoc = len(published_courses)
        
        # Tính tổng số lượng học viên từ các khóa học đã xuất bản
        so_luong_hoc_vien = sum(len(c.dang_ky_hoc) for c in published_courses)
        
        response_list.append(InstructorResponse(
            id=instructor.id,
            ho_ten=instructor.ho_ten,
            avatar_url=instructor.avatar_url,
            so_luong_khoa_hoc=so_luong_khoa_hoc,
            so_luong_hoc_vien=so_luong_hoc_vien
        ))
        
    return response_list


@router.get(
    "/{instructor_id}",
    response_model=InstructorDetailResponse,
    summary="Lấy chi tiết Giảng viên và danh sách khóa học"
)
async def get_instructor_detail(instructor_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(User)
        .options(
            selectinload(User.khoa_hoc).selectinload(Course.dang_ky_hoc)
        )
        .where(User.id == instructor_id, User.vai_tro == "instructor")
    )
    instructor = result.scalar_one_or_none()
    if not instructor:
        raise HTTPException(status_code=404, detail="Không tìm thấy giảng viên")

    published_courses = [c for c in instructor.khoa_hoc if c.da_xuat_ban]
    so_luong_hoc_vien = sum(len(c.dang_ky_hoc) for c in published_courses)

    courses_response = []
    for c in published_courses:
      courses_response.append(CourseResponse(
        id=c.id,
        ma_giang_vien=c.ma_giang_vien,
        ma_danh_muc=c.ma_danh_muc,
        tieu_de=c.tieu_de,
        mo_ta=c.mo_ta,
        gia_tien=c.gia_tien,
        trinh_do=c.trinh_do,
        da_xuat_ban=c.da_xuat_ban,
        trang_thai_phe_duyet=c.trang_thai_phe_duyet,
        danh_gia_trung_binh=c.danh_gia_trung_binh,
        ngay_tao=c.ngay_tao,
        so_luong_hoc_vien=len(c.dang_ky_hoc),
      ))

    return InstructorDetailResponse(
        id=instructor.id,
        ho_ten=instructor.ho_ten,
        avatar_url=instructor.avatar_url,
        so_luong_khoa_hoc=len(published_courses),
        so_luong_hoc_vien=so_luong_hoc_vien,
        khoa_hoc=courses_response,
    )
