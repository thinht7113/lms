from fastapi import APIRouter
from app.modules import get_modules
from app.api.v1.endpoints import notifications

api_router = APIRouter()

for module in get_modules():
    for route in module.routes:
        api_router.include_router(route.router, prefix=route.prefix, tags=list(route.tags))

api_router.include_router(notifications.router, prefix="/notifications", tags=["Notifications"])
