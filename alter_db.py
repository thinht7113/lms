import asyncio
from sqlalchemy import text
from app.core.database import engine

async def alter_db():
    async with engine.begin() as conn:
        try:
            await conn.execute(text("ALTER TABLE nguoi_dung ALTER COLUMN mat_khau DROP NOT NULL;"))
            await conn.execute(text("ALTER TABLE nguoi_dung ADD COLUMN google_id VARCHAR(255) UNIQUE;"))
            await conn.execute(text("ALTER TABLE nguoi_dung ADD COLUMN facebook_id VARCHAR(255) UNIQUE;"))
            await conn.execute(text("ALTER TABLE nguoi_dung ADD COLUMN avatar_url VARCHAR(500);"))
            print("Successfully updated database schema!")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(alter_db())
