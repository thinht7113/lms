from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from typing import Type, Any, Optional, List, Dict
from pydantic import BaseModel
from app.api.deps import get_db, get_current_admin_user
from app.models.user import User

def create_crud_router(
    model: Type[Any],
    response_schema: Type[BaseModel],
    create_schema: Type[BaseModel],
    update_schema: Type[BaseModel],
    prefix: str,
    tags: List[str],
    search_columns: List[str] = None,
    options: List[Any] = None
) -> APIRouter:
    router = APIRouter(prefix=prefix, tags=tags)

    @router.get("", response_model=Dict[str, Any])
    async def get_all(
        skip: int = Query(0, ge=0),
        limit: int = Query(10, ge=1, le=100),
        search: Optional[str] = None,
        filter_col: Optional[str] = None,
        filter_val: Optional[str] = None,
        db: AsyncSession = Depends(get_db),
        current_admin: User = Depends(get_current_admin_user)
    ):
        query = select(model)
        if options:
            query = query.options(*options)
        count_query = select(func.count()).select_from(model)

        if filter_col and filter_val and hasattr(model, filter_col):
            col = getattr(model, filter_col)
            # Try to convert to int if it's a numeric column
            val = int(filter_val) if filter_val.isdigit() else filter_val
            query = query.where(col == val)
            count_query = count_query.where(col == val)

        if search and search_columns:
            conditions = []
            for col_name in search_columns:
                col = getattr(model, col_name)
                if isinstance(col.type, str.__class__): # Simple string check
                    conditions.append(col.ilike(f"%{search}%"))
                elif hasattr(col.type, 'python_type') and col.type.python_type == str:
                    conditions.append(col.ilike(f"%{search}%"))
            if conditions:
                query = query.where(or_(*conditions))
                count_query = count_query.where(or_(*conditions))

        if hasattr(model, 'id'):
            query = query.order_by(model.id.desc())

        query = query.offset(skip).limit(limit)
        
        result = await db.execute(query)
        items = result.scalars().all()
        
        total_result = await db.execute(count_query)
        total = total_result.scalar() or 0

        # Convert SQLAlchemy models to Pydantic schemas explicitly then to dict
        items_data = [response_schema.model_validate(item).model_dump() for item in items]

        # Trả về format chuẩn để React Admin / Dynamic UI dễ xử lý
        return {
            "data": items_data,
            "total": total,
            "skip": skip,
            "limit": limit
        }

    @router.get("/{item_id}", response_model=response_schema)
    async def get_one(
        item_id: int,
        db: AsyncSession = Depends(get_db),
        current_admin: User = Depends(get_current_admin_user)
    ):
        q = select(model).where(model.id == item_id)
        if options:
            q = q.options(*options)
        result = await db.execute(q)
        item = result.scalars().first()
        if not item:
            raise HTTPException(status_code=404, detail="Item not found")
        return item

    @router.post("", response_model=response_schema, status_code=status.HTTP_201_CREATED)
    async def create_item(
        item_in: create_schema,
        db: AsyncSession = Depends(get_db),
        current_admin: User = Depends(get_current_admin_user)
    ):
        # Chuyển Pydantic model thành dict
        item_data = item_in.model_dump(exclude_unset=True)

        # Lọc bỏ các key không phải là cột thật trong DB (như relationship, property)
        from sqlalchemy import inspect
        mapper = inspect(model)
        column_keys = {c.key for c in mapper.attrs if hasattr(c, 'columns')}
        valid_data = {k: v for k, v in item_data.items() if k in column_keys}

        db_item = model(**valid_data)
        db.add(db_item)
        await db.commit()
        await db.refresh(db_item)
        if options:
            query = select(model).where(model.id == getattr(db_item, "id", None)).options(*options)
            result = await db.execute(query)
            db_item = result.scalars().first() or db_item
            
        if model.__name__ == "Category":
            from app.core.redis import clear_categories_cache
            await clear_categories_cache()
        return db_item

    @router.put("/{item_id}", response_model=response_schema)
    async def update_item(
        item_id: int,
        item_in: update_schema,
        db: AsyncSession = Depends(get_db),
        current_admin: User = Depends(get_current_admin_user)
    ):
        query = select(model).where(model.id == item_id)
        if options:
            query = query.options(*options)
        result = await db.execute(query)
        db_item = result.scalars().first()

        if not db_item:
            raise HTTPException(status_code=404, detail="Item not found")

        update_data = item_in.model_dump(exclude_unset=True)
        
        from sqlalchemy import inspect
        mapper = inspect(model)
        column_keys = {c.key for c in mapper.attrs if hasattr(c, 'columns')}
        
        for field, value in update_data.items():
            if field in column_keys:
                setattr(db_item, field, value)

        await db.commit()
        await db.refresh(db_item)
        if model.__name__ == "Category":
            from app.core.redis import clear_categories_cache
            await clear_categories_cache()
        return db_item

    @router.delete("/{item_id}")
    async def delete_item(
        item_id: int,
        db: AsyncSession = Depends(get_db),
        current_admin: User = Depends(get_current_admin_user)
    ):
        result = await db.execute(select(model).where(model.id == item_id))
        db_item = result.scalars().first()
        if not db_item:
            raise HTTPException(status_code=404, detail="Item not found")
            
        await db.delete(db_item)
        await db.commit()
        if model.__name__ == "Category":
            from app.core.redis import clear_categories_cache
            await clear_categories_cache()
        return {"status": "success", "message": "Deleted successfully"}

    return router
