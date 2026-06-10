from app.models.base import Base
from app.models.user import User
from app.models.course import Category, Course, Section, Lesson, LessonContent, Enrollment, Progress, CourseReview, Wishlist
from app.models.cart import CartItem
from app.models.order import Coupon, Order, OrderItem
from app.models.quiz import Quiz, Question, QuestionOption, QuizAttempt, QuizAttemptAnswer
from app.models.certificate import Certificate
from app.models.log import AdminLog
from app.models.setting import Setting
from app.models.banner import Banner
from app.models.payout import PayoutRequest
from app.models.notification import Notification

# Gom toàn bộ các ORM models lại để import tập trung dễ dàng
__all__ = [
    "Base",
    "User",
    "Category",
    "Course",
    "Section",
    "Lesson",
    "LessonContent",
    "Enrollment",
    "Progress",
    "CourseReview",
    "Wishlist",
    "CartItem",
    "Coupon",
    "Order",
    "OrderItem",
    "Quiz",
    "Question",
    "QuestionOption",
    "QuizAttempt",
    "QuizAttemptAnswer",
    "Certificate",
    "AdminLog",
    "Banner",
    "Setting",
    "PayoutRequest",
    "Notification"
]

