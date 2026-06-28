from typing import Any, List, Optional, Sequence, Type

from sqlalchemy import String, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession


class DynamicCrudRepository:
    def __init__(
        self,
        db: AsyncSession,
        model: Type[Any],
        options: Optional[Sequence[Any]] = None,
    ):
        self.db = db
        self.model = model
        self.options = list(options or [])

    def _apply_options(self, query: Any) -> Any:
        if self.options:
            return query.options(*self.options)
        return query

    def _apply_filters(
        self,
        query: Any,
        count_query: Any,
        search: Optional[str],
        search_columns: Optional[List[str]],
        filter_col: Optional[str],
        filter_val: Optional[str],
    ) -> tuple[Any, Any]:
        if filter_col and filter_val and hasattr(self.model, filter_col):
            col = getattr(self.model, filter_col)
            val: Any = int(filter_val) if filter_val.isdigit() else filter_val
            query = query.where(col == val)
            count_query = count_query.where(col == val)

        if search and search_columns:
            conditions = []
            for col_name in search_columns:
                col = getattr(self.model, col_name)
                if isinstance(col.type, String):
                    conditions.append(col.ilike(f"%{search}%"))
            if conditions:
                query = query.where(or_(*conditions))
                count_query = count_query.where(or_(*conditions))

        return query, count_query

    async def list_items(
        self,
        skip: int,
        limit: int,
        search: Optional[str],
        search_columns: Optional[List[str]],
        filter_col: Optional[str],
        filter_val: Optional[str],
    ) -> tuple[list[Any], int]:
        query = self._apply_options(select(self.model))
        count_query = select(func.count()).select_from(self.model)
        query, count_query = self._apply_filters(
            query,
            count_query,
            search,
            search_columns,
            filter_col,
            filter_val,
        )

        if hasattr(self.model, "id"):
            query = query.order_by(self.model.id.desc())

        result = await self.db.execute(query.offset(skip).limit(limit))
        total_result = await self.db.execute(count_query)
        return list(result.scalars().all()), int(total_result.scalar() or 0)

    async def get_by_id(self, item_id: int) -> Any | None:
        query = self._apply_options(select(self.model).where(self.model.id == item_id))
        result = await self.db.execute(query)
        return result.scalars().first()

    async def create(self, data: dict[str, Any]) -> Any:
        item = self.model(**data)
        self.db.add(item)
        await self.db.commit()
        await self.db.refresh(item)
        return item

    async def update(self, item: Any) -> Any:
        await self.db.commit()
        await self.db.refresh(item)
        return item

    async def delete(self, item: Any) -> None:
        await self.db.delete(item)
        await self.db.commit()
