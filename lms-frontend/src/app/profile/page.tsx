"use client";

import { useEffect, useState } from "react";
import { useUser } from "@/context/user-context";
import { apiFetch, levelLabel, formatPrice, getCourseImage } from "@/lib/api";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FastAverageColor } from "fast-average-color";

// Types
interface Course {
  id: number;
  tieu_de: string;
  mo_ta: string | null;
  gia_tien: string;
  trinh_do: string;
  danh_gia_trung_binh: string;
}

interface Progress {
  course_id: number;
  total_lessons: number;
  completed_lessons: number;
  progress_percentage: number;
}

interface Certificate {
  id: number;
  ma_khoa_hoc: number;
  uuid: string | null;
  ngay_cap: string;
  duong_dan_chung_chi: string;
}

interface OrderItem {
  id: number;
  ma_khoa_hoc: number;
  gia_luc_mua: string;
  khoa_hoc?: Course;
}

interface Order {
  id: number;
  tong_tien: string;
  trang_thai: string;
  ngay_tao: string;
  chi_tiet_don_hang: OrderItem[];
}

export default function ProfilePage() {
  const { user, role, token, isAuthenticated } = useUser();
  const [activeTab, setActiveTab] = useState<"courses" | "certificates" | "orders">("courses");
  
  const [courses, setCourses] = useState<Course[]>([]);
  const [progressMap, setProgressMap] = useState<Record<number, Progress>>({});
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Edit profile state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    ho_ten: "",
    so_dien_thoai: "",
    avatar_url: ""
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [headerGradient, setHeaderGradient] = useState<string | null>(null);

  // Refund and notification states
  const [showRefundConfirm, setShowRefundConfirm] = useState(false);
  const [selectedRefundOrderId, setSelectedRefundOrderId] = useState<number | null>(null);
  const [refunding, setRefunding] = useState(false);

  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const showNotification = (message: string, type: "success" | "error" | "info" = "error") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4500);
  };

  const isRefundable = (orderDateStr: string) => {
    const orderDate = new Date(orderDateStr);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - orderDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 7;
  };

  const isOrderRefundable = (order: Order) => {
    if (!isRefundable(order.ngay_tao)) return false;
    for (const item of order.chi_tiet_don_hang) {
      const prog = progressMap[item.ma_khoa_hoc];
      if (prog && prog.progress_percentage >= 10) {
        return false;
      }
    }
    return true;
  };

  const handleRefundClick = (orderId: number) => {
    setSelectedRefundOrderId(orderId);
    setShowRefundConfirm(true);
  };

  const handleRefund = async (orderId: number) => {
    if (!token) return;
    setRefunding(true);
    try {
      const res = await apiFetch(`/orders/${orderId}/refund`, token, {
        method: "POST"
      });
      if (res.ok) {
        showNotification("Gửi yêu cầu hoàn tiền thành công. Vui lòng chờ Admin phê duyệt.", "success");
        // Reload all data
        const [cRes, certRes, orderRes] = await Promise.all([
          apiFetch("/enrollments/my-courses", token),
          apiFetch("/certificates/my-certificates", token),
          apiFetch("/my-orders", token).catch(() => ({ ok: false, json: () => [] }))
        ]);
        if (cRes.ok) setCourses(await cRes.json());
        if (certRes.ok) setCertificates(await certRes.json());
        if (orderRes && orderRes.ok) setOrders(await orderRes.json());
      } else {
        const err = await res.json();
        showNotification(err.detail || "Lỗi hoàn tiền đơn hàng");
      }
    } catch {
      showNotification("Lỗi kết nối máy chủ");
    }
    setRefunding(false);
    setShowRefundConfirm(false);
    setSelectedRefundOrderId(null);
  };

  useEffect(() => {
    if (user?.avatar_url) {
      const fac = new FastAverageColor();
      fac.getColorAsync(user.avatar_url, { crossOrigin: "anonymous" })
        .then(color => {
          const [r, g, b] = color.value;
          setHeaderGradient(`linear-gradient(to right, rgba(${r},${g},${b},0.4), rgba(${r},${g},${b},0.05))`);
        })
        .catch(e => console.log("Không thể lấy màu ảnh avatar:", e));
    } else {
      setHeaderGradient(null);
    }
  }, [user?.avatar_url]);

  useEffect(() => {
    if (!token || !isAuthenticated) {
        setLoading(false);
        return;
    }
    const load = async () => {
      setLoading(true);
      try {
        if (role === "student") {
            const [cRes, certRes, orderRes] = await Promise.all([
                apiFetch("/enrollments/my-courses", token),
                apiFetch("/certificates/my-certificates", token),
                apiFetch("/my-orders", token).catch(() => ({ ok: false, json: () => [] }))
            ]);

            if (cRes.ok) {
              const data = await cRes.json();
              setCourses(data);
              const progMap: Record<number, Progress> = {};
              await Promise.all(
                data.map(async (c: Course) => {
                  try {
                    const pRes = await apiFetch(`/learn/courses/${c.id}/progress`, token);
                    if (pRes.ok) progMap[c.id] = await pRes.json();
                  } catch { /* ignore */ }
                })
              );
              setProgressMap(progMap);
            }
            if (certRes.ok) setCertificates(await certRes.json());
            if (orderRes && orderRes.ok) setOrders(await orderRes.json());
        }
      } catch (e) {
          console.error("Lỗi tải profile:", e);
      }
      setLoading(false);
    };
    load();
  }, [token, role, isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center animate-slide-up">
        <div className="w-24 h-24 bg-surface-container-high rounded-full flex items-center justify-center mb-6">
          <i className="ph-fill ph-user text-5xl text-on-surface-variant"></i>
        </div>
        <h2 className="text-2xl font-bold text-on-surface mb-2">Hồ sơ cá nhân</h2>
        <p className="text-on-surface-variant mb-8 max-w-md">Bạn cần đăng nhập để xem thông tin tài khoản và khóa học của mình.</p>
        <Link href="/login" className="px-6 py-3 bg-primary text-on-primary font-bold rounded-xl shadow-md hover:bg-primary/90 transition-colors flex items-center gap-2">
          <i className="ph-bold ph-sign-in text-lg"></i> Đăng nhập ngay
        </Link>
      </div>
    );
  }

  const getCert = (courseId: number) => certificates.find((c) => c.ma_khoa_hoc === courseId);

  const getLevelBadge = (level: string) => {
    const l = (level || "").toLowerCase().trim();
    if (l === "beginner" || l === "cơ bản") return { text: "Cơ bản", color: "bg-success/10 text-success border-success/30" };
    if (l === "intermediate" || l === "trung cấp") return { text: "Trung cấp", color: "bg-primary/10 text-primary border-primary/30" };
    if (l === "advanced" || l === "nâng cao") return { text: "Nâng cao", color: "bg-warning/10 text-warning border-warning/30" };
    return { text: level, color: "bg-surface-container text-on-surface-variant border-outline-variant/50" };
  };

  const roleBadge = (() => {
    if (role === "admin") return { title: "Quản trị viên", color: "bg-error/10 border-error/30 text-error" };
    if (role === "instructor") return { title: "Giảng viên", color: "bg-secondary/10 border-secondary/30 text-secondary" };
    
    if (!user?.ngay_dang_ky) return { title: "New Learner", color: "bg-[#4CAF50]/10 border-[#4CAF50]/30 text-[#4CAF50]" };
    
    const date = new Date(user.ngay_dang_ky);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 30) return { title: "New Learner", color: "bg-[#4CAF50]/10 border-[#4CAF50]/30 text-[#4CAF50]" };
    if (diffDays <= 90) return { title: "Active Learner", color: "bg-primary/10 border-primary/30 text-primary" };
    if (diffDays <= 180) return { title: "Pro Learner", color: "bg-[#9C27B0]/10 border-[#9C27B0]/30 text-[#9C27B0]" };
    if (diffDays <= 365) return { title: "Elite Learner", color: "bg-[#FF9800]/10 border-[#FF9800]/30 text-[#FF9800]" };
    
    return { title: "Legendary Learner", color: "bg-[#FFC107]/10 border-[#FFC107]/30 text-[#FF9800]" };
  })();

  // TECH THEME WRAPPER - Semantic Light/Dark Colors
  return (
    <div className="max-w-6xl mx-auto animate-slide-up pb-12 pt-4">
      
      {/* Header Profile - Tech Glassmorphism */}
      <div className="relative mb-10 rounded-[24px] bg-surface/80 backdrop-blur-xl border border-outline-variant/60 shadow-lg overflow-hidden">
          {headerGradient ? (
              <div className="absolute top-0 left-0 w-full h-32" style={{ background: headerGradient }}></div>
          ) : (
              <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-r from-primary/10 via-secondary/10 to-tertiary/10"></div>
          )}
          
          <div className="px-8 py-10 flex flex-col sm:flex-row gap-8 relative items-center sm:items-start mt-8">
              {/* Glowing Avatar */}
              <div className="w-32 h-32 rounded-full p-1 bg-gradient-to-br from-primary to-secondary shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)] shrink-0 relative">
                  <div className="w-full h-full rounded-full bg-surface flex items-center justify-center text-4xl font-black text-primary overflow-hidden">
                      {user?.avatar_url ? (
                        <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        user?.ho_ten?.charAt(0) || "U"
                      )}
                  </div>
                  <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-surface rounded-full border-2 border-secondary/50 flex items-center justify-center shadow-md">
                      <i className="ph-fill ph-check-circle text-secondary text-2xl"></i>
                  </div>
              </div>
              
              <div className="flex-1 text-center sm:text-left">
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 mb-2">
                      <h1 className="text-2xl font-bold text-on-surface tracking-tight">{user?.ho_ten}</h1>
                      <span className={`px-3 py-1 border text-xs font-bold rounded-full uppercase tracking-wider ${roleBadge.color}`}>
                          {roleBadge.title}
                      </span>
                  </div>
                  <p className="text-on-surface-variant font-medium flex items-center justify-center sm:justify-start gap-2 mb-4">
                      <i className="ph-fill ph-envelope-simple text-primary"></i> {user?.email}
                  </p>
                  
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-6 text-sm">
                      <div>
                          <span className="text-on-surface-variant text-xs block mb-1">Ngày tham gia</span>
                          <span className="font-bold text-on-surface">
                              {user?.ngay_dang_ky ? new Date(user.ngay_dang_ky).toLocaleDateString("vi-VN") : "Chưa cập nhật"}
                          </span>
                      </div>
                      <div className="w-px h-8 bg-outline-variant/50"></div>
                      <div>
                          <span className="text-on-surface-variant text-xs block mb-1">Số điện thoại</span>
                          <span className="font-bold text-on-surface">{user?.so_dien_thoai || "Chưa cập nhật"}</span>
                      </div>
                  </div>
              </div>
              
              <div className="flex gap-3">
                  <button 
                      onClick={() => {
                        setEditForm({
                          ho_ten: user?.ho_ten || "",
                          so_dien_thoai: user?.so_dien_thoai || "",
                          avatar_url: user?.avatar_url || ""
                        });
                        setIsEditModalOpen(true);
                      }} 
                      className="px-6 py-2.5 bg-surface-container hover:bg-surface-container-high border border-outline-variant/60 text-on-surface rounded-xl font-bold transition-all flex items-center gap-2 shadow-sm"
                  >
                      <i className="ph-bold ph-pencil-simple text-primary"></i> Sửa hồ sơ
                  </button>
              </div>
          </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              {/* Stats Sidebar */}
              <div className="lg:col-span-1 space-y-6">
                  <div className="bg-surface/80 backdrop-blur-xl border border-outline-variant/60 p-6 rounded-[24px] shadow-md">
                      <h3 className="text-sm font-bold text-on-surface mb-6 uppercase tracking-wider flex items-center gap-2">
                          <i className="ph-fill ph-chart-donut text-primary text-lg"></i> Thống kê
                      </h3>
                      <div className="space-y-6">
                          <div className="flex items-center justify-between group">
                              <div className="flex items-center gap-3 text-on-surface-variant group-hover:text-primary transition-colors">
                                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                      <i className="ph-fill ph-books text-lg"></i>
                                  </div>
                                  <span className="font-medium text-sm">Khóa học</span>
                              </div>
                              <span className="font-black text-on-surface text-lg">{courses.length}</span>
                          </div>
                          <div className="flex items-center justify-between group">
                              <div className="flex items-center gap-3 text-on-surface-variant group-hover:text-secondary transition-colors">
                                  <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center text-secondary">
                                      <i className="ph-fill ph-certificate text-lg"></i>
                                  </div>
                                  <span className="font-medium text-sm">Chứng chỉ</span>
                              </div>
                              <span className="font-black text-on-surface text-lg">{certificates.length}</span>
                          </div>
                          <div className="flex items-center justify-between group">
                              <div className="flex items-center gap-3 text-on-surface-variant group-hover:text-tertiary transition-colors">
                                  <div className="w-10 h-10 rounded-full bg-tertiary/10 flex items-center justify-center text-tertiary">
                                      <i className="ph-fill ph-receipt text-lg"></i>
                                  </div>
                                  <span className="font-medium text-sm">Đơn hàng</span>
                              </div>
                              <span className="font-black text-on-surface text-lg">{orders.length}</span>
                          </div>
                      </div>
                  </div>
              </div>

              {/* Tabs & Content */}
              <div className="lg:col-span-3">
                  {/* Horizontal Scrollable Tabs */}
                  <div className="flex gap-2 mb-8 overflow-x-auto custom-scrollbar pb-2">
                      <button 
                          onClick={() => setActiveTab("courses")}
                          className={`whitespace-nowrap px-6 py-3 font-bold text-sm transition-all rounded-xl flex items-center gap-2 border ${
                              activeTab === "courses" 
                              ? "bg-primary/10 text-primary border-primary/30 shadow-sm" 
                              : "bg-surface text-on-surface-variant border-outline-variant/60 hover:bg-surface-container hover:text-on-surface"
                          }`}
                      >
                          <i className="ph-fill ph-books text-lg"></i> Khóa học của tôi
                      </button>
                      <button 
                          onClick={() => setActiveTab("certificates")}
                          className={`whitespace-nowrap px-6 py-3 font-bold text-sm transition-all rounded-xl flex items-center gap-2 border ${
                              activeTab === "certificates" 
                              ? "bg-secondary/10 text-secondary border-secondary/30 shadow-sm" 
                              : "bg-surface text-on-surface-variant border-outline-variant/60 hover:bg-surface-container hover:text-on-surface"
                          }`}
                      >
                          <i className="ph-fill ph-certificate text-lg"></i> Chứng chỉ
                      </button>
                      <button 
                          onClick={() => setActiveTab("orders")}
                          className={`whitespace-nowrap px-6 py-3 font-bold text-sm transition-all rounded-xl flex items-center gap-2 border ${
                              activeTab === "orders" 
                              ? "bg-tertiary/10 text-tertiary border-tertiary/30 shadow-sm" 
                              : "bg-surface text-on-surface-variant border-outline-variant/60 hover:bg-surface-container hover:text-on-surface"
                          }`}
                      >
                          <i className="ph-fill ph-receipt text-lg"></i> Lịch sử đơn hàng
                      </button>
                  </div>

                  {/* Content */}
                  {loading ? (
                      <div className="py-20 flex justify-center">
                          <i className="ph-bold ph-spinner-gap animate-spin text-4xl text-primary"></i>
                      </div>
                  ) : (
                      <div className="animate-slide-up">
                          {/* TAB: COURSES */}
                          {activeTab === "courses" && (
                              <div className="space-y-6">
                                  {courses.length === 0 ? (
                                      <div className="bg-surface/80 backdrop-blur-xl p-12 rounded-[24px] text-center border border-outline-variant/60 shadow-md">
                                          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                              <i className="ph-fill ph-empty text-3xl text-primary"></i>
                                          </div>
                                          <h3 className="text-xl font-bold text-on-surface mb-2">Chưa có khóa học nào</h3>
                                          <p className="text-on-surface-variant mb-6 font-medium">Bạn chưa đăng ký tham gia khóa học nào trên hệ thống.</p>
                                          <Link href="/courses" className="px-6 py-2.5 bg-gradient-to-r from-primary to-secondary text-white rounded-xl font-bold hover:opacity-90 transition-all inline-block shadow-md">Khám phá ngay</Link>
                                      </div>
                                  ) : (
                                      courses.map((course) => {
                                          const prog = progressMap[course.id];
                                          const pct = prog ? Math.round(prog.progress_percentage) : 0;
                                          return (
                                              <div key={course.id} className="bg-surface/90 backdrop-blur-xl p-5 rounded-[24px] border border-outline-variant/60 flex flex-col md:flex-row gap-6 items-center hover:border-primary/50 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                                                  
                                                  {/* Thumbnail */}
                                                  <div className="w-full md:w-56 h-36 rounded-2xl bg-surface-container-high border border-outline-variant/30 overflow-hidden relative shrink-0">
                                                      <img 
                                                          src={getCourseImage(course.tieu_de)}
                                                          alt={course.tieu_de}
                                                          className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                                      />
                                                      <div className="absolute inset-0 bg-black/10"></div>
                                                      <div className="absolute inset-0 flex items-center justify-center text-white/80 z-10">
                                                          <i className="ph-fill ph-play-circle text-5xl group-hover:scale-110 group-hover:text-white transition-all drop-shadow-md"></i>
                                                      </div>
                                                  </div>
                                                  
                                                  <div className="flex-1 w-full relative z-10">
                                                      <div className="flex items-start justify-between mb-2">
                                                          <h3 className="text-xl font-bold text-on-surface line-clamp-1 group-hover:text-primary transition-colors">{course.tieu_de}</h3>
                                                          {(() => {
                                                              const lvl = getLevelBadge(course.trinh_do);
                                                              return <span className={`px-3 py-1 text-xs font-bold rounded-lg border ${lvl.color}`}>{lvl.text}</span>;
                                                          })()}
                                                      </div>
                                                      
                                                      {prog ? (
                                                          <div className="mb-4 mt-4">
                                                              <div className="flex justify-between text-xs font-bold mb-2">
                                                                  <span className={pct === 100 ? "text-success" : "text-amber-600"}>
                                                                      {pct === 100 ? "Đã hoàn thành" : "Đang tiến hành"}
                                                                  </span>
                                                                  <span className={pct === 100 ? "text-success" : "text-amber-600/80"}>{prog.completed_lessons} / {prog.total_lessons} bài học ({pct}%)</span>
                                                              </div>
                                                              <div className="w-full bg-surface-container-high h-2 rounded-full overflow-hidden border border-outline-variant/30 relative">
                                                                  <div 
                                                                      className={`h-full rounded-full transition-all duration-1000 relative overflow-hidden ${pct === 100 ? "bg-success" : "bg-amber-500"}`} 
                                                                      style={{ width: `${Math.max(pct, 2)}%` }}
                                                                  >
                                                                      {pct > 0 && <div className="absolute top-0 right-0 bottom-0 w-2 bg-white/50 blur-[2px]"></div>}
                                                                  </div>
                                                              </div>
                                                          </div>
                                                      ) : (
                                                          <div className="text-sm text-on-surface-variant mb-4 font-medium flex items-center gap-2">
                                                              <i className="ph-fill ph-info text-primary"></i> Chưa có dữ liệu tiến độ
                                                          </div>
                                                      )}

                                                      <div className="flex items-center gap-3 mt-4">
                                                          <Link href={`/learn/${course.id}`} className="px-6 py-2 bg-gradient-to-r from-primary to-secondary text-white rounded-xl text-sm font-bold shadow-md hover:opacity-90 transition-all flex items-center gap-2">
                                                              <i className="ph-fill ph-play"></i> {pct === 0 ? "Bắt đầu học" : "Tiếp tục học"}
                                                          </Link>
                                                          {pct === 100 && getCert(course.id) && (
                                                              <button onClick={() => showNotification(`UUID Chứng chỉ: ${getCert(course.id)?.uuid}`, "info")} className="px-5 py-2 bg-secondary/10 text-secondary border border-secondary/30 rounded-xl text-sm font-bold hover:bg-secondary/20 transition-colors flex items-center gap-2">
                                                                  <i className="ph-fill ph-certificate"></i> Chứng chỉ
                                                              </button>
                                                          )}
                                                      </div>
                                                  </div>
                                              </div>
                                          );
                                      })
                                  )}
                              </div>
                          )}

                          {/* TAB: CERTIFICATES */}
                          {activeTab === "certificates" && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  {certificates.length === 0 ? (
                                      <div className="col-span-full bg-surface/80 backdrop-blur-xl p-12 rounded-[24px] text-center border border-outline-variant/60 shadow-md">
                                          <div className="w-20 h-20 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                              <i className="ph-fill ph-certificate text-3xl text-secondary"></i>
                                          </div>
                                          <h3 className="text-xl font-bold text-on-surface mb-2">Chưa có chứng chỉ nào</h3>
                                          <p className="text-on-surface-variant font-medium">Hoàn thành 100% các khóa học để nhận chứng chỉ nhé.</p>
                                      </div>
                                  ) : (
                                      certificates.map(cert => {
                                          const c = courses.find(x => x.id === cert.ma_khoa_hoc);
                                          return (
                                              <div key={cert.id} className="bg-surface/90 backdrop-blur-xl p-6 rounded-[24px] border border-secondary/30 shadow-sm relative overflow-hidden group hover:-translate-y-1 hover:shadow-md transition-all">
                                                  <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                                      <i className="ph-fill ph-seal-check text-9xl text-secondary"></i>
                                                  </div>
                                                  <div className="w-14 h-14 bg-secondary/10 text-secondary border border-secondary/30 rounded-2xl flex items-center justify-center mb-6 relative z-10">
                                                      <i className="ph-fill ph-certificate text-2xl"></i>
                                                  </div>
                                                  <h4 className="text-xl font-bold text-on-surface mb-2 relative z-10">{c?.tieu_de || "Khóa học"}</h4>
                                                  <p className="text-sm text-on-surface-variant font-medium mb-6 relative z-10 flex items-center gap-2">
                                                      <i className="ph-bold ph-calendar"></i> Cấp ngày: {new Date(cert.ngay_cap).toLocaleDateString("vi-VN")}
                                                  </p>
                                                  <div className="flex items-center gap-2.5 mt-4">
                                                       <button 
                                                            onClick={() => {
                                                                if (cert.duong_dan_chung_chi) {
                                                                    window.open(cert.duong_dan_chung_chi, "_blank");
                                                                }
                                                            }}
                                                            className="text-sm font-bold text-secondary hover:text-secondary-container transition-colors relative z-10 flex items-center gap-1 border border-secondary/30 px-4 py-2 rounded-lg bg-secondary/5 hover:bg-secondary/10"
                                                        >
                                                            <i className="ph-bold ph-download-simple"></i> Tải PDF
                                                       </button>
                                                       {cert.uuid && (
                                                           <Link
                                                                href={`/verify/${cert.uuid}`}
                                                                target="_blank"
                                                                className="text-sm font-bold text-indigo-600 hover:text-indigo-750 transition-colors relative z-10 flex items-center gap-1 border border-indigo-200 px-4 py-2 rounded-lg bg-indigo-50/5 hover:bg-indigo-50/50"
                                                           >
                                                                <i className="ph-bold ph-shield-check"></i> Xác thực
                                                           </Link>
                                                       )}
                                                   </div>
                                              </div>
                                          );
                                      })
                                  )}
                              </div>
                          )}

                          {/* TAB: ORDERS */}
                          {activeTab === "orders" && (
                              <div className="space-y-4">
                                  {orders.length === 0 ? (
                                      <div className="bg-surface/80 backdrop-blur-xl p-12 rounded-[24px] text-center border border-outline-variant/60 shadow-md">
                                          <div className="w-20 h-20 bg-tertiary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                              <i className="ph-fill ph-receipt text-3xl text-tertiary"></i>
                                          </div>
                                          <h3 className="text-xl font-bold text-on-surface mb-2">Lịch sử giao dịch trống</h3>
                                  <p className="text-on-surface-variant font-medium">Bạn chưa thực hiện thanh toán nào trên hệ thống.</p>
                                      </div>
                                  ) : (
                                      orders.map(order => (
                                          <div key={order.id} className="bg-surface/90 backdrop-blur-xl p-6 rounded-[20px] border border-outline-variant/60 hover:border-tertiary/50 transition-colors flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm hover:shadow-md">
                                              <div>
                                                  <div className="flex items-center gap-3 mb-2">
                                                      <span className="font-bold text-on-surface text-lg">Đơn hàng #{order.id}</span>
                                                      <span className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-md border ${
                                                          order.trang_thai === "success" 
                                                          ? "bg-secondary/10 text-secondary border-secondary/30" 
                                                          : order.trang_thai === "refunded"
                                                          ? "bg-outline-variant/20 text-on-surface-variant/80 border-outline-variant/40"
                                                          : order.trang_thai === "refund_requested"
                                                          ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
                                                          : order.trang_thai === "pending"
                                                          ? "bg-yellow-500/10 text-yellow-600 border-yellow-500/30"
                                                          : "bg-red-500/10 text-red-600 border-red-500/30"
                                                      }`}>
                                                          {order.trang_thai === "success" 
                                                              ? "Thành công" 
                                                              : order.trang_thai === "refunded" 
                                                              ? "Đã hoàn tiền" 
                                                              : order.trang_thai === "refund_requested"
                                                              ? "Chờ hoàn tiền"
                                                              : order.trang_thai === "pending" 
                                                              ? "Đang chờ" 
                                                              : "Thất bại"}
                                                      </span>
                                                  </div>
                                                  <p className="text-sm text-on-surface-variant mb-2 flex items-center gap-2">
                                                      <i className="ph-bold ph-calendar-blank"></i> {new Date(order.ngay_tao).toLocaleString("vi-VN")}
                                                  </p>
                                                  <div className="flex flex-wrap gap-2 mt-3">
                                                      {order.chi_tiet_don_hang.map(item => (
                                                          <span key={item.id} className="text-xs px-3 py-1.5 bg-surface-container border border-outline-variant/50 text-on-surface-variant rounded-lg flex items-center gap-1">
                                                              <i className="ph-fill ph-book-open"></i> {item.khoa_hoc?.tieu_de || "Khóa học đã xóa"}
                                                          </span>
                                                      ))}
                                                  </div>
                                              </div>
                                              <div className="text-right shrink-0 w-full md:w-auto pt-4 md:pt-0 border-t border-outline-variant/30 md:border-0 mt-2 md:mt-0 flex flex-col items-end gap-2">
                                                  <div>
                                                      <p className="text-sm text-on-surface-variant mb-1 uppercase tracking-wider">Tổng thanh toán</p>
                                                      <p className="text-2xl font-black text-primary">{formatPrice(order.tong_tien)}</p>
                                                  </div>
                                                  {order.trang_thai === "success" && isOrderRefundable(order) && (
                                                      <button
                                                          onClick={() => handleRefundClick(order.id)}
                                                          className="mt-2 text-xs font-bold text-error border border-error/20 hover:bg-error hover:text-on-error bg-error/10 px-3 py-1.5 rounded-lg transition-all"
                                                      >
                                                          Hoàn tiền
                                                      </button>
                                                  )}
                                              </div>
                                          </div>
                                      ))
                                  )}
                              </div>
                          )}
                      </div>
                  )}
              </div>
          </div>

      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface border border-outline-variant rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-scale-up">
            <div className="px-6 py-4 border-b border-outline-variant flex items-center justify-between bg-surface-container-lowest">
              <h3 className="text-lg font-bold text-on-surface">Cập nhật hồ sơ</h3>
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container hover:text-error transition-colors"
              >
                <i className="ph-bold ph-x"></i>
              </button>
            </div>
            
            <form onSubmit={async (e) => {
              e.preventDefault();
              setIsSaving(true);
              try {
                const res = await apiFetch("/auth/profile", token, {
                  method: "PUT",
                  body: JSON.stringify(editForm)
                });
                
                if (res.ok) {
                  const updatedUser = await res.json();
                  const savedUserStr = localStorage.getItem("lms_user");
                  if (savedUserStr) {
                      const savedUser = JSON.parse(savedUserStr);
                      const newUser = { ...savedUser, ho_ten: updatedUser.ho_ten, so_dien_thoai: updatedUser.so_dien_thoai, avatar_url: updatedUser.avatar_url };
                      localStorage.setItem("lms_user", JSON.stringify(newUser));
                  }
                  showNotification("Cập nhật hồ sơ thành công!", "success");
                  setIsEditModalOpen(false);
                  setTimeout(() => window.location.reload(), 1000); // Đơn giản nhất để cập nhật context
                } else {
                  const err = await res.json();
                  showNotification(err.detail || "Cập nhật thất bại.");
                }
              } catch (err) {
                showNotification("Lỗi kết nối.");
              }
              setIsSaving(false);
            }} className="p-6 space-y-4">
              
              <div>
                <label className="block text-sm font-bold text-on-surface mb-1">Họ và tên</label>
                <input 
                  type="text" 
                  required
                  value={editForm.ho_ten}
                  onChange={(e) => setEditForm({...editForm, ho_ten: e.target.value})}
                  className="w-full bg-surface-container border border-outline-variant rounded-xl px-4 py-2.5 text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-on-surface mb-1">Số điện thoại</label>
                <input 
                  type="tel" 
                  value={editForm.so_dien_thoai}
                  onChange={(e) => setEditForm({...editForm, so_dien_thoai: e.target.value})}
                  className="w-full bg-surface-container border border-outline-variant rounded-xl px-4 py-2.5 text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-on-surface mb-1">Ảnh đại diện</label>
                <div className="flex items-center gap-4">
                    {editForm.avatar_url && (
                        <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 border border-outline-variant">
                            <img src={editForm.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                        </div>
                    )}
                    <input 
                        type="file"
                        accept="image/*"
                        disabled={isUploading}
                        onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            setIsUploading(true);
                            const formData = new FormData();
                            formData.append("file", file);
                            try {
                                const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1";
                                const uploadRes = await fetch(`${API}/upload`, {
                                    method: "POST",
                                    headers: { "Authorization": `Bearer ${token}` },
                                    body: formData
                                });
                                if (uploadRes.ok) {
                                    const data = await uploadRes.json();
                                    setEditForm({...editForm, avatar_url: data.url});
                                } else {
                                    showNotification("Tải ảnh thất bại.");
                                }
                            } catch (err) {
                                showNotification("Lỗi tải ảnh.");
                            }
                            setIsUploading(false);
                        }}
                        className="w-full bg-surface-container border border-outline-variant rounded-xl px-4 py-2 text-sm text-on-surface focus:outline-none file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 transition-all cursor-pointer"
                    />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 mt-6">
                <button 
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl font-bold text-on-surface-variant hover:bg-surface-container transition-colors"
                >
                  Hủy
                </button>
                <button 
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 bg-primary text-on-primary rounded-xl font-bold hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
                >
                  {isSaving ? <i className="ph-bold ph-spinner animate-spin"></i> : <i className="ph-bold ph-floppy-disk"></i>}
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showRefundConfirm && selectedRefundOrderId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 animate-fade-in">
          <div className="glass-panel w-full max-w-md bg-surface p-8 rounded-3xl shadow-2xl relative animate-scale-up border border-outline-variant/50">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-error/10 text-error rounded-full flex items-center justify-center mx-auto mb-4 border border-error/20 text-3xl">
                <i className="ph-fill ph-warning-circle"></i>
              </div>
              <h3 className="text-xl font-bold text-on-surface">Yêu cầu hoàn tiền</h3>
              <p className="text-sm text-on-surface-variant mt-2 leading-relaxed">
                Bạn có chắc chắn muốn gửi yêu cầu hoàn tiền cho đơn hàng **#{selectedRefundOrderId}**? 
                Yêu cầu của bạn sẽ được gửi tới Ban quản trị phê duyệt. Nếu được duyệt, hệ thống sẽ thu hồi quyền học tập, tiến độ và chứng chỉ của các khóa học trong đơn hàng này.
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <button 
                onClick={() => {
                  setShowRefundConfirm(false);
                  setSelectedRefundOrderId(null);
                }}
                disabled={refunding}
                className="px-5 py-2.5 rounded-xl font-bold text-on-surface-variant hover:bg-surface-container transition-colors disabled:opacity-50"
              >
                Hủy
              </button>
              <button 
                onClick={() => handleRefund(selectedRefundOrderId)}
                disabled={refunding}
                className="px-6 py-2.5 bg-error text-on-error rounded-xl font-bold hover:bg-error/90 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
              >
                {refunding ? <i className="ph-bold ph-spinner animate-spin"></i> : <i className="ph-fill ph-key-return"></i>}
                Gửi yêu cầu hoàn tiền
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Toast Notification Banner */}
      {notification && (
        <div className={`fixed bottom-8 right-8 z-[200] px-6 py-4 rounded-2xl shadow-2xl border flex items-center gap-3 animate-slide-up ${
          notification.type === "success" 
            ? "bg-success/10 border-success/30 text-success" 
            : notification.type === "error"
            ? "bg-error/10 border-error/30 text-error"
            : "bg-primary/10 border-primary/30 text-primary"
        }`}>
          {notification.type === "success" ? (
            <i className="ph-fill ph-check-circle text-xl"></i>
          ) : (
            <i className="ph-fill ph-warning-circle text-xl"></i>
          )}
          <span className="font-bold text-sm">{notification.message}</span>
          <button onClick={() => setNotification(null)} className="ml-2 hover:opacity-80">
            <i className="ph-bold ph-x text-xs"></i>
          </button>
        </div>
      )}
    </div>
  );
}
