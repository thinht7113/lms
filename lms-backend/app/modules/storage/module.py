from app.api.v1.endpoints import upload
from app.modules.base import ModuleDefinition, ModuleRoute


module = ModuleDefinition(
    name="storage",
    description="File upload boundary backed by MinIO/S3-compatible object storage.",
    routes=[
        ModuleRoute(upload.router, prefix="/upload", tags=["File Storage"]),
    ],
    owns_models=[],
    depends_on=["identity"],
)
