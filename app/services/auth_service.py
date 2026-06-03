from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, status
from app.models.user import User
from app.schemas.user import UserRegister
from app.core.security import get_password_hash, verify_password

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
        
        # 2. Đối soát mật khẩu đã băm
        if not verify_password(mat_khau, user.mat_khau):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Email hoặc mật khẩu không chính xác."
            )
            
        return user
