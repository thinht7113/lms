import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
from app.core.config import settings

async def main():
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        # Query all orders
        res = await session.execute(text("SELECT id, ma_nguoi_dung, ma_giam_gia_id, tong_tien, trang_thai, phuong_thuc_thanh_toan, ma_giao_dich FROM don_hang ORDER BY id DESC LIMIT 10"))
        orders = res.all()
        print("--- LAST 10 ORDERS ---")
        for order in orders:
            print(f"ID: {order[0]}, User: {order[1]}, CouponID: {order[2]}, Total: {order[3]}, Status: {order[4]}, Method: {order[5]}, TXCode: {order[6]}")
            
        # Query coupons
        res_coupons = await session.execute(text("SELECT id, ma_code, loai_giam_gia, gia_tri_giam, so_luot_da_dung FROM ma_giam_gia"))
        coupons = res_coupons.all()
        print("\n--- COUPONS ---")
        for coupon in coupons:
            print(f"ID: {coupon[0]}, Code: {coupon[1]}, Type: {coupon[2]}, Val: {coupon[3]}, Used count: {coupon[4]}")
            
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(main())
