from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, status
from app.models.user import User
from app.core.security import get_password_hash, verify_password
from app.schemas.user import UserRegister, UserUpdate

class AuthService:
    @staticmethod
    async def register(db: AsyncSession, user_in: UserRegister) -> User:
        # 0. Bảo mật: Không cho phép đăng ký vai trò Quản trị viên (Admin) qua cổng công khai
        if user_in.vai_tro == "admin":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Không cho phép đăng ký vai trò Quản trị viên (Admin) qua cổng công khai."
            )

        # 1. Kiểm tra xem email đã được đăng ký trước đó chưa
        result = await db.execute(select(User).where(User.email == user_in.email))
        existing_user = result.scalars().first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email này đã được sử dụng trên hệ thống."
            )
        
        # 2. Khởi tạo thực thể User mới và băm mật khẩu bảo mật
        new_user = User(
            email=user_in.email,
            ho_ten=user_in.ho_ten,
            so_dien_thoai=user_in.so_dien_thoai,
            mat_khau=get_password_hash(user_in.mat_khau),
            vai_tro=user_in.vai_tro
        )
        db.add(new_user)
        await db.commit()  # Commit để DB sinh ID tự tăng cho User
        await db.refresh(new_user)

        return new_user

    @staticmethod
    async def authenticate(db: AsyncSession, email: str, mat_khau: str) -> User:
        # 1. Tìm kiếm người dùng dựa vào email
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalars().first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Email hoặc mật khẩu không chính xác."
            )

        if not user.trang_thai_hoat_dong:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên."
            )
        
        if not user.mat_khau:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Tài khoản này được tạo thông qua mạng xã hội. Vui lòng chọn Đăng nhập bằng Google hoặc Facebook."
            )
            
        if not verify_password(mat_khau, user.mat_khau):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Email hoặc mật khẩu không chính xác."
            )
            
        return user

    @staticmethod
    async def update_profile(db: AsyncSession, user: User, update_in: UserUpdate) -> User:
        if update_in.ho_ten is not None:
            user.ho_ten = update_in.ho_ten
        if update_in.avatar_url is not None:
            user.avatar_url = update_in.avatar_url
        if update_in.so_dien_thoai is not None:
            user.so_dien_thoai = update_in.so_dien_thoai

        if update_in.mat_khau_moi:
            if not user.mat_khau:
                # Tài khoản mạng xã hội chưa có mật khẩu, cho phép đặt mật khẩu mới mà không cần mật khẩu cũ
                user.mat_khau = get_password_hash(update_in.mat_khau_moi)
            else:
                if not update_in.mat_khau_cu:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Vui lòng nhập mật khẩu cũ để đổi mật khẩu mới."
                    )
                if not verify_password(update_in.mat_khau_cu, user.mat_khau):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Mật khẩu cũ không chính xác."
                    )
                user.mat_khau = get_password_hash(update_in.mat_khau_moi)

        db.add(user)
        await db.commit()
        await db.refresh(user)
        return user

    @staticmethod
    async def social_login(db: AsyncSession, social_data: dict) -> User:
        from app.schemas.user import SocialLoginRequest
        # Chuyển đổi thành schema nếu cần
        email = social_data.get("email")
        provider = social_data.get("provider")
        provider_id = social_data.get("provider_id")
        ho_ten = social_data.get("ho_ten")
        avatar_url = social_data.get("avatar_url")

        # 1. Kiểm tra email đã tồn tại chưa
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalars().first()

        if user:
            # 2a. Nếu đã tồn tại -> Liên kết tài khoản (Merge)
            if provider == "google" and not user.google_id:
                user.google_id = provider_id
            elif provider == "facebook" and not user.facebook_id:
                user.facebook_id = provider_id
            
            if avatar_url and not user.avatar_url:
                user.avatar_url = avatar_url
        else:
            # 2b. Nếu chưa tồn tại -> Tạo tài khoản mới (vai trò mặc định: student)
            user = User(
                email=email,
                ho_ten=ho_ten,
                vai_tro="student",
                mat_khau=None,  # Không có mật khẩu
                google_id=provider_id if provider == "google" else None,
                facebook_id=provider_id if provider == "facebook" else None,
                avatar_url=avatar_url
            )
            db.add(user)

        await db.commit()
        await db.refresh(user)
        return user
