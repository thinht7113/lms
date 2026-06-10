from app.api.v1.endpoints import admin, dynamic_admin, settings
from app.modules.base import ModuleDefinition, ModuleRoute


module = ModuleDefinition(
    name="administration",
    description="Back-office administration, moderation, dynamic admin CRUD, settings and audit logs.",
    routes=[
        ModuleRoute(admin.router, prefix="/admin", tags=["Admin Dashboard"]),
        ModuleRoute(dynamic_admin.dynamic_router, prefix="/dynamic-admin", tags=["Dynamic Admin API"]),
        ModuleRoute(settings.router, prefix="/settings", tags=["System Settings"]),
    ],
    owns_models=["AdminLog", "Setting"],
    depends_on=["identity", "catalog", "commerce", "learning", "instructor", "storage"],
)
