from typing import List

from sqlalchemy import and_, desc, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.course import Course
from app.models.order import Coupon, Order, OrderItem
from app.repositories.base import BaseRepository


class CouponRepository(BaseRepository[Coupon]):
    def __init__(self, db: AsyncSession):
        super().__init__(db, Coupon)

    async def get_by_code(self, code: str) -> Coupon | None:
        result = await self.db.execute(select(Coupon).where(Coupon.ma_code == code))
        return result.scalars().first()

    async def get_by_id(self, coupon_id: int) -> Coupon | None:
        result = await self.db.execute(select(Coupon).where(Coupon.id == coupon_id))
        return result.scalars().first()

    async def get_by_id_for_update(self, coupon_id: int) -> Coupon | None:
        result = await self.db.execute(
            select(Coupon)
            .where(Coupon.id == coupon_id)
            .with_for_update()
        )
        return result.scalars().first()


class OrderRepository(BaseRepository[Order]):
    def __init__(self, db: AsyncSession):
        super().__init__(db, Order)

    async def get_successful_coupon_use(
        self,
        user_id: int,
        coupon_id: int,
        exclude_order_id: int | None = None,
    ) -> Order | None:
        conditions = [
            Order.ma_nguoi_dung == user_id,
            Order.ma_giam_gia_id == coupon_id,
            Order.trang_thai == "success",
        ]
        if exclude_order_id is not None:
            conditions.append(Order.id != exclude_order_id)

        result = await self.db.execute(select(Order).where(and_(*conditions)))
        return result.scalars().first()

    async def get_by_id_with_items_for_update(self, order_id: int) -> Order | None:
        result = await self.db.execute(
            select(Order)
            .options(selectinload(Order.chi_tiet_don_hang))
            .where(Order.id == order_id)
            .with_for_update()
        )
        return result.scalars().first()

    async def get_by_id_with_items_course_instructor(self, order_id: int) -> Order | None:
        result = await self.db.execute(
            select(Order)
            .options(
                selectinload(Order.chi_tiet_don_hang)
                .selectinload(OrderItem.khoa_hoc)
                .selectinload(Course.giang_vien)
            )
            .where(Order.id == order_id)
        )
        return result.scalars().first()

    async def get_by_id_with_items_course(self, order_id: int) -> Order:
        result = await self.db.execute(
            select(Order)
            .options(
                selectinload(Order.chi_tiet_don_hang)
                .selectinload(OrderItem.khoa_hoc)
            )
            .where(Order.id == order_id)
        )
        return result.scalars().one()

    async def list_by_user_with_items(self, user_id: int) -> List[Order]:
        result = await self.db.execute(
            select(Order)
            .options(
                selectinload(Order.chi_tiet_don_hang)
                .selectinload(OrderItem.khoa_hoc)
                .selectinload(Course.giang_vien)
            )
            .where(Order.ma_nguoi_dung == user_id)
            .order_by(desc(Order.ngay_tao))
        )
        return list(result.scalars().all())


class OrderItemRepository(BaseRepository[OrderItem]):
    def __init__(self, db: AsyncSession):
        super().__init__(db, OrderItem)
