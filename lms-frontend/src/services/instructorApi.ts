// ============================================================
// LuminaLMS Frontend — Instructor & Studio API
// ============================================================

import type {
  Course, Section, Lesson, LessonContent, User,
  CoursePayload, SectionPayload, LessonPayload, LessonContentPayload,
  InstructorStats, InstructorStudent, InstructorTransaction, Review, PayoutRequest,
} from "./types";
import { API_BASE_URL, fetchWithAuth } from "./client";

export const instructorApi = {
  // Course Management
  async getInstructorCourses(): Promise<Course[]> {
    const res = await fetchWithAuth(`${API_BASE_URL}/instructor/courses`);
    if (!res.ok) throw new Error("Failed to fetch instructor courses");
    return await res.json();
  },

  async createInstructorCourse(payload: CoursePayload): Promise<Course> {
    const res = await fetchWithAuth(`${API_BASE_URL}/instructor/courses`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || "Không thể tạo khóa học");
    }
    return await res.json();
  },

  async updateInstructorCourse(courseId: number, payload: Partial<CoursePayload>): Promise<Course> {
    const res = await fetchWithAuth(`${API_BASE_URL}/courses/${courseId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || "Không thể cập nhật khóa học");
    }
    return await res.json();
  },

  // Section Management
  async createSection(courseId: number, payload: SectionPayload): Promise<Section> {
    const res = await fetchWithAuth(`${API_BASE_URL}/courses/${courseId}/sections`, {
      method: "POST",
      body: JSON.stringify({ ...payload, ma_khoa_hoc: courseId }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || "Không thể tạo chương học");
    }
    return await res.json();
  },

  async updateSection(sectionId: number, payload: Partial<SectionPayload>): Promise<Section> {
    const res = await fetchWithAuth(`${API_BASE_URL}/sections/${sectionId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || "Không thể cập nhật chương học");
    }
    return await res.json();
  },

  async deleteSection(sectionId: number): Promise<void> {
    const res = await fetchWithAuth(`${API_BASE_URL}/sections/${sectionId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || "Không thể xóa chương học");
    }
  },

  // Lesson Management
  async createLesson(sectionId: number, payload: LessonPayload): Promise<Lesson> {
    const res = await fetchWithAuth(`${API_BASE_URL}/sections/${sectionId}/lessons`, {
      method: "POST",
      body: JSON.stringify({ ...payload, ma_chuong_hoc: sectionId }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const errorMsg = Array.isArray(errData.detail) ? JSON.stringify(errData.detail) : errData.detail;
      throw new Error(errorMsg || "Không thể tạo bài học");
    }
    return await res.json();
  },

  async updateLesson(lessonId: number, payload: Partial<LessonPayload>): Promise<Lesson> {
    const res = await fetchWithAuth(`${API_BASE_URL}/lessons/${lessonId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || "Không thể cập nhật bài học");
    }
    return await res.json();
  },

  async deleteLesson(lessonId: number): Promise<void> {
    const res = await fetchWithAuth(`${API_BASE_URL}/lessons/${lessonId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || "Không thể xóa bài học");
    }
  },

  // Lesson Content
  async createLessonContent(lessonId: number, payload: LessonContentPayload): Promise<LessonContent> {
    const res = await fetchWithAuth(`${API_BASE_URL}/lessons/${lessonId}/contents`, {
      method: "POST",
      body: JSON.stringify({ ...payload, ma_bai_hoc: lessonId }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || "Không thể tạo nội dung bài học");
    }
    return await res.json();
  },

  async updateLessonContent(contentId: number, payload: Partial<LessonContentPayload>): Promise<LessonContent> {
    const res = await fetchWithAuth(`${API_BASE_URL}/lesson-contents/${contentId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || "Không thể cập nhật nội dung bài học");
    }
    return await res.json();
  },

  async deleteLessonContent(contentId: number): Promise<void> {
    const res = await fetchWithAuth(`${API_BASE_URL}/lesson-contents/${contentId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || "Không thể xóa nội dung bài học");
    }
  },

  // Students
  async getCourseStudents(courseId: number): Promise<User[]> {
    const res = await fetchWithAuth(`${API_BASE_URL}/instructor/courses/${courseId}/students`);
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || "Không thể tải danh sách học viên");
    }
    return await res.json();
  },

  // ── Instructor Studio Dashboard ──

  async getInstructorStudioStats(): Promise<InstructorStats> {
    const res = await fetchWithAuth(`${API_BASE_URL}/instructor-studio/stats`);
    if (!res.ok) throw new Error("Failed to fetch instructor stats");
    return await res.json();
  },

  async getInstructorStudioStudents(): Promise<InstructorStudent[]> {
    const res = await fetchWithAuth(`${API_BASE_URL}/instructor-studio/students`);
    if (!res.ok) throw new Error("Failed to fetch instructor students");
    return await res.json();
  },

  async getInstructorStudioReviews(): Promise<Review[]> {
    const res = await fetchWithAuth(`${API_BASE_URL}/instructor-studio/reviews`);
    if (!res.ok) throw new Error("Failed to fetch instructor reviews");
    return await res.json();
  },

  async getInstructorStudioTransactions(): Promise<InstructorTransaction[]> {
    const res = await fetchWithAuth(`${API_BASE_URL}/instructor-studio/transactions`);
    if (!res.ok) throw new Error("Failed to fetch instructor transactions");
    return await res.json();
  },

  async getMyPayouts(): Promise<PayoutRequest[]> {
    const res = await fetchWithAuth(`${API_BASE_URL}/instructor-studio/payouts`);
    if (!res.ok) throw new Error("Failed to fetch payouts");
    return await res.json();
  },

  async requestPayout(payload: { amount: number; bank_name: string; account_number: string; account_name: string }): Promise<PayoutRequest> {
    const res = await fetchWithAuth(`${API_BASE_URL}/instructor-studio/payouts`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || "Không thể yêu cầu rút tiền");
    }
    return await res.json();
  },
};
