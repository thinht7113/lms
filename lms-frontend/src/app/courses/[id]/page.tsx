"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useUser } from "@/context/user-context";
import { apiFetch, formatPrice, formatDuration, levelLabel } from "@/lib/api";
import Link from "next/link";

interface LessonContent {
  id: number;
  loai_noi_dung: string;
  noi_dung_text: string | null;
}

interface Lesson {
  id: number;
  tieu_de: string;
  thoi_luong: number;
  thu_tu: number;
  xem_truoc: boolean;
  da_xuat_ban: boolean;
  noi_dung: LessonContent[];
}

interface Section {
  id: number;
  tieu_de: string;
  thu_tu: number;
  bai_hoc: Lesson[];
}

interface Review {
  id: number;
  so_sao: number;
  binh_luan: string | null;
  ngay_tao: string;
  nguoi_dung: { id: number; ho_ten: string } | null;
}

interface CourseDetail {
  id: number;
  tieu_de: string;
  mo_ta: string | null;
  gia_tien: string;
  trinh_do: string;
  da_xuat_ban: boolean;
  danh_gia_trung_binh: string;
  ma_giang_vien: number | null;
  chuong_hoc: Section[];
  danh_gia_khoa_hoc: Review[];
}

export default function CourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { role, token, user, isAuthenticated, refreshCartCount } = useUser();
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrolled, setEnrolled] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set());

  const courseId = params.id as string;

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await apiFetch(`/courses/${courseId}`, token);
        if (res.ok) setCourse(await res.json());
      } catch (e) { console.error(e); }

      // Check enrollment
      if (token && role === "student") {
        try {
          const eRes = await apiFetch("/enrollments/my-courses", token);
          if (eRes.ok) {
            const myCourses = await eRes.json();
            setEnrolled(myCourses.some((c: { id: number }) => c.id === parseInt(courseId)));
          }
        } catch { /* ignore */ }
      }
      setLoading(false);
    };
    load();
  }, [courseId, token, role]);

  useEffect(() => {
    if (course) {
      if (course.chuong_hoc.length > 0) {
        setExpandedSections(new Set([course.chuong_hoc[0].id]));
      }
    }
  }, [course]);

  const toggleSection = (id: number) => {
    setExpandedSections((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const handleAddToCart = async () => {
    if (!token) { router.push("/login"); return; }
    setAddingToCart(true);
    try {
      const res = await apiFetch("/cart/items", token, {
        method: "POST",
        body: JSON.stringify({ ma_khoa_hoc: parseInt(courseId) }),
      });
      if (res.ok) {
        await refreshCartCount();
        router.push("/cart");
      } else {
        const err = await res.json();
        alert(err.detail || "Lỗi thêm vào giỏ hàng");
      }
    } catch (e) { alert("Lỗi kết nối"); }
    setAddingToCart(false);
  };

  if (loading) return (
    <div className="flex justify-center items-center h-64 text-on-surface-variant">
      <i className="ph ph-spinner-gap animate-spin text-3xl text-primary mr-2"></i> Đang tải thông tin khóa học...
    </div>
  );

  if (!course) return (
    <div className="flex flex-col justify-center items-center h-64 text-center">
      <div className="text-5xl mb-4">😔</div>
      <p className="text-on-surface-variant mb-4">Không tìm thấy khóa học này</p>
      <Link href="/" className="px-4 py-2 bg-primary text-on-primary rounded-lg font-medium hover:bg-primary/90 transition-colors">
        Về trang chủ
      </Link>
    </div>
  );

  const isInstructor = role === "instructor" && course.ma_giang_vien === user?.id;
  const totalLessons = course.chuong_hoc.reduce((sum, s) => sum + s.bai_hoc.length, 0);
  const totalDuration = course.chuong_hoc.reduce((sum, s) => sum + s.bai_hoc.reduce((a, l) => a + l.thoi_luong, 0), 0);

  return (
    <div className="animate-slide-up space-y-8 pb-12">
      {/* LUXURY HERO BANNER */}
      <div className="relative w-full min-h-[340px] rounded-3xl overflow-hidden border border-outline-variant/30 shadow-xl bg-surface-container-highest">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/90 via-primary to-secondary/90 z-0"></div>
        <div className="absolute top-0 right-0 w-full h-full overflow-hidden z-0 pointer-events-none">
          <div className="absolute -top-20 -right-20 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/4 w-64 h-64 bg-black/10 rounded-full blur-3xl"></div>
          <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: "radial-gradient(#fff 1px, transparent 1px)", backgroundSize: "24px 24px" }}></div>
        </div>
        
        <div className="relative z-10 w-full h-full p-8 md:p-12 flex flex-col justify-center">
          <nav className="flex items-center gap-2 text-sm text-white/70 mb-6 font-medium">
            <Link href="/" className="hover:text-white transition-colors flex items-center gap-1">
              <i className="ph-fill ph-house"></i> Trang chủ
            </Link>
            <i className="ph-bold ph-caret-right text-xs opacity-50"></i>
            <Link href="/courses" className="hover:text-white transition-colors">Bách khoa</Link>
            <i className="ph-bold ph-caret-right text-xs opacity-50"></i>
            <span className="text-white truncate max-w-[200px]" title={course.tieu_de}>{course.tieu_de}</span>
          </nav>
          
          <div className="flex gap-3 mb-6">
            <span className="px-4 py-1.5 bg-white/20 text-white backdrop-blur-md text-xs font-black uppercase tracking-wider rounded-lg border border-white/20 shadow-sm">
              {levelLabel(course.trinh_do)}
            </span>
            {isInstructor && (
              <span className={`px-4 py-1.5 backdrop-blur-md text-xs font-black uppercase tracking-wider rounded-lg border shadow-sm ${course.da_xuat_ban ? 'bg-success/20 text-white border-success/30' : 'bg-warning/20 text-white border-warning/30'}`}>
                {course.da_xuat_ban ? "Đã xuất bản" : "Bản nháp"}
              </span>
            )}
          </div>
          
          <h1 className="text-4xl md:text-5xl font-black text-white leading-tight mb-4 max-w-3xl drop-shadow-md">
            {course.tieu_de}
          </h1>
          <p className="text-lg text-white/90 leading-relaxed mb-8 max-w-3xl font-medium">
            {course.mo_ta}
          </p>
          
          <div className="flex flex-wrap gap-6 text-sm text-white/90">
            <span className="flex items-center gap-2 bg-black/20 px-4 py-2 rounded-xl backdrop-blur-sm border border-white/10">
              <i className="ph-fill ph-star text-warning text-xl drop-shadow"></i> 
              <span className="font-bold text-white text-base">{parseFloat(course.danh_gia_trung_binh).toFixed(1)}</span>
            </span>
            <span className="flex items-center gap-2 bg-black/20 px-4 py-2 rounded-xl backdrop-blur-sm border border-white/10">
              <i className="ph-fill ph-book-open text-white/80 text-xl"></i> 
              <span className="font-bold text-white">{totalLessons}</span> bài học
            </span>
            <span className="flex items-center gap-2 bg-black/20 px-4 py-2 rounded-xl backdrop-blur-sm border border-white/10">
              <i className="ph-fill ph-clock text-white/80 text-xl"></i> 
              <span className="font-bold text-white">{formatDuration(totalDuration)}</span>
            </span>
            <span className="flex items-center gap-2 bg-black/20 px-4 py-2 rounded-xl backdrop-blur-sm border border-white/10">
              <i className="ph-fill ph-folders text-white/80 text-xl"></i> 
              <span className="font-bold text-white">{course.chuong_hoc.length}</span> chương
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8 items-start">
        {/* ===== LEFT: Course Content ===== */}
        <div className="space-y-8">
          {/* Syllabus */}
          <div>
            <h2 className="text-2xl font-black text-on-surface mb-6 flex items-center gap-2">
              <i className="ph-fill ph-list-dashes text-primary"></i> Đề cương khóa học
            </h2>
            {course.chuong_hoc.length === 0 ? (
              <div className="glass-panel p-12 text-center rounded-3xl text-on-surface-variant border border-outline-variant bg-surface-container/50">
                <i className="ph-fill ph-empty text-5xl mb-4 opacity-50"></i>
                <p className="font-medium">Khóa học này chưa có nội dung bài giảng.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {course.chuong_hoc.sort((a, b) => a.thu_tu - b.thu_tu).map((section) => (
                  <div key={section.id} className="glass-panel rounded-2xl overflow-hidden border border-outline-variant/60 bg-surface/80 hover:border-primary/30 transition-colors shadow-sm">
                    <button
                      onClick={() => toggleSection(section.id)}
                      className="w-full px-6 py-5 flex justify-between items-center bg-transparent hover:bg-surface-container-low transition-colors"
                    >
                      <span className="font-bold text-on-surface flex items-center gap-3 text-lg">
                        <i className={`ph-fill ${expandedSections.has(section.id) ? 'ph-folder-open text-primary' : 'ph-folder text-on-surface-variant'}`}></i> 
                        {section.tieu_de}
                      </span>
                      <span className="flex items-center gap-3 text-sm text-on-surface-variant font-medium bg-surface-container px-3 py-1.5 rounded-lg">
                        {section.bai_hoc.length} bài
                        <i className={`ph-bold ph-caret-down transition-transform ${expandedSections.has(section.id) ? "rotate-180 text-primary" : ""}`}></i>
                      </span>
                    </button>
                    
                    {expandedSections.has(section.id) && (
                      <div className="border-t border-outline-variant/60 bg-surface-container-lowest">
                        {section.bai_hoc.sort((a, b) => a.thu_tu - b.thu_tu).map((lesson, idx) => (
                          <div
                            key={lesson.id}
                            className={`px-6 py-4 pl-12 flex justify-between items-center text-sm hover:bg-surface-container-low transition-colors ${idx !== section.bai_hoc.length - 1 ? 'border-b border-outline-variant/40' : ''}`}
                          >
                            <span className="flex items-center gap-3">
                              {lesson.xem_truoc ? (
                                <i className="ph-fill ph-play-circle text-primary text-xl"></i>
                              ) : (
                                <i className="ph-fill ph-lock-key text-on-surface-variant/70 text-xl"></i>
                              )}
                              <span className={`font-semibold text-base ${!lesson.da_xuat_ban ? "text-on-surface-variant line-through" : "text-on-surface"}`}>
                                {lesson.tieu_de}
                              </span>
                              
                              {!lesson.da_xuat_ban && (
                                <span className="text-[10px] bg-surface-container-high text-on-surface-variant px-2 py-1 rounded font-black uppercase">Nháp</span>
                              )}
                              {lesson.xem_truoc && lesson.da_xuat_ban && (
                                <span className="text-[10px] bg-primary/10 text-primary border border-primary/20 px-2 py-1 rounded font-black uppercase">Học thử</span>
                              )}
                            </span>
                            <span className="text-xs text-on-surface-variant font-bold bg-surface-container px-3 py-1.5 rounded-lg border border-outline-variant/50">
                              {formatDuration(lesson.thoi_luong)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Reviews */}
          {course.danh_gia_khoa_hoc.length > 0 && (
            <div className="pt-4">
              <h2 className="text-2xl font-black text-on-surface mb-6 flex items-center gap-2">
                <i className="ph-fill ph-star text-warning"></i> Đánh giá từ học viên
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                {course.danh_gia_khoa_hoc.map((r) => (
                  <div key={r.id} className="glass-panel p-6 rounded-2xl border border-outline-variant/60 bg-surface/80 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary-container text-on-primary-container flex items-center justify-center font-black text-sm">
                          {(r.nguoi_dung?.ho_ten || "Ẩn danh").charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-sm text-on-surface">{r.nguoi_dung?.ho_ten || "Ẩn danh"}</div>
                          <div className="text-xs text-on-surface-variant mt-0.5">{new Date(r.ngay_tao).toLocaleDateString("vi-VN")}</div>
                        </div>
                      </div>
                      <span className="text-warning text-sm flex gap-0.5 bg-warning/10 px-2 py-1 rounded border border-warning/20">
                        {Array(5).fill(0).map((_, i) => (
                          <i key={i} className={i < r.so_sao ? "ph-fill ph-star" : "ph-fill ph-star text-warning/20"}></i>
                        ))}
                      </span>
                    </div>
                    {r.binh_luan && <p className="text-sm text-on-surface-variant leading-relaxed font-medium">{r.binh_luan}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ===== RIGHT: Action Panel ===== */}
        <div>
          <div className="glass-panel rounded-3xl p-8 border border-outline-variant/60 shadow-2xl sticky top-24 bg-surface/90 backdrop-blur-xl">
            <div className="mb-2">
              <span className="text-[10px] font-black uppercase tracking-wider px-3 py-1 bg-primary/10 text-primary rounded-lg border border-primary/20">
                Chi phí đầu tư
              </span>
            </div>
            <div className="text-4xl font-black text-on-surface mb-2 tracking-tight">
              {parseFloat(course.gia_tien) > 0 ? formatPrice(parseFloat(course.gia_tien)) : "Miễn phí"}
            </div>
            <p className="text-sm text-on-surface-variant mb-8 flex items-center gap-2 font-medium bg-surface-container px-3 py-2 rounded-lg">
              <i className="ph-fill ph-shield-check text-secondary text-lg"></i> Thanh toán một lần, trọn đời
            </p>

            {/* CTA Button */}
            {!isAuthenticated && (
              <Link
                href="/login"
                className="w-full py-4 bg-primary hover:bg-primary/90 text-on-primary rounded-xl font-bold text-base transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 hover:scale-[1.02]"
              >
                <i className="ph-bold ph-sign-in text-xl"></i> Đăng nhập để mua
              </Link>
            )}
            
            {role === "student" && !enrolled && (
              <button
                onClick={handleAddToCart}
                disabled={addingToCart}
                className="w-full py-4 bg-primary hover:bg-primary/90 text-on-primary rounded-xl font-bold text-base transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 group hover:scale-[1.02]"
              >
                {addingToCart ? (
                  <><i className="ph-bold ph-spinner-gap animate-spin text-xl"></i> Đang xử lý...</>
                ) : (
                  <><i className="ph-bold ph-shopping-cart text-xl group-hover:-rotate-12 transition-transform"></i> Thêm vào giỏ hàng</>
                )}
              </button>
            )}
            
            {role === "student" && enrolled && (
              <Link
                href={`/learn/${courseId}`}
                className="w-full py-4 bg-secondary hover:bg-secondary/90 text-on-secondary rounded-xl font-bold text-base transition-all shadow-lg shadow-secondary/20 flex items-center justify-center gap-2 hover:scale-[1.02]"
              >
                <i className="ph-fill ph-play-circle text-xl"></i> Vào học ngay
              </Link>
            )}
            
            {isInstructor && (
              <Link
                href={`/instructor/courses/${courseId}`}
                className="w-full py-4 bg-tertiary hover:bg-tertiary/90 text-on-tertiary rounded-xl font-bold text-base transition-all shadow-lg shadow-tertiary/20 flex items-center justify-center gap-2 hover:scale-[1.02]"
              >
                <i className="ph-fill ph-pencil-simple text-xl"></i> Quản lý nội dung
              </Link>
            )}

            {/* Course Stats List */}
            <div className="mt-8 flex flex-col gap-4 pt-8 border-t border-outline-variant/60">
              <h3 className="font-bold text-on-surface mb-2">Thông tin thêm</h3>
              {[
                { icon: "ph-folders", color: "text-tertiary", label: "Chương học", value: `${course.chuong_hoc.length} chương` },
                { icon: "ph-book-open", color: "text-primary", label: "Bài giảng", value: `${totalLessons} bài` },
                { icon: "ph-clock", color: "text-secondary", label: "Thời lượng", value: formatDuration(totalDuration) },
                { icon: "ph-chart-bar", color: "text-on-surface", label: "Trình độ", value: levelLabel(course.trinh_do) },
                { icon: "ph-certificate", color: "text-success", label: "Chứng chỉ", value: "Hoàn thành" },
              ].map((s) => (
                <div key={s.label} className="flex justify-between items-center text-sm bg-surface-container-lowest p-3 rounded-xl border border-outline-variant/30">
                  <span className="text-on-surface-variant flex items-center gap-2.5 font-medium">
                    <div className={`w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center ${s.color}`}>
                      <i className={`ph-fill ${s.icon} text-lg`}></i>
                    </div> 
                    {s.label}
                  </span>
                  <span className="font-bold text-on-surface">{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
