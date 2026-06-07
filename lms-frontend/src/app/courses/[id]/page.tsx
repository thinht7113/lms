"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Star, Clock, BookOpen, ChevronDown, ChevronUp, PlayCircle, Lock, ShieldCheck, Heart, ShoppingCart, RefreshCw, AlertCircle, Award } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { apiService, CourseDetail } from "@/services/api";

export default function CourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [dbCourse, setDbCourse] = useState<CourseDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [cartLoading, setCartLoading] = useState(false);
  const [cartSuccess, setCartSuccess] = useState<string | null>(null);
  const [cartError, setCartError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDetail() {
      if (!id) return;
      setIsLoading(true);
      try {
        const detail = await apiService.getCourseDetail(Number(id));
        setDbCourse(detail);
      } catch (err) {
        console.error("Error loading course detail:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadDetail();
  }, [id]);

  const course = useMemo(() => {
    if (dbCourse) {
      return {
        id: dbCourse.id,
        title: dbCourse.tieu_de,
        description: dbCourse.mo_ta || "Không có mô tả chi tiết.",
        level: dbCourse.trinh_do === "beginner" ? "Cơ bản (Beginner)" : dbCourse.trinh_do === "intermediate" ? "Trung cấp (Intermediate)" : "Chuyên sâu (Advanced)",
        category: dbCourse.ma_danh_muc ? `Danh mục ${dbCourse.ma_danh_muc}` : "Lập trình",
        rating: Number(dbCourse.danh_gia_trung_binh) || 5.0,
        price: Number(dbCourse.gia_tien),
        originalPrice: Number(dbCourse.gia_tien) > 0 ? Number(dbCourse.gia_tien) * 1.5 : undefined,
        studentsCount: dbCourse.so_luong_hoc_vien || 120,
        thumbnail: dbCourse.anh_dai_dien,
        instructor: {
          name: "Giảng viên Nemo",
          title: "Senior Tech Specialist",
          bio: "Chuyên gia dày dặn kinh nghiệm trong việc phát triển và kiến trúc hệ thống chuẩn Enterprise."
        },
        sections: dbCourse.chuong_hoc?.map((s: any) => ({
          id: s.id,
          title: s.tieu_de,
          lessons: s.bai_hoc?.map((l: any) => ({
            id: l.id,
            title: l.tieu_de,
            duration: l.thoi_luong ? `${Math.round(l.thoi_luong / 60)} phút` : "Chưa cập nhật",
            preview: l.xem_truoc
          })) || []
        })) || [],
        reviews: dbCourse.danh_gia_khoa_hoc?.map((r: any) => ({
          id: r.id,
          name: r.nguoi_dung?.ho_ten || `Học viên #${r.ma_nguoi_dung}`,
          stars: r.so_sao,
          comment: r.binh_luan || "Không có nội dung bình luận."
        })) || []
      };
    }
    return null;
  }, [dbCourse]);

  const [openSections, setOpenSections] = useState<Record<number, boolean>>({
    1: true
  });

  const toggleSection = (sectionId: number) => {
    setOpenSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  const formatPrice = (val: number) => {
    return val === 0 ? "Miễn phí" : new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(val);
  };

  const ratingBreakdown = useMemo(() => {
    const counts = [0, 0, 0, 0, 0];
    if (course && course.reviews) {
      course.reviews.forEach((r: any) => {
        if (r.stars >= 1 && r.stars <= 5) {
          counts[r.stars - 1]++;
        }
      });
    }
    const total = (course && course.reviews?.length) || 1;
    return counts.map((count) => ({
      count,
      percentage: Math.round((count / total) * 100)
    })).reverse();
  }, [course]);

  if (isLoading) {
    return (
      <>
        <Navbar />
        <main className="flex justify-center items-center h-screen bg-background">
          <RefreshCw className="h-10 w-10 text-primary animate-spin" />
        </main>
        <Footer />
      </>
    );
  }

  if (!course) {
    return (
      <>
        <Navbar />
        <main className="max-w-2xl mx-auto px-4 pt-32 pb-20 min-h-[70vh] flex items-center justify-center">
          <div className="bg-card border border-dashed border-border rounded-[2rem] p-12 text-center space-y-6 shadow-sm">
            <AlertCircle className="h-16 w-16 text-destructive mx-auto opacity-80" />
            <div>
              <h3 className="font-black text-xl text-foreground">Không tìm thấy khóa học</h3>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">Khóa học này không tồn tại hoặc chưa được xuất bản. Vui lòng kiểm tra lại đường dẫn.</p>
            </div>
            <Link
              href="/courses"
              className="inline-block bg-primary hover:bg-blue-700 text-white rounded-xl text-xs font-bold px-8 py-3.5 transition-all shadow-lg shadow-primary/20 uppercase tracking-widest"
            >
              Trở về danh sách
            </Link>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-[#F8F9FA] pt-28 pb-20">
        {/* TOP HERO BANNER */}
        <div className="bg-slate-900 border-b border-border/20 text-white overflow-hidden relative">
           <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-transparent z-0" />
           <div className="absolute right-0 top-0 w-1/3 h-full bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.05),transparent)] z-0" />
           
           <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24 relative z-10 flex flex-col lg:flex-row gap-12 items-center">
              <div className="flex-grow space-y-6 text-center lg:text-left">
                  <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-md px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10">
                    <span>{course.category}</span>
                  </div>
                  
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tighter leading-tight drop-shadow-md">
                    {course.title}
                  </h1>
                  
                  <p className="text-slate-300 text-sm sm:text-base max-w-2xl leading-relaxed font-medium">
                    {course.description}
                  </p>

                  <div className="flex flex-wrap items-center justify-center lg:justify-start gap-6 text-xs font-bold text-slate-200">
                    <div className="flex items-center">
                      <Star className="h-4 w-4 fill-amber-400 text-amber-400 mr-1.5" />
                      <span className="text-white text-base mr-1">{course.rating.toFixed(1)}</span>
                      <span>({course.reviews?.length || 0} đánh giá)</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <Award className="h-4 w-4 text-primary" />
                      <span>{course.level}</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <Heart className="h-4 w-4 text-rose-400" />
                      <span>{course.studentsCount} học viên</span>
                    </div>
                  </div>
              </div>

              {/* FLOATING CHECKOUT CARD (Mobile visible, Desktop sticky setup in next section) */}
              <div className="w-full lg:w-96 shrink-0 lg:hidden">
                 <div className="bg-card text-card-foreground rounded-[2rem] p-6 shadow-2xl border border-border/50">
                    <div className="space-y-4">
                        <div className="flex items-baseline space-x-2">
                          <span className="text-3xl font-black text-primary tracking-tighter">{formatPrice(course.price)}</span>
                          {course.originalPrice && <span className="text-sm text-muted-foreground line-through decoration-red-500/50">{formatPrice(course.originalPrice)}</span>}
                        </div>
                        <button className="w-full bg-primary text-white font-bold py-3.5 rounded-xl text-xs uppercase tracking-widest shadow-lg shadow-primary/20">
                            Thêm vào giỏ
                        </button>
                    </div>
                 </div>
              </div>
           </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            {/* LEFT COLUMN */}
            <div className="lg:col-span-8 space-y-12">
              
              {/* Syllabus Accordion */}
              <section className="space-y-6">
                <h2 className="text-2xl font-black tracking-tight text-foreground flex items-center space-x-2">
                   <BookOpen className="w-6 h-6 text-primary" />
                   <span>Lộ trình giảng dạy</span>
                </h2>
                
                <div className="bg-card border border-border/60 rounded-[1.5rem] overflow-hidden shadow-sm">
                  {course.sections && course.sections.length > 0 ? (
                    course.sections.map((section: any, idx: number) => {
                      const isOpen = !!openSections[section.id];
                      return (
                        <div key={section.id} className={idx > 0 ? "border-t border-border/50" : ""}>
                          <button
                            onClick={() => toggleSection(section.id)}
                            className={`w-full flex items-center justify-between p-5 transition-colors ${isOpen ? 'bg-secondary/50' : 'hover:bg-secondary/30'}`}
                          >
                            <span className="text-sm font-bold text-foreground text-left leading-snug">
                              {section.title}
                            </span>
                            <div className={`p-1.5 rounded-lg bg-background border border-border/50 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            </div>
                          </button>

                          {isOpen && (
                            <div className="bg-background border-t border-border/50 divide-y divide-border/30">
                              {section.lessons && section.lessons.length > 0 ? (
                                section.lessons.map((lesson: any) => (
                                  <div key={lesson.id} className="p-4 px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-secondary/20 transition-colors">
                                    <div className="flex items-start sm:items-center space-x-3 text-sm">
                                      {lesson.preview ? (
                                        <PlayCircle className="h-4.5 w-4.5 text-primary shrink-0 mt-0.5 sm:mt-0" />
                                      ) : (
                                        <Lock className="h-4.5 w-4.5 text-muted-foreground/60 shrink-0 mt-0.5 sm:mt-0" />
                                      )}
                                      <span className={`${lesson.preview ? "text-foreground font-bold" : "text-muted-foreground font-medium"}`}>
                                        {lesson.title}
                                      </span>
                                    </div>
                                    <div className="flex items-center space-x-3 text-xs pl-7 sm:pl-0">
                                      <span className="text-muted-foreground flex items-center space-x-1">
                                          <Clock className="w-3 h-3" />
                                          <span>{lesson.duration}</span>
                                      </span>
                                      {lesson.preview && (
                                        <span className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md cursor-pointer hover:bg-emerald-500 hover:text-white transition-colors">
                                          Học thử
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <div className="p-6 text-xs text-muted-foreground italic text-center">Chưa có bài học nào.</div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-10 text-center text-sm font-medium text-muted-foreground bg-secondary/20">Chương trình học đang được Nemo biên soạn.</div>
                  )}
                </div>
              </section>

              {/* Instructor */}
              <section className="space-y-6">
                 <h2 className="text-2xl font-black tracking-tight text-foreground">Người dẫn dắt</h2>
                 <div className="bg-card border border-border/60 rounded-[2rem] p-8 flex flex-col sm:flex-row gap-6 items-center sm:items-start shadow-sm hover:shadow-md transition-shadow">
                    <img 
                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${course.instructor.name}`} 
                        alt="Instructor" 
                        className="w-24 h-24 rounded-full border-4 border-secondary shadow-sm object-cover bg-primary/5"
                    />
                    <div className="text-center sm:text-left space-y-2">
                        <h3 className="text-xl font-black text-foreground">{course.instructor.name}</h3>
                        <p className="text-[11px] font-black text-primary uppercase tracking-widest">{course.instructor.title}</p>
                        <p className="text-sm text-muted-foreground leading-relaxed mt-2">{course.instructor.bio}</p>
                    </div>
                 </div>
              </section>

              {/* Reviews */}
              <section className="space-y-6">
                <h2 className="text-2xl font-black tracking-tight text-foreground">Đánh giá học viên</h2>
                
                {/* Bento Rating Box */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-card border border-border/60 rounded-[2rem] p-8 shadow-sm">
                  <div className="flex flex-col items-center justify-center md:border-r border-border/50 pb-6 md:pb-0">
                    <p className="text-6xl font-black text-primary tracking-tighter">{course.rating.toFixed(1)}</p>
                    <div className="flex items-center text-amber-400 my-3">
                      {[...Array(5)].map((_, i) => <Star key={i} className="h-5 w-5 fill-current" />)}
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Trung bình cộng</p>
                  </div>

                  <div className="md:col-span-2 flex flex-col justify-center space-y-3">
                    {ratingBreakdown.map((row, idx) => {
                      const starsCount = 5 - idx;
                      return (
                        <div key={starsCount} className="flex items-center space-x-4 text-xs font-bold">
                          <span className="w-12 text-muted-foreground flex justify-end items-center gap-1">
                             <span>{starsCount}</span> <Star className="w-3 h-3 fill-muted-foreground" />
                          </span>
                          <div className="flex-grow h-2.5 bg-secondary rounded-full overflow-hidden">
                            <div className="h-full bg-amber-400 rounded-full" style={{ width: `${row.percentage}%` }} />
                          </div>
                          <span className="w-10 text-right text-muted-foreground">{row.percentage}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {course.reviews && course.reviews.length > 0 ? (
                    course.reviews.map((rev: any) => (
                      <div key={rev.id} className="bg-card border border-border/50 p-6 rounded-2xl shadow-sm space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-sm text-foreground">{rev.name}</h4>
                          <div className="flex items-center gap-0.5 text-amber-400">
                            {[...Array(rev.stars)].map((_, i) => <Star key={i} className="h-3 w-3 fill-current" />)}
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed italic">"{rev.comment}"</p>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full py-10 text-center bg-secondary/30 rounded-2xl border border-dashed border-border text-xs text-muted-foreground font-medium">
                        Chưa có nhận xét nào. Bạn sẽ là người đầu tiên chứ?
                    </div>
                  )}
                </div>
              </section>
            </div>

            {/* RIGHT COLUMN (STICKY DESKTOP CART) */}
            <div className="hidden lg:block lg:col-span-4">
               <div className="sticky top-28 bg-card border border-border/60 rounded-[2rem] p-6 shadow-2xl flex flex-col">
                  {/* Thumbnail / Trailer */}
                  <div className="w-full aspect-video rounded-xl bg-slate-100 overflow-hidden relative group mb-6">
                      {course.thumbnail ? (
                         <img src={course.thumbnail} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt="thumbnail" />
                      ) : (
                         <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-indigo-800" />
                      )}
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center group-hover:bg-black/40 transition-colors">
                          <PlayCircle className="w-16 h-16 text-white/90 hover:scale-110 transition-transform cursor-pointer drop-shadow-lg" />
                      </div>
                  </div>

                  <div className="space-y-6 flex-grow">
                      <div className="space-y-1">
                          <div className="flex items-center space-x-3">
                              <span className="text-3xl font-black text-primary tracking-tighter">{formatPrice(course.price)}</span>
                              {course.originalPrice && <span className="text-sm font-bold text-muted-foreground line-through decoration-red-500/60">{formatPrice(course.originalPrice)}</span>}
                          </div>
                          {course.originalPrice && (
                              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-500/10 inline-block px-2 py-1 rounded-md">
                                  Tiết kiệm {Math.round(((course.originalPrice - course.price)/course.originalPrice)*100)}%
                              </p>
                          )}
                      </div>

                      {cartSuccess && <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs font-bold rounded-xl text-center">{cartSuccess}</div>}
                      {cartError && <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs font-bold rounded-xl text-center">{cartError}</div>}

                      <div className="space-y-3">
                          <button 
                            onClick={async () => {
                              setCartError(null); setCartSuccess(null);
                              const token = localStorage.getItem("lumina_token");
                              if (!token) return router.push("/login");
                              setCartLoading(true);
                              try {
                                await apiService.addToCart(Number(id));
                                setCartSuccess("Tuyệt vời! Đã thêm vào giỏ.");
                                setTimeout(() => setCartSuccess(null), 3000);
                                window.location.reload();
                              } catch (err: any) {
                                setCartError(err.message || "Không thể thêm vào giỏ hàng.");
                              } finally {
                                setCartLoading(false);
                              }
                            }}
                            disabled={cartLoading}
                            className="w-full bg-primary hover:bg-blue-700 text-white font-black py-4 rounded-xl text-xs uppercase tracking-widest shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                          >
                             <ShoppingCart className="w-4 h-4" />
                             <span>Thêm vào giỏ</span>
                          </button>
                          
                          <button 
                            onClick={async () => {
                              setCartError(null); setCartSuccess(null);
                              const token = localStorage.getItem("lumina_token");
                              if (!token) return router.push("/login");
                              setCartLoading(true);
                              try {
                                await apiService.addToCart(Number(id));
                                router.push("/cart");
                              } catch (err: any) {
                                if (err.message.includes("đã có") || err.message.includes("exists")) router.push("/cart");
                                else setCartError(err.message || "Lỗi giao dịch.");
                              } finally { setCartLoading(false); }
                            }}
                            disabled={cartLoading}
                            className="w-full bg-secondary border border-border hover:border-primary/50 text-foreground font-black py-4 rounded-xl text-xs uppercase tracking-widest transition-all cursor-pointer disabled:opacity-50"
                          >
                             Mua ngay
                          </button>
                      </div>

                      <div className="pt-6 border-t border-border/50 space-y-4">
                          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest text-center">Khóa học bao gồm</p>
                          <ul className="space-y-3 text-xs font-medium text-foreground">
                              <li className="flex items-center gap-3"><Clock className="w-4 h-4 text-primary" /> Quyền truy cập nội dung trọn đời</li>
                              <li className="flex items-center gap-3"><BookOpen className="w-4 h-4 text-primary" /> Tài liệu đính kèm (PDF, Source Code)</li>
                              <li className="flex items-center gap-3"><ShieldCheck className="w-4 h-4 text-primary" /> Cấp chứng chỉ điện tử Nemo Certified</li>
                          </ul>
                      </div>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
