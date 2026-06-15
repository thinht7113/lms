import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def main():
    engine = create_async_engine("postgresql+asyncpg://postgres:thinh@localhost:5432/lms_database")
    async with engine.connect() as conn:
        result = await conn.execute(text("SELECT id, hinh_anh_url, trang_thai FROM banner"))
        rows = result.fetchall()
        with open("banners.txt", "w", encoding="utf-8") as f:
            for r in rows:
                f.write(f"ID: {r[0]}, URL: {r[1]}, Active: {r[2]}\n")

if __name__ == "__main__":
    asyncio.run(main())
