// ============================================================
// LuminaLMS Frontend — Admin Dashboard API
// ============================================================

import type {
  AdminStats, Course, Order, Enrollment, Lesson, AdminQuizDetail, PendingLesson,
  CourseImportConfigStatus, CourseImportCreatePayload, CourseImportJob, CourseImportImportPayload,
} from "./types";
import { API_BASE_URL, fetchWithAuth } from "./client";

export const adminApi = {
  // Dashboard
  async getAdminDashboardStats(): Promise<AdminStats> {
    const res = await fetchWithAuth(`${API_BASE_URL}/admin/stats`);
    if (!res.ok) throw new Error("Failed to fetch admin stats");
    return await res.json();
  },

  // Courses
  async getAdminCourses(): Promise<Course[]> {
    const res = await fetchWithAuth(`${API_BASE_URL}/admin/courses?limit=200`);
    if (!res.ok) throw new Error("Failed to fetch admin courses");
    return await res.json();
  },

  // Lesson Moderation
  async getAdminPendingLessons(): Promise<PendingLesson[]> {
    const res = await fetchWithAuth(`${API_BASE_URL}/admin/lessons/pending`);
    if (!res.ok) throw new Error("Failed to fetch pending lessons");
    return await res.json();
  },

  async approveAdminLesson(lessonId: number): Promise<Lesson> {
    const res = await fetchWithAuth(`${API_BASE_URL}/admin/lessons/${lessonId}/approve`, {
      method: "PUT",
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || "Không thể duyệt bài học");
    }
    return await res.json();
  },

  async rejectAdminLesson(lessonId: number, reason: string): Promise<Lesson> {
    const res = await fetchWithAuth(`${API_BASE_URL}/admin/lessons/${lessonId}/reject`, {
      method: "PUT",
      body: JSON.stringify({ reason }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || "Không thể từ chối bài học");
    }
    return await res.json();
  },

  // Quizzes
  async getAdminQuizDetail(quizId: number): Promise<AdminQuizDetail> {
    const res = await fetchWithAuth(`${API_BASE_URL}/admin/quizzes/${quizId}`);
    if (!res.ok) throw new Error("Failed to fetch admin quiz detail");
    return await res.json();
  },

  // Refund Management
  async approveRefund(orderId: number): Promise<Order> {
    const res = await fetchWithAuth(`${API_BASE_URL}/admin/orders/${orderId}/approve-refund`, {
      method: "POST",
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || "Không thể duyệt hoàn tiền");
    }
    return await res.json();
  },

  async rejectRefund(orderId: number): Promise<Order> {
    const res = await fetchWithAuth(`${API_BASE_URL}/admin/orders/${orderId}/reject-refund`, {
      method: "POST",
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || "Không thể từ chối hoàn tiền");
    }
    return await res.json();
  },

  // Enrollments
  async getAdminEnrollments(): Promise<Enrollment[]> {
    const res = await fetchWithAuth(`${API_BASE_URL}/admin/enrollments?limit=200`);
    if (!res.ok) throw new Error("Không thể tải danh sách ghi danh");
    return await res.json();
  },

  async createAdminEnrollment(payload: { ma_nguoi_dung: number; ma_khoa_hoc: number }): Promise<Enrollment> {
    const res = await fetchWithAuth(`${API_BASE_URL}/admin/enrollments`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || "Không thể cấp quyền học");
    }
    return await res.json();
  },

  async deleteAdminEnrollment(enrollmentId: number): Promise<void> {
    const res = await fetchWithAuth(`${API_BASE_URL}/admin/enrollments/${enrollmentId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || "Không thể thu hồi quyền học");
    }
  },

  // ── Course Import ──

  async getCourseImportConfig(): Promise<CourseImportConfigStatus> {
    const res = await fetchWithAuth(`${API_BASE_URL}/admin/course-imports/config`);
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || "Không thể tải cấu hình crawler khóa học");
    }
    return await res.json();
  },

  async createHoctapgiareImportJob(payload: CourseImportCreatePayload): Promise<CourseImportJob> {
    const res = await fetchWithAuth(`${API_BASE_URL}/admin/course-imports/hoctapgiare`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || "Không thể chạy crawler khóa học");
    }
    return await res.json();
  },

  async getCourseImportJobs(limit = 50): Promise<CourseImportJob[]> {
    const res = await fetchWithAuth(`${API_BASE_URL}/admin/course-imports/?limit=${limit}`);
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || "Không thể tải danh sách job import");
    }
    return await res.json();
  },

  async getCourseImportJob(jobId: number): Promise<CourseImportJob> {
    const res = await fetchWithAuth(`${API_BASE_URL}/admin/course-imports/${jobId}`);
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || "Không thể tải chi tiết job import");
    }
    return await res.json();
  },

  async importCourseImportJob(jobId: number, payload: CourseImportImportPayload): Promise<CourseImportJob> {
    const res = await fetchWithAuth(`${API_BASE_URL}/admin/course-imports/${jobId}/import`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || "Không thể import khóa học vào LMS");
    }
    return await res.json();
  },
};
