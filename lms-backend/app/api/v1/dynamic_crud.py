from enum import Enum
from typing import Any, Dict, List, Optional, Sequence, Type

from fastapi import APIRouter, Depends, Query, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_admin_user, get_db
from app.models.user import User
from app.services.dynamic_crud_service import DynamicCrudService


def create_crud_router(
    model: Type[Any],
    response_schema: Type[BaseModel],
    create_schema: Type[BaseModel],
    update_schema: Type[BaseModel],
    prefix: str,
    tags: Sequence[str | Enum] | None = None,
    search_columns: Optional[List[str]] = None,
    options: Optional[List[Any]] = None,
) -> APIRouter:
    router = APIRouter(prefix=prefix, tags=list(tags) if tags is not None else None)

    @router.get("", response_model=Dict[str, Any])
    async def get_all(
        skip: int = Query(0, ge=0),
        limit: int = Query(10, ge=1, le=100),
        search: Optional[str] = None,
        filter_col: Optional[str] = None,
        filter_val: Optional[str] = None,
        db: AsyncSession = Depends(get_db),
        current_admin: User = Depends(get_current_admin_user),
    ):
        return await DynamicCrudService.list_items(
            db=db,
            model=model,
            response_schema=response_schema,
            skip=skip,
            limit=limit,
            search=search,
            filter_col=filter_col,
            filter_val=filter_val,
            search_columns=search_columns,
            options=options,
        )

    @router.get("/{item_id}", response_model=response_schema)
    async def get_one(
        item_id: int,
        db: AsyncSession = Depends(get_db),
        current_admin: User = Depends(get_current_admin_user),
    ):
        return await DynamicCrudService.get_item(db, model, item_id, options)

    @router.post("", response_model=response_schema, status_code=status.HTTP_201_CREATED)
    async def create_item(
        item_in: create_schema,  # pyright: ignore[reportInvalidTypeForm]
        db: AsyncSession = Depends(get_db),
        current_admin: User = Depends(get_current_admin_user),
    ):
        return await DynamicCrudService.create_item(db, model, item_in, options)

    @router.put("/{item_id}", response_model=response_schema)
    async def update_item(
        item_id: int,
        item_in: update_schema,  # pyright: ignore[reportInvalidTypeForm]
        db: AsyncSession = Depends(get_db),
        current_admin: User = Depends(get_current_admin_user),
    ):
        return await DynamicCrudService.update_item(db, model, item_id, item_in, options)

    @router.delete("/{item_id}")
    async def delete_item(
        item_id: int,
        db: AsyncSession = Depends(get_db),
        current_admin: User = Depends(get_current_admin_user),
    ):
        return await DynamicCrudService.delete_item(db, model, item_id)

    return router
