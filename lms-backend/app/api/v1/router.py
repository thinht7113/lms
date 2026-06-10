from fastapi import APIRouter
from app.modules import get_modules

api_router = APIRouter()

for module in get_modules():
    for route in module.routes:
        api_router.include_router(route.router, prefix=route.prefix, tags=list(route.tags))
