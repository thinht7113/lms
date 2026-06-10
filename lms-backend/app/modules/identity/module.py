from app.api.v1.endpoints import auth
from app.modules.base import ModuleDefinition, ModuleRoute


module = ModuleDefinition(
    name="identity",
    description="Authentication, profile management, password recovery and role identity.",
    routes=[
        ModuleRoute(auth.router, prefix="/auth", tags=["Authentication"]),
    ],
    owns_models=["User"],
)
