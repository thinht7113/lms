"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BookOpen, Heart, Bell, Award, Star, Compass, Play, RefreshCw, User, Settings, ShieldCheck, ChevronRight } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { apiService, Course, CourseProgress } from "@/services/api";

export default function StudentDashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"my-courses" | "wishlist" | "notifications" | "certificates">("my-courses");
  const [enrolledCourses, setEnrolledCourses] = useState<Course[]>([]);
  const [progressMap, setProgressMap] = useState<Record<number, CourseProgress>>({});
  const [wishlist, setWishlist] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("lumina_token");
    if (!token) {
      router.push("/login");
      return;
    }

    async function loadDashboardData() {
      setLoading(true);
      try {
        const [profile, courses, wishlistData] = await Promise.all([
            apiService.getProfile(),
            apiService.getMyEnrolledCourses(),
            apiService.getWishlist()
        ]);
        
        setUserProfile(profile);
        setEnrolledCourses(courses);
        setWishlist(wishlistData);

        const progressList = await Promise.all(
          courses.map(async (c) => {
            try {
              const prog = await apiService.getCourseProgress(c.id);
              return { courseId: c.id, data: prog };
            } catch {
              return { courseId: c.id, data: { course_id: c.id, total_lessons: 0, completed_lessons: 0, progress_percentage: 0 }};
            }
          })
        );

        const progressObj: Record<number, CourseProgress> = {};
        progressList.forEach((item) => { progressObj[item.courseId] = item.data; });
        setProgressMap(progressObj);
      } catch (err) {
        console.error("Error loading dashboard data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, [router]);

  const getGradient = (index: number) => {
    const gradients = ["from-blue-600 to-indigo-700", "from-slate-700 to-slate-900", "from-indigo-500 to-blue-500"];
    return gradients[index % gradients.length];
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="flex flex-col items-center justify-center h-screen space-y-4">
          <RefreshCw className="h-10 w-10 text-primary animate-spin" />
          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Khởi tạo không gian học tập Nemo...</p>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-[#F8F9FA] pt-32 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* NEMO USER BANNER */}
          <div className="relative overflow-hidden bg-slate-900 rounded-[2rem] p-8 sm:p-12 text-white mb-12 shadow-2xl">
              <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-primary/20 to-transparent z-0" />
              <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-8">
                  <div className="relative">
                    <img 
                        src={userProfile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userProfile?.ho_ten}`} 
                        className="w-24 h-24 sm:w-32 sm:h-32 rounded-3xl object-cover border-4 border-white/10 shadow-xl"
                    />
                    <div className="absolute -bottom-2 -right-2 bg-primary p-2 rounded-xl shadow-lg">
                        <Award className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  <div className="space-y-4 text-center md:text-left flex-grow">
                      <div className="space-y-1">
                        <h1 className="text-3xl sm:text-4xl font-black tracking-tighter">
                            Chào {userProfile?.ho_ten?.split(' ').pop()}, sẵn sàng chinh phục <span className="text-primary italic">Code</span> mới?
                        </h1>
                        <p className="text-slate-400 text-sm font-medium">Học viên hạng Diamond • Hoàn thành 12 bài giảng tuần này</p>
                      </div>
                      
                      <div className="flex flex-wrap justify-center md:justify-start gap-4">
                          <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-xl backdrop-blur-sm">
                             <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Khóa học</p>
                             <p className="text-xl font-black">{enrolledCourses.length}</p>
                          </div>
                          <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-xl backdrop-blur-sm">
                             <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Chứng chỉ</p>
                             <p className="text-xl font-black">0</p>
                          </div>
                          <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-xl backdrop-blur-sm">
                             <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Nemo Points</p>
                             <p className="text-xl font-black text-amber-400">1,250</p>
                          </div>
                      </div>
                  </div>
                  <div className="shrink-0 flex items-center">
                      <Link href="/settings" className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all border border-white/5">
                        <Settings className="w-6 h-6" />
                      </Link>
                  </div>
              </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            {/* SIDEBAR TABS */}
            <aside className="lg:col-span-3 space-y-4">
                <div className="bg-card border border-border/60 rounded-[1.5rem] p-4 shadow-sm space-y-1">
                    {[
                        { id: "my-courses", label: "Khóa học của tôi", icon: BookOpen },
                        { id: "wishlist", label: "Danh sách yêu thích", icon: Heart },
                        { id: "certificates", label: "Chứng chỉ của tôi", icon: ShieldCheck },
                        { id: "notifications", label: "Thông báo hệ thống", icon: Bell },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer ${
                                activeTab === tab.id 
                                ? "bg-primary text-white shadow-lg shadow-primary/25" 
                                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                            }`}
                        >
                            <div className="flex items-center space-x-3">
                                <tab.icon className="w-4 h-4" />
                                <span>{tab.label}</span>
                            </div>
                            <ChevronRight className={`w-3 h-3 opacity-50 ${activeTab === tab.id ? 'block' : 'hidden'}`} />
                        </button>
                    ))}
                </div>
            </aside>

            {/* MAIN CONTENT AREA */}
            <section className="lg:col-span-9">
                {activeTab === "my-courses" && (
                    <div className="space-y-8">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-black tracking-tight">Tiến độ học tập</h2>
                        </div>
                        
                        {enrolledCourses.length === 0 ? (
                            <div className="bg-card border border-dashed border-border rounded-[2rem] py-20 text-center space-y-6">
                                <Compass className="w-12 h-12 text-muted-foreground mx-auto" />
                                <div className="space-y-1">
                                    <p className="font-bold">Chưa có dữ liệu học tập</p>
                                    <p className="text-xs text-muted-foreground">Hãy bắt đầu hành trình của bạn bằng cách đăng ký khóa học Nemo.</p>
                                </div>
                                <Link href="/courses" className="inline-block bg-primary text-white font-black text-[11px] uppercase tracking-widest px-8 py-3 rounded-xl shadow-lg shadow-primary/20">Khám phá ngay</Link>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {enrolledCourses.map((c, i) => {
                                    const prog = progressMap[c.id] || { progress_percentage: 0, completed_lessons: 0, total_lessons: 0 };
                                    return (
                                        <div key={c.id} className="group bg-card border border-border/50 rounded-[2rem] overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500">
                                            <div className={`h-40 bg-gradient-to-br ${getGradient(i)} relative flex items-center justify-center p-6 text-white text-center`}>
                                                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-all" />
                                                <h3 className="relative z-10 font-black text-base line-clamp-2 drop-shadow-md">{c.tieu_de}</h3>
                                            </div>
                                            <div className="p-6 space-y-6">
                                                <div className="space-y-3">
                                                    <div className="flex justify-between items-end">
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Hoàn thành</span>
                                                        <span className="text-sm font-black text-primary">{Math.round(prog.progress_percentage)}%</span>
                                                    </div>
                                                    <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                                                        <div className="h-full bg-primary rounded-full transition-all duration-1000" style={{ width: `${prog.progress_percentage}%` }} />
                                                    </div>
                                                    <p className="text-[10px] font-bold text-slate-400 text-right italic">Đã học {prog.completed_lessons}/{prog.total_lessons} bài giảng</p>
                                                </div>
                                                
                                                <Link 
                                                    href={`/learn/${c.id}`}
                                                    className="flex items-center justify-center space-x-2 w-full bg-slate-900 text-white py-3.5 rounded-2xl font-black text-[11px] uppercase tracking-[0.1em] hover:bg-primary transition-all shadow-lg group-hover:shadow-primary/20"
                                                >
                                                    <Play className="w-4 h-4 fill-current" />
                                                    <span>Tiếp tục học tập</span>
                                                </Link>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === "wishlist" && (
                    <div className="space-y-8 text-center py-20">
                         <Heart className="w-12 h-12 text-primary mx-auto opacity-20" />
                         <p className="font-bold text-muted-foreground">Danh sách yêu thích đang trống.</p>
                    </div>
                )}
                
                {activeTab === "certificates" && (
                    <div className="space-y-8 text-center py-20">
                         <ShieldCheck className="w-12 h-12 text-primary mx-auto opacity-20" />
                         <p className="font-bold text-muted-foreground">Bạn chưa hoàn thành khóa học nào để nhận chứng chỉ.</p>
                    </div>
                )}
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
