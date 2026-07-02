// ============================================================
// LuminaLMS Frontend — Barrel re-export file
// ============================================================
// File này giữ backward-compatibility cho tất cả import cũ.
// Toàn bộ types, client helpers và API functions đã được tách
// thành các module riêng biệt trong thư mục services/.
//
// Nếu bạn đang viết code MỚI, hãy import trực tiếp từ module:
//   import { authApi } from "@/services/authApi";
//   import type { Course } from "@/services/types";
// ============================================================

// ── Types ──
export * from "./types";

// ── HTTP Client Infrastructure ──
export { API_BASE_URL, fetchWithTimeout, getCachedJson, fetchWithAuth, tokenHelper } from "./client";

// ── Domain API Modules ──
export { authApi } from "./authApi";
export { courseApi } from "./courseApi";
export { cartOrderApi } from "./cartOrderApi";
export { learningApi } from "./learningApi";
export { instructorApi } from "./instructorApi";
export { quizApi } from "./quizApi";
export { adminApi } from "./adminApi";
export { certificateApiModule, certificateApi } from "./certificateApi";

// ── Legacy-compatible unified apiService ──
// Tập hợp lại tất cả methods vào một object duy nhất để
// code cũ dùng `apiService.xxx()` vẫn hoạt động.

import { authApi } from "./authApi";
import { courseApi } from "./courseApi";
import { cartOrderApi } from "./cartOrderApi";
import { learningApi } from "./learningApi";
import { instructorApi } from "./instructorApi";
import { quizApi } from "./quizApi";
import { adminApi } from "./adminApi";
import { certificateApiModule } from "./certificateApi";

export const apiService = {
  // Auth
  login: authApi.login,
  register: authApi.register,
  getProfile: authApi.getProfile,
  updateProfile: authApi.updateProfile,
  uploadFile: authApi.uploadFile,
  forgotPassword: authApi.forgotPassword,
  resetPassword: authApi.resetPassword,
  logout: authApi.logout,

  // Courses & Content
  getBanners: courseApi.getBanners,
  getCategories: courseApi.getCategories,
  getCategoriesWithCounts: courseApi.getCategoriesWithCounts,
  getFeaturedCourses: courseApi.getFeaturedCourses,
  getCourses: courseApi.getCourses,
  getCourseDetail: courseApi.getCourseDetail,
  getCourseDetailWithAuth: courseApi.getCourseDetailWithAuth,
  getCourseReviews: courseApi.getCourseReviews,
  createCourseReview: courseApi.createCourseReview,
  getPublicInstructors: courseApi.getPublicInstructors,

  // Cart & Orders
  getCart: cartOrderApi.getCart,
  addToCart: cartOrderApi.addToCart,
  removeFromCart: cartOrderApi.removeFromCart,
  applyCoupon: cartOrderApi.applyCoupon,
  checkout: cartOrderApi.checkout,
  getMyOrders: cartOrderApi.getMyOrders,
  requestRefund: cartOrderApi.requestRefund,
  cancelRefund: cartOrderApi.cancelRefund,
  payMock: cartOrderApi.payMock,

  // Learning & Progress
  getMyEnrolledCourses: learningApi.getMyEnrolledCourses,
  getMyDashboard: learningApi.getMyDashboard,
  getLessonLearningContent: learningApi.getLessonLearningContent,
  getLessonProgress: learningApi.getLessonProgress,
  updateLessonProgress: learningApi.updateLessonProgress,
  getCourseProgress: learningApi.getCourseProgress,
  getNotifications: learningApi.getNotifications,
  markNotificationAsRead: learningApi.markNotificationAsRead,

  // Instructor
  getInstructorCourses: instructorApi.getInstructorCourses,
  createInstructorCourse: instructorApi.createInstructorCourse,
  updateInstructorCourse: instructorApi.updateInstructorCourse,
  createSection: instructorApi.createSection,
  updateSection: instructorApi.updateSection,
  deleteSection: instructorApi.deleteSection,
  createLesson: instructorApi.createLesson,
  updateLesson: instructorApi.updateLesson,
  deleteLesson: instructorApi.deleteLesson,
  createLessonContent: instructorApi.createLessonContent,
  updateLessonContent: instructorApi.updateLessonContent,
  deleteLessonContent: instructorApi.deleteLessonContent,
  getCourseStudents: instructorApi.getCourseStudents,
  getInstructorStudioStats: instructorApi.getInstructorStudioStats,
  getInstructorStudioStudents: instructorApi.getInstructorStudioStudents,
  getInstructorStudioReviews: instructorApi.getInstructorStudioReviews,
  getInstructorStudioTransactions: instructorApi.getInstructorStudioTransactions,
  getMyPayouts: instructorApi.getMyPayouts,
  requestPayout: instructorApi.requestPayout,

  // Quizzes
  getCourseQuizzes: quizApi.getCourseQuizzes,
  createQuiz: quizApi.createQuiz,
  deleteQuiz: quizApi.deleteQuiz,
  createQuestion: quizApi.createQuestion,
  deleteQuestion: quizApi.deleteQuestion,
  getQuizDetail: quizApi.getQuizDetail,
  startQuiz: quizApi.startQuiz,
  submitQuiz: quizApi.submitQuiz,
  getQuizAttempt: quizApi.getQuizAttempt,
  getQuizAttemptReview: quizApi.getQuizAttemptReview,

  // Certificates
  getPublicCertificate: certificateApiModule.getPublicCertificate,
  getMyCertificates: certificateApiModule.getMyCertificates,
  issueOrGetCertificate: certificateApiModule.issueOrGetCertificate,

  // Admin
  getAdminDashboardStats: adminApi.getAdminDashboardStats,
  getAdminCourses: adminApi.getAdminCourses,
  getAdminPendingLessons: adminApi.getAdminPendingLessons,
  approveAdminLesson: adminApi.approveAdminLesson,
  rejectAdminLesson: adminApi.rejectAdminLesson,
  getAdminQuizDetail: adminApi.getAdminQuizDetail,
  approveRefund: adminApi.approveRefund,
  rejectRefund: adminApi.rejectRefund,
  getAdminEnrollments: adminApi.getAdminEnrollments,
  createAdminEnrollment: adminApi.createAdminEnrollment,
  deleteAdminEnrollment: adminApi.deleteAdminEnrollment,
};

