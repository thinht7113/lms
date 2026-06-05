from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, and_, desc, asc, func
from sqlalchemy.orm import selectinload, attributes
from fastapi import HTTPException, status
from app.models.course import Category, Course, Section, Lesson, LessonContent, Enrollment, CourseReview, Wishlist, CoursePrerequisite
from app.models.user import User
from app.schemas.course import CategoryCreate, CourseCreate, CourseUpdate, SectionCreate, LessonCreate, LessonUpdate, LessonContentCreate, ReviewCreate
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
        # Load đầy đủ chương học, bài học, đánh giá và điều kiện tiên quyết bằng selectinload
        result = await db.execute(
            select(Course)
            .options(
                selectinload(Course.chuong_hoc)
                .selectinload(Section.bai_hoc)
                .selectinload(Lesson.noi_dung),
                selectinload(Course.danh_gia_khoa_hoc)
                .selectinload(CourseReview.nguoi_dung),
                selectinload(Course.dieu_kien_tien_quyet)
                .selectinload(CoursePrerequisite.khoa_hoc_tien_quyet)
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
            .options(
                selectinload(Course.chuong_hoc),
                selectinload(Course.dang_ky_hoc)
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
            thoi_luong=lesson_in.thoi_luong,
            thu_tu=lesson_in.thu_tu,
            xem_truoc=lesson_in.xem_truoc,
            da_xuat_ban=lesson_in.da_xuat_ban if lesson_in.da_xuat_ban is not None else False
        )

        db.add(db_lesson)
        await db.commit()
        await db.refresh(db_lesson)
        
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
        
        if lesson_in.noi_dung:
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

    # ==================== COURSE PREREQUISITE SERVICES ====================
    @staticmethod
    async def add_course_prerequisite(db: AsyncSession, course_id: int, prereq_id: int) -> CoursePrerequisite:
        if course_id == prereq_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Khóa học không thể tự làm điều kiện tiên quyết của chính nó."
            )
            
        # Kiểm tra sự tồn tại của cả hai khóa học
        main_course_res = await db.execute(select(Course).where(Course.id == course_id))
        if not main_course_res.scalars().first():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Khóa học chính không tồn tại."
            )
            
        prereq_course_res = await db.execute(select(Course).where(Course.id == prereq_id))
        prereq_course = prereq_course_res.scalars().first()
        if not prereq_course:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Khóa học tiên quyết không tồn tại."
            )
            
        # Kiểm tra xem liên kết đã tồn tại chưa
        existing = await db.execute(
            select(CoursePrerequisite).where(
                and_(
                    CoursePrerequisite.ma_khoa_hoc_chinh == course_id,
                    CoursePrerequisite.ma_khoa_hoc_tien_quyet == prereq_id
                )
            )
        )
        if existing.scalars().first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Điều kiện tiên quyết này đã tồn tại."
            )
            
        # Kiểm tra tính tuần hoàn: prereq_id có yêu cầu course_id làm tiên quyết không?
        async def check_circular(start: int, target: int) -> bool:
            visited = set()
            queue = [start]
            while queue:
                curr = queue.pop(0)
                if curr == target:
                    return True
                if curr in visited:
                    continue
                visited.add(curr)
                res = await db.execute(
                    select(CoursePrerequisite.ma_khoa_hoc_tien_quyet)
                    .where(CoursePrerequisite.ma_khoa_hoc_chinh == curr)
                )
                for p_id in res.scalars().all():
                    if p_id not in visited:
                        queue.append(p_id)
            return False
            
        if await check_circular(prereq_id, course_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Không thể tạo liên kết vì sẽ gây ra chu kỳ phụ thuộc điều kiện tiên quyết."
            )
            
        db_prereq = CoursePrerequisite(
            ma_khoa_hoc_chinh=course_id,
            ma_khoa_hoc_tien_quyet=prereq_id
        )
        db.add(db_prereq)
        await db.commit()
        await db.refresh(db_prereq)
        
        attributes.set_committed_value(db_prereq, "khoa_hoc_tien_quyet", prereq_course)
        return db_prereq

    @staticmethod
    async def delete_course_prerequisite(db: AsyncSession, course_id: int, prereq_id: int) -> bool:
        # Tìm bản ghi liên kết điều kiện tiên quyết
        result = await db.execute(
            select(CoursePrerequisite).where(
                and_(
                    CoursePrerequisite.ma_khoa_hoc_chinh == course_id,
                    CoursePrerequisite.ma_khoa_hoc_tien_quyet == prereq_id
                )
            )
        )
        db_prereq = result.scalars().first()
        if not db_prereq:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Mối liên kết điều kiện tiên quyết này không tồn tại."
            )
        await db.delete(db_prereq)
        await db.commit()
        return True

    @staticmethod
    async def check_prerequisites(db: AsyncSession, user_id: int, course_id: int):
        # Lấy tất cả điều kiện tiên quyết của khóa học chính
        result = await db.execute(
            select(CoursePrerequisite)
            .options(selectinload(CoursePrerequisite.khoa_hoc_tien_quyet))
            .where(CoursePrerequisite.ma_khoa_hoc_chinh == course_id)
        )
        prereqs = result.scalars().all()
        
        from app.services.cert_service import CertService
        from app.models.certificate import Certificate
        
        for prereq in prereqs:
            prereq_id = prereq.ma_khoa_hoc_tien_quyet
            prereq_title = prereq.khoa_hoc_tien_quyet.tieu_de
            
            # 1. Kiểm tra xem có chứng chỉ chưa
            cert_res = await db.execute(
                select(Certificate).where(
                    and_(
                        Certificate.ma_nguoi_dung == user_id,
                        Certificate.ma_khoa_hoc == prereq_id
                    )
                )
            )
            if cert_res.scalars().first():
                continue
                
            # 2. Kiểm tra Enrollment
            enroll_res = await db.execute(
                select(Enrollment).where(
                    and_(
                        Enrollment.ma_nguoi_dung == user_id,
                        Enrollment.ma_khoa_hoc == prereq_id
                    )
                )
            )
            enrollment = enroll_res.scalars().first()
            if not enrollment:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Bạn cần hoàn thành khóa học tiên quyết: {prereq_title} trước khi đăng ký khóa học này."
                )
                
            # 3. Tính tiến độ nếu đã Enrollment
            progress_data = await CertService.get_course_progress(db, user_id, prereq_id)
            if progress_data["progress_percentage"] < 100.0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Bạn cần hoàn thành khóa học tiên quyết: {prereq_title} trước khi đăng ký khóa học này."
                )


