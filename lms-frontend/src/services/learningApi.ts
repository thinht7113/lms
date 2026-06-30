// ============================================================
// LuminaLMS Frontend — Learning, Progress & Notifications API
// ============================================================

import type { Course, LearnerDashboard, Lesson, LessonProgress, CourseProgress, Notification } from "./types";
import { API_BASE_URL, fetchWithAuth } from "./client";

export const learningApi = {
  // Enrolled Courses
  async getMyEnrolledCourses(): Promise<Course[]> {
    const res = await fetchWithAuth(`${API_BASE_URL}/enrollments/my-courses`);
    if (!res.ok) throw new Error("Failed to fetch enrolled courses");
    return await res.json();
  },

  async getMyDashboard(): Promise<LearnerDashboard> {
    const res = await fetchWithAuth(`${API_BASE_URL}/learn/my-dashboard`);
    if (!res.ok) throw new Error("Failed to fetch learner dashboard data");
    return await res.json();
  },

  // Lesson Content
  async getLessonLearningContent(courseId: number, lessonId: number): Promise<Lesson> {
    const res = await fetchWithAuth(`${API_BASE_URL}/learn/courses/${courseId}/lessons/${lessonId}`);
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || "Không thể truy cập bài học này.");
    }
    return await res.json();
  },

  // Progress
  async getLessonProgress(lessonId: number): Promise<LessonProgress> {
    const res = await fetchWithAuth(`${API_BASE_URL}/progress/lessons/${lessonId}`);
    if (!res.ok) throw new Error("Failed to get lesson progress");
    return await res.json();
  },

  async updateLessonProgress(lessonId: number, da_hoan_thanh: boolean, videoResumeSeconds = 0): Promise<LessonProgress> {
    const res = await fetchWithAuth(`${API_BASE_URL}/progress/lessons/${lessonId}`, {
      method: "PUT",
      body: JSON.stringify({
        da_hoan_thanh,
        video_resume_seconds: videoResumeSeconds
      }),
    });
    if (!res.ok) throw new Error("Failed to update lesson progress");
    return await res.json();
  },

  async getCourseProgress(courseId: number): Promise<CourseProgress> {
    const res = await fetchWithAuth(`${API_BASE_URL}/learn/courses/${courseId}/progress`);
    if (!res.ok) throw new Error("Failed to get course progress");
    return await res.json();
  },

  // Notifications
  async getNotifications(): Promise<Notification[]> {
    const res = await fetchWithAuth(`${API_BASE_URL}/notifications`);
    if (!res.ok) throw new Error("Failed to fetch notifications");
    return await res.json();
  },

  async markNotificationAsRead(notificationId: number): Promise<Notification> {
    const res = await fetchWithAuth(`${API_BASE_URL}/notifications/${notificationId}/read`, {
      method: "POST",
    });
    if (!res.ok) throw new Error("Failed to mark notification as read");
    return await res.json();
  },
};
