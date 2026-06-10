from app.api.v1.endpoints import cart, orders
from app.modules.base import ModuleDefinition, ModuleRoute


module = ModuleDefinition(
    name="commerce",
    description="Shopping cart, coupons, checkout, mock payments, refunds and order history.",
    routes=[
        ModuleRoute(cart.router, prefix="/cart", tags=["Shopping Cart"]),
        ModuleRoute(orders.router, prefix="", tags=["Checkout & Payments"]),
    ],
    owns_models=["CartItem", "Coupon", "Order", "OrderItem"],
    depends_on=["identity", "catalog"],
)
