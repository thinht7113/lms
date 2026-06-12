const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
const PUBLIC_FETCH_TIMEOUT_MS = 8000;
const publicCache = new Map<string, { expiresAt: number; data: unknown }>();

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = PUBLIC_FETCH_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: options.signal || controller.signal,
    });
  } finally {
    globalThis.clearTimeout(timeout);
  }
}

async function getCachedJson<T>(url: string, ttlMs = 30_000): Promise<T> {
  const now = Date.now();
  const cached = publicCache.get(url);
  if (cached && cached.expiresAt > now) {
    return cached.data as T;
  }

  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}`);
  const data = await res.json();
  publicCache.set(url, { data, expiresAt: now + ttlMs });
  return data as T;
}

// Helpers for localStorage Token management
export const tokenHelper = {
  setRoleCookie(role?: string | null) {
    if (typeof document === "undefined") return;
    if (!role) {
      document.cookie = "lumina_role=; Path=/; Max-Age=0; SameSite=Lax";
      return;
    }
    document.cookie = `lumina_role=${encodeURIComponent(role)}; Path=/; Max-Age=86400; SameSite=Lax`;
  },
  getToken(): string | null {
    if (typeof window === "undefined") return null;
    const legacyToken = localStorage.getItem("lumina_token");
    if (legacyToken) return legacyToken;
    return localStorage.getItem("lumina_user") ? "cookie-session" : null;
  },
  setToken(_token: string) {
    if (typeof window !== "undefined") {
      localStorage.removeItem("lumina_token");
    }
  },
  removeToken() {
    if (typeof window !== "undefined") {
      localStorage.removeItem("lumina_token");
    }
  },
  getCurrentUser(): any | null {
    if (typeof window !== "undefined") {
      const user = localStorage.getItem("lumina_user");
      return user ? JSON.parse(user) : null;
    }
    return null;
  },
  setCurrentUser(user: any) {
    if (typeof window !== "undefined") {
      localStorage.setItem("lumina_user", JSON.stringify(user));
      this.setRoleCookie(user?.vai_tro);
    }
  },
  removeCurrentUser() {
    if (typeof window !== "undefined") {
      localStorage.removeItem("lumina_user");
      this.setRoleCookie(null);
    }
  }
};

// Helper for Fetching with Auth Token
export async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = new Headers(options.headers || {});

  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: "include", // This ensures HttpOnly cookie is sent automatically
  });

  if (response.status === 401) {
    tokenHelper.removeCurrentUser();
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  }

  return response;
}

// Interface declarations
export interface User {
  id: number;
  email: string;
  ho_ten: string;
  vai_tro: string;
  ngay_tao: string;
  so_dien_thoai?: string;
  avatar_url?: string;
}

export interface UploadResponse {
  status: string;
  message: string;
  filename: string;
  original_name: string;
  url: string;
  content_type?: string;
  asset_type?: string;
}

export type UploadAssetType = "image" | "lesson-image" | "avatar" | "pdf" | "video";

export interface Course {
  id: number;
  ma_giang_vien?: number;
  ma_danh_muc?: number;
  tieu_de: string;
  mo_ta?: string;
  gia_tien: number;
  trinh_do: string;
  anh_dai_dien?: string;
  da_xuat_ban: boolean;
  trang_thai_phe_duyet: string;
  danh_gia_trung_binh: number;
  ngay_tao: string;
  so_luong_hoc_vien: number;
}

export interface CoursePayload {
  tieu_de: string;
  gia_tien: number;
  mo_ta?: string;
  ma_danh_muc?: number | null;
  trinh_do: string;
  anh_dai_dien?: string;
  da_xuat_ban?: boolean;
  trang_thai_phe_duyet?: string;
}

export interface SectionPayload {
  ma_khoa_hoc?: number;
  tieu_de: string;
  thu_tu: number;
}

export interface LessonContentPayload {
  ma_bai_hoc?: number;
  loai_noi_dung: "video" | "pdf" | "text" | "code" | "image";
  noi_dung_text?: string;
  duong_dan_file?: string;
  thu_tu: number;
}

export interface LessonPayload {
  ma_chuong_hoc?: number;
  tieu_de: string;
  noi_dung?: LessonContentPayload[];
  thoi_luong: number;
  thu_tu: number;
  xem_truoc: boolean;
  da_xuat_ban?: boolean;
  trang_thai_phe_duyet?: string;
}

export interface Category {
  id: number;
  ten_danh_muc: string;
  mo_ta?: string;
  course_count?: number;
}

export interface Banner {
  id: number;
  hinh_anh_url: string;
  tieu_de?: string;
  duong_dan?: string;
  trang_thai: boolean;
  thu_tu: number;
}

export interface LessonContent {
  id: number;
  ma_bai_hoc: number;
  loai_noi_dung: string; // "VIDEO", "PDF", "TEXT"
  noi_dung_text?: string;
  duong_dan_file?: string;
  thu_tu: number;
}

export interface Lesson {
  id: number;
  ma_khoa_hoc: number;
  ma_chuong_hoc?: number;
  tieu_de: string;
  noi_dung: LessonContent[];
  thoi_luong: number;
  thu_tu: number;
  xem_truoc: boolean;
  da_xuat_ban: boolean;
  trang_thai_phe_duyet: string;
}

export interface Section {
  id: number;
  ma_khoa_hoc: number;
  tieu_de: string;
  thu_tu: number;
  bai_hoc: Lesson[];
}

export interface Review {
  id: number;
  ma_nguoi_dung: number;
  ma_khoa_hoc: number;
  so_sao: number;
  binh_luan?: string;
  ngay_tao: string;
  nguoi_dung?: {
    id: number;
    ho_ten: string;
  };
}

export interface CourseDetail extends Course {
  chuong_hoc: Section[];
  danh_gia_khoa_hoc: Review[];
}

export interface LearnerDashboard {
  courses: Course[];
  progress_map: Record<number, CourseProgress>;
  quizzes_map: Record<number, Quiz[]>;
}

export interface CartItem {
  id: number;
  ma_nguoi_dung: number;
  ma_khoa_hoc: number;
  ngay_them_vao_gio?: string;
  khoa_hoc: Course;
}

export interface Cart {
  chi_tiet_gio_hang: CartItem[];
  tong_tien_tam_tinh: number;
}

export interface CouponApplyResponse {
  coupon_id: number;
  code: string;
  discount_percentage: number;
  discount_amount: number;
  final_amount: number;
  loai_giam_gia?: string;
  gia_tri_giam?: number;
}

export interface OrderItem {
  id: number;
  ma_khoa_hoc: number;
  gia_luc_mua: number;
  khoa_hoc?: Course;
}

export interface Order {
  id: number;
  ma_nguoi_dung: number;
  ma_giam_gia_id?: number;
  tong_tien: number;
  trang_thai: string; // 'pending', 'success', 'fail'
  ngay_tao: string;
  phuong_thuc_thanh_toan?: string;
  ma_giao_dich?: string;
  ngay_thanh_toan?: string;
  ma_giam_gia_code?: string;
  chi_tiet_don_hang: OrderItem[];
}

export interface LessonProgress {
  id: number;
  ma_dang_ky_hoc: number;
  ma_bai_hoc: number;
  da_hoan_thanh: boolean;
  ngay_hoan_thanh?: string;
  video_resume_seconds: number;
}

export interface CourseProgress {
  course_id: number;
  total_lessons: number;
  completed_lessons: number;
  progress_percentage: number;
  total_quizzes?: number;
  passed_quizzes?: number;
}

export interface Option {
  id: number;
  text: string;
}

export interface Question {
  id: number;
  ma_bai_kiem_tra: number;
  noi_dung: string;
  cac_lua_chon: Option[];
}

export interface QuizPayload {
  tieu_de: string;
  diem_dat: number;
  thoi_gian_lam_bai?: number | null;
  so_luot_lam_toi_da?: number | null;
}

export interface QuestionPayload {
  noi_dung: string;
  giai_thich?: string;
  cac_lua_chon: {
    text: string;
    is_correct: boolean;
  }[];
}

export interface Quiz {
  id: number;
  ma_khoa_hoc: number;
  tieu_de: string;
  diem_dat: number;
  thoi_gian_lam_bai?: number;
  so_luot_lam_toi_da: number;
  ngay_tao: string;
  attempts_count?: number;
  highest_score?: number;
  passed?: boolean;
}

export interface QuizDetail extends Quiz {
  cau_hoi: Question[];
}

export interface QuizAttempt {
  id: number;
  ma_nguoi_dung: number;
  ma_bai_kiem_tra: number;
  diem_dat_duoc?: number;
  da_qua_mon?: boolean;
  ngay_bat_dau?: string;
  ngay_lam_bai?: string;
  trang_thai?: string; // "started", "submitted"
  bai_kiem_tra?: Quiz;
  cau_tra_loi_chi_tiet: any[];
}

export interface QuizReviewOption extends Option {
  is_correct: boolean;
}

export interface QuizReviewQuestion {
  id: number;
  ma_bai_kiem_tra: number;
  noi_dung: string;
  giai_thich?: string;
  cac_lua_chon: QuizReviewOption[];
  user_option_id?: number | null;
  correct_option_id?: number | null;
  is_user_correct: boolean;
}

export interface QuizAttemptReview extends Omit<QuizAttempt, "bai_kiem_tra" | "cau_tra_loi_chi_tiet"> {
  bai_kiem_tra: Quiz;
  cau_hoi_review: QuizReviewQuestion[];
}

export interface QuizSubmitResponse {
  attempt_id: number;
  score: number;
  passed: boolean;
  correct_count: number;
  total_count: number;
  message?: string;
}

export interface Certificate {
  id: number;
  ma_nguoi_dung: number;
  ma_khoa_hoc: number;
  uuid?: string;
  duong_dan_chung_chi: string;
  ngay_cap: string;
  khoa_hoc?: Course;
  nguoi_dung?: User;
}

export interface Enrollment {
  id: number;
  ma_nguoi_dung: number;
  ma_khoa_hoc: number;
  ngay_dang_ky: string;
  nguoi_dung?: {
    id: number;
    ho_ten: string;
  };
  khoa_hoc?: {
    id: number;
    tieu_de: string;
  };
}

export interface LuminaPaymentResponse {
  id: number;
  ma_don_hang: number;
  phuong_thuc_thanh_toan?: string;
  ma_giao_dich?: string;
  ngay_thanh_toan?: string;
}

export interface Notification {
  id: number;
  ma_nguoi_dung: number;
  tieu_de: string;
  noi_dung: string;
  loai: string;
  da_doc: boolean;
  ngay_tao: string;
}

export const apiService = {
  // 1. Banners API
  async getBanners(): Promise<Banner[]> {
    try {
      return await getCachedJson<Banner[]>(`${API_BASE_URL}/banners`, 30_000);
    } catch (err) {
      console.warn("API Error (Banners):", err);
      return [];
    }
  },

  // 2. Categories API
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

  // 3. Courses List API
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

  // 4. Course Details API
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

  // 5. Auth API
  async login(email: string, mat_khau: string): Promise<{ access_token: string; user: User }> {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, mat_khau }),
      credentials: "include",
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || "Đăng nhập thất bại");
    }
    const data = await res.json();
    tokenHelper.setCurrentUser(data.user);
    return data;
  },

  async register(email: string, mat_khau: string, ho_ten: string, so_dien_thoai?: string, vai_tro = "student"): Promise<User> {
    const res = await fetch(`${API_BASE_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, mat_khau, ho_ten, so_dien_thoai, vai_tro }),
      credentials: "include",
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || "Đăng ký thất bại");
    }
    return await res.json();
  },

  async getProfile(): Promise<User> {
    const res = await fetchWithAuth(`${API_BASE_URL}/auth/profile`);
    if (!res.ok) throw new Error("Failed to fetch profile");
    const user = await res.json();
    tokenHelper.setCurrentUser(user);
    return user;
  },

  async updateProfile(payload: {
    ho_ten?: string;
    so_dien_thoai?: string;
    avatar_url?: string;
    mat_khau_cu?: string;
    mat_khau_moi?: string;
  }): Promise<User> {
    const res = await fetchWithAuth(`${API_BASE_URL}/auth/profile`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || "Không thể cập nhật hồ sơ");
    }
    const user = await res.json();
    tokenHelper.setCurrentUser(user);
    return user;
  },

  async uploadFile(file: File, assetType?: UploadAssetType): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append("file", file);
    if (assetType) formData.append("asset_type", assetType);

    const res = await fetchWithAuth(`${API_BASE_URL}/upload`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || "Upload tệp thất bại");
    }
    return await res.json();
  },

  async forgotPassword(email: string): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || "Không thể gửi yêu cầu quên mật khẩu");
    }
    return await res.json();
  },

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE_URL}/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, mat_khau_moi: newPassword }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || "Đặt lại mật khẩu thất bại");
    }
    return await res.json();
  },

  async logout(): Promise<void> {
    try {
      await fetchWithAuth(`${API_BASE_URL}/auth/logout`, { method: "POST" });
    } catch (err) {
      console.warn("Logout endpoint error:", err);
    } finally {
      tokenHelper.removeCurrentUser();
    }
  },

  // 6. Cart API
  async getCart(): Promise<Cart> {
    const res = await fetchWithAuth(`${API_BASE_URL}/cart`);
    if (!res.ok) throw new Error("Failed to fetch cart");
    return await res.json();
  },

  async addToCart(courseId: number): Promise<CartItem> {
    const res = await fetchWithAuth(`${API_BASE_URL}/cart/items`, {
      method: "POST",
      body: JSON.stringify({ ma_khoa_hoc: courseId }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || "Không thể thêm vào giỏ hàng");
    }
    return await res.json();
  },

  async removeFromCart(courseId: number): Promise<void> {
    const res = await fetchWithAuth(`${API_BASE_URL}/cart/items/${courseId}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to remove item from cart");
  },

  // 7. Orders & Coupons API
  async applyCoupon(code: string, originalAmount: number): Promise<CouponApplyResponse> {
    const res = await fetchWithAuth(`${API_BASE_URL}/coupons/apply`, {
      method: "POST",
      body: JSON.stringify({ code, original_amount: originalAmount }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || "Mã giảm giá không hợp lệ");
    }
    return await res.json();
  },

  async checkout(couponId?: number, paymentMethod = "visa"): Promise<Order> {
    const res = await fetchWithAuth(`${API_BASE_URL}/checkout`, {
      method: "POST",
      body: JSON.stringify({ coupon_id: couponId, payment_method: paymentMethod }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || "Đặt hàng thất bại");
    }
    return await res.json();
  },

  async getMyOrders(): Promise<Order[]> {
    const res = await fetchWithAuth(`${API_BASE_URL}/my-orders`);
    if (!res.ok) throw new Error("Failed to fetch orders");
    return await res.json();
  },

  async requestRefund(orderId: number): Promise<Order> {
    const res = await fetchWithAuth(`${API_BASE_URL}/orders/${orderId}/refund`, {
      method: "POST",
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || "Không thể gửi yêu cầu hoàn tiền");
    }
    return await res.json();
  },

  async cancelRefund(orderId: number): Promise<Order> {
    const res = await fetchWithAuth(`${API_BASE_URL}/orders/${orderId}/cancel-refund`, {
      method: "POST",
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || "Không thể hủy yêu cầu hoàn tiền");
    }
    return await res.json();
  },

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

  async payMock(orderId: number, paymentMethod = "visa", transactionCode = "TX" + Date.now()): Promise<LuminaPaymentResponse> {
    const res = await fetchWithAuth(`${API_BASE_URL}/payments/mock`, {
      method: "POST",
      body: JSON.stringify({
        ma_don_hang: orderId,
        phuong_thuc_thanh_toan: paymentMethod,
        ma_giao_dich: transactionCode
      }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || "Thanh toán giả lập thất bại");
    }
    return await res.json();
  },

  // 8. Progress & Learning API
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

  async getCourseStudents(courseId: number): Promise<User[]> {
    const res = await fetchWithAuth(`${API_BASE_URL}/instructor/courses/${courseId}/students`);
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || "Không thể tải danh sách học viên");
    }
    return await res.json();
  },

  async getLessonLearningContent(courseId: number, lessonId: number): Promise<Lesson> {
    const res = await fetchWithAuth(`${API_BASE_URL}/learn/courses/${courseId}/lessons/${lessonId}`);
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || "Không thể truy cập bài học này.");
    }
    return await res.json();
  },

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

  // 9. Quizzes API
  async getCourseQuizzes(courseId: number): Promise<Quiz[]> {
    const res = await fetchWithAuth(`${API_BASE_URL}/courses/${courseId}/quizzes`);
    if (!res.ok) throw new Error("Failed to fetch quizzes");
    return await res.json();
  },

  async createQuiz(courseId: number, payload: QuizPayload): Promise<Quiz> {
    const res = await fetchWithAuth(`${API_BASE_URL}/courses/${courseId}/quizzes`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || "Không thể tạo bài kiểm tra");
    }
    return await res.json();
  },

  async deleteQuiz(courseId: number, quizId: number): Promise<void> {
    const res = await fetchWithAuth(`${API_BASE_URL}/courses/${courseId}/quizzes/${quizId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || "Không thể xóa bài kiểm tra");
    }
  },

  async createQuestion(quizId: number, payload: QuestionPayload): Promise<Question> {
    const res = await fetchWithAuth(`${API_BASE_URL}/quizzes/${quizId}/questions`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || "Không thể tạo câu hỏi");
    }
    return await res.json();
  },

  async deleteQuestion(questionId: number): Promise<void> {
    const res = await fetchWithAuth(`${API_BASE_URL}/questions/${questionId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || "Không thể xóa câu hỏi");
    }
  },

  async getQuizDetail(quizId: number): Promise<QuizDetail> {
    const res = await fetchWithAuth(`${API_BASE_URL}/quizzes/${quizId}`);
    if (!res.ok) throw new Error("Failed to fetch quiz detail");
    return await res.json();
  },

  async getAdminQuizDetail(quizId: number): Promise<any> {
    const res = await fetchWithAuth(`${API_BASE_URL}/admin/quizzes/${quizId}`);
    if (!res.ok) throw new Error("Failed to fetch admin quiz detail");
    return await res.json();
  },

  async startQuiz(quizId: number): Promise<QuizAttempt> {
    const res = await fetchWithAuth(`${API_BASE_URL}/quizzes/${quizId}/start`, {
      method: "POST"
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || "Không thể bắt đầu thi");
    }
    return await res.json();
  },

  async submitQuiz(quizId: number, attemptId: number, answers: { question_id: number; chosen_option_id: number }[]): Promise<QuizSubmitResponse> {
    const res = await fetchWithAuth(`${API_BASE_URL}/quizzes/${quizId}/submit`, {
      method: "POST",
      body: JSON.stringify({ attempt_id: attemptId, answers })
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || "Không thể nộp bài thi");
    }
    return await res.json();
  },

  async getQuizAttempt(attemptId: number): Promise<QuizAttempt> {
    const res = await fetchWithAuth(`${API_BASE_URL}/quizzes/attempts/${attemptId}`);
    if (!res.ok) throw new Error("Failed to fetch quiz attempt detail");
    return await res.json();
  },

  async getQuizAttemptReview(attemptId: number): Promise<QuizAttemptReview> {
    const res = await fetchWithAuth(`${API_BASE_URL}/quizzes/attempts/${attemptId}/review`);
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || "Failed to fetch quiz review");
    }
    return await res.json();
  },

  // 10. Certificates API
  async getPublicCertificate(uuid: string): Promise<any> {
    const res = await fetchWithTimeout(`${API_BASE_URL}/certificates/verify/${uuid}`);
    if (!res.ok) throw new Error("Không thể xác thực chứng chỉ này");
    const data = await res.json();
    if (!data.valid || !data.certificate) {
      throw new Error(data.message || "Chứng chỉ không hợp lệ");
    }
    return data.certificate;
  },

  async getMyCertificates(): Promise<Certificate[]> {
    const res = await fetchWithAuth(`${API_BASE_URL}/certificates/my-certificates`);
    if (!res.ok) throw new Error("Failed to fetch certificates");
    return await res.json();
  },

  async issueOrGetCertificate(courseId: number): Promise<Certificate> {
    const res = await fetchWithAuth(`${API_BASE_URL}/certificates/${courseId}/download`);
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || "Bạn chưa đủ điều kiện nhận chứng chỉ");
    }
    return await res.json();
  },

  // 11. Instructors API
  async getPublicInstructors(): Promise<any[]> {
    try {
      const res = await fetchWithTimeout(`${API_BASE_URL}/instructors`);
      if (!res.ok) throw new Error("Failed to fetch instructors");
      return await res.json();
    } catch (err) {
      console.warn("API Error (Instructors):", err);
      return [];
    }
  },

  // 12. Wishlist API
  async getWishlist(): Promise<any[]> {
    const res = await fetchWithAuth(`${API_BASE_URL}/courses/wishlist/me`);
    if (!res.ok) throw new Error("Failed to fetch wishlist");
    return await res.json();
  },

  async toggleWishlist(courseId: number): Promise<{ added: boolean; message: string }> {
    const res = await fetchWithAuth(`${API_BASE_URL}/courses/${courseId}/wishlist`, {
      method: "POST"
    });
    if (!res.ok) throw new Error("Failed to toggle wishlist");
    return await res.json();
  },

  // 13. Admin API
  async getAdminDashboardStats(): Promise<any> {
    const res = await fetchWithAuth(`${API_BASE_URL}/admin/stats`);
    if (!res.ok) throw new Error("Failed to fetch admin stats");
    return await res.json();
  },

  async getAdminCourses(): Promise<Course[]> {
    const res = await fetchWithAuth(`${API_BASE_URL}/admin/courses?limit=200`);
    if (!res.ok) throw new Error("Failed to fetch admin courses");
    return await res.json();
  },

  async getAdminPendingLessons(): Promise<any[]> {
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

  // 14. Instructor Studio Dashboard API
  async getInstructorStudioStats(): Promise<any> {
    const res = await fetchWithAuth(`${API_BASE_URL}/instructor-studio/stats`);
    if (!res.ok) throw new Error("Failed to fetch instructor stats");
    return await res.json();
  },

  async getInstructorStudioStudents(): Promise<any[]> {
    const res = await fetchWithAuth(`${API_BASE_URL}/instructor-studio/students`);
    if (!res.ok) throw new Error("Failed to fetch instructor students");
    return await res.json();
  },

  async getInstructorStudioReviews(): Promise<any[]> {
    const res = await fetchWithAuth(`${API_BASE_URL}/instructor-studio/reviews`);
    if (!res.ok) throw new Error("Failed to fetch instructor reviews");
    return await res.json();
  },

  async getInstructorStudioTransactions(): Promise<any[]> {
    const res = await fetchWithAuth(`${API_BASE_URL}/instructor-studio/transactions`);
    if (!res.ok) throw new Error("Failed to fetch instructor transactions");
    return await res.json();
  },

  async getMyPayouts(): Promise<any[]> {
    const res = await fetchWithAuth(`${API_BASE_URL}/instructor-studio/payouts`);
    if (!res.ok) throw new Error("Failed to fetch payouts");
    return await res.json();
  },

  async requestPayout(payload: { amount: number; bank_name: string; account_number: string; account_name: string }): Promise<any> {
    const res = await fetchWithAuth(`${API_BASE_URL}/instructor-studio/payouts`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || "Không thể yêu cầu rút tiền");
    }
    return await res.json();
  }
};

export const certificateApi = {
  verifyCertificate: async (uuid: string): Promise<any> => {
    const res = await fetch(`${API_BASE_URL}/certificates/verify/${uuid}`);
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || "Không thể xác minh chứng chỉ");
    }
    return await res.json();
  },
  getMyCertificates: async (): Promise<any[]> => {
    const res = await fetchWithAuth(`${API_BASE_URL}/certificates/my-certificates`);
    if (!res.ok) throw new Error("Failed to fetch certificates");
    return await res.json();
  },
  downloadCertificate: async (courseId: number): Promise<any> => {
    const res = await fetchWithAuth(`${API_BASE_URL}/certificates/${courseId}/download`);
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || "Không thể tải chứng chỉ");
    }
    return await res.json();
  }
};
