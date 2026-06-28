from typing import Generic, Type, TypeVar

from sqlalchemy.ext.asyncio import AsyncSession


ModelT = TypeVar("ModelT")


class BaseRepository(Generic[ModelT]):
    def __init__(self, db: AsyncSession, model: Type[ModelT]):
        self.db = db
        self.model = model

    async def add(self, instance: ModelT) -> ModelT:
        self.db.add(instance)
        return instance

    async def delete(self, instance: ModelT) -> None:
        await self.db.delete(instance)

    async def refresh(self, instance: ModelT) -> ModelT:
        await self.db.refresh(instance)
        return instance

    async def flush(self) -> None:
        await self.db.flush()
