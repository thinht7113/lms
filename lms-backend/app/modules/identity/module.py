from app.api.v1.endpoints import auth, notifications
from app.modules.base import ModuleDefinition, ModuleRoute


module = ModuleDefinition(
    name="identity",
    description="Authentication, profile management, password recovery and role identity.",
    routes=[
        ModuleRoute(auth.router, prefix="/auth", tags=["Authentication"]),
        ModuleRoute(notifications.router, prefix="/notifications", tags=["Notifications"]),
    ],
    owns_models=["User"],
)
