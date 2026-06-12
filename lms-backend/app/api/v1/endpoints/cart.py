from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_db, get_current_user
from app.modules.identity.models import User
from app.modules.commerce.schemas import CartResponse, CartItemResponse, CartItemAdd
from app.modules.commerce.services import OrderService

router = APIRouter()

@router.get(
    "", 
    response_model=CartResponse, 
    summary="User views current cart details with subtotal"
)
async def get_cart(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await OrderService.get_cart(db, current_user.id)

@router.post(
    "/items", 
    response_model=CartItemResponse, 
    status_code=status.HTTP_201_CREATED,
    summary="User adds course to cart"
)
async def add_to_cart(
    item_in: CartItemAdd,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await OrderService.add_to_cart(db, current_user.id, item_in.course_id)

@router.delete(
    "/items/{course_id}", 
    summary="User removes course from cart"
)
async def remove_from_cart(
    course_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    await OrderService.remove_from_cart(db, current_user.id, course_id)
    return {"status": "success", "message": "Đã xóa khóa học khỏi giỏ hàng."}
