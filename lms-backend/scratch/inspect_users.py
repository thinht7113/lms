import asyncio
from sqlalchemy import select
from app.core.database import async_session_maker
from app.modules.identity.models import User

async def main():
    async with async_session_maker() as session:
        result = await session.execute(select(User))
        users = result.scalars().all()
        for u in users:
            print(f"ID: {u.id}, Name: {u.ho_ten}, Email: {u.email}, Role: {u.vai_tro}, Active: {u.trang_thai_hoat_dong}")

if __name__ == "__main__":
    asyncio.run(main())
