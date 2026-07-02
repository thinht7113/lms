"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen, CheckCircle2, Clock, RefreshCw, Star, TrendingUp, Users, Wallet, Plus } from "lucide-react";
import { apiService, Course, tokenHelper } from "@/services/api";

export default function InstructorDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const currentUser = tokenHelper.getCurrentUser();
    if (!currentUser || (currentUser.vai_tro !== "instructor" && currentUser.vai_tro !== "admin")) {
      router.push("/login");
      return;
    }

    setUser(currentUser);

    async function loadInstructorData() {
      setLoading(true);
      setError(null);
      try {
        const [courseData, statsData] = await Promise.all([
          apiService.getInstructorCourses(),
          apiService.getInstructorStudioStats()
        ]);
        setCourses(courseData);
        setStats(statsData);
      } catch (err: any) {
        setError(err.message || "Không thể tải dữ liệu giảng viên.");
      } finally {
        setLoading(false);
      }
    }

    loadInstructorData();
  }, [router]);

  const dashboardStats = [
    { label: "Tổng học viên", value: (stats?.total_students || 0).toLocaleString(), icon: Users, color: "text-primary", bg: "bg-primary/10" },
    { label: "Khóa học", value: (stats?.total_courses || 0).toString(), icon: BookOpen, color: "text-indigo-500", bg: "bg-indigo-500/10" },
    { label: "Đánh giá", value: (stats?.average_rating || 5.0).toFixed(1), icon: Star, color: "text-amber-500", bg: "bg-amber-500/10" },
    { label: "Tổng doanh thu", value: (stats?.total_revenue || 0).toLocaleString('vi-VN') + " đ", icon: Wallet, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  ];

  if (!user) return null;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
        </div>
        <Link
          href="/instructor/courses/create"
          className="w-fit inline-flex items-center gap-2 bg-primary hover:bg-primary/95 text-white px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-lg shadow-blue-200"
        >
          <Plus className="w-4 h-4" /> Tạo khóa học mới
        </Link>
      </div>

      {loading ? (
        <div className="flex h-72 items-center justify-center rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          <RefreshCw className="h-9 w-9 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="rounded-[2rem] border border-red-200 bg-red-50 p-8 text-red-700">
          <p className="font-black">Không thể tải dữ liệu giảng viên</p>
          <p className="mt-2 text-sm">{error}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {dashboardStats.map((stat) => (
              <div key={stat.label} className="bg-white border border-slate-200/60 rounded-[1.5rem] p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                <div className={`absolute -right-6 -top-6 w-24 h-24 ${stat.bg} rounded-full blur-2xl opacity-50`} />
                <div className="flex justify-between items-start relative z-10">
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
                    <p className="text-2xl font-black text-slate-800">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color}`}>
                    <stat.icon className="h-6 w-6" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-white border border-slate-200/60 rounded-[2rem] p-8 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
                <h3 className="font-black text-lg text-slate-800 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  <span>Khóa học của bạn</span>
                </h3>
                <Link href="/instructor/courses" className="text-xs font-black uppercase tracking-widest text-primary hover:text-primary/80">
                  Xem tất cả
                </Link>
              </div>

              {courses.length === 0 ? (
                <div className="flex min-h-[260px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 text-center">
                  <BookOpen className="h-12 w-12 text-slate-300" />
                  <p className="mt-4 font-bold text-slate-700">Bạn chưa có khóa học nào</p>
                  <Link href="/instructor/courses/create" className="mt-4 rounded-2xl bg-primary px-5 py-3 text-sm font-black text-white hover:bg-primary/95">
                    Bắt đầu ngay
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {courses.slice(0, 6).map((course) => (
                    <div key={course.id} className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-4 sm:flex-row sm:items-center sm:justify-between hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 overflow-hidden shrink-0">
                          {course.anh_dai_dien ? (
                            <img src={course.anh_dai_dien} className="w-full h-full object-cover" alt="" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-primary font-black text-xs">COURSE</div>
                          )}
                        </div>
                        <div>
                          <p className="font-black text-slate-900 line-clamp-1">{course.tieu_de}</p>
                          <p className="mt-0.5 text-xs font-bold text-slate-500 uppercase tracking-widest">
                            {course.so_luong_hoc_vien || 0} Học viên • {Number(course.danh_gia_trung_binh || 0).toFixed(1)} <Star className="inline w-2.5 h-2.5 fill-current" />
                          </p>
                        </div>
                      </div>
                      <Link
                        href={`/instructor/courses/${course.id}/edit`}
                        className="w-fit rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-600 hover:bg-slate-900 hover:text-white transition-all shadow-sm"
                      >
                        Chỉnh sửa
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="lg:col-span-1 space-y-6">
              <div className="rounded-[2rem] p-8 text-black shadow-xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/30 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-primary/50 transition-colors"></div>
                <div className="relative z-10 space-y-6">
                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-primary/80">Doanh thu tạm tính</p>
                    <p className="text-3xl font-black">{(stats?.total_revenue * 0.7 || 0).toLocaleString('vi-VN')} đ</p>
                  </div>
                  <button onClick={() => router.push('/instructor/revenue')} className="w-full bg-white text-slate-900 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-primary/10 hover:text-primary transition-colors">
                    Xem chi tiết ví
                  </button>
                </div>
              </div>

              <div className="bg-white border border-slate-200/60 rounded-[2rem] p-8 shadow-sm space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <h3 className="font-black text-lg text-slate-800">Cần chú ý</h3>
                  <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse"></span>
                </div>

                {courses.filter(c => c.trang_thai_phe_duyet === "pending").length === 0 ? (
                  <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-5 text-emerald-700">
                    <CheckCircle2 className="h-6 w-6" />
                    <p className="mt-3 text-sm font-bold">Tất cả bài giảng đã được duyệt.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {courses.filter(c => c.trang_thai_phe_duyet === "pending").slice(0, 3).map((course) => (
                      <div key={course.id} className="flex gap-4 p-4 rounded-2xl bg-amber-50 border border-amber-100 items-start">
                        <div className="bg-amber-500/10 p-2 rounded-xl text-amber-600 shrink-0">
                          <Clock className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-bold text-sm text-amber-900 leading-tight">{course.tieu_de}</p>
                          <p className="text-xs text-amber-700/70 mt-1 uppercase font-black tracking-widest">
                            Đang chờ duyệt
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
