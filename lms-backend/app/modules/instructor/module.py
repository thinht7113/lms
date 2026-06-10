from app.api.v1.endpoints import instructor_studio
from app.modules.base import ModuleDefinition, ModuleRoute


module = ModuleDefinition(
    name="instructor",
    description="Instructor studio analytics, student lists, reviews, transactions and payout requests.",
    routes=[
        ModuleRoute(instructor_studio.router, prefix="/instructor-studio", tags=["Instructor Studio Dashboard"]),
    ],
    owns_models=["PayoutRequest"],
    depends_on=["identity", "catalog", "commerce", "learning"],
)
