"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, BookOpen, Layers, Star, Zap, Briefcase, Building, ArrowRight, ImageIcon, ArrowUpRight } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CourseCard from "@/components/CourseCard";
import { apiService, Course, Banner, Category } from "@/services/api";

export default function HomePage() {
  // Real DB states
  const [banners, setBanners] = useState<Banner[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [affordableCourses, setAffordableCourses] = useState<Course[]>([]);
  const [popularCourses, setPopularCourses] = useState<Course[]>([]);
  const [newCourses, setNewCourses] = useState<Course[]>([]);

  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch from DB on mount
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const [bannersData, catsData, allDbCourses] = await Promise.all([
          apiService.getBanners(),
          apiService.getCategories(),
          apiService.getCourses({ limit: 1000 }) // Fetch all courses to calculate counts
        ]);

        // Lọc banner đang hiển thị và sắp xếp theo thu_tu
        setBanners(bannersData.filter(b => b.trang_thai).sort((a, b) => a.thu_tu - b.thu_tu));
        setCategories(catsData.slice(0, 8)); // Lấy 8 danh mục đầu
        setAllCourses(allDbCourses);

        if (allDbCourses.length > 0) {
          // Khóa học giá tốt dựa trên giá bán thật trong CSDL
          const affordable = [...allDbCourses]
            .filter(c => Number(c.gia_tien) > 0)
            .sort((a, b) => Number(a.gia_tien) - Number(b.gia_tien));
          setAffordableCourses(affordable.slice(0, 4));

          // Khóa học được học nhiều
          const sortedPop = [...allDbCourses].sort((a, b) => (b.so_luong_hoc_vien || 0) - (a.so_luong_hoc_vien || 0));
          setPopularCourses(sortedPop.slice(0, 4));

          // Khóa học mới xuất bản (Sắp xếp theo id giảm dần hoặc ngay_tao)
          const sortedNew = [...allDbCourses].sort((a, b) => b.id - a.id);
          setNewCourses(sortedNew.slice(0, 4));
        }
      } catch (err) {
        console.error("Error loading DB data:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  // Banner Auto Slide
  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentBannerIndex((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [banners.length]);

  const nextBanner = () => setCurrentBannerIndex((p) => (p + 1) % banners.length);
  const prevBanner = () => setCurrentBannerIndex((p) => (p - 1 + banners.length) % banners.length);

  // Helper cho CourseCard
  const getGradient = (index: number) => {
    const gradients = [
      "from-blue-600 to-indigo-700",
      "from-slate-700 to-slate-900",
      "from-teal-500 to-cyan-600",
      "from-purple-500 to-pink-600"
    ];
    return gradients[index % gradients.length];
  };

  const mapDbCourse = (c: Course, index: number) => ({
    id: c.id,
    title: c.tieu_de,
    thumbnail: c.anh_dai_dien,
    instructor: "Giảng viên chuyên gia",
    category: categories.find(cat => cat.id === c.ma_danh_muc)?.ten_danh_muc || "Lập trình",
    level: c.trinh_do,
    rating: Number(c.danh_gia_trung_binh) || 5.0,
    price: Number(c.gia_tien),
    studentsCount: c.so_luong_hoc_vien || 0,
    gradient: getGradient(index)
  });

  return (
    <>
      <Navbar />

      <main className="flex-grow bg-background pt-24 pb-20 space-y-20">

        {/* 1. BANNER SLIDER SECTION */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="relative w-full aspect-[21/9] sm:aspect-[3/1] bg-secondary rounded-3xl overflow-hidden shadow-xl border border-border/60 group">
                {banners.length > 0 ? (
                    <>
                        {banners.map((banner, idx) => (
                            <Link
                                href={banner.duong_dan || "/courses"}
                                key={banner.id}
                                className={`absolute inset-0 transition-opacity duration-1000 ${idx === currentBannerIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
                            >
                                <img
                                    src={banner.hinh_anh_url}
                                    alt={`Banner ${idx}`}
                                    loading={idx === currentBannerIndex ? "eager" : "lazy"}
                                    decoding="async"
                                    className="w-full h-full object-cover"
                                />
                            </Link>
                        ))}
                        {/* Navigation Arrows */}
                        {banners.length > 1 && (
                            <>
                                <button
                                    onClick={(e) => { e.preventDefault(); prevBanner(); }}
                                    className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/30 hover:bg-black/60 text-white rounded-full flex items-center justify-center z-20 opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm"
                                >
                                    <ChevronLeft className="w-6 h-6" />
                                </button>
                                <button
                                    onClick={(e) => { e.preventDefault(); nextBanner(); }}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/30 hover:bg-black/60 text-white rounded-full flex items-center justify-center z-20 opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm"
                                >
                                    <ChevronRight className="w-6 h-6" />
                                </button>
                            </>
                        )}
                        {/* Dots */}
                        {banners.length > 1 && (
                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 z-20">
                                {banners.map((_, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setCurrentBannerIndex(idx)}
                                        className={`w-2.5 h-2.5 rounded-full transition-all ${idx === currentBannerIndex ? 'bg-white w-6' : 'bg-white/50 hover:bg-white/80'}`}
                                    />
                                ))}
                            </div>
                        )}
                    </>
                ) : isLoading ? (
                    <div className="w-full h-full animate-pulse bg-gradient-to-br from-slate-100 to-slate-200" />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground bg-gradient-to-br from-slate-100 to-slate-200">
                        <ImageIcon className="w-12 h-12 mb-2 opacity-30" />
                        <span className="font-bold">Không có banner nào hoạt động</span>
                    </div>
                )}
            </div>
        </section>

        {/* 2. AFFORDABLE COURSES */}
        {affordableCourses.length > 0 && (
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-2xl font-black tracking-tight flex items-center gap-2">
                         Khóa học giá tốt
                    </h2>
                    <Link href="/courses?order=price-asc" className="text-sm font-bold text-primary hover:underline">Xem tất cả</Link>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {affordableCourses.map((c, i) => <CourseCard key={c.id} {...mapDbCourse(c, i)} />)}
                </div>
            </section>
        )}

        {/* 3. POPULAR COURSES */}
        {popularCourses.length > 0 && (
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-2xl font-black tracking-tight flex items-center gap-2">
                         Được học nhiều nhất
                    </h2>
                    <Link href="/courses?sort_by=popular" className="text-sm font-bold text-primary hover:underline">Xem tất cả</Link>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {popularCourses.map((c, i) => <CourseCard key={c.id} {...mapDbCourse(c, i)} />)}
                </div>
            </section>
        )}

        {/* 4. NEWEST COURSES */}
        {newCourses.length > 0 && (
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-2xl font-black tracking-tight flex items-center gap-2">
                         Mới xuất bản
                    </h2>
                    <Link href="/courses" className="text-sm font-bold text-primary hover:underline">Xem tất cả</Link>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {newCourses.map((c, i) => <CourseCard key={c.id} {...mapDbCourse(c, i)} />)}
                </div>
            </section>
        )}

        {/* 5. CATEGORIES SECTION */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-black tracking-tight mb-8">
                 Các chủ đề chuyên môn
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {categories.length > 0 ? categories.map((cat) => {
                    const courseCount = allCourses.filter(c => c.ma_danh_muc === cat.id).length;

                    return (
                        <Link
                            key={cat.id}
                            href={`/courses?ma_danh_muc=${cat.id}`}
                            className="bg-white border border-slate-200/80 hover:border-primary/40 hover:bg-slate-50/50 rounded-xl px-5 py-4 transition-all group flex items-center justify-between cursor-pointer"
                        >
                            <span className="font-bold text-slate-800 text-sm group-hover:text-primary transition-colors">{cat.ten_danh_muc}</span>
                            <div className="flex items-center gap-2 text-slate-400">
                                <span className="text-xs font-bold text-slate-400/70">{courseCount}</span>
                                <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                            </div>
                        </Link>
                    );
                }) : isLoading ? Array.from({ length: 8 }).map((_, idx) => (
                    <div key={idx} className="h-[52px] rounded-xl border border-slate-200/80 bg-white animate-pulse" />
                )) : null}
            </div>
        </section>

        {/* 6. ABOUT US SECTION */}
        <section id="about" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="bg-primary/5 border border-primary/10 rounded-[2.5rem] p-10 lg:p-16 flex flex-col lg:flex-row items-center gap-12">
                <div className="lg:w-1/2 space-y-6 text-center lg:text-left">
                    <div className="inline-flex items-center space-x-2 bg-primary/10 px-4 py-1.5 rounded-full text-[11px] font-bold text-primary uppercase tracking-widest">
                        <BookOpen className="h-4 w-4" />
                        <span>Về chúng tôi</span>
                    </div>
                    <h2 className="text-3xl sm:text-4xl font-black text-foreground tracking-tight leading-tight">
                        Kiến tạo tương lai với <br />
                        <span className="text-primary italic">Lumina LMS</span>
                    </h2>
                    <p className="text-muted-foreground font-medium leading-relaxed max-w-xl mx-auto lg:mx-0">
                        Chúng tôi tự hào là nền tảng học trực tuyến hàng đầu, kết nối hàng triệu học viên với những chuyên gia đầu ngành. Nhiệm vụ của Lumina là phá vỡ mọi rào cản giáo dục, mang tri thức chuẩn quốc tế đến với bất kỳ ai, ở bất kỳ đâu.
                    </p>
                    <div className="pt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-left">
                        <div>
                            <p className="text-3xl font-black text-foreground">1M+</p>
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">Học viên</p>
                        </div>
                        <div>
                            <p className="text-3xl font-black text-foreground">500+</p>
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">Khóa học</p>
                        </div>
                        <div>
                            <p className="text-3xl font-black text-foreground">200+</p>
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">Giảng viên</p>
                        </div>
                        <div>
                            <p className="text-3xl font-black text-foreground">4.8</p>
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">Đánh giá</p>
                        </div>
                    </div>
                </div>
                <div className="lg:w-1/2 w-full">
                    <div className="relative aspect-video rounded-3xl overflow-hidden shadow-2xl border border-border/50">
                        <img src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=1200&auto=format&fit=crop" alt="Lumina LMS Team" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-8">
                            <p className="text-white font-bold text-lg">Xây dựng cộng đồng học tập không giới hạn.</p>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        {/* 7 & 8. CTA BANNERS (Giảng viên & Doanh nghiệp) */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="grid md:grid-cols-2 gap-8">

                {/* Instructor CTA */}
                <div className="bg-slate-900 text-white rounded-[2rem] p-10 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-purple-600/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="relative z-10 space-y-4">
                        <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm">
                            <Briefcase className="w-6 h-6 text-blue-400" />
                        </div>
                        <h3 className="text-2xl font-black">Trở thành Giảng viên</h3>
                        <p className="text-white/70 text-sm font-medium leading-relaxed max-w-sm">
                            Chia sẻ kiến thức của bạn với hàng ngàn học viên trên toàn quốc và tạo ra nguồn thu nhập thụ động bền vững.
                        </p>
                        <Link href="/become-instructor" className="mt-4 inline-flex bg-primary hover:bg-blue-600 text-white text-xs font-bold uppercase tracking-widest px-6 py-3 rounded-xl transition-all shadow-lg items-center gap-2">
                            Bắt đầu giảng dạy <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                </div>

                {/* B2B Enterprise CTA */}
                <div className="bg-card border border-border/60 rounded-[2rem] p-10 relative overflow-hidden group shadow-sm hover:shadow-xl hover:border-primary/40 transition-all">
                    <div className="absolute -right-10 -bottom-10 opacity-5">
                        <Building className="w-64 h-64" />
                    </div>
                    <div className="relative z-10 space-y-4">
                        <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                            <Building className="w-6 h-6 text-primary" />
                        </div>
                        <h3 className="text-2xl font-black text-foreground">Dành cho Doanh nghiệp</h3>
                        <p className="text-muted-foreground text-sm font-medium leading-relaxed max-w-sm">
                            Nâng cao năng lực đội ngũ nhân sự với các gói đào tạo được thiết kế riêng biệt và hệ thống báo cáo tiến độ chi tiết.
                        </p>
                        <a href="mailto:hello@luminalms.vn?subject=Tư vấn đào tạo doanh nghiệp" className="mt-4 bg-secondary hover:bg-slate-200 text-foreground border border-border/60 text-xs font-bold uppercase tracking-widest px-6 py-3 rounded-xl transition-all inline-flex items-center gap-2">
                            Liên hệ tư vấn <ArrowRight className="w-4 h-4" />
                        </a>
                    </div>
                </div>

            </div>
        </section>

      </main>

      <Footer />
    </>
  );
}
