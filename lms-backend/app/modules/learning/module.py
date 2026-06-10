from app.api.v1.endpoints import certificates, progress, quizzes
from app.modules.base import ModuleDefinition, ModuleRoute


module = ModuleDefinition(
    name="learning",
    description="Enrollment access, learning progress, quizzes, grading and certificates.",
    routes=[
        ModuleRoute(progress.router, prefix="", tags=["Learning & Progress"]),
        ModuleRoute(quizzes.router, prefix="", tags=["Quizzes & Grading"]),
        ModuleRoute(certificates.router, prefix="/certificates", tags=["Certificates & Verification"]),
    ],
    owns_models=[
        "Enrollment",
        "Progress",
        "Quiz",
        "Question",
        "QuestionOption",
        "QuizAttempt",
        "QuizAttemptAnswer",
        "Certificate",
    ],
    depends_on=["identity", "catalog", "commerce", "storage"],
)
