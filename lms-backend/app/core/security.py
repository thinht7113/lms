import bcrypt
from datetime import datetime, timedelta, timezone
from typing import Any, Optional, Union
import jwt
from app.core.config import settings

# 1. Hàm kiểm tra mật khẩu khớp với mật khẩu băm (Sử dụng bcrypt trực tiếp)
def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8")
        )
    except Exception:
        return False

# 2. Hàm thực hiện băm mật khẩu (Sử dụng bcrypt trực tiếp)
def get_password_hash(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

# 4. Hàm sinh mã JWT Access Token bảo mật
def create_access_token(
    subject: Union[str, Any], expires_delta: Optional[timedelta] = None
) -> str:
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )
    
    # Payload của JWT chứa ID người dùng và thời gian hết hạn
    to_encode = {"exp": expire, "sub": str(subject)}
    encoded_jwt = jwt.encode(
        to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM
    )
    return encoded_jwt
