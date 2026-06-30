// ============================================================
// LuminaLMS Frontend — Shared TypeScript interfaces & types
// ============================================================

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
  loai_noi_dung: string;
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
  trang_thai: string;
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
  completed_lesson_ids?: number[];
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
  trang_thai?: string;
  bai_kiem_tra?: Quiz;
  cau_tra_loi_chi_tiet: QuizAttemptAnswerDetail[];
}

export interface QuizAttemptAnswerDetail {
  id: number;
  ma_cau_hoi: number;
  ma_lua_chon: number;
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

export interface CourseImportCreatePayload {
  source_url: string;
  limit: number;
  checkout_free: boolean;
  headless: boolean;
}

export interface CourseImportConfigStatus {
  source: string;
  has_login_credentials: boolean;
  has_storage_state: boolean;
  can_checkout_free: boolean;
  headless_default: boolean;
}

export interface CourseImportImportPayload {
  confirmed_preview: boolean;
  publish: boolean;
  approve: boolean;
  category_id?: number | null;
  course_category_map?: Record<string, number | null>;
  instructor_id?: number | null;
}

export interface CourseImportDraft {
  source?: string;
  source_url?: string;
  title?: string;
  description?: string;
  thumbnail_url?: string;
  price?: number;
  level?: string;
  sections?: { title?: string; lessons?: unknown[] }[];
  raw?: {
    video_count?: number;
    mp4_count?: number;
    youtube_count?: number;
    external_video_count?: number;
    pdf_count?: number;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface CourseImportErrorDetail {
  code?: string;
  stage?: string;
  message?: string;
  url?: string;
  details?: Record<string, unknown>;
  source_url?: string;
  asset_type?: string;
  context?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface CourseImportJob {
  id: number;
  source: string;
  source_url: string;
  status: string;
  draft_data?: {
    courses?: CourseImportDraft[];
    errors?: CourseImportErrorDetail[];
    summary?: {
      requested_limit?: number;
      success_count?: number;
      error_count?: number;
      checkout_free?: boolean;
    };
    imported_course_ids?: number[];
    asset_mirror_errors?: CourseImportErrorDetail[];
    [key: string]: unknown;
  } | null;
  error_message?: string | null;
  imported_course_id?: number | null;
  created_by?: number | null;
  created_at: string;
  updated_at: string;
}

// ============================================================
// HM6: Typed interfaces thay thế các `any` cũ
// ============================================================

export interface AdminStats {
  total_users: number;
  total_students: number;
  total_instructors: number;
  total_courses: number;
  total_orders: number;
  total_revenue: number;
  instructor_revenue: number;
  platform_revenue: number;
  revenue_this_month: number;
  completion_rate: number;
  chart_data: { name: string; revenue: number; students: number }[];
  pending_courses: { id: number; tieu_de: string; giang_vien: string; ngay_tao: string; loai: string }[];
  pending_refunds: { id: number; nguoi_yeu_cau: string; so_tien: number; ngay_yeu_cau: string }[];
  top_courses: { id: number; tieu_de: string; so_hoc_vien: number; doanh_thu: number }[];
  recent_activities: { id: number; hanh_dong: string; chi_tiet?: string; ngay_thuc_hien: string; nguoi_thuc_hien: string }[];
}

export interface InstructorStats {
  total_courses: number;
  total_students: number;
  total_revenue: number;
  avg_rating: number;
  courses: Course[];
  recent_enrollments: Enrollment[];
}

export interface PublicInstructor {
  id: number;
  ho_ten: string;
  avatar_url?: string | null;
  course_count?: number;
  student_count?: number;
  so_luong_khoa_hoc: number;
  so_luong_hoc_vien: number;
}

export interface CertificateVerification {
  id: number;
  uuid: string;
  ngay_cap: string;
  duong_dan_chung_chi: string;
  nguoi_dung: { id: number; ho_ten: string };
  khoa_hoc: { id: number; tieu_de: string };
}

export interface InstructorTransaction {
  order_id: number;
  course_title: string;
  student_name: string;
  amount: number;
  instructor_share: number;
  date: string;
}

export interface InstructorStudent {
  user_id: number;
  ho_ten: string;
  email: string;
  avatar_url?: string;
  enrolled_courses: number;
  enrolled_at: string;
}

export interface PendingLesson {
  id: number;
  tieu_de: string;
  ma_chuong_hoc: number;
  trang_thai_phe_duyet: string;
  ten_chuong: string;
  ma_khoa_hoc: number;
  ten_khoa_hoc: string;
}

export interface AdminQuizDetail extends Quiz {
  cau_hoi: (Question & {
    giai_thich?: string;
    cac_lua_chon: (Option & { is_correct: boolean })[];
  })[];
  khoa_hoc?: { id: number; tieu_de: string };
}

export interface PayoutRequest {
  id: number;
  ma_giang_vien: number;
  so_tien: number;
  ngan_hang: string;
  so_tai_khoan: string;
  ten_chu_tai_khoan: string;
  trang_thai: string;
  ly_do_tu_choi?: string;
  ngay_yeu_cau: string;
  ngay_xu_ly?: string;
}
