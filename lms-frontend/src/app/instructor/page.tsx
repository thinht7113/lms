"use client";

import { useEffect, useState } from "react";
import { useUser } from "@/context/user-context";
import { apiFetch, formatPrice } from "@/lib/api";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Course {
  id: number;
  tieu_de: string;
  mo_ta: string | null;
  gia_tien: string;
  trinh_do: string;
  da_xuat_ban: boolean;
  trang_thai_phe_duyet: string;
  danh_gia_trung_binh: string;
  ngay_tao: string;
  so_luong_hoc_vien: number;
}

interface Category {
  id: number;
  ten_danh_muc: string;
}

export default function InstructorPage() {
  const router = useRouter();
  const { role, token, isAuthenticated, isLoading } = useUser();
  const [courses, setCourses] = useState<Course[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newCourse, setNewCourse] = useState({ tieu_de: "", mo_ta: "", gia_tien: "0", ma_danh_muc: 0, trinh_do: "beginner" });
  
  // Student modal states
  const [showStudentsModal, setShowStudentsModal] = useState(false);
  const [courseStudents, setCourseStudents] = useState<any[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [selectedCourseForStudents, setSelectedCourseForStudents] = useState<Course | null>(null);

  const loadCourses = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [cRes, catRes] = await Promise.all([
        apiFetch("/instructor/courses", token),
        apiFetch("/categories"),
      ]);
      if (cRes.ok) setCourses(await cRes.json());
      if (catRes.ok) setCategories(await catRes.json());
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { loadCourses(); }, [token]);

  // Redirect if not authorized
  useEffect(() => {
    if (!isLoading && (!isAuthenticated || role !== "instructor")) {
      router.replace(isAuthenticated ? "/" : "/login");
    }
  }, [isLoading, isAuthenticated, role, router]);

  const createCourse = async () => {
    if (!token || !newCourse.tieu_de) return;
    setCreating(true);
    try {
      const res = await apiFetch("/instructor/courses", token, {
        method: "POST",
        body: JSON.stringify({
          tieu_de: newCourse.tieu_de,
          mo_ta: newCourse.mo_ta,
          gia_tien: parseFloat(newCourse.gia_tien) || 0,
          ma_danh_muc: newCourse.ma_danh_muc || null,
          trinh_do: newCourse.trinh_do,
        }),
      });
      if (res.ok) {
        setShowCreateModal(false);
        setNewCourse({ tieu_de: "", mo_ta: "", gia_tien: "0", ma_danh_muc: 0, trinh_do: "beginner" });
        loadCourses();
      } else {
        const err = await res.json();
        alert(err.detail || "Lỗi tạo khóa học");
      }
    } catch { alert("Lỗi kết nối"); }
    setCreating(false);
  };

  const updateCourseStatus = async (course: Course, nextStatus: string) => {
    if (!token) return;
    try {
      const body: any = { trang_thai_phe_duyet: nextStatus };
      if (nextStatus === "draft") {
        body.da_xuat_ban = false;
      }
      const res = await apiFetch(`/courses/${course.id}`, token, {
        method: "PUT",
        body: JSON.stringify(body),
      });
      if (res.ok) loadCourses();
      else {
        const err = await res.json();
        alert(err.detail || "Lỗi thay đổi trạng thái.");
      }
    } catch { alert("Lỗi kết nối"); }
  };

  const loadStudents = async (course: Course) => {
    setSelectedCourseForStudents(course);
    setShowStudentsModal(true);
    setLoadingStudents(true);
    try {
      const res = await apiFetch(`/instructor/courses/${course.id}/students`, token);
      if (res.ok) {
        setCourseStudents(await res.json());
      }
    } catch { /* ignore */ }
    setLoadingStudents(false);
  };

  const renderStatusBadge = (course: Course) => {
    switch (course.trang_thai_phe_duyet) {
      case "pending":
        return (
          <span className="text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full border bg-amber-500/10 text-amber-500 border-amber-500/20 shadow-sm animate-pulse">
            Chờ duyệt
          </span>
        );
      case "approved":
        return (
          <span className="text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full border bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shadow-sm">
            Đã xuất bản
          </span>
        );
      case "rejected":
        return (
          <span className="text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full border bg-rose-500/10 text-rose-500 border-rose-500/20 shadow-sm">
            Từ chối
          </span>
        );
      case "draft":
      default:
        return (
          <span className="text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full border bg-slate-500/10 text-slate-500 border-slate-500/20 shadow-sm">
            Bản nháp
          </span>
        );
    }
  };

  const renderActionButton = (course: Course) => {
    switch (course.trang_thai_phe_duyet) {
      case "pending":
        return (
          <button
            onClick={() => updateCourseStatus(course, "draft")}
            className="px-4 py-2 rounded-xl text-xs font-bold transition-all border border-slate-500/20 text-slate-500 hover:bg-slate-500/10"
            title="Rút lại yêu cầu phê duyệt để sửa chữa"
          >
            Rút yêu cầu
          </button>
        );
      case "approved":
        return (
          <button
            onClick={() => updateCourseStatus(course, "draft")}
            className="px-4 py-2 rounded-xl text-xs font-bold transition-all border border-rose-500/20 text-rose-500 hover:bg-rose-500/10"
            title="Gỡ khóa học xuống thành bản nháp"
          >
            Gỡ xuống
          </button>
        );
      case "rejected":
        return (
          <button
            onClick={() => updateCourseStatus(course, "pending")}
            className="px-4 py-2 rounded-xl text-xs font-bold transition-all border border-amber-500/20 bg-amber-500/5 text-amber-500 hover:bg-amber-500/15"
            title="Gửi lại yêu cầu duyệt cho Admin"
          >
            Duyệt lại
          </button>
        );
      case "draft":
      default:
        return (
          <button
            onClick={() => updateCourseStatus(course, "pending")}
            className="px-4 py-2 rounded-xl text-xs font-bold transition-all border border-emerald-500/20 bg-emerald-500/5 text-emerald-500 hover:bg-emerald-500/15 shadow-sm"
            title="Gửi yêu cầu duyệt cho Admin"
          >
            Gửi duyệt
          </button>
        );
    }
  };

  // Compute metrics
  const totalCourses = courses.length;
  const totalStudents = courses.reduce((sum, c) => sum + (c.so_luong_hoc_vien || 0), 0);
  const pendingCourses = courses.filter(c => c.trang_thai_phe_duyet === "pending").length;
  const avgRating = totalCourses 
    ? (courses.reduce((sum, c) => sum + parseFloat(c.danh_gia_trung_binh || "0"), 0) / totalCourses).toFixed(1) 
    : "0.0";

  if (!isAuthenticated || role !== "instructor") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] px-4">
        <div className="bg-white/80 backdrop-blur-xl p-10 rounded-3xl text-center border border-slate-200/60 max-w-md w-full shadow-2xl">
          <div className="text-5xl mb-6">🔒</div>
          <h2 className="text-2xl font-extrabold text-slate-800 mb-2">Quyền truy cập bị giới hạn</h2>
          <p className="text-slate-500 mb-8 text-sm">Vui lòng đăng nhập với tài khoản <strong>Giảng viên</strong> để tiếp tục.</p>
          <Link href="/login" className="inline-block w-full px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold shadow-lg shadow-indigo-600/20 transition-all hover:-translate-y-0.5">
            Đăng nhập
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-20">
      <div className="w-full max-w-[95%] mx-auto px-4 md:px-8 pt-10">
        
        {/* Upper Dashboard Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
          <div>
            <div className="flex items-center gap-2.5 text-xs font-bold text-indigo-600 uppercase tracking-widest mb-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-600"></span> Giảng viên
            </div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
              Bảng điều khiển
            </h1>
            <p className="text-slate-400 text-sm mt-0.5 font-medium">Theo dõi hoạt động giảng dạy và quản lý các khóa học</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-2xl font-bold text-sm transition-all shadow-lg shadow-indigo-600/10 hover:shadow-indigo-600/20 hover:-translate-y-0.5 flex items-center gap-2"
          >
            <i className="ph-bold ph-plus text-base"></i> Tạo khóa học mới
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-10">
          <div className="bg-white border border-slate-100 rounded-2xl p-5 md:p-6 shadow-sm hover:shadow-md transition-all flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xl shrink-0"><i className="ph-fill ph-book-open"></i></div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tổng khóa học</p>
              <h3 className="text-2xl font-black text-slate-800">{totalCourses}</h3>
            </div>
          </div>
          <div className="bg-white border border-slate-100 rounded-2xl p-5 md:p-6 shadow-sm hover:shadow-md transition-all flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl shrink-0"><i className="ph-fill ph-users"></i></div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tổng học viên</p>
              <h3 className="text-2xl font-black text-slate-800">{totalStudents}</h3>
            </div>
          </div>
          <div className="bg-white border border-slate-100 rounded-2xl p-5 md:p-6 shadow-sm hover:shadow-md transition-all flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-xl shrink-0"><i className="ph-fill ph-star"></i></div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Đánh giá trung bình</p>
              <h3 className="text-2xl font-black text-slate-800">{avgRating} / 5.0</h3>
            </div>
          </div>
          <div className="bg-white border border-slate-100 rounded-2xl p-5 md:p-6 shadow-sm hover:shadow-md transition-all flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center text-xl shrink-0"><i className="ph-fill ph-clock"></i></div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Chờ phê duyệt</p>
              <h3 className="text-2xl font-black text-slate-800">{pendingCourses}</h3>
            </div>
          </div>
        </div>

        {/* Content Section */}
        {loading ? (
          <div className="flex justify-center items-center py-24">
            <div className="flex flex-col items-center gap-3">
              <i className="ph-bold ph-spinner-gap animate-spin text-4xl text-indigo-600"></i>
              <span className="text-sm font-bold text-slate-400">Đang tải danh sách...</span>
            </div>
          </div>
        ) : courses.length === 0 ? (
          <div className="bg-white border border-slate-100 rounded-3xl p-16 text-center shadow-sm max-w-xl mx-auto mt-10">
            <div className="w-20 h-20 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center text-3xl mx-auto mb-6"><i className="ph-bold ph-folder-open"></i></div>
            <h3 className="text-xl font-bold text-slate-700 mb-2">Bạn chưa có khóa học nào</h3>
            <p className="text-slate-400 text-sm mb-8 font-medium">Bắt đầu tạo khóa học đầu tiên để tiếp cận hàng ngàn học viên trực tuyến.</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-sm shadow-md transition-all"
            >
              Tạo khóa học ngay
            </button>
          </div>
        ) : (
          <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h3 className="font-extrabold text-slate-700 text-sm">Danh sách khóa học ({courses.length})</h3>
            </div>
            
            <div className="divide-y divide-slate-100">
              {courses.map((course) => (
                <div
                  key={course.id}
                  className="p-6 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 hover:bg-slate-50/40 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2.5 mb-2.5">
                      <h4 className="text-base font-black text-slate-800 truncate hover:text-indigo-600 transition-colors">
                        <Link href={`/instructor/courses/${course.id}`}>{course.tieu_de}</Link>
                      </h4>
                      {renderStatusBadge(course)}
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-bold text-slate-400">
                      <span className="text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
                        {formatPrice(course.gia_tien)}
                      </span>
                      <span className="flex items-center gap-1">
                        <i className="ph-fill ph-star text-amber-400 text-sm"></i> {parseFloat(course.danh_gia_trung_binh).toFixed(1)}
                      </span>
                      <button 
                        onClick={() => loadStudents(course)}
                        className="flex items-center gap-1 text-slate-400 hover:text-indigo-600 transition-colors hover:underline"
                      >
                        <i className="ph-fill ph-users text-sm text-slate-400"></i> {course.so_luong_hoc_vien || 0} Học viên
                      </button>
                      <span className="flex items-center gap-1">
                        <i className="ph-fill ph-calendar-blank text-sm"></i> {new Date(course.ngay_tao).toLocaleDateString("vi-VN")}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 w-full lg:w-auto shrink-0">
                    {renderActionButton(course)}
                    <Link
                      href={`/instructor/courses/${course.id}`}
                      className="flex-1 lg:flex-none px-5 py-2 bg-indigo-50 hover:bg-indigo-100/80 text-indigo-600 rounded-xl text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5"
                    >
                      Quản lý <i className="ph-bold ph-arrow-right text-xs"></i>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modern Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[100] flex justify-center items-center p-4 bg-slate-900/40 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) setShowCreateModal(false); }}>
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 md:p-8 border border-slate-100 shadow-2xl animate-scale-up">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                <i className="ph-bold ph-plus-circle text-indigo-600"></i> Tạo khóa học mới
              </h2>
              <button onClick={() => setShowCreateModal(false)} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-50 text-slate-400 transition-colors"><i className="ph-bold ph-x"></i></button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-600 uppercase tracking-wider mb-2">Tiêu đề *</label>
                <input 
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 outline-none transition-all font-medium text-sm text-slate-800" 
                  value={newCourse.tieu_de} 
                  onChange={(e) => setNewCourse({ ...newCourse, tieu_de: e.target.value })} 
                  placeholder="Nhập tiêu đề khóa học..." 
                />
              </div>
              
              <div>
                <label className="block text-xs font-black text-slate-600 uppercase tracking-wider mb-2">Mô tả</label>
                <textarea 
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 outline-none transition-all font-medium text-sm text-slate-800 min-h-[90px] resize-y" 
                  value={newCourse.mo_ta} 
                  onChange={(e) => setNewCourse({ ...newCourse, mo_ta: e.target.value })} 
                  placeholder="Mô tả tóm tắt nội dung..." 
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-600 uppercase tracking-wider mb-2">Giá (VNĐ)</label>
                  <input 
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 outline-none transition-all font-bold text-sm text-slate-800" 
                    type="number" 
                    value={newCourse.gia_tien} 
                    onChange={(e) => setNewCourse({ ...newCourse, gia_tien: e.target.value })} 
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-600 uppercase tracking-wider mb-2">Trình độ</label>
                  <select 
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 outline-none transition-all font-bold text-sm text-slate-700 cursor-pointer" 
                    value={newCourse.trinh_do} 
                    onChange={(e) => setNewCourse({ ...newCourse, trinh_do: e.target.value })}
                  >
                    <option value="beginner">Cơ bản</option>
                    <option value="intermediate">Trung cấp</option>
                    <option value="advanced">Nâng cao</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-black text-slate-600 uppercase tracking-wider mb-2">Danh mục</label>
                <select 
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 outline-none transition-all font-bold text-sm text-slate-700 cursor-pointer" 
                  value={newCourse.ma_danh_muc} 
                  onChange={(e) => setNewCourse({ ...newCourse, ma_danh_muc: parseInt(e.target.value) })}
                >
                  <option value={0}>Chọn danh mục</option>
                  {categories.map((c) => (<option key={c.id} value={c.id}>{c.ten_danh_muc}</option>))}
                </select>
              </div>
            </div>
            
            <div className="flex gap-3 mt-8 justify-end">
              <button 
                onClick={() => setShowCreateModal(false)} 
                className="px-5 py-2.5 rounded-xl font-bold text-sm text-slate-400 hover:bg-slate-50 transition-colors"
              >
                Hủy
              </button>
              <button 
                onClick={createCourse} 
                disabled={creating || !newCourse.tieu_de} 
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-sm transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {creating ? <><i className="ph-bold ph-spinner-gap animate-spin"></i> Đang tạo</> : "Tạo khóa học"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modern Student list modal */}
      {showStudentsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) setShowStudentsModal(false); }}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden animate-scale-up flex flex-col max-h-[75vh]" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
              <h3 className="text-base font-black text-slate-700 flex items-center gap-2">
                <i className="ph-fill ph-users text-indigo-600 text-lg"></i> 
                Học viên đăng ký
              </h3>
              <button 
                onClick={() => setShowStudentsModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-200/50 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <i className="ph-bold ph-x text-sm"></i>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <h4 className="font-extrabold text-sm text-slate-800 mb-4 bg-indigo-50/50 px-3 py-2 rounded-xl border border-indigo-100/50 truncate">
                {selectedCourseForStudents?.tieu_de}
              </h4>
              
              {loadingStudents ? (
                <div className="flex justify-center py-10">
                  <i className="ph-bold ph-spinner-gap animate-spin text-2xl text-indigo-600"></i>
                </div>
              ) : courseStudents.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-slate-200 rounded-2xl">
                  <i className="ph-fill ph-users text-3xl text-slate-300 mb-2"></i>
                  <p className="text-slate-400 text-xs font-bold">Chưa có học viên nào đăng ký khóa học này.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {courseStudents.map(student => (
                    <div key={student.id} className="flex items-center gap-3 p-3 border border-slate-100 rounded-xl bg-slate-50/30 hover:border-indigo-500/20 hover:bg-indigo-50/10 transition-all">
                      <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs overflow-hidden shrink-0">
                        {student.avatar_url ? (
                          <img src={student.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          student.ho_ten.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="overflow-hidden">
                        <p className="font-extrabold text-slate-700 text-xs truncate">{student.ho_ten}</p>
                        <p className="text-[10px] text-slate-400 font-medium truncate">{student.email}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
