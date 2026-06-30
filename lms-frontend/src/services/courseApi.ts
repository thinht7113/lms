// ============================================================
// LuminaLMS Frontend — Courses, Categories & Banners API
// ============================================================

import type { Banner, Category, Course, CourseDetail, Review, PublicInstructor } from "./types";
import { API_BASE_URL, fetchWithAuth, fetchWithTimeout, getCachedJson } from "./client";

export const courseApi = {
  // Banners
  async getBanners(): Promise<Banner[]> {
    try {
      return await getCachedJson<Banner[]>(`${API_BASE_URL}/banners`, 30_000);
    } catch (err) {
      console.warn("API Error (Banners):", err);
      return [];
    }
  },

  // Categories
  async getCategories(): Promise<Category[]> {
    try {
      return await getCachedJson<Category[]>(`${API_BASE_URL}/categories`, 60_000);
    } catch (err) {
      console.warn("API Error (Categories):", err);
      return [];
    }
  },

  async getCategoriesWithCounts(): Promise<Category[]> {
    try {
      return await getCachedJson<Category[]>(`${API_BASE_URL}/categories/with-counts`, 30_000);
    } catch (err) {
      console.warn("API Error (CategoriesWithCounts):", err);
      return [];
    }
  },

  async getFeaturedCourses(limit?: number): Promise<{ popular: Course[]; affordable: Course[]; newest: Course[] }> {
    try {
      const url = limit ? `${API_BASE_URL}/courses/featured?limit=${limit}` : `${API_BASE_URL}/courses/featured`;
      return await getCachedJson<{ popular: Course[]; affordable: Course[]; newest: Course[] }>(url, 30_000);
    } catch (err) {
      console.warn("API Error (FeaturedCourses):", err);
      return { popular: [], affordable: [], newest: [] };
    }
  },

  // Courses List
  async getCourses(params?: {
    q?: string;
    ma_danh_muc?: number;
    trinh_do?: string;
    gia_min?: number;
    gia_max?: number;
    sort_by?: string;
    order?: string;
    limit?: number;
  }): Promise<Course[]> {
    try {
      const queryParts: string[] = [];
      if (params) {
        if (params.q) queryParts.push(`q=${encodeURIComponent(params.q)}`);
        if (params.ma_danh_muc) queryParts.push(`ma_danh_muc=${params.ma_danh_muc}`);
        if (params.trinh_do) queryParts.push(`trinh_do=${params.trinh_do}`);
        if (params.gia_min !== undefined) queryParts.push(`gia_min=${params.gia_min}`);
        if (params.gia_max !== undefined) queryParts.push(`gia_max=${params.gia_max}`);
        if (params.sort_by) queryParts.push(`sort_by=${params.sort_by}`);
        if (params.order) queryParts.push(`order=${params.order}`);
        if (params.limit) queryParts.push(`limit=${params.limit}`);
      }
      const queryString = queryParts.length > 0 ? `?${queryParts.join("&")}` : "";
      return await getCachedJson<Course[]>(`${API_BASE_URL}/courses${queryString}`, 20_000);
    } catch (err) {
      console.warn("API Error (Courses):", err);
      return [];
    }
  },

  // Course Details
  async getCourseDetail(id: number): Promise<CourseDetail | null> {
    try {
      return await getCachedJson<CourseDetail>(`${API_BASE_URL}/courses/${id}`, 15_000);
    } catch (err) {
      console.warn(`API Error (Course Detail ID ${id}):`, err);
      return null;
    }
  },

  async getCourseDetailWithAuth(id: number): Promise<CourseDetail> {
    const res = await fetchWithAuth(`${API_BASE_URL}/courses/${id}`);
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || "Không thể tải chi tiết khóa học");
    }
    return await res.json();
  },

  // Reviews
  async getCourseReviews(courseId: number): Promise<Review[]> {
    const res = await fetchWithTimeout(`${API_BASE_URL}/courses/${courseId}/reviews`);
    if (!res.ok) throw new Error("Không thể tải đánh giá khóa học");
    return await res.json();
  },

  async createCourseReview(courseId: number, payload: { so_sao: number; binh_luan?: string }): Promise<Review> {
    const res = await fetchWithAuth(`${API_BASE_URL}/courses/${courseId}/reviews`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || "Không thể gửi đánh giá khóa học");
    }
    return await res.json();
  },

  // Public Instructors
  async getPublicInstructors(): Promise<PublicInstructor[]> {
    try {
      const res = await fetchWithTimeout(`${API_BASE_URL}/instructors`);
      if (!res.ok) throw new Error("Failed to fetch instructors");
      return await res.json();
    } catch (err) {
      console.warn("API Error (Instructors):", err);
      return [];
    }
  },
};
