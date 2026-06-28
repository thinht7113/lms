from datetime import datetime, timedelta
import random

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_password_hash, verify_password
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.schemas.user import UserRegister, UserUpdate


class AuthService:
    @staticmethod
    async def register(db: AsyncSession, user_in: UserRegister) -> User:
        user_repo = UserRepository(db)
        existing_user = await user_repo.get_by_email(user_in.email)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email nay da duoc su dung tren he thong.",
            )

        new_user = User(
            email=user_in.email,
            ho_ten=user_in.ho_ten,
            so_dien_thoai=user_in.so_dien_thoai,
            mat_khau=get_password_hash(user_in.mat_khau),
            vai_tro=user_in.vai_tro,
        )
        await user_repo.add(new_user)
        await db.commit()
        await user_repo.refresh(new_user)
        return new_user

    @staticmethod
    async def authenticate(db: AsyncSession, email: str, mat_khau: str) -> User:
        user_repo = UserRepository(db)
        user = await user_repo.get_by_email(email)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Email hoac mat khau khong chinh xac.",
            )

        if not user.trang_thai_hoat_dong:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Tai khoan da bi khoa.",
            )

        if not user.mat_khau:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Tai khoan nay duoc tao thong qua mang xa hoi.",
            )

        if not verify_password(mat_khau, user.mat_khau):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Email hoac mat khau khong chinh xac.",
            )

        return user

    @staticmethod
    async def update_profile(db: AsyncSession, user: User, update_in: UserUpdate) -> User:
        user_repo = UserRepository(db)
        if update_in.ho_ten is not None:
            user.ho_ten = update_in.ho_ten
        if update_in.avatar_url is not None:
            user.avatar_url = update_in.avatar_url
        if update_in.so_dien_thoai is not None:
            user.so_dien_thoai = update_in.so_dien_thoai

        if update_in.mat_khau_moi:
            if not user.mat_khau:
                user.mat_khau = get_password_hash(update_in.mat_khau_moi)
            else:
                if not update_in.mat_khau_cu:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Vui long nhap mat khau cu.",
                    )
                if not verify_password(update_in.mat_khau_cu, user.mat_khau):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Mat khau cu khong chinh xac.",
                    )
                user.mat_khau = get_password_hash(update_in.mat_khau_moi)

        await user_repo.add(user)
        await db.commit()
        await user_repo.refresh(user)
        return user

    @staticmethod
    async def social_login(db: AsyncSession, social_data: dict) -> User:
        user_repo = UserRepository(db)
        email = social_data.get("email")
        provider = social_data.get("provider")
        provider_id = social_data.get("provider_id")
        ho_ten = social_data.get("ho_ten")
        avatar_url = social_data.get("avatar_url")

        user = await user_repo.get_by_email(email)

        if user:
            if provider == "google" and not user.google_id:
                user.google_id = provider_id
            elif provider == "facebook" and not user.facebook_id:
                user.facebook_id = provider_id

            if avatar_url and not user.avatar_url:
                user.avatar_url = avatar_url
        else:
            user = User(
                email=email,
                ho_ten=ho_ten,
                vai_tro="student",
                mat_khau=None,
                google_id=provider_id if provider == "google" else None,
                facebook_id=provider_id if provider == "facebook" else None,
                avatar_url=avatar_url,
            )

        await user_repo.add(user)
        await db.commit()
        await user_repo.refresh(user)
        return user

    @staticmethod
    async def forgot_password(db: AsyncSession, email: str) -> None:
        user_repo = UserRepository(db)
        user = await user_repo.get_by_email(email)

        if not user or not user.trang_thai_hoat_dong:
            return

        reset_token = str(random.randint(100000, 999999))
        user.reset_token = reset_token
        user.reset_token_expires = datetime.now() + timedelta(minutes=15)

        await user_repo.add(user)
        await db.commit()

        print("\n=======================================================")
        print(f"[MOCK EMAIL] Ma khoi phuc mat khau cho {user.email}: {reset_token}")
        print("=======================================================\n")

    @staticmethod
    async def reset_password(db: AsyncSession, token: str, new_password: str) -> bool:
        user_repo = UserRepository(db)
        user = await user_repo.get_by_reset_token(token)

        if not user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ma xac nhan khong hop le.",
            )

        if not user.reset_token_expires or user.reset_token_expires < datetime.now():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ma xac nhan da het han.",
            )

        user.mat_khau = get_password_hash(new_password)
        user.reset_token = None
        user.reset_token_expires = None

        await user_repo.add(user)
        await db.commit()
        return True
