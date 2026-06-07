const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

// Helpers for localStorage Token management
export const tokenHelper = {
  getToken(): string | null {
    if (typeof window !== "undefined") {
      return localStorage.getItem("lumina_token");
    }
    return null;
  },
  setToken(token: string) {
    if (typeof window !== "undefined") {
      localStorage.setItem("lumina_token", token);
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
    }
  },
  removeCurrentUser() {
    if (typeof window !== "undefined") {
      localStorage.removeItem("lumina_user");
    }
  }
};

// Helper for Fetching with Auth Token
async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const token = tokenHelper.getToken();
  const headers = new Headers(options.headers || {});
  
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(url, {
    ...options,
    headers,
  });
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

export interface Category {
  id: number;
  ten_danh_muc: string;
  mo_ta?: string;
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

export interface Quiz {
  id: number;
  ma_khoa_hoc: number;
  tieu_de: string;
  diem_dat: number;
  thoi_gian_lam_bai?: number;
  so_luot_lam_toi_da: number;
  ngay_tao: string;
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

export interface LuminaPaymentResponse {
  id: number;
  ma_don_hang: number;
  phuong_thuc_thanh_toan?: string;
  ma_giao_dich?: string;
  ngay_thanh_toan?: string;
}

export const apiService = {
  // 1. Banners API
  async getBanners(): Promise<Banner[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/banners`);
      if (!res.ok) throw new Error("Failed to fetch banners");
      return await res.json();
    } catch (err) {
      console.warn("API Error (Banners):", err);
      return [];
    }
  },

  // 2. Categories API
  async getCategories(): Promise<Category[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/categories`);
      if (!res.ok) throw new Error("Failed to fetch categories");
      return await res.json();
    } catch (err) {
      console.warn("API Error (Categories):", err);
      return [];
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
      const res = await fetch(`${API_BASE_URL}/courses${queryString}`);
      if (!res.ok) throw new Error("Failed to fetch courses");
      return await res.json();
    } catch (err) {
      console.warn("API Error (Courses):", err);
      return [];
    }
  },

  // 4. Course Details API
  async getCourseDetail(id: number): Promise<CourseDetail | null> {
    try {
      const res = await fetch(`${API_BASE_URL}/courses/${id}`);
      if (!res.ok) throw new Error(`Failed to fetch course details for ID ${id}`);
      return await res.json();
    } catch (err) {
      console.warn(`API Error (Course Detail ID ${id}):`, err);
      return null;
    }
  },

  // 5. Auth API
  async login(email: string, mat_khau: string): Promise<{ access_token: string; user: User }> {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, mat_khau }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || "Đăng nhập thất bại");
    }
    const data = await res.json();
    tokenHelper.setToken(data.access_token);
    tokenHelper.setCurrentUser(data.user);
    return data;
  },

  async register(email: string, mat_khau: string, ho_ten: string, so_dien_thoai?: string, vai_tro = "student"): Promise<User> {
    const res = await fetch(`${API_BASE_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, mat_khau, ho_ten, so_dien_thoai, vai_tro }),
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

  async logout(): Promise<void> {
    try {
      await fetchWithAuth(`${API_BASE_URL}/auth/logout`, { method: "POST" });
    } catch (err) {
      console.warn("Logout endpoint error:", err);
    } finally {
      tokenHelper.removeToken();
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
    const res = await fetchWithAuth(`${API_BASE_URL}/orders/coupons/apply`, {
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
    const res = await fetchWithAuth(`${API_BASE_URL}/orders/checkout`, {
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
    const res = await fetchWithAuth(`${API_BASE_URL}/orders/my-orders`);
    if (!res.ok) throw new Error("Failed to fetch orders");
    return await res.json();
  },

  async payMock(orderId: number, paymentMethod = "visa", transactionCode = "TX" + Date.now()): Promise<LuminaPaymentResponse> {
    const res = await fetchWithAuth(`${API_BASE_URL}/orders/payments/mock`, {
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
    const res = await fetchWithAuth(`${API_BASE_URL}/progress/enrollments/my-courses`);
    if (!res.ok) throw new Error("Failed to fetch enrolled courses");
    return await res.json();
  },

  async getLessonLearningContent(courseId: number, lessonId: number): Promise<Lesson> {
    const res = await fetchWithAuth(`${API_BASE_URL}/progress/learn/courses/${courseId}/lessons/${lessonId}`);
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || "Không thể truy cập bài học này.");
    }
    return await res.json();
  },

  async getLessonProgress(lessonId: number): Promise<LessonProgress> {
    const res = await fetchWithAuth(`${API_BASE_URL}/progress/progress/lessons/${lessonId}`);
    if (!res.ok) throw new Error("Failed to get lesson progress");
    return await res.json();
  },

  async updateLessonProgress(lessonId: number, da_hoan_thanh: boolean, videoResumeSeconds = 0): Promise<LessonProgress> {
    const res = await fetchWithAuth(`${API_BASE_URL}/progress/progress/lessons/${lessonId}`, {
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
    const res = await fetchWithAuth(`${API_BASE_URL}/progress/learn/courses/${courseId}/progress`);
    if (!res.ok) throw new Error("Failed to get course progress");
    return await res.json();
  },

  // 9. Quizzes API
  async getCourseQuizzes(courseId: number): Promise<Quiz[]> {
    const res = await fetchWithAuth(`${API_BASE_URL}/quizzes/courses/${courseId}/quizzes`);
    if (!res.ok) throw new Error("Failed to fetch quizzes");
    return await res.json();
  },

  async getQuizDetail(quizId: number): Promise<QuizDetail> {
    const res = await fetchWithAuth(`${API_BASE_URL}/quizzes/${quizId}`);
    if (!res.ok) throw new Error("Failed to fetch quiz detail");
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

  // 10. Certificates API
  async getPublicCertificate(uuid: string): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/certificates/public/${uuid}`);
    if (!res.ok) throw new Error("Không thể xác thực chứng chỉ này");
    return await res.json();
  },

  // 11. Instructors API
  async getPublicInstructors(): Promise<any[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/instructors`);
      if (!res.ok) throw new Error("Failed to fetch instructors");
      return await res.json();
    } catch (err) {
      console.warn("API Error (Instructors):", err);
      return [];
    }
  },

  // 12. Wishlist API
  async getWishlist(): Promise<any[]> {
    const res = await fetchWithAuth(`${API_BASE_URL}/courses/courses/wishlist/me`);
    if (!res.ok) throw new Error("Failed to fetch wishlist");
    return await res.json();
  },

  async toggleWishlist(courseId: number): Promise<{ added: boolean; message: string }> {
    const res = await fetchWithAuth(`${API_BASE_URL}/courses/courses/${courseId}/wishlist`, {
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
  }
};

