"use client";

import { useEffect, useState, useRef } from "react";
import { apiFetch, formatPrice, levelLabel, getCourseImage } from "@/lib/api";
import Link from "next/link";
import WishlistButton from "@/components/WishlistButton";

interface Course {
  id: number;
  tieu_de: string;
  mo_ta: string | null;
  gia_tien: string;
  trinh_do: string;
  da_xuat_ban: boolean;
  danh_gia_trung_binh: string;
  ma_danh_muc: number | null;
}

interface Category {
  id: number;
  ten_danh_muc: string;
}

interface Banner {
  id: number;
  hinh_anh_url: string;
  tieu_de: string | null;
  duong_dan: string | null;
  trang_thai: boolean;
  thu_tu: number;
}

function CategoryCarousel({ categories }: { categories: Category[] }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [transitionEnabled, setTransitionEnabled] = useState(true);
  const [trackOffset, setTrackOffset] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  const dbCats = [...categories];
  const baseItems = dbCats.map(c => ({ id: c.id.toString(), label: c.ten_danh_muc, href: `/courses?category=${c.id}` }));

  const n = baseItems.length;
  const quintupleItems = [...baseItems, ...baseItems, ...baseItems, ...baseItems, ...baseItems];

  useEffect(() => {
    setTransitionEnabled(false);
    setActiveIdx(2 * n);
  }, [n]);

  useEffect(() => {
    if (trackRef.current && trackRef.current.children.length > activeIdx) {
      const activeChild = trackRef.current.children[activeIdx] as HTMLElement;
      setTrackOffset(-activeChild.offsetLeft + 16);
    }
  }, [activeIdx, n]);

  const handleNext = () => {
    if (animating) return;
    setAnimating(true);
    setTransitionEnabled(true);
    setActiveIdx(prev => prev + 1);
  };

  const handlePrev = () => {
    if (animating) return;
    setAnimating(true);
    setTransitionEnabled(true);
    setActiveIdx(prev => prev - 1);
  };

  const handleTransitionEnd = () => {
    setAnimating(false);
    if (activeIdx >= 3 * n) {
      setTransitionEnabled(false);
      setActiveIdx(activeIdx - n);
    } else if (activeIdx < 2 * n) {
      setTransitionEnabled(false);
      setActiveIdx(activeIdx + n);
    }
  };

  // 3s Auto-play interval shifting 1 category
  useEffect(() => {
    if (n <= 1 || isHovered) return;
    const timer = setInterval(() => {
      if (!animating) {
        setAnimating(true);
        setTransitionEnabled(true);
        setActiveIdx(prev => prev + 1);
      }
    }, 3000);
    return () => clearInterval(timer);
  }, [animating, activeIdx, n, isHovered]);

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative flex items-center w-full bg-surface-container-lowest p-3 rounded-full border border-outline-variant/30 shadow-sm overflow-hidden"
    >
      {/* Left Navigation Arrow */}
      <button
        onClick={handlePrev}
        className="w-10 h-10 rounded-full border border-outline-variant bg-surface flex items-center justify-center text-on-surface hover:bg-surface-container shadow-md cursor-pointer flex-shrink-0 z-20 hover:scale-105 active:scale-95 transition-all"
        aria-label="Previous Category"
      >
        <i className="ph-bold ph-caret-left text-lg"></i>
      </button>

      {/* Viewport Wrapper */}
      <div className="overflow-hidden flex-1 mx-2 relative py-1">
        <div
          ref={trackRef}
          onTransitionEnd={handleTransitionEnd}
          className="flex items-center gap-3"
          style={{
            transform: `translateX(${trackOffset}px)`,
            transition: transitionEnabled ? 'transform 500ms cubic-bezier(0.16, 1, 0.3, 1)' : 'none',
            width: 'max-content'
          }}
        >
          {quintupleItems.map((item, idx) => {
            return (
              <Link
                key={`${item.id}-${idx}`}
                href={item.href}
                className="flex-shrink-0 px-6 py-2.5 rounded-full border border-outline-variant/80 bg-surface text-on-surface-variant hover:border-primary hover:text-primary hover:bg-primary/5 text-xs md:text-sm font-bold transition-all whitespace-nowrap text-decoration-none flex items-center justify-center"
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Right Navigation Arrow */}
      <button
        onClick={handleNext}
        className="w-10 h-10 rounded-full border border-outline-variant bg-surface flex items-center justify-center text-on-surface hover:bg-surface-container shadow-md cursor-pointer flex-shrink-0 z-20 hover:scale-105 active:scale-95 transition-all"
        aria-label="Next Category"
      >
        <i className="ph-bold ph-caret-right text-lg"></i>
      </button>
    </div>
  );
}

export default function HomePage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);

  // Courses lists for tabs
  const [featuredCourses, setFeaturedCourses] = useState<Course[]>([]);
  const [newestCourses, setNewestCourses] = useState<Course[]>([]);
  const [freeCourses, setFreeCourses] = useState<Course[]>([]);

  const [activeTab, setActiveTab] = useState<"featured" | "newest" | "free">("featured");
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loading, setLoading] = useState(true);
  const [emailSubscribe, setEmailSubscribe] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [catRes, bannerRes, featuredRes, newestRes, freeRes] = await Promise.all([
          apiFetch("/categories"),
          apiFetch("/banners"),
          apiFetch("/courses?sort_by=danh_gia_trung_binh&order=desc&limit=8"),
          apiFetch("/courses?sort_by=ngay_tao&order=desc&limit=8"),
          apiFetch("/courses?gia_max=0&limit=8")
        ]);

        if (catRes.ok) setCategories(await catRes.json());
        if (bannerRes.ok) setBanners(await bannerRes.json());
        if (featuredRes.ok) setFeaturedCourses(await featuredRes.json());
        if (newestRes.ok) setNewestCourses(await newestRes.json());
        if (freeRes.ok) setFreeCourses(await freeRes.json());
      } catch (e) {
        console.error("Lỗi khi tải trang chủ:", e);
      }
      setLoading(false);
    };
    load();
  }, []);

  const displayBanners = banners.length > 0 ? banners : [
    { id: -1, hinh_anh_url: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1200&auto=format&fit=crop", tieu_de: "Khám phá tri thức vô tận", duong_dan: "/courses", trang_thai: true, thu_tu: 0 },
    { id: -2, hinh_anh_url: "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?q=80&w=1200&auto=format&fit=crop", tieu_de: "Trở thành chuyên gia công nghệ", duong_dan: "/courses", trang_thai: true, thu_tu: 1 }
  ];

  const nextSlide = () => {
    setCurrentSlide(prev => (prev + 1) % displayBanners.length);
  };

  const prevSlide = () => {
    setCurrentSlide(prev => (prev - 1 + displayBanners.length) % displayBanners.length);
  };

  useEffect(() => {
    if (displayBanners.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % displayBanners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [displayBanners.length]);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (emailSubscribe.trim()) {
      setSubscribed(true);
      setEmailSubscribe("");
      setTimeout(() => setSubscribed(false), 3000);
    }
  };

  // Icon mapping helper for categories
  const getCategoryIcon = (name: string) => {
    const lowercase = name.toLowerCase();
    if (lowercase.includes("web") || lowercase.includes("frontend") || lowercase.includes("html")) {
      return "ph-fill ph-code-block text-primary";
    }
    if (lowercase.includes("backend") || lowercase.includes("node") || lowercase.includes("server")) {
      return "ph-fill ph-database text-secondary";
    }
    if (lowercase.includes("ui") || lowercase.includes("ux") || lowercase.includes("design") || lowercase.includes("thiết kế")) {
      return "ph-fill ph-palette text-tertiary";
    }
    if (lowercase.includes("python") || lowercase.includes("data") || lowercase.includes("máy")) {
      return "ph-fill ph-terminal-window text-emerald-500";
    }
    return "ph-fill ph-brackets-angle text-blue-500";
  };

  const getActiveCourses = () => {
    if (activeTab === "newest") return newestCourses;
    if (activeTab === "free") return freeCourses;
    return featuredCourses;
  };

  const activeCourses = getActiveCourses();

  return (
    <div className="space-y-16 animate-slide-up pb-12">
      {/* 1. BANNER SLIDER */}
      <section className="relative w-full h-[320px] md:h-[420px] rounded-[32px] overflow-hidden shadow-2xl group bg-surface-container-highest border border-outline-variant/30">
        {displayBanners.map((banner, idx) => (
          <div
            key={banner.id}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${idx === currentSlide ? "opacity-100 z-10" : "opacity-0 z-0"}`}
          >
            {banner.duong_dan ? (
              <Link href={banner.duong_dan} className="block w-full h-full relative cursor-pointer group/link">
                <img src={banner.hinh_anh_url} alt={banner.tieu_de || "Banner"} className="w-full h-full object-cover transform group-hover/link:scale-[1.02] transition-transform duration-7000 ease-out" />
                <div className="absolute inset-0 bg-gradient-to-tr from-black/80 via-black/40 to-transparent flex flex-col justify-end p-8 md:p-16">
                  {banner.tieu_de && (
                    <h1 className="text-4xl md:text-6xl font-black text-white drop-shadow-xl mb-4 max-w-2xl leading-none tracking-tight">
                      {banner.tieu_de}
                    </h1>
                  )}
                  <p className="text-white/80 text-sm md:text-base max-w-lg mb-6 font-medium line-clamp-2">
                    Làm chủ các công nghệ mới nhất với lộ trình bài bản và nhận chứng chỉ xác thực trên chuỗi khối Blockchain độc quyền.
                  </p>
                  <div className="inline-flex items-center justify-center bg-white text-black font-black text-xs md:text-sm px-6 py-3 rounded-full hover:bg-primary hover:text-white transition-all w-fit shadow-md">
                    Khám phá Khóa học
                  </div>
                </div>
              </Link>
            ) : (
              <div className="w-full h-full relative">
                <img src={banner.hinh_anh_url} alt={banner.tieu_de || "Banner"} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-tr from-black/80 via-black/40 to-transparent flex flex-col justify-end p-8 md:p-16">
                  {banner.tieu_de && (
                    <h1 className="text-4xl md:text-6xl font-black text-white drop-shadow-xl mb-4 max-w-2xl leading-none">
                      {banner.tieu_de}
                    </h1>
                  )}
                  <p className="text-white/80 text-sm md:text-base max-w-lg mb-6 font-medium">
                    Học tập cùng chuyên gia hàng đầu và trợ lý ảo AI luôn túc trực hỗ trợ bạn.
                  </p>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Navigation Dots */}
        {displayBanners.length > 1 && (
          <>
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-2.5 bg-black/40 backdrop-blur-md px-4 py-2.5 rounded-full border border-white/10">
              {displayBanners.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentSlide(idx)}
                  className={`h-2.5 rounded-full transition-all duration-300 ${idx === currentSlide ? "bg-primary w-8" : "bg-white/50 hover:bg-white w-2.5"}`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>

            {/* Prev/Next Buttons */}
            <button
              onClick={prevSlide}
              className="absolute left-6 top-1/2 -translate-y-1/2 z-20 w-12 h-12 flex items-center justify-center rounded-full bg-black/30 hover:bg-black/60 text-white backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100 border border-white/10"
              aria-label="Previous slide"
            >
              <i className="ph-bold ph-caret-left text-2xl"></i>
            </button>
            <button
              onClick={nextSlide}
              className="absolute right-6 top-1/2 -translate-y-1/2 z-20 w-12 h-12 flex items-center justify-center rounded-full bg-black/30 hover:bg-black/60 text-white backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100 border border-white/10"
              aria-label="Next slide"
            >
              <i className="ph-bold ph-caret-right text-2xl"></i>
            </button>
          </>
        )}
      </section>

      {/* Floating Statistics Counter Row */}
      <div className="max-w-6xl mx-auto px-4 -mt-24 relative z-20">
        <div className="bg-surface/80 backdrop-blur-lg rounded-[24px] p-6 md:p-8 shadow-xl border border-outline-variant/50 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div className="space-y-1 border-r border-outline-variant/30 last:border-0">
            <div className="text-3xl md:text-4xl font-black text-primary tracking-tight">10K+</div>
            <div className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Học Viên Năng Động</div>
          </div>
          <div className="space-y-1 md:border-r border-outline-variant/30 last:border-0">
            <div className="text-3xl md:text-4xl font-black text-secondary tracking-tight">200+</div>
            <div className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Khóa Học Chuyên Nghiệp</div>
          </div>
          <div className="space-y-1 border-r border-outline-variant/30 last:border-0">
            <div className="text-3xl md:text-4xl font-black text-tertiary tracking-tight">50+</div>
            <div className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Lộ Trình Bài Bản</div>
          </div>
          <div className="space-y-1 last:border-0">
            <div className="text-3xl md:text-4xl font-black text-emerald-500 tracking-tight">4.8/5</div>
            <div className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Đánh Giá Tích Cực</div>
          </div>
        </div>
      </div>

      {/* 2. CORE VALUES / CREDIBILITY */}
      <section className="max-w-7xl mx-auto px-4 py-4 space-y-10">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <h2 className="text-3xl font-black text-on-surface tracking-tight">Tại sao chọn Lumina LMS?</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="glass-panel p-6 rounded-[24px] bg-surface-container-low border border-outline-variant/30 hover:border-primary/40 hover:shadow-lg hover:-translate-y-1 transition-all flex flex-col">
            <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center text-2xl mb-4">
              <i className="ph-fill ph-book-open"></i>
            </div>
            <h3 className="font-bold text-on-surface text-base mb-2">Học tập không giới hạn</h3>
            <p className="text-xs text-on-surface-variant font-medium leading-relaxed flex-1">Học trực tuyến linh hoạt mọi lúc mọi nơi trên mọi thiết bị. Nội dung cập nhật liên tục sát với nhu cầu thực tiễn.</p>
          </div>

          <div className="glass-panel p-6 rounded-[24px] bg-surface-container-low border border-outline-variant/30 hover:border-secondary/40 hover:shadow-lg hover:-translate-y-1 transition-all flex flex-col">
            <div className="w-12 h-12 rounded-xl bg-secondary/10 text-secondary border border-secondary/20 flex items-center justify-center text-2xl mb-4">
              <i className="ph-fill ph-robot"></i>
            </div>
            <h3 className="font-bold text-on-surface text-base mb-2">Trợ lý học tập AI</h3>
            <p className="text-xs text-on-surface-variant font-medium leading-relaxed flex-1">Chat360 đồng hành cùng bạn 24/7. Trả lời câu hỏi học thuật, gỡ lỗi code và định hướng lộ trình cá nhân hóa.</p>
          </div>

          <div className="glass-panel p-6 rounded-[24px] bg-surface-container-low border border-outline-variant/30 hover:border-tertiary/40 hover:shadow-lg hover:-translate-y-1 transition-all flex flex-col">
            <div className="w-12 h-12 rounded-xl bg-tertiary/10 text-tertiary border border-tertiary/20 flex items-center justify-center text-2xl mb-4">
              <i className="ph-fill ph-certificate"></i>
            </div>
            <h3 className="font-bold text-on-surface text-base mb-2">Chứng chỉ Blockchain</h3>
            <p className="text-xs text-on-surface-variant font-medium leading-relaxed flex-1">Nhận chứng nhận hoàn thành khóa học được mã hóa và xác thực tự động an toàn tuyệt đối trên chuỗi khối Blockchain.</p>
          </div>

          <div className="glass-panel p-6 rounded-[24px] bg-surface-container-low border border-outline-variant/30 hover:border-emerald-500/40 hover:shadow-lg hover:-translate-y-1 transition-all flex flex-col">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center justify-center text-2xl mb-4">
              <i className="ph-fill ph-code"></i>
            </div>
            <h3 className="font-bold text-on-surface text-base mb-2">Thực hành thực tế</h3>
            <p className="text-xs text-on-surface-variant font-medium leading-relaxed flex-1">Không chỉ học lý thuyết, bạn được làm các bài lab thực hành ảo, dự án thực tế và trắc nghiệm tương tác cao.</p>
          </div>
        </div>
      </section>

      {/* 3. DYNAMIC CATEGORIES SLIDER */}
      {categories.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 space-y-6">
          <div className="flex justify-between items-end">
            <div className="space-y-1">
              <h2 className="text-2xl font-black text-on-surface tracking-tight">Danh mục môn học</h2>
            </div>
            <Link href="/courses" className="text-sm font-bold text-primary hover:underline flex items-center gap-1">
              Xem tất cả <i className="ph-bold ph-caret-right"></i>
            </Link>
          </div>

          <CategoryCarousel categories={categories} />
        </section>
      )}

      {/* 4. TABS FILTERED COURSE PRODUCT GRID */}
      <section className="max-w-7xl mx-auto px-4 space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <h2 className="text-3xl font-black text-on-surface tracking-tight flex items-center gap-3">
              Thư viện Khóa học
            </h2>
          </div>

          {/* Navigation Tabs */}
          <div className="flex bg-surface-container p-1 rounded-2xl border border-outline-variant/60 w-fit shrink-0">
            <button
              onClick={() => setActiveTab("featured")}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 ${activeTab === "featured" ? "bg-surface text-primary shadow-sm" : "text-on-surface-variant hover:text-on-surface"}`}
            >
              <i className="ph-fill ph-fire"></i> Nổi bật nhất
            </button>
            <button
              onClick={() => setActiveTab("newest")}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 ${activeTab === "newest" ? "bg-surface text-primary shadow-sm" : "text-on-surface-variant hover:text-on-surface"}`}
            >
              <i className="ph-fill ph-clock"></i> Mới cập nhật
            </button>
            <button
              onClick={() => setActiveTab("free")}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 ${activeTab === "free" ? "bg-surface text-primary shadow-sm" : "text-on-surface-variant hover:text-on-surface"}`}
            >
              <i className="ph-fill ph-gift"></i> Miễn phí
            </button>
          </div>
        </div>

        {/* Product Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="glass-panel rounded-3xl h-[380px] animate-pulse bg-surface-container"></div>
            ))}
          </div>
        ) : activeCourses.length === 0 ? (
          <div className="text-center py-20 bg-surface rounded-3xl border border-outline-variant/40 shadow-sm">
            <i className="ph-fill ph-books text-5xl text-on-surface-variant/50 mb-4"></i>
            <h3 className="text-lg font-bold text-on-surface">Chưa có khóa học nào trong mục này</h3>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {activeCourses.map((course, idx) => (
              <Link
                href={`/courses/${course.id}`}
                key={course.id}
                className="glass-panel group rounded-3xl border border-outline-variant/50 overflow-hidden hover:border-primary/50 transition-all flex flex-col h-[385px] hover:-translate-y-1.5 hover:shadow-xl hover:shadow-primary/10 relative bg-surface"
                style={{ animationDelay: `${idx * 0.05}s`, animationFillMode: "both" }}
              >
                <div className="h-44 relative bg-surface-container-highest overflow-hidden">
                  <img
                    src={getCourseImage(course.tieu_de)}
                    alt={course.tieu_de}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-secondary/10 opacity-60 group-hover:scale-110 transition-transform duration-700"></div>
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                    <div className="w-12 h-12 rounded-full bg-white text-primary flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
                      <i className="ph-fill ph-play text-xl"></i>
                    </div>
                  </div>
                  <div className="absolute top-4 left-4 flex gap-2 z-10">
                    <span className="px-2.5 py-1 bg-surface/90 backdrop-blur-md text-on-surface text-[10px] font-black rounded-lg shadow-sm border border-outline-variant/30 uppercase tracking-wider">
                      {categories.find((cat) => cat.id === course.ma_danh_muc)?.ten_danh_muc || "Khác"}
                    </span>
                  </div>
                  <WishlistButton courseId={course.id} />
                  <div className="absolute bottom-4 right-4 bg-surface/90 backdrop-blur-md px-2 py-1 rounded-lg flex items-center gap-1 shadow-sm border border-outline-variant/30 z-10">
                    <i className="ph-fill ph-star text-warning text-xs drop-shadow-sm"></i>
                    <span className="text-[10px] font-black text-on-surface">{parseFloat(course.danh_gia_trung_binh).toFixed(1)}</span>
                  </div>
                </div>
                <div className="p-6 flex flex-col flex-1">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[9px] font-black uppercase tracking-wider px-2 py-1 bg-primary/10 text-primary rounded-md border border-primary/20">
                      {levelLabel(course.trinh_do)}
                    </span>
                  </div>
                  <h3 className="font-bold text-on-surface text-base mb-2 line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                    {course.tieu_de}
                  </h3>
                  <p className="text-xs text-on-surface-variant font-medium line-clamp-2 leading-relaxed mb-4">
                    {course.mo_ta || "Chưa có mô tả chi tiết cho khóa học này từ giảng viên."}
                  </p>
                  <div className="mt-auto pt-4 border-t border-outline-variant/40 flex justify-between items-center">
                    <span className="font-black text-primary text-lg tracking-tight">
                      {parseFloat(course.gia_tien) > 0 ? formatPrice(parseFloat(course.gia_tien)) : "Miễn phí"}
                    </span>
                    <button className="w-9 h-9 rounded-xl bg-surface-container text-on-surface-variant flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all shadow-sm">
                      <i className="ph-bold ph-arrow-right text-base"></i>
                    </button>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        <div className="text-center pt-4">
          <Link
            href="/courses"
            className="inline-flex px-8 py-3.5 bg-surface border border-outline-variant text-on-surface font-black text-xs md:text-sm rounded-xl hover:bg-surface-container transition-all items-center gap-2 shadow-sm border border-outline-variant/60 hover:border-primary/40 uppercase tracking-wider"
          >
            Khám phá tất cả khóa học <i className="ph-bold ph-arrow-right"></i>
          </Link>
        </div>
      </section>

      {/* 5. INTERACTIVE LEARNING PATHS (LỘ TRÌNH HỌC TẬP) */}
      <section className="max-w-7xl mx-auto px-4 space-y-10">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <h2 className="text-3xl font-black text-on-surface tracking-tight">Lộ trình Đào tạo Chuyên sâu</h2>
          <p className="text-sm font-medium text-on-surface-variant">Lộ trình học tập tích hợp đa khóa học dẫn dắt bạn trở thành chuyên gia trong ngành.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Path 1 */}
          <div className="glass-panel rounded-3xl p-8 bg-surface-container-low border border-outline-variant/30 flex flex-col h-full hover:shadow-xl hover:border-primary/30 transition-all relative overflow-hidden group">
            <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-primary/5 rounded-full blur-2xl z-0 group-hover:bg-primary/10 transition-colors"></div>
            <div className="relative z-10 flex flex-col h-full">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-6 border border-primary/20 text-primary">
                <i className="ph-fill ph-code-block text-2xl"></i>
              </div>
              <h3 className="text-lg font-black text-on-surface mb-2">Frontend Developer</h3>
              <p className="text-xs text-on-surface-variant font-medium leading-relaxed mb-6">Làm chủ giao diện web chuyên nghiệp với HTML/CSS, Javascript, ReactJS, Next.js và Tailwind CSS. Tối ưu trải nghiệm UI/UX tinh tế.</p>

              <div className="space-y-3 mt-auto pt-4 border-t border-outline-variant/30">
                <div className="flex justify-between text-[11px] font-bold text-on-surface-variant">
                  <span>Số khóa học: <strong>6 Khóa</strong></span>
                  <span>Thời lượng: <strong>120 giờ</strong></span>
                </div>
                <Link href="/courses" className="text-xs font-bold text-primary hover:text-primary-container flex items-center gap-1.5 mt-2 group/btn">
                  Chi tiết lộ trình <i className="ph-bold ph-caret-right transform group-hover/btn:translate-x-1 transition-transform"></i>
                </Link>
              </div>
            </div>
          </div>

          {/* Path 2 */}
          <div className="glass-panel rounded-3xl p-8 bg-surface-container-low border border-outline-variant/30 flex flex-col h-full hover:shadow-xl hover:border-secondary/30 transition-all relative overflow-hidden group">
            <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-secondary/5 rounded-full blur-2xl z-0 group-hover:bg-secondary/10 transition-colors"></div>
            <div className="relative z-10 flex flex-col h-full">
              <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center mb-6 border border-secondary/20 text-secondary">
                <i className="ph-fill ph-database text-2xl"></i>
              </div>
              <h3 className="text-lg font-black text-on-surface mb-2">Backend Architect</h3>
              <p className="text-xs text-on-surface-variant font-medium leading-relaxed mb-6">Thiết kế và triển khai API chịu tải lớn với Python FastAPI, Node.js, Docker, kiến trúc Microservices và tối ưu hóa hệ cơ sở dữ liệu SQL/NoSQL.</p>

              <div className="space-y-3 mt-auto pt-4 border-t border-outline-variant/30">
                <div className="flex justify-between text-[11px] font-bold text-on-surface-variant">
                  <span>Số khóa học: <strong>8 Khóa</strong></span>
                  <span>Thời lượng: <strong>160 giờ</strong></span>
                </div>
                <Link href="/courses" className="text-xs font-bold text-secondary hover:underline flex items-center gap-1.5 mt-2 group/btn">
                  Chi tiết lộ trình <i className="ph-bold ph-caret-right transform group-hover/btn:translate-x-1 transition-transform"></i>
                </Link>
              </div>
            </div>
          </div>

          {/* Path 3 */}
          <div className="glass-panel rounded-3xl p-8 bg-surface-container-low border border-outline-variant/30 flex flex-col h-full hover:shadow-xl hover:border-emerald-500/30 transition-all relative overflow-hidden group">
            <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl z-0 group-hover:bg-emerald-500/10 transition-colors"></div>
            <div className="relative z-10 flex flex-col h-full">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-6 border border-emerald-500/20 text-emerald-600">
                <i className="ph-fill ph-cpu text-2xl"></i>
              </div>
              <h3 className="text-lg font-black text-on-surface mb-2">AI & Machine Learning</h3>
              <p className="text-xs text-on-surface-variant font-medium leading-relaxed mb-6">Nắm vững đại số tuyến tính, Python nâng cao, xử lý dữ liệu với Pandas, xây dựng và huấn luyện mô hình học sâu (Deep Learning) bằng TensorFlow/PyTorch.</p>

              <div className="space-y-3 mt-auto pt-4 border-t border-outline-variant/30">
                <div className="flex justify-between text-[11px] font-bold text-on-surface-variant">
                  <span>Số khóa học: <strong>5 Khóa</strong></span>
                  <span>Thời lượng: <strong>100 giờ</strong></span>
                </div>
                <Link href="/courses" className="text-xs font-bold text-emerald-600 hover:underline flex items-center gap-1.5 mt-2 group/btn">
                  Chi tiết lộ trình <i className="ph-bold ph-caret-right transform group-hover/btn:translate-x-1 transition-transform"></i>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. AI COMPANION PROMO BANNER */}
      <section className="max-w-7xl mx-auto px-4">
        <div className="relative rounded-[32px] overflow-hidden bg-gradient-to-br from-[#1E1B4B] via-[#0F0E2A] to-[#311042] border border-white/5 p-8 md:p-16 flex flex-col lg:flex-row items-center gap-12 shadow-2xl">
          {/* Glow lights */}
          <div className="absolute top-0 left-1/4 w-72 h-72 bg-primary/10 rounded-full blur-[100px] pointer-events-none"></div>
          <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-indigo-500/15 rounded-full blur-[100px] pointer-events-none"></div>

          <div className="flex-1 space-y-6 text-left relative z-10">
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-indigo-500/10 text-indigo-300 rounded-full border border-indigo-500/20 text-xs font-black uppercase tracking-wider">
              <i className="ph-fill ph-sparkle animate-pulse"></i> Độc quyền tại Lumina
            </span>
            <h2 className="text-3xl md:text-5xl font-black text-white leading-tight tracking-tight">
              Bứt phá giới hạn với Trợ lý học tập ảo AI Chat360
            </h2>
            <p className="text-white/80 text-sm md:text-base leading-relaxed font-medium">
              Bạn đang gặp lỗi bug cú pháp lập trình? Bạn cần giải thích nhanh các khái niệm giải thuật phức tạp? Hãy bắt đầu cuộc hội thoại với Chat360. Trợ lý AI sẽ túc trực 24/7 để phân tích tài liệu và đưa ra hướng dẫn chính xác theo ngữ cảnh bài học của bạn.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <Link href="/courses" className="inline-flex items-center justify-center px-6 py-3.5 bg-white text-black font-black text-xs md:text-sm rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-md">
                Trải nghiệm AI ngay
              </Link>
              <Link href="#" className="inline-flex items-center justify-center px-6 py-3.5 bg-white/10 hover:bg-white/20 text-white font-black text-xs md:text-sm rounded-xl border border-white/10 transition-all">
                Tìm hiểu thêm
              </Link>
            </div>
          </div>

          <div className="w-full lg:w-[35%] shrink-0 flex justify-center relative z-10">
            <div className="w-48 h-48 md:w-60 md:h-60 rounded-[36px] bg-gradient-to-br from-indigo-500/20 to-primary/20 border border-white/10 flex items-center justify-center shadow-2xl relative animate-float">
              <div className="absolute inset-2 rounded-[28px] bg-black/40 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center space-y-4">
                <i className="ph-fill ph-robot text-5xl text-indigo-400 drop-shadow-[0_0_15px_rgba(129,140,248,0.5)]"></i>
                <div className="space-y-0.5">
                  <div className="text-sm font-bold text-white leading-none">Lumina Chat360</div>
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest flex items-center justify-center gap-1">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span> Trực Tuyến
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. STUDENT GRADUATE TESTIMONIALS */}
      <section className="max-w-7xl mx-auto px-4 space-y-10">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <h2 className="text-3xl font-black text-on-surface tracking-tight">Cảm nhận từ Học viên</h2>
          <p className="text-sm font-medium text-on-surface-variant">Hàng ngàn học viên đã thay đổi sự nghiệp thành công cùng Lumina LMS.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="glass-panel p-8 rounded-3xl bg-surface border border-outline-variant/40 shadow-sm flex flex-col">
            <div className="flex items-center gap-1 text-warning mb-4">
              {[1, 2, 3, 4, 5].map(i => <i key={i} className="ph-fill ph-star"></i>)}
            </div>
            <p className="text-xs text-on-surface-variant font-medium leading-relaxed italic mb-6">
              "Nhờ lộ trình học Backend tại Lumina, tôi đã tự tin vượt qua các vòng phỏng vấn khó nhằn của doanh nghiệp. Trợ lý AI Chat360 thực sự là một người bạn đồng hành tuyệt vời hỗ trợ tôi mỗi đêm thức code dự án."
            </p>
            <div className="flex items-center gap-3 mt-auto">
              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-black text-sm">
                N
              </div>
              <div>
                <div className="text-xs font-bold text-on-surface">Nguyễn Văn Nam</div>
                <div className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider">Software Engineer tại VNG</div>
              </div>
            </div>
          </div>

          <div className="glass-panel p-8 rounded-3xl bg-surface border border-outline-variant/40 shadow-sm flex flex-col">
            <div className="flex items-center gap-1 text-warning mb-4">
              {[1, 2, 3, 4, 5].map(i => <i key={i} className="ph-fill ph-star"></i>)}
            </div>
            <p className="text-xs text-on-surface-variant font-medium leading-relaxed italic mb-6">
              "Giao diện học tập vô cùng mượt mà và trực quan. Khóa học UI/UX của Lumina rất chất lượng, bài tập thực hành sát thực tế. Đặc biệt chứng chỉ Blockchain giúp hồ sơ ứng tuyển của tôi tạo được điểm nhấn khác biệt."
            </p>
            <div className="flex items-center gap-3 mt-auto">
              <div className="w-10 h-10 rounded-full bg-secondary/10 text-secondary flex items-center justify-center font-black text-sm">
                L
              </div>
              <div>
                <div className="text-xs font-bold text-on-surface">Phan Thị Lan</div>
                <div className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider">Frontend Dev tại FPT Software</div>
              </div>
            </div>
          </div>

          <div className="glass-panel p-8 rounded-3xl bg-surface border border-outline-variant/40 shadow-sm flex flex-col">
            <div className="flex items-center gap-1 text-warning mb-4">
              {[1, 2, 3, 4, 5].map(i => <i key={i} className="ph-fill ph-star"></i>)}
            </div>
            <p className="text-xs text-on-surface-variant font-medium leading-relaxed italic mb-6">
              "Tôi thích cách thiết kế bài học của giảng viên ở đây, trình bày rất ngắn gọn, xúc tích và dễ hiểu. Hệ thống trắc nghiệm kiểm tra bài học và thực hành giả lập ảo vô cùng trực quan, giúp tôi ghi nhớ bài lâu hơn."
            </p>
            <div className="flex items-center gap-3 mt-auto">
              <div className="w-10 h-10 rounded-full bg-tertiary/10 text-tertiary flex items-center justify-center font-black text-sm">
                H
              </div>
              <div>
                <div className="text-xs font-bold text-on-surface">Lê Minh Hoàng</div>
                <div className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider">Học viên Khoa học dữ liệu</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. INSTRUCTOR RECRUITMENT CTA */}
      <section className="max-w-7xl mx-auto px-4">
        <div className="bg-gradient-to-r from-primary/10 via-secondary/5 to-primary/5 rounded-[32px] p-8 md:p-12 border border-primary/20 flex flex-col md:flex-row items-center justify-between gap-8 text-left">
          <div className="space-y-3">
            <h2 className="text-2xl md:text-3xl font-black text-on-surface tracking-tight">Trở thành Giảng viên trên Lumina</h2>
            <p className="text-sm font-medium text-on-surface-variant max-w-2xl leading-relaxed">
              Chia sẻ kiến thức của bạn với hàng ngàn học viên trên khắp cả nước. Chúng tôi cung cấp công cụ giảng dạy, hệ thống quản lý học thuật tối ưu và nguồn thu nhập hấp dẫn ổn định.
            </p>
          </div>
          <Link href="/register" className="inline-flex px-6 py-3.5 bg-primary hover:bg-primary/90 text-on-primary font-black text-xs md:text-sm rounded-xl transition-all shadow-md shrink-0 uppercase tracking-wider">
            Đăng ký giảng dạy ngay
          </Link>
        </div>
      </section>

      {/* 9. PREMIUM MULTI-COLUMN FOOTER */}
      <footer className="border-t border-outline-variant/60 pt-16 pb-8 mt-12 bg-surface-container-lowest rounded-t-[32px]">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 text-left mb-12">
          {/* Column 1: Brand Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-surface-container-high border border-outline-variant flex items-center justify-center text-primary font-bold text-lg">
                L
              </div>
              <span className="text-xl font-bold tracking-tight text-on-surface">Lumina <span className="text-primary font-normal">LMS</span></span>
            </div>
            <p className="text-xs text-on-surface-variant font-medium leading-relaxed">
              Kiến tạo tương lai số bằng các chương trình đào tạo kỹ năng công nghệ cao chất lượng cao, an toàn tuyệt đối và thông minh vượt trội.
            </p>
            <div className="flex gap-3 pt-2">
              <a href="#" className="w-8 h-8 rounded-full bg-surface-container hover:bg-primary hover:text-white border border-outline-variant/40 flex items-center justify-center text-on-surface-variant transition-colors text-base" aria-label="Facebook">
                <i className="ph-fill ph-facebook-logo"></i>
              </a>
              <a href="#" className="w-8 h-8 rounded-full bg-surface-container hover:bg-primary hover:text-white border border-outline-variant/40 flex items-center justify-center text-on-surface-variant transition-colors text-base" aria-label="Youtube">
                <i className="ph-fill ph-youtube-logo"></i>
              </a>
              <a href="#" className="w-8 h-8 rounded-full bg-surface-container hover:bg-primary hover:text-white border border-outline-variant/40 flex items-center justify-center text-on-surface-variant transition-colors text-base" aria-label="LinkedIn">
                <i className="ph-fill ph-linkedin-logo"></i>
              </a>
              <a href="#" className="w-8 h-8 rounded-full bg-surface-container hover:bg-primary hover:text-white border border-outline-variant/40 flex items-center justify-center text-on-surface-variant transition-colors text-base" aria-label="GitHub">
                <i className="ph-fill ph-github-logo"></i>
              </a>
            </div>
          </div>

          {/* Column 2: Explore links */}
          <div className="space-y-4">
            <h4 className="text-xs font-black uppercase tracking-wider text-on-surface">Khám phá</h4>
            <ul className="space-y-2.5 p-0 list-none m-0">
              <li>
                <Link href="/courses" className="text-xs font-bold text-on-surface-variant hover:text-primary transition-colors text-decoration-none">Thư viện Khóa học</Link>
              </li>
              <li>
                <Link href="/courses" className="text-xs font-bold text-on-surface-variant hover:text-primary transition-colors text-decoration-none">Lộ trình Nghề nghiệp</Link>
              </li>
              <li>
                <Link href="/courses?gia_max=0" className="text-xs font-bold text-on-surface-variant hover:text-primary transition-colors text-decoration-none">Khóa học Miễn phí</Link>
              </li>
              <li>
                <Link href="/instructors" className="text-xs font-bold text-on-surface-variant hover:text-primary transition-colors text-decoration-none">Đội ngũ Giảng viên</Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Corporate/About Links */}
          <div className="space-y-4">
            <h4 className="text-xs font-black uppercase tracking-wider text-on-surface">Về Lumina</h4>
            <ul className="space-y-2.5 p-0 list-none m-0">
              <li>
                <a href="#" className="text-xs font-bold text-on-surface-variant hover:text-primary transition-colors text-decoration-none">Về chúng tôi</a>
              </li>
              <li>
                <a href="#" className="text-xs font-bold text-on-surface-variant hover:text-primary transition-colors text-decoration-none">Tin tức & Sự kiện</a>
              </li>
              <li>
                <a href="#" className="text-xs font-bold text-on-surface-variant hover:text-primary transition-colors text-decoration-none">Liên hệ hợp tác</a>
              </li>
              <li>
                <a href="#" className="text-xs font-bold text-on-surface-variant hover:text-primary transition-colors text-decoration-none">Điều khoản & Bảo mật</a>
              </li>
            </ul>
          </div>

          {/* Column 4: Newsletter */}
          <div className="space-y-4">
            <h4 className="text-xs font-black uppercase tracking-wider text-on-surface">Bản tin công nghệ</h4>
            <p className="text-xs text-on-surface-variant font-medium leading-relaxed">
              Nhận thông báo về các khóa học mới nhất, mã giảm giá và tài liệu lập trình hữu ích hàng tuần.
            </p>
            <form onSubmit={handleSubscribe} className="flex gap-2">
              <input
                type="email"
                value={emailSubscribe}
                onChange={(e) => setEmailSubscribe(e.target.value)}
                placeholder="Nhập email của bạn"
                className="bg-surface-container border border-outline-variant/60 rounded-xl px-4 py-2.5 text-xs text-on-surface placeholder:text-outline w-full focus:outline-none focus:border-primary transition-colors"
                required
              />
              <button
                type="submit"
                className="bg-primary hover:bg-primary/95 text-on-primary rounded-xl px-4 py-2 text-xs font-black shadow-sm transition-colors uppercase tracking-wider"
              >
                Đăng ký
              </button>
            </form>
            {subscribed && (
              <span className="text-[10px] text-emerald-500 font-bold block animate-fade-in">Đăng ký bản tin thành công!</span>
            )}
          </div>
        </div>

        {/* Footer Bottom row */}
        <div className="max-w-7xl mx-auto px-4 pt-8 border-t border-outline-variant/40 flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-bold text-on-surface-variant">
          <div>
            © {new Date().getFullYear()} Lumina LMS. Mọi quyền được bảo lưu.
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 text-[10px] uppercase tracking-wider">
              <i className="ph-fill ph-shield-check text-xs"></i> Blockchain Certificate Secured
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
