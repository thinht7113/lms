from typing import Any, Dict, List

from pydantic import BaseModel

from app.schemas.course import CourseResponse


class LearnerDashboardResponse(BaseModel):
    courses: List[CourseResponse]
    progress_map: Dict[int, Any]
    quizzes_map: Dict[int, List[Any]]
