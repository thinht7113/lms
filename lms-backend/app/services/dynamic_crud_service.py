from typing import Any, Dict, List, Optional, Sequence, Type

from fastapi import HTTPException
from pydantic import BaseModel
from sqlalchemy import inspect
from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.dynamic_crud_repository import DynamicCrudRepository


class DynamicCrudService:
    @staticmethod
    def _column_keys(model: Type[Any]) -> set[str]:
        mapper = inspect(model)
        return {attr.key for attr in mapper.attrs if hasattr(attr, "columns")}

    @staticmethod
    def _filter_column_data(model: Type[Any], data: Dict[str, Any]) -> Dict[str, Any]:
        column_keys = DynamicCrudService._column_keys(model)
        return {key: value for key, value in data.items() if key in column_keys}

    @staticmethod
    async def _after_mutation(model: Type[Any]) -> None:
        if model.__name__ == "Category":
            from app.core.redis import clear_categories_cache

            await clear_categories_cache()

    @staticmethod
    async def list_items(
        db: AsyncSession,
        model: Type[Any],
        response_schema: Type[BaseModel],
        skip: int,
        limit: int,
        search: Optional[str],
        filter_col: Optional[str],
        filter_val: Optional[str],
        search_columns: Optional[List[str]],
        options: Optional[Sequence[Any]],
    ) -> Dict[str, Any]:
        repo = DynamicCrudRepository(db, model, options)
        items, total = await repo.list_items(
            skip=skip,
            limit=limit,
            search=search,
            search_columns=search_columns,
            filter_col=filter_col,
            filter_val=filter_val,
        )
        return {
            "data": [response_schema.model_validate(item).model_dump() for item in items],
            "total": total,
            "skip": skip,
            "limit": limit,
        }

    @staticmethod
    async def get_item(
        db: AsyncSession,
        model: Type[Any],
        item_id: int,
        options: Optional[Sequence[Any]],
    ) -> Any:
        repo = DynamicCrudRepository(db, model, options)
        item = await repo.get_by_id(item_id)
        if item is None:
            raise HTTPException(status_code=404, detail="Item not found")
        return item

    @staticmethod
    async def create_item(
        db: AsyncSession,
        model: Type[Any],
        item_in: BaseModel,
        options: Optional[Sequence[Any]],
    ) -> Any:
        repo = DynamicCrudRepository(db, model, options)
        data = DynamicCrudService._filter_column_data(
            model,
            item_in.model_dump(exclude_unset=True),
        )
        item = await repo.create(data)
        if options and hasattr(item, "id"):
            item = await repo.get_by_id(item.id) or item
        await DynamicCrudService._after_mutation(model)
        return item

    @staticmethod
    async def update_item(
        db: AsyncSession,
        model: Type[Any],
        item_id: int,
        item_in: BaseModel,
        options: Optional[Sequence[Any]],
    ) -> Any:
        repo = DynamicCrudRepository(db, model, options)
        item = await repo.get_by_id(item_id)
        if item is None:
            raise HTTPException(status_code=404, detail="Item not found")

        column_keys = DynamicCrudService._column_keys(model)
        for field, value in item_in.model_dump(exclude_unset=True).items():
            if field in column_keys:
                setattr(item, field, value)

        item = await repo.update(item)
        await DynamicCrudService._after_mutation(model)
        return item

    @staticmethod
    async def delete_item(
        db: AsyncSession,
        model: Type[Any],
        item_id: int,
    ) -> Dict[str, str]:
        repo = DynamicCrudRepository(db, model)
        item = await repo.get_by_id(item_id)
        if item is None:
            raise HTTPException(status_code=404, detail="Item not found")

        await repo.delete(item)
        await DynamicCrudService._after_mutation(model)
        return {"status": "success", "message": "Deleted successfully"}
