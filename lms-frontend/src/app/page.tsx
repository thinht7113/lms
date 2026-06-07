"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Flame, ArrowRight, Award, Star, BookOpen, GraduationCap, CheckCircle, TrendingUp, Zap, Shield, RefreshCw } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CourseCard from "@/components/CourseCard";
import { apiService, Course, Banner } from "@/services/api";

export default function HomePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("bestseller");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Real DB states
  const [dbBanners, setDbBanners] = useState<Banner[]>([]);
  const [dbFlashSale, setDbFlashSale] = useState<Course[]>([]);
  const [dbBestSellers, setDbBestSellers] = useState<Course[]>([]);
  const [dbNewCourses, setDbNewCourses] = useState<Course[]>([]);
  const [dbFreeCourses, setDbFreeCourses] = useState<Course[]>([]);
  const [dbInstructors, setDbInstructors] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch from DB on mount
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const [bannersData, allDbCourses, instructorsData] = await Promise.all([
          apiService.getBanners(),
          apiService.getCourses(),
          apiService.getPublicInstructors()
        ]);
        
        setDbBanners(bannersData);
        setDbInstructors(instructorsData);

        if (allDbCourses.length > 0) {
          setDbFlashSale(allDbCourses.slice(0, 4));
          const sortedBest = [...allDbCourses].sort((a, b) => b.danh_gia_trung_binh - a.danh_gia_trung_binh);
          setDbBestSellers(sortedBest.slice(0, 3));
          const sortedNew = [...allDbCourses].sort((a, b) => new Date(b.ngay_tao).getTime() - new Date(a.ngay_tao).getTime());
          setDbNewCourses(sortedNew.slice(0, 3));
          const free = allDbCourses.filter((c) => Number(c.gia_tien) === 0);
          setDbFreeCourses(free.slice(0, 3));
        }
      } catch (err) {
        console.error("Error loading DB data:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const getGradient = (index: number) => {
    const gradients = [
      "from-blue-600 to-indigo-700",
      "from-slate-700 to-slate-900",
      "from-indigo-500 to-blue-500",
      "from-blue-400 to-indigo-600"
    ];
    return gradients[index % gradients.length];
  };

  const mapDbCourse = (c: Course, index: number) => ({
    id: c.id,
    title: c.tieu_de,
    thumbnail: c.anh_dai_dien,
    instructor: "Giảng viên Nemo",
    category: c.ma_danh_muc ? `Chuyên ngành ${c.ma_danh_muc}` : "Lập trình",
    level: c.trinh_do,
    rating: Number(c.danh_gia_trung_binh) || 5.0,
    price: Number(c.gia_tien),
    originalPrice: Number(c.gia_tien) > 0 ? Number(c.gia_tien) * 1.2 : undefined,
    studentsCount: c.so_luong_hoc_vien || 0,
    gradient: getGradient(index)
  });

  const getActiveTabCourses = () => {
    if (activeTab === "new") return dbNewCourses.map((c, i) => mapDbCourse(c, i));
    if (activeTab === "free") return dbFreeCourses.map((c, i) => mapDbCourse(c, i));
    return dbBestSellers.map((c, i) => mapDbCourse(c, i));
  };

  return (
    <>
      <Navbar />

      <main className="flex-grow bg-background">
        {/* HERO SECTION - Nemo Style */}
        <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden border-b border-border/40">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.08),transparent)] -z-10" />
          <div className="absolute top-0 left-0 w-full h-full bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] opacity-20 -z-10" />
          
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col items-center text-center space-y-10">
              {/* Badge */}
              <div className="inline-flex items-center space-x-2 bg-primary/10 border border-primary/20 px-4 py-1.5 rounded-full text-[11px] font-bold text-primary uppercase tracking-widest animate-fade-in">
                <Zap className="h-3.5 w-3.5 fill-primary" />
                <span>Nền tảng học tập thế hệ mới</span>
              </div>

              {/* Title */}
              <h1 className="max-w-4xl font-sans font-black text-5xl sm:text-6xl lg:text-7xl tracking-tighter leading-[0.9] text-foreground">
                Khai phá tiềm năng <br />
                <span className="text-primary italic">Lập trình</span> của bạn
              </h1>

              {/* Subtitle */}
              <p className="max-w-2xl text-base sm:text-lg text-muted-foreground font-medium leading-relaxed">
                Trải nghiệm lộ trình học tập Nemo được thiết kế tinh gọn, thực chiến và kết nối trực tiếp với nhu cầu tuyển dụng thực tế của doanh nghiệp.
              </p>

              {/* CTA & Search */}
              <div className="w-full max-w-2xl space-y-6">
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-primary to-blue-400 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200" />
                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (searchQuery.trim()) router.push(`/courses?q=${encodeURIComponent(searchQuery)}`);
                    }}
                    className="relative flex items-center bg-card border border-border shadow-2xl rounded-2xl p-2"
                  >
                    <div className="flex-grow flex items-center px-4">
                      <Search className="h-5 w-5 text-muted-foreground mr-3" />
                      <input
                        type="text"
                        placeholder="Tìm kiếm khóa học, kỹ năng hoặc giảng viên..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-transparent border-none outline-none text-sm font-medium py-3"
                      />
                    </div>
                    <button 
                      type="submit"
                      className="bg-primary hover:bg-blue-700 text-white font-bold px-8 py-3 rounded-xl transition-all shadow-lg shadow-primary/25 cursor-pointer text-sm"
                    >
                      Bắt đầu ngay
                    </button>
                  </form>
                </div>

                {/* Trust Badges */}
                <div className="flex flex-wrap justify-center items-center gap-x-8 gap-y-4 pt-4 grayscale opacity-60">
                  <div className="flex items-center space-x-2">
                    <Shield className="h-4 w-4" />
                    <span className="text-xs font-bold uppercase tracking-tighter">Bảo mật tuyệt đối</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Award className="h-4 w-4" />
                    <span className="text-xs font-bold uppercase tracking-tighter">Chứng chỉ Nemo</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="h-4 w-4" />
                    <span className="text-xs font-bold uppercase tracking-tighter">Cam kết đầu ra</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FEATURED COURSES - Bento Grid Style */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
            <div className="space-y-3">
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
                Khóa học nổi bật
              </h2>
              <p className="text-muted-foreground font-medium max-w-md">
                Lựa chọn từ 30+ chương trình đào tạo chuyên sâu được cập nhật nội dung hàng tuần.
              </p>
            </div>
            
            {/* Tabs */}
            <div className="inline-flex bg-secondary/50 p-1 rounded-xl border border-border/60">
              {[
                { id: "bestseller", label: "Phổ biến" },
                { id: "new", label: "Mới nhất" },
                { id: "free", label: "Miễn phí" }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-6 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    activeTab === tab.id
                      ? "bg-card text-primary shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {getActiveTabCourses().length > 0 ? (
              getActiveTabCourses().map((c) => (
                <CourseCard key={c.id} {...c} />
              ))
            ) : (
              <div className="col-span-full py-20 text-center border-2 border-dashed border-border rounded-3xl">
                <RefreshCw className="h-10 w-10 text-muted-foreground mx-auto animate-spin mb-4" />
                <p className="text-sm font-medium text-muted-foreground">Đang tải dữ liệu từ Nemo Cloud...</p>
              </div>
            )}
          </div>
          
          <div className="mt-16 text-center">
            <Link
              href="/courses"
              className="inline-flex items-center space-x-2 text-sm font-bold text-primary hover:underline group"
            >
              <span>Xem tất cả danh mục khóa học</span>
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </section>

        {/* STATS SECTION - Nemo Blue Block */}
        <section className="bg-primary py-20 mb-24 overflow-hidden relative">
          <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.05)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.05)_50%,rgba(255,255,255,0.05)_75%,transparent_75%,transparent)] bg-[length:64px_64px] opacity-10" />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-12 text-white text-center">
              <div className="space-y-2">
                <p className="text-4xl sm:text-5xl font-black tracking-tighter">15k+</p>
                <p className="text-xs font-bold uppercase tracking-widest opacity-80">Học viên tin dùng</p>
              </div>
              <div className="space-y-2">
                <p className="text-4xl sm:text-5xl font-black tracking-tighter">120+</p>
                <p className="text-xs font-bold uppercase tracking-widest opacity-80">Giảng viên kỳ cựu</p>
              </div>
              <div className="space-y-2">
                <p className="text-4xl sm:text-5xl font-black tracking-tighter">98%</p>
                <p className="text-xs font-bold uppercase tracking-widest opacity-80">Tỷ lệ có việc làm</p>
              </div>
              <div className="space-y-2">
                <p className="text-4xl sm:text-5xl font-black tracking-tighter">24/7</p>
                <p className="text-xs font-bold uppercase tracking-widest opacity-80">Hỗ trợ kỹ thuật</p>
              </div>
            </div>
          </div>
        </section>

        {/* INSTRUCTORS SECTION */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-32">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground mb-4">
              Đội ngũ giảng viên thực chiến
            </h2>
            <div className="w-20 h-1.5 bg-primary mx-auto rounded-full" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {dbInstructors.slice(0, 3).map((ins, idx) => (
              <div
                key={ins.id}
                className="group relative bg-card border border-border/60 rounded-3xl p-8 transition-all hover:shadow-2xl hover:-translate-y-2"
              >
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="relative h-24 w-24 mb-2">
                    <div className="absolute inset-0 bg-primary/20 rounded-full scale-110 group-hover:scale-125 transition-transform" />
                    <img 
                      src={ins.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${ins.ho_ten}`} 
                      alt={ins.ho_ten}
                      className="h-full w-full rounded-full object-cover border-4 border-card relative z-10"
                    />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-foreground group-hover:text-primary transition-colors">{ins.ho_ten}</h3>
                    <p className="text-[11px] font-bold text-primary uppercase tracking-widest mb-4">Senior Developer</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Chuyên gia với hơn 10 năm kinh nghiệm trong lĩnh vực {idx % 2 === 0 ? 'Full-stack' : 'Mobile Dev'}.
                    </p>
                  </div>
                  
                  <div className="flex items-center space-x-6 pt-6 border-t border-border/40 w-full justify-center">
                    <div className="text-center">
                      <p className="text-sm font-black text-foreground">{ins.so_luong_hoc_vien}</p>
                      <p className="text-[10px] font-medium text-muted-foreground uppercase">Học viên</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-black text-foreground">{ins.so_luong_khoa_hoc}</p>
                      <p className="text-[10px] font-medium text-muted-foreground uppercase">Khóa học</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
