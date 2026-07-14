from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from config import settings

engine = create_async_engine(settings.DATABASE_URL,echo=False,pool_pre_ping=True,pool_recycle=1800)
async_session_maker = async_sessionmaker(engine,expire_on_commit=False,class_=AsyncSession)

async def get_db_session():
    async with async_session_maker() as session:
        yield session
