from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, and_, desc, asc, func
from sqlalchemy.orm import selectinload, attributes
from fastapi import HTTPException, status
from app.models.course import Category, Course, Section, Lesson, LessonContent, Enrollment, CourseReview, Wishlist
from app.models.user import User
from app.schemas.course import (
    CategoryCreate, CourseCreate, CourseUpdate,
    SectionCreate, SectionUpdate,
    LessonCreate, LessonUpdate,
    LessonContentCreate, LessonContentUpdate,
    ReviewCreate,
)
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

    @staticmethod
    async def get_categories_with_counts(db: AsyncSession) -> list:
        """Trả về danh mục kèm số lượng khóa học đã xuất bản (tính bằng SQL COUNT)."""
        result = await db.execute(
            select(
                Category.id,
                Category.ten_danh_muc,
                Category.mo_ta,
                func.count(Course.id).label("course_count")
            )
            .outerjoin(Course, and_(
                Course.ma_danh_muc == Category.id,
                Course.da_xuat_ban == True,
                Course.trang_thai_phe_duyet == "approved"
            ))
            .group_by(Category.id)
        )
        rows = result.all()
        return [
            {
                "id": row.id,
                "ten_danh_muc": row.ten_danh_muc,
                "mo_ta": row.mo_ta,
                "course_count": row.course_count,
            }
            for row in rows
        ]

    @staticmethod
    async def get_featured_courses(db: AsyncSession, limit: int = 8) -> dict:
        """Trả về 3 nhóm khóa học nổi bật trong 1 lần truy vấn batch: phổ biến, giá tốt, mới nhất."""
        popular = await CourseService.get_courses(
            db, limit=limit, sort_by="so_luong_hoc_vien", order="desc"
        )
        affordable = await CourseService.get_courses(
            db, limit=limit, min_price=Decimal("0.01"), sort_by="gia_tien", order="asc"
        )
        newest = await CourseService.get_courses(
            db, limit=limit, sort_by="ngay_tao", order="desc"
        )
        return {
            "popular": popular,
            "affordable": affordable,
            "newest": newest,
        }

    # ==================== COURSE SERVICES ====================
    @staticmethod
    async def create_course(db: AsyncSession, course_in: CourseCreate, instructor_id: int) -> Course:
        # Kiểm tra danh mục tồn tại nếu được cung cấp
        if course_in.ma_danh_muc:
            result = await db.execute(select(Category).where(Category.id == course_in.ma_danh_muc))
            if not result.scalars().first():
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Danh mục không tồn tại."
                )

        db_course = Course(
            ma_giang_vien=instructor_id,
            ma_danh_muc=course_in.ma_danh_muc,
            tieu_de=course_in.tieu_de,
            mo_ta=course_in.mo_ta,
            gia_tien=course_in.gia_tien,
            trinh_do=course_in.trinh_do,
            anh_dai_dien=course_in.anh_dai_dien,
            da_xuat_ban=False
        )
        db.add(db_course)
        await db.commit()
        
        # Reload course with all required relationships loaded
        result = await db.execute(
            select(Course)
            .options(selectinload(Course.dang_ky_hoc), selectinload(Course.giang_vien))
            .where(Course.id == db_course.id)
        )
        return result.scalars().one()

    @staticmethod
    async def get_course(db: AsyncSession, course_id: int) -> Course:
        # Load đầy đủ chương học, bài học, đánh giá bằng selectinload
        result = await db.execute(
            select(Course)
            .options(
                selectinload(Course.chuong_hoc)
                .selectinload(Section.bai_hoc)
                .selectinload(Lesson.noi_dung),
                selectinload(Course.danh_gia_khoa_hoc)
                .selectinload(CourseReview.nguoi_dung),
                selectinload(Course.giang_vien),
                selectinload(Course.dang_ky_hoc)
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
        enrollment_count = (
            select(
                Enrollment.ma_khoa_hoc.label("course_id"),
                func.count(Enrollment.id).label("student_count"),
            )
            .group_by(Enrollment.ma_khoa_hoc)
            .subquery()
        )

        query = (
            select(Course, func.coalesce(enrollment_count.c.student_count, 0))
            .options(selectinload(Course.giang_vien), selectinload(Course.dang_ky_hoc))
            .outerjoin(enrollment_count, enrollment_count.c.course_id == Course.id)
            .where(
                Course.da_xuat_ban == True,
                Course.trang_thai_phe_duyet == "approved"
            )
        )

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
        elif sort_by == "so_luong_hoc_vien":
            sort_column = func.coalesce(enrollment_count.c.student_count, 0)

        if order == "asc":
            query = query.order_by(asc(sort_column))
        else:
            query = query.order_by(desc(sort_column))

        # 3. Pagination
        query = query.offset(skip).limit(limit)

        result = await db.execute(query)
        courses: List[Course] = []
        for course, student_count in result.all():
            setattr(course, "_so_luong_hoc_vien", int(student_count or 0))
            courses.append(course)
        return courses

    @staticmethod
    async def get_instructor_courses(db: AsyncSession, instructor_id: int) -> List[Course]:
        result = await db.execute(
            select(Course)
            .options(
                selectinload(Course.chuong_hoc),
                selectinload(Course.dang_ky_hoc),
                selectinload(Course.giang_vien)
            )
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
        old_price = course.gia_tien

        for field, value in update_data.items():
            setattr(course, field, value)

        db.add(course)
        await db.commit()
        
        # Reload course with all required relationships loaded
        result = await db.execute(
            select(Course)
            .options(selectinload(Course.dang_ky_hoc), selectinload(Course.giang_vien))
            .where(Course.id == course_id)
        )
        course = result.scalars().one()

        if "gia_tien" in update_data and old_price is not None and Decimal(update_data["gia_tien"]) != Decimal(old_price):
            from app.models.notification import Notification
            from app.models.course import Wishlist
            wishlist_res = await db.execute(select(Wishlist).where(Wishlist.ma_khoa_hoc == course_id))
            for w in wishlist_res.scalars().all():
                db.add(Notification(
                    ma_nguoi_dung=w.ma_nguoi_dung,
                    tieu_de="Khóa học yêu thích thay đổi giá!",
                    noi_dung=f"Khóa học '{course.tieu_de}' mà bạn lưu trong Wishlist vừa được cập nhật giá. Cơ hội tuyệt vời để bắt đầu học ngay!",
                    loai="course"
                ))
            await db.commit()

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
            thu_tu=section_in.thu_tu
        )
        db.add(db_section)
        await db.commit()
        await db.refresh(db_section)
        # Sử dụng set_committed_value của SQLAlchemy để tránh kích hoạt lazy-loading
        attributes.set_committed_value(db_section, "bai_hoc", [])
        return db_section

    @staticmethod
    async def update_section(db: AsyncSession, section_id: int, section_in: SectionUpdate, instructor_id: int) -> Section:
        result = await db.execute(
            select(Section)
            .options(selectinload(Section.khoa_hoc), selectinload(Section.bai_hoc))
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
                detail="Bạn không có quyền chỉnh sửa chương học này."
            )

        update_data = section_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(section, field, value)

        db.add(section)
        await db.commit()
        
        final_res = await db.execute(
            select(Section)
            .options(
                selectinload(Section.khoa_hoc),
                selectinload(Section.bai_hoc).selectinload(Lesson.noi_dung)
            )
            .where(Section.id == section_id)
        )
        return final_res.scalars().one()

    @staticmethod
    async def delete_section(db: AsyncSession, section_id: int, instructor_id: int) -> bool:
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
                detail="Bạn không có quyền xóa chương học này."
            )

        await db.delete(section)
        await db.commit()
        return True

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
            thoi_luong=lesson_in.thoi_luong,
            thu_tu=lesson_in.thu_tu,
            xem_truoc=lesson_in.xem_truoc,
            da_xuat_ban=lesson_in.da_xuat_ban if lesson_in.da_xuat_ban is not None else False
        )

        db.add(db_lesson)
        await db.flush()
        
        # Thêm các block nội dung nếu có
        for content_in in lesson_in.noi_dung:
            db_content = LessonContent(
                ma_bai_hoc=db_lesson.id,
                loai_noi_dung=content_in.loai_noi_dung,
                noi_dung_text=content_in.noi_dung_text,
                duong_dan_file=content_in.duong_dan_file,
                thu_tu=content_in.thu_tu
            )
            db.add(db_content)
        
        await db.commit()
        
        # Load lại kèm chuong_hoc và noi_dung để trả về chuẩn Schema
        final_res = await db.execute(
            select(Lesson)
            .options(
                selectinload(Lesson.chuong_hoc),
                selectinload(Lesson.noi_dung)
            )
            .where(Lesson.id == db_lesson.id)
        )
        return final_res.scalars().one()

    @staticmethod
    async def update_lesson(db: AsyncSession, lesson_id: int, lesson_in: LessonUpdate, instructor_id: int) -> Lesson:
        result = await db.execute(
            select(Lesson)
            .options(
                selectinload(Lesson.chuong_hoc).selectinload(Section.khoa_hoc),
                selectinload(Lesson.noi_dung)
            )
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
        
        final_res = await db.execute(
            select(Lesson)
            .options(
                selectinload(Lesson.chuong_hoc).selectinload(Section.khoa_hoc),
                selectinload(Lesson.noi_dung)
            )
            .where(Lesson.id == lesson_id)
        )
        return final_res.scalars().one()

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

    # ==================== LESSON CONTENT SERVICES ====================
    @staticmethod
    async def create_lesson_content(db: AsyncSession, lesson_id: int, content_in: LessonContentCreate, instructor_id: int) -> LessonContent:
        result = await db.execute(
            select(Lesson)
            .options(selectinload(Lesson.chuong_hoc).selectinload(Section.khoa_hoc))
            .where(Lesson.id == lesson_id)
        )
        lesson = result.scalars().first()
        if not lesson:
            raise HTTPException(status_code=404, detail="Bài học không tồn tại.")
        if lesson.chuong_hoc.khoa_hoc.ma_giang_vien != instructor_id:
            raise HTTPException(status_code=403, detail="Không có quyền chỉnh sửa.")

        db_content = LessonContent(
            ma_bai_hoc=lesson_id,
            loai_noi_dung=content_in.loai_noi_dung,
            noi_dung_text=content_in.noi_dung_text,
            duong_dan_file=content_in.duong_dan_file,
            thu_tu=content_in.thu_tu
        )
        db.add(db_content)
        await db.commit()
        await db.refresh(db_content)
        return db_content

    @staticmethod
    async def delete_lesson_content(db: AsyncSession, content_id: int, instructor_id: int) -> bool:
        result = await db.execute(
            select(LessonContent)
            .options(selectinload(LessonContent.bai_hoc).selectinload(Lesson.chuong_hoc).selectinload(Section.khoa_hoc))
            .where(LessonContent.id == content_id)
        )
        content = result.scalars().first()
        if not content:
            raise HTTPException(status_code=404, detail="Nội dung không tồn tại.")
        if content.bai_hoc.chuong_hoc.khoa_hoc.ma_giang_vien != instructor_id:
            raise HTTPException(status_code=403, detail="Không có quyền xóa.")

        await db.delete(content)
        await db.commit()
        return True

    @staticmethod
    async def update_lesson_content(db: AsyncSession, content_id: int, content_in: LessonContentUpdate, instructor_id: int) -> LessonContent:
        result = await db.execute(
            select(LessonContent)
            .options(selectinload(LessonContent.bai_hoc).selectinload(Lesson.chuong_hoc).selectinload(Section.khoa_hoc))
            .where(LessonContent.id == content_id)
        )
        content = result.scalars().first()
        if not content:
            raise HTTPException(status_code=404, detail="Nội dung không tồn tại.")
        if content.bai_hoc.chuong_hoc.khoa_hoc.ma_giang_vien != instructor_id:
            raise HTTPException(status_code=403, detail="Không có quyền chỉnh sửa.")

        update_data = content_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(content, field, value)

        db.add(content)
        await db.commit()
        await db.refresh(content)
        return content

    # ==================== COURSE REVIEW SERVICES ====================
    @staticmethod
    async def create_course_review(db: AsyncSession, user_id: int, course_id: int, review_in: ReviewCreate) -> CourseReview:
        # 1. Kiểm tra học viên đã đăng ký/mua khóa học này chưa
        enroll_result = await db.execute(
            select(Enrollment).where(
                and_(
                    Enrollment.ma_nguoi_dung == user_id,
                    Enrollment.ma_khoa_hoc == course_id
                )
            )
        )
        if not enroll_result.scalars().first():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn phải đăng ký và mua khóa học này mới được phép đánh giá."
            )

        # 2. Kiểm tra xem học viên đã đánh giá khóa học này chưa (Unique Constraint)
        existing_review = await db.execute(
            select(CourseReview).where(
                and_(
                    CourseReview.ma_nguoi_dung == user_id,
                    CourseReview.ma_khoa_hoc == course_id
                )
            )
        )
        if existing_review.scalars().first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Bạn đã đánh giá khóa học này rồi."
            )

        # 3. Tạo đánh giá mới
        db_review = CourseReview(
            ma_nguoi_dung=user_id,
            ma_khoa_hoc=course_id,
            so_sao=review_in.so_sao,
            binh_luan=review_in.binh_luan
        )
        db.add(db_review)
        await db.commit()
        await db.refresh(db_review)

        # 4. Tính toán lại đánh giá trung bình của khóa học
        avg_stars_result = await db.execute(
            select(func.avg(CourseReview.so_sao)).where(CourseReview.ma_khoa_hoc == course_id)
        )
        avg_stars = avg_stars_result.scalar() or 0.0
        
        course_result = await db.execute(select(Course).where(Course.id == course_id))
        course = course_result.scalars().first()
        if course:
            course.danh_gia_trung_binh = Decimal(str(round(float(avg_stars), 2)))
            db.add(course)
            await db.commit()

        # Load thêm thông tin người dùng gửi về
        final_res = await db.execute(
            select(CourseReview)
            .options(selectinload(CourseReview.nguoi_dung), selectinload(CourseReview.khoa_hoc))
            .where(CourseReview.id == db_review.id)
        )
        return final_res.scalars().one()

    @staticmethod
    async def get_course_reviews(db: AsyncSession, course_id: int, skip: int = 0, limit: int = 20) -> List[CourseReview]:
        result = await db.execute(
            select(CourseReview)
            .options(selectinload(CourseReview.nguoi_dung))
            .where(CourseReview.ma_khoa_hoc == course_id)
            .order_by(desc(CourseReview.ngay_tao))
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all())

    # ==================== COURSE WISHLIST SERVICES ====================
    @staticmethod
    async def toggle_wishlist(db: AsyncSession, user_id: int, course_id: int) -> bool:
        # 1. Kiểm tra khóa học có tồn tại không
        course_result = await db.execute(select(Course).where(Course.id == course_id))
        course = course_result.scalars().first()
        if not course:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Khóa học không tồn tại."
            )

        # 2. Kiểm tra xem người dùng đã yêu thích khóa học này chưa
        existing_wish = await db.execute(
            select(Wishlist).where(
                and_(
                    Wishlist.ma_nguoi_dung == user_id,
                    Wishlist.ma_khoa_hoc == course_id
                )
            )
        )
        db_wish = existing_wish.scalars().first()

        if db_wish:
            # Nếu đã thích, xóa bản ghi (bỏ yêu thích)
            await db.delete(db_wish)
            await db.commit()
            return False
        else:
            # Nếu chưa thích, tạo bản ghi mới (yêu thích)
            new_wish = Wishlist(
                ma_nguoi_dung=user_id,
                ma_khoa_hoc=course_id
            )
            db.add(new_wish)
            await db.commit()
            return True

    @staticmethod
    async def get_user_wishlist(db: AsyncSession, user_id: int) -> List[Wishlist]:
        result = await db.execute(
            select(Wishlist)
            .options(selectinload(Wishlist.khoa_hoc))
            .where(Wishlist.ma_nguoi_dung == user_id)
            .order_by(desc(Wishlist.ngay_them))
        )
        return list(result.scalars().all())
