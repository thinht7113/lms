from app.models.base import Base
from app.models.user import User
from app.models.course import Category, Course, Section, Lesson, Enrollment, Progress, CourseReview, Wishlist, CoursePrerequisite
from app.models.cart import CartItem
from app.models.order import Coupon, Order, OrderItem
from app.models.quiz import Quiz, Question, QuestionOption, QuizAttempt, QuizAttemptAnswer
from app.models.certificate import Certificate

# Gom toàn bộ các ORM models lại để import tập trung dễ dàng
__all__ = [
    "Base",
    "User",
    "Category",
    "Course",
    "Section",
    "Lesson",
    "Enrollment",
    "Progress",
    "CourseReview",
    "Wishlist",
    "CoursePrerequisite",
    "CartItem",
    "Coupon",
    "Order",
    "OrderItem",
    "Quiz",
    "Question",
    "QuestionOption",
    "QuizAttempt",
    "QuizAttemptAnswer",
    "Certificate"
]

