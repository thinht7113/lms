"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Star, Clock, Video, FileText, CheckCircle2, ChevronDown, ChevronUp, PlayCircle, Lock, Users, Activity, ShoppingCart, RefreshCw } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { apiService, CourseDetail, tokenHelper } from "@/services/api";
import { useToast } from "@/contexts/ToastContext";

export default function CourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const courseId = Number(params.id);

  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Accordion state cho Syllabus
  const [expandedSections, setExpandedSections] = useState<number[]>([]);

  useEffect(() => {
    setCurrentUser(tokenHelper.getCurrentUser());
  }, []);

  useEffect(() => {
    async function loadData() {
      if (!courseId) return;
      setIsLoading(true);
      try {
        const data = await apiService.getCourseDetail(courseId);
        setCourse(data);
        if (data && data.chuong_hoc && data.chuong_hoc.length > 0) {
          // Mở sẵn chương đầu tiên
          setExpandedSections([data.chuong_hoc[0].id]);
        }
      } catch (err) {
        toast.error("Lỗi khi tải dữ liệu khóa học");
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [courseId, toast]);

  const toggleSection = (sectionId: number) => {
    setExpandedSections(prev =>
      prev.includes(sectionId) ? prev.filter(id => id !== sectionId) : [...prev, sectionId]
    );
  };

  const handleAddToCart = async () => {
    setIsAddingToCart(true);
    try {
        await apiService.addToCart(courseId);
        toast.success("Đã thêm vào giỏ hàng!");
        window.dispatchEvent(new Event("lumina-cart-updated"));
    } catch (err: any) {
        toast.error(err.message || "Vui lòng đăng nhập để thêm vào giỏ hàng");
    } finally {
        setIsAddingToCart(false);
    }
  };

  const handleBuyNow = async () => {
    setIsAddingToCart(true);
    try {
        await apiService.addToCart(courseId);
        window.dispatchEvent(new Event("lumina-cart-updated"));
        router.push("/cart");
    } catch (err: any) {
        if (typeof err.message === "string" && err.message.includes("giỏ hàng")) {
            router.push("/cart");
            return;
        }
        toast.error(err.message || "Không thể mua khóa học này");
    } finally {
        setIsAddingToCart(false);
    }
  };

  const handleSubmitReview = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!tokenHelper.getToken()) {
      router.push("/login");
      return;
    }

    setIsSubmittingReview(true);
    try {
      const review = await apiService.createCourseReview(courseId, {
        so_sao: reviewRating,
        binh_luan: reviewComment.trim() || undefined,
      });
      setCourse((prev) => prev ? {
        ...prev,
        danh_gia_khoa_hoc: [review, ...(prev.danh_gia_khoa_hoc || [])],
      } : prev);
      setReviewComment("");
      setReviewRating(5);
      toast.success("Đã gửi đánh giá khóa học");
    } catch (err: any) {
      toast.error(err.message || "Không thể gửi đánh giá");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  if (isLoading) {
    return (
        <div className="min-h-screen bg-background flex flex-col">
            <Navbar />
            <div className="flex-1 flex items-center justify-center">
                <RefreshCw className="w-10 h-10 animate-spin text-primary" />
            </div>
            <Footer />
        </div>
    );
  }

  if (!course) {
    return (
        <div className="min-h-screen bg-background flex flex-col">
            <Navbar />
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
                <h1 className="text-2xl font-black">Không tìm thấy khóa học</h1>
                <button onClick={() => router.push("/courses")} className="text-primary hover:underline">Quay lại danh sách</button>
            </div>
            <Footer />
        </div>
    );
  }

  // Thống kê nháp
  const totalLessons = course.chuong_hoc?.reduce((acc, sec) => acc + (sec.bai_hoc?.length || 0), 0) || 0;
  const totalDuration = course.chuong_hoc?.reduce((acc, sec) => acc + (sec.bai_hoc?.reduce((accL, less) => accL + (less.thoi_luong || 0), 0) || 0), 0) || 0;
  const hours = Math.floor(totalDuration / 3600);
  const minutes = Math.floor((totalDuration % 3600) / 60);
  const isOwnCourse = Boolean(currentUser && course.ma_giang_vien === currentUser.id);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      {/* Hero Section */}
      <section className="bg-slate-900 text-white pt-32 pb-16 relative overflow-hidden">
        <div className="absolute inset-0 bg-primary/10 mix-blend-overlay"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-12">

            {/* Left Content */}
            <div className="lg:col-span-2 space-y-6">
                <div className="flex items-center gap-3 text-sm font-bold tracking-widest uppercase">
                    <span className="text-primary/90">ID: {course.ma_danh_muc}</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-white/30"></span>
                    <span className="text-white/80">{course.trinh_do === 'beginner' ? 'Cơ bản' : course.trinh_do === 'intermediate' ? 'Trung cấp' : 'Chuyên sâu'}</span>
                </div>

                <h1 className="text-4xl lg:text-5xl font-black leading-tight tracking-tight">
                    {course.tieu_de}
                </h1>

                <p className="text-lg text-white/70 leading-relaxed font-medium max-w-3xl">
                    {course.mo_ta || "Khóa học này sẽ cung cấp cho bạn những kỹ năng và kiến thức thực tiễn nhất để áp dụng ngay vào công việc."}
                </p>

                <div className="flex flex-wrap items-center gap-6 pt-4">
                    <div className="flex items-center gap-2">
                        <div className="flex items-center text-amber-400">
                            <span className="font-bold mr-1.5">{Number(course.danh_gia_trung_binh).toFixed(1)}</span>
                            <Star className="w-4 h-4 fill-current" />
                        </div>
                        <span className="text-white/50 text-sm">({course.danh_gia_khoa_hoc?.length || 0} đánh giá)</span>
                    </div>
                    <div className="flex items-center gap-2 text-white/70 text-sm">
                        <Users className="w-4 h-4" />
                        <span>{course.so_luong_hoc_vien.toLocaleString()} Học viên</span>
                    </div>
                </div>

                <div className="text-white/50 text-sm pt-4 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white font-black text-xs">
                        GV
                    </div>
                    <span>Tạo bởi <strong className="text-white">Giảng viên ID: {course.ma_giang_vien}</strong> • Cập nhật cuối {new Date(course.ngay_tao).toLocaleDateString('vi-VN')}</span>
                </div>
            </div>

            {/* Right Card (Floating on desktop) */}
            <div className="lg:col-span-1 lg:-mt-8">
                <div className="bg-card text-card-foreground rounded-3xl p-6 shadow-2xl border border-border/60 sticky top-28">
                    {/* Thumbnail */}
                    <div className="aspect-video bg-secondary rounded-2xl mb-6 overflow-hidden relative group">
                        {course.anh_dai_dien ? (
                            <img src={course.anh_dai_dien} alt={course.tieu_de} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        ) : (
                            <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-primary flex items-center justify-center">
                                <PlayCircle className="w-16 h-16 text-white/50" />
                            </div>
                        )}
                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                <PlayCircle className="w-8 h-8 text-white fill-white" />
                            </div>
                        </div>
                    </div>

                    {/* Price & Actions */}
                    <div className="space-y-6">
                        <div className="flex items-baseline gap-3">
                            <span className="text-4xl font-black text-foreground">{Number(course.gia_tien) === 0 ? "Miễn phí" : `${Number(course.gia_tien).toLocaleString()} đ`}</span>
                        </div>

                        {isOwnCourse ? (
                            <div className="space-y-3">
                                <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm font-bold leading-6 text-blue-800">
                                    Đây là khóa học do bạn giảng dạy. Bạn có thể quản lý nội dung trong kênh giảng viên thay vì mua khóa học này.
                                </div>
                                <button
                                    onClick={() => router.push("/instructor/dashboard")}
                                    className="w-full bg-primary hover:bg-blue-700 text-white py-4 rounded-xl font-black tracking-widest uppercase text-sm shadow-lg shadow-primary/20 transition-all"
                                >
                                    Vào kênh giảng viên
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <button
                                    onClick={handleAddToCart}
                                    disabled={isAddingToCart}
                                    className="w-full bg-primary hover:bg-blue-700 text-white py-4 rounded-xl font-black tracking-widest uppercase text-sm shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isAddingToCart ? (
                                        <RefreshCw className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <ShoppingCart className="w-5 h-5" />
                                    )}
                                    <span>Thêm vào giỏ</span>
                                </button>
                                <button
                                    onClick={handleBuyNow}
                                    disabled={isAddingToCart}
                                    className="w-full bg-secondary hover:bg-secondary/70 text-foreground py-4 rounded-xl font-black tracking-widest uppercase text-sm transition-all border border-border/60 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Mua ngay
                                </button>
                            </div>
                        )}

                        <div className="pt-6 border-t border-border/60 space-y-3">
                            <p className="font-bold text-sm">Khóa học này bao gồm:</p>
                            <ul className="space-y-2 text-sm text-muted-foreground">
                                <li className="flex items-center gap-3"><Video className="w-4 h-4 text-primary" /> {hours} giờ {minutes} phút video bài giảng</li>
                                <li className="flex items-center gap-3"><FileText className="w-4 h-4 text-primary" /> Bài viết & Tài liệu đính kèm</li>
                                <li className="flex items-center gap-3"><Activity className="w-4 h-4 text-primary" /> Truy cập mọi lúc, mọi nơi</li>
                                <li className="flex items-center gap-3"><CheckCircle2 className="w-4 h-4 text-primary" /> Cấp chứng chỉ hoàn thành</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 grid grid-cols-1 lg:grid-cols-3 gap-12 flex-1 w-full">
        <div className="lg:col-span-2 space-y-12">

            {/* What you'll learn */}
            <div className="bg-emerald-50/50 border border-emerald-100 p-8 rounded-3xl">
                <h2 className="text-2xl font-black tracking-tight mb-6">Bạn sẽ học được gì?</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                    <div className="flex gap-3 text-sm font-medium"><CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" /> Hiểu rõ các nguyên lý cốt lõi của khóa học này.</div>
                    <div className="flex gap-3 text-sm font-medium"><CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" /> Có khả năng áp dụng thực tế vào dự án.</div>
                    <div className="flex gap-3 text-sm font-medium"><CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" /> Được hướng dẫn từng bước (Step-by-step).</div>
                    <div className="flex gap-3 text-sm font-medium"><CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" /> Cơ hội nhận chứng chỉ hoàn thành khóa học.</div>
                </div>
            </div>

            {/* Curriculum */}
            <div>
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-black tracking-tight">Nội dung khóa học</h2>
                    <span className="text-sm font-medium text-muted-foreground">{course.chuong_hoc?.length || 0} phần • {totalLessons} bài học</span>
                </div>

                <div className="border border-border/60 rounded-3xl overflow-hidden bg-card shadow-sm">
                    {course.chuong_hoc && course.chuong_hoc.length > 0 ? (
                        course.chuong_hoc.map((section: any, idx: number) => {
                            const isExpanded = expandedSections.includes(section.id);
                            return (
                                <div key={section.id} className="border-b border-border/60 last:border-b-0">
                                    <button
                                        onClick={() => toggleSection(section.id)}
                                        className="w-full flex items-center justify-between p-5 bg-secondary/30 hover:bg-secondary/80 transition-colors text-left"
                                    >
                                        <div className="flex items-center gap-4">
                                            {isExpanded ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
                                            <h3 className="font-bold text-base">Phần {idx + 1}: {section.tieu_de}</h3>
                                        </div>
                                        <span className="text-xs font-medium text-muted-foreground hidden sm:block">
                                            {section.bai_hoc?.length || 0} bài học
                                        </span>
                                    </button>

                                    {/* Lessons List */}
                                    {isExpanded && (
                                        <div className="bg-card">
                                            {section.bai_hoc && section.bai_hoc.length > 0 ? (
                                                <div className="divide-y divide-border/40">
                                                    {section.bai_hoc.map((lesson: any, lIdx: number) => (
                                                        <div key={lesson.id} className="flex items-center justify-between p-4 pl-14 hover:bg-slate-50/50 transition-colors group">
                                                            <div className="flex items-center gap-4">
                                                                {lesson.xem_truoc ? (
                                                                    <PlayCircle className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
                                                                ) : (
                                                                    <Lock className="w-4 h-4 text-muted-foreground/50" />
                                                                )}
                                                                <div>
                                                                    <span className={`text-sm ${lesson.xem_truoc ? 'font-bold text-primary hover:underline cursor-pointer' : 'font-medium text-foreground'}`}>
                                                                        {lesson.tieu_de}
                                                                    </span>
                                                                    {lesson.xem_truoc && (
                                                                        <span className="ml-3 text-[10px] uppercase font-black tracking-widest bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">Học thử</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            {lesson.thoi_luong > 0 && (
                                                                <span className="text-xs text-muted-foreground">
                                                                    {Math.floor(lesson.thoi_luong / 60).toString().padStart(2, '0')}:{(lesson.thoi_luong % 60).toString().padStart(2, '0')}
                                                                </span>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="p-5 text-center text-sm text-muted-foreground">Chưa có bài học nào trong phần này.</div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    ) : (
                        <div className="p-10 text-center text-muted-foreground">
                            Khóa học này đang được cập nhật nội dung.
                        </div>
                    )}
                </div>
            </div>

            {/* Reviews */}
            <div>
                <h2 className="text-2xl font-black tracking-tight mb-6">Đánh giá từ học viên</h2>
                <form onSubmit={handleSubmitReview} className="mb-6 rounded-3xl border border-amber-100 bg-amber-50/50 p-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <p className="text-sm font-black text-slate-950">Gửi đánh giá của bạn</p>
                            <p className="mt-1 text-xs font-medium text-slate-500">Chỉ học viên đã mua khóa học mới có thể đánh giá.</p>
                        </div>
                        <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    type="button"
                                    onClick={() => setReviewRating(star)}
                                    className="rounded-lg p-1 text-amber-500 transition hover:bg-white"
                                    aria-label={`Chọn ${star} sao`}
                                >
                                    <Star className={`h-6 w-6 ${star <= reviewRating ? "fill-current" : "text-slate-300"}`} />
                                </button>
                            ))}
                        </div>
                    </div>
                    <textarea
                        value={reviewComment}
                        onChange={(event) => setReviewComment(event.target.value)}
                        maxLength={1000}
                        placeholder="Chia sẻ cảm nhận sau khi học khóa này..."
                        className="mt-4 min-h-28 w-full rounded-2xl border border-amber-100 bg-white p-4 text-sm font-medium outline-none transition focus:border-amber-300"
                    />
                    <div className="mt-4 flex justify-end">
                        <button
                            type="submit"
                            disabled={isSubmittingReview}
                            className="rounded-2xl bg-slate-950 px-6 py-3 text-xs font-black uppercase tracking-widest text-white transition hover:bg-primary disabled:opacity-50"
                        >
                            {isSubmittingReview ? "Đang gửi..." : "Gửi đánh giá"}
                        </button>
                    </div>
                </form>

                {course.danh_gia_khoa_hoc && course.danh_gia_khoa_hoc.length > 0 ? (
                    <div className="space-y-6">
                        {course.danh_gia_khoa_hoc.map((review: any) => (
                            <div key={review.id} className="bg-card border border-border/60 p-6 rounded-2xl shadow-sm">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                            {review.nguoi_dung?.ho_ten?.charAt(0) || "U"}
                                        </div>
                                        <div>
                                            <p className="font-bold text-sm">{review.nguoi_dung?.ho_ten || "Học viên ẩn danh"}</p>
                                            <p className="text-[10px] text-muted-foreground">{new Date(review.ngay_tao).toLocaleDateString('vi-VN')}</p>
                                        </div>
                                    </div>
                                    <div className="flex text-amber-500">
                                        {[...Array(5)].map((_, i) => (
                                            <Star key={i} className={`w-4 h-4 ${i < review.so_sao ? 'fill-current' : 'text-slate-300'}`} />
                                        ))}
                                    </div>
                                </div>
                                <p className="text-sm text-foreground/80 leading-relaxed">
                                    {review.binh_luan || "Học viên đã đánh giá khóa học này mà không để lại bình luận."}
                                </p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-secondary/50 border border-border/40 rounded-2xl p-8 text-center text-muted-foreground text-sm">
                        Chưa có đánh giá nào cho khóa học này. Hãy là người đầu tiên!
                    </div>
                )}
            </div>

        </div>
      </section>

      <Footer />
    </div>
  );
}
