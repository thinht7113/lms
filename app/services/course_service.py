from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, and_, desc, asc, func
from sqlalchemy.orm import selectinload, attributes
from fastapi import HTTPException, status
from app.models.course import Category, Course, Section, Lesson
from app.models.user import User
from app.schemas.course import CategoryCreate, CourseCreate, CourseUpdate, SectionCreate, LessonCreate, LessonUpdate
from typing import List, Optional
from decimal import Decimal

class CourseService:
    # ==================== CATEGORY SERVICES ====================
    @staticmethod
    async def create_category(db: AsyncSession, category_in: CategoryCreate) -> Category:
        db_category = Category(
            ten_danh_muc=category_in.ten_danh_muc,
            mo_ta=category_in.mo_ta
        )
        db.add(db_category)
        await db.commit()
        await db.refresh(db_category)
        return db_category

    @staticmethod
    async def get_categories(db: AsyncSession) -> List[Category]:
        result = await db.execute(select(Category))
        return list(result.scalars().all())

    # ==================== COURSE SERVICES ====================
    @staticmethod
    async def create_course(db: AsyncSession, course_in: CourseCreate, instructor_id: int) -> Course:
        # Kiểm tra danh mục tồn tại nếu được cung cấp
        if course_in.category_id:
            result = await db.execute(select(Category).where(Category.id == course_in.category_id))
            if not result.scalars().first():
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Danh mục không tồn tại."
                )

        db_course = Course(
            ma_giang_vien=instructor_id,
            ma_danh_muc=course_in.category_id,
            tieu_de=course_in.title,
            mo_ta=course_in.description,
            gia_tien=course_in.price,
            trinh_do=course_in.level,
            da_xuat_ban=False
        )
        db.add(db_course)
        await db.commit()
        await db.refresh(db_course)
        return db_course

    @staticmethod
    async def get_course(db: AsyncSession, course_id: int) -> Course:
        # Load đầy đủ chương học và bài học trong chương học bằng selectinload
        result = await db.execute(
            select(Course)
            .options(
                selectinload(Course.chuong_hoc).selectinload(Section.bai_hoc)
            )
            .where(Course.id == course_id)
        )
        course = result.scalars().first()
        if not course:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy khóa học."
            )
        return course

    @staticmethod
    async def get_courses(
        db: AsyncSession,
        skip: int = 0,
        limit: int = 20,
        q: Optional[str] = None,
        category_id: Optional[int] = None,
        level: Optional[str] = None,
        min_price: Optional[Decimal] = None,
        max_price: Optional[Decimal] = None,
        instructor_id: Optional[int] = None,
        sort_by: Optional[str] = "ngay_tao",
        order: Optional[str] = "desc"
    ) -> List[Course]:
        query = select(Course).where(Course.da_xuat_ban == True)

        # 1. Filters
        if q:
            query = query.where(
                or_(
                    Course.tieu_de.ilike(f"%{q}%"),
                    Course.mo_ta.ilike(f"%{q}%")
                )
            )
        if category_id:
            query = query.where(Course.ma_danh_muc == category_id)
        if level:
            query = query.where(Course.trinh_do == level)
        if min_price is not None:
            query = query.where(Course.gia_tien >= min_price)
        if max_price is not None:
            query = query.where(Course.gia_tien <= max_price)
        if instructor_id:
            query = query.where(Course.ma_giang_vien == instructor_id)

        # 2. Sorting
        sort_column = Course.ngay_tao
        if sort_by == "gia_tien":
            sort_column = Course.gia_tien
        elif sort_by == "danh_gia_trung_binh":
            sort_column = Course.danh_gia_trung_binh

        if order == "asc":
            query = query.order_by(asc(sort_column))
        else:
            query = query.order_by(desc(sort_column))

        # 3. Pagination
        query = query.offset(skip).limit(limit)

        result = await db.execute(query)
        return list(result.scalars().all())

    @staticmethod
    async def get_instructor_courses(db: AsyncSession, instructor_id: int) -> List[Course]:
        result = await db.execute(
            select(Course)
            .options(selectinload(Course.chuong_hoc))
            .where(Course.ma_giang_vien == instructor_id)
        )
        return list(result.scalars().all())

    @staticmethod
    async def update_course(db: AsyncSession, course_id: int, course_in: CourseUpdate, instructor_id: int) -> Course:
        course = await CourseService.get_course(db, course_id)
        if course.ma_giang_vien != instructor_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn không có quyền chỉnh sửa khóa học này."
            )

        update_data = course_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(course, field, value)

        db.add(course)
        await db.commit()
        await db.refresh(course)
        return course

    # ==================== SECTION SERVICES ====================
    @staticmethod
    async def create_section(db: AsyncSession, course_id: int, section_in: SectionCreate, instructor_id: int) -> Section:
        course = await CourseService.get_course(db, course_id)
        if course.ma_giang_vien != instructor_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn không có quyền thêm chương học vào khóa học này."
            )

        db_section = Section(
            ma_khoa_hoc=course_id,
            tieu_de=section_in.tieu_de,
            thu_tu=section_in.sort_order
        )
        db.add(db_section)
        await db.commit()
        await db.refresh(db_section)
        # Sử dụng set_committed_value của SQLAlchemy để tránh kích hoạt lazy-loading
        attributes.set_committed_value(db_section, "bai_hoc", [])
        return db_section

    # ==================== LESSON SERVICES ====================
    @staticmethod
    async def create_lesson(db: AsyncSession, section_id: int, lesson_in: LessonCreate, instructor_id: int) -> Lesson:
        # Kiểm tra chương học tồn tại và giảng viên sở hữu khóa học đó
        result = await db.execute(
            select(Section)
            .options(selectinload(Section.khoa_hoc))
            .where(Section.id == section_id)
        )
        section = result.scalars().first()
        if not section:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Chương học không tồn tại."
            )
        if section.khoa_hoc.ma_giang_vien != instructor_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn không có quyền chỉnh sửa nội dung khóa học này."
            )

        db_lesson = Lesson(
            ma_chuong_hoc=section_id,
            tieu_de=lesson_in.tieu_de,
            loai_noi_dung=lesson_in.loai_noi_dung,
            duong_dan_video=lesson_in.duong_dan_video,
            duong_dan_tai_lieu=lesson_in.duong_dan_tai_lieu,
            duong_dan_noi_dung=lesson_in.duong_dan_noi_dung,
            thoi_luong=lesson_in.thoi_luong,
            thu_tu=lesson_in.thu_tu,
            xem_truoc=lesson_in.xem_truoc
        )
        db.add(db_lesson)
        await db.commit()
        await db.refresh(db_lesson)
        
        # Load lại kèm chuong_hoc để tránh lỗi async lazy loading khi truy cập property ma_khoa_hoc
        final_res = await db.execute(
            select(Lesson)
            .options(selectinload(Lesson.chuong_hoc))
            .where(Lesson.id == db_lesson.id)
        )
        return final_res.scalars().one()

    @staticmethod
    async def update_lesson(db: AsyncSession, lesson_id: int, lesson_in: LessonUpdate, instructor_id: int) -> Lesson:
        result = await db.execute(
            select(Lesson)
            .options(selectinload(Lesson.chuong_hoc).selectinload(Section.khoa_hoc))
            .where(Lesson.id == lesson_id)
        )
        lesson = result.scalars().first()
        if not lesson:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Bài học không tồn tại."
            )
        if lesson.chuong_hoc.khoa_hoc.ma_giang_vien != instructor_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn không có quyền chỉnh sửa bài học này."
            )

        update_data = lesson_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(lesson, field, value)

        db.add(lesson)
        await db.commit()
        await db.refresh(lesson)
        return lesson

    @staticmethod
    async def delete_lesson(db: AsyncSession, lesson_id: int, instructor_id: int) -> bool:
        result = await db.execute(
            select(Lesson)
            .options(selectinload(Lesson.chuong_hoc).selectinload(Section.khoa_hoc))
            .where(Lesson.id == lesson_id)
        )
        lesson = result.scalars().first()
        if not lesson:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Bài học không tồn tại."
            )
        if lesson.chuong_hoc.khoa_hoc.ma_giang_vien != instructor_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn không có quyền xóa bài học này."
            )

        await db.delete(lesson)
        await db.commit()
        return True
