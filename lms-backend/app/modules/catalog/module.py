from app.api.v1.endpoints import banners, courses, instructors
from app.modules.base import ModuleDefinition, ModuleRoute


module = ModuleDefinition(
    name="catalog",
    description="Public course catalog, instructor discovery, categories, curriculum authoring and banners.",
    routes=[
        ModuleRoute(banners.router, prefix="/banners", tags=["Banners & Sliders"]),
        ModuleRoute(instructors.router, prefix="/instructors", tags=["Instructors"]),
        ModuleRoute(courses.router, prefix="", tags=["Courses & Content"]),
    ],
    owns_models=[
        "Banner",
        "Category",
        "Course",
        "Section",
        "Lesson",
        "LessonContent",
        "CourseReview",
        "Wishlist",
    ],
    depends_on=["identity", "storage"],
)
