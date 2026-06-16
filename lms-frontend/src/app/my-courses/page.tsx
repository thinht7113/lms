"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BookOpenText,
  CheckCircle2,
  Clock3,
  Compass,
  GraduationCap,
  LibraryBig,
  Play,
  RefreshCw,
  Search,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { apiService, Course, CourseProgress, Quiz, tokenHelper } from "@/services/api";
import { useToast } from "@/contexts/ToastContext";

type CourseFilter = "all" | "learning" | "completed";

const emptyProgress = (courseId: number): CourseProgress => ({
  course_id: courseId,
  total_lessons: 0,
  completed_lessons: 0,
  progress_percentage: 0,
});

function formatPrice(value: number) {
  return Number(value || 0) === 0 ? "Miễn phí" : `${Number(value || 0).toLocaleString("vi-VN")} đ`;
}

export default function MyCoursesPage() {
  const router = useRouter();
  const toast = useToast();
  const [courses, setCourses] = useState<Course[]>([]);
  const [progressMap, setProgressMap] = useState<Record<number, CourseProgress>>({});
  const [quizzesMap, setQuizzesMap] = useState<Record<number, Quiz[]>>({});
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<CourseFilter>("all");
  const [claimingCertificateId, setClaimingCertificateId] = useState<number | null>(null);

  useEffect(() => {
    if (!tokenHelper.getToken()) {
      router.push("/login");
      return;
    }

    async function loadData() {
      setLoading(true);
      try {
        const dashboard = await apiService.getMyDashboard();
        setCourses(dashboard.courses || []);
        setProgressMap(dashboard.progress_map || {});
        setQuizzesMap(dashboard.quizzes_map || {});
      } catch (err) {
        console.error("Failed to load dashboard data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [router]);

  const metrics = useMemo(() => {
    const completedCourses = courses.filter((course) => (progressMap[course.id]?.progress_percentage || 0) >= 100).length;
    const completedLessons = courses.reduce((sum, course) => sum + Number(progressMap[course.id]?.completed_lessons || 0), 0);
    const totalLessons = courses.reduce((sum, course) => sum + Number(progressMap[course.id]?.total_lessons || 0), 0);

    return {
      totalCourses: courses.length,
      completedCourses,
      completedLessons,
      totalLessons,
    };
  }, [courses, progressMap]);

  const continueCourse = useMemo(() => {
    return courses
      .map((course) => ({ course, progress: progressMap[course.id] || emptyProgress(course.id) }))
      .sort((a, b) => {
        const aProgress = a.progress.progress_percentage || 0;
        const bProgress = b.progress.progress_percentage || 0;
        if (aProgress > 0 && aProgress < 100 && (bProgress === 0 || bProgress >= 100)) return -1;
        if (bProgress > 0 && bProgress < 100 && (aProgress === 0 || aProgress >= 100)) return 1;
        return bProgress - aProgress;
      })[0];
  }, [courses, progressMap]);

  const filteredCourses = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return courses.filter((course) => {
      const progress = progressMap[course.id] || emptyProgress(course.id);
      const matchesQuery = !normalizedQuery || course.tieu_de.toLowerCase().includes(normalizedQuery);
      const matchesFilter =
        filter === "all" ||
        (filter === "learning" && progress.progress_percentage < 100) ||
        (filter === "completed" && progress.progress_percentage >= 100);
      return matchesQuery && matchesFilter;
    });
  }, [courses, progressMap, query, filter]);

  const tabs: { id: CourseFilter; label: string }[] = [
    { id: "all", label: "Tất cả" },
    { id: "learning", label: "Đang học" },
    { id: "completed", label: "Đã hoàn thành" },
  ];

  const handleClaimCertificate = async (courseId: number) => {
    setClaimingCertificateId(courseId);
    try {
      const certificate = await apiService.issueOrGetCertificate(courseId);
      toast.success("Đã cấp chứng chỉ cho khóa học");
      if (certificate.uuid) {
        router.push(`/certificates/${certificate.uuid}`);
      } else {
        router.push("/certificates");
      }
    } catch (err: any) {
      toast.error(err.message || "Bạn chưa đủ điều kiện nhận chứng chỉ");
    } finally {
      setClaimingCertificateId(null);
    }
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[#f7f8ff] pt-32 pb-20 text-slate-950">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <section className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-600">Không gian học tập</p>
            </div>

            <div className="relative w-full max-w-md">
              <Search className="absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Tìm kiếm khóa học..."
                className="h-16 w-full rounded-[2rem] border border-slate-200 bg-white/80 pl-14 pr-5 text-sm font-bold shadow-sm outline-none ring-0 transition focus:border-blue-300 focus:bg-white focus:shadow-md"
              />
            </div>
          </section>

          {loading ? (
            <div className="flex h-96 flex-col items-center justify-center gap-4 rounded-[2rem] border border-slate-200 bg-white shadow-sm">
              <RefreshCw className="h-9 w-9 animate-spin text-blue-600" />
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">Đang tải khóa học...</p>
            </div>
          ) : courses.length === 0 ? (
            <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white py-24 text-center shadow-sm">
              <Compass className="mx-auto h-14 w-14 text-slate-300" />
              <h2 className="mt-5 text-2xl font-black text-slate-950">Bạn chưa có khóa học nào</h2>
              <p className="mx-auto mt-2 max-w-md text-sm font-medium text-slate-500">
                Hãy chọn một khóa học phù hợp để bắt đầu hành trình học tập.
              </p>
              <Link href="/courses" className="mt-7 inline-flex rounded-2xl bg-blue-600 px-7 py-3 text-sm font-black text-white shadow-lg shadow-blue-200 hover:bg-blue-700">
                Khám phá khóa học
              </Link>
            </div>
          ) : (
            <div className="grid gap-8 lg:grid-cols-[1fr_390px]">
              <div className="space-y-8">
                <div className="grid gap-5 md:grid-cols-3">
                  {[
                    { label: "Tổng khóa học", value: metrics.totalCourses, icon: LibraryBig, color: "text-blue-600", bg: "bg-blue-50" },
                    { label: "Đã hoàn thành", value: metrics.completedCourses, icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-50" },
                    { label: "Bài đã học", value: `${metrics.completedLessons}/${metrics.totalLessons}`, icon: Clock3, color: "text-amber-500", bg: "bg-amber-50" },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.label} className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
                        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${item.bg} ${item.color}`}>
                          <Icon className="h-6 w-6" />
                        </div>
                        <p className="mt-8 text-sm font-bold text-slate-500">{item.label}</p>
                        <p className="mt-2 text-3xl font-black tracking-tight text-slate-950">{item.value}</p>
                      </div>
                    );
                  })}
                </div>

                {continueCourse && (
                  <section className="space-y-5">
                    <h2 className="text-2xl font-black tracking-tight">Tiếp tục học</h2>
                    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
                      <div className="grid gap-6 md:grid-cols-[1fr_220px] md:items-center">
                        <div>
                          <h3 className="text-2xl font-black leading-tight">{continueCourse.course.tieu_de}</h3>
                          <p className="mt-2 text-sm font-medium text-slate-500">
                            {continueCourse.progress.completed_lessons}/{continueCourse.progress.total_lessons} bài học đã hoàn thành
                          </p>
                          <div className="mt-6 max-w-xl">
                            <div className="mb-2 flex justify-between text-sm font-black">
                              <span className="text-slate-500">Tiến độ học tập</span>
                              <span className="text-blue-600">{Math.round(continueCourse.progress.progress_percentage || 0)}%</span>
                            </div>
                            <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className="h-full rounded-full bg-blue-600 transition-all"
                                style={{ width: `${Math.min(100, continueCourse.progress.progress_percentage || 0)}%` }}
                              />
                            </div>
                          </div>
                        </div>
                        <Link href={`/learn/${continueCourse.course.id}`} className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 text-sm font-black text-white shadow-lg shadow-blue-200 hover:bg-blue-700">
                          Tiếp tục học
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>
                  </section>
                )}

                <section className="space-y-6">
                  <div className="border-b border-slate-200">
                    <div className="flex gap-8">
                      {tabs.map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => setFilter(tab.id)}
                          className={`border-b-2 pb-4 text-sm font-black transition ${
                            filter === tab.id ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-900"
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {filteredCourses.length === 0 ? (
                    <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-white p-10 text-center">
                      <BookOpenText className="mx-auto h-10 w-10 text-slate-300" />
                      <p className="mt-3 text-sm font-bold text-slate-500">Không có khóa học phù hợp bộ lọc.</p>
                    </div>
                  ) : (
                    <div className="grid gap-6 md:grid-cols-2">
                      {filteredCourses.map((course) => {
                        const progress = progressMap[course.id] || emptyProgress(course.id);
                        const percent = Math.round(progress.progress_percentage || 0);
                        const isCompleted = percent >= 100;

                        return (
                          <article key={course.id} className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
                            <div className="flex gap-4">
                              <div className="relative h-20 w-24 shrink-0 overflow-hidden rounded-2xl bg-slate-100">
                                {course.anh_dai_dien ? (
                                  <Image
                                    src={course.anh_dai_dien}
                                    alt={course.tieu_de}
                                    fill
                                    sizes="96px"
                                    className="object-cover"
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center text-slate-300">
                                    <GraduationCap className="h-8 w-8" />
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0">
                                <h3 className="line-clamp-2 text-xl font-black leading-tight">{course.tieu_de}</h3>
                                <p className="mt-2 text-sm font-medium text-slate-500">
                                  {course.trinh_do === "beginner" ? "Cơ bản" : course.trinh_do === "intermediate" ? "Trung cấp" : "Chuyên sâu"} • {formatPrice(course.gia_tien)}
                                </p>
                              </div>
                            </div>

                            <div className="mt-6">
                              <div className="mb-2 flex justify-between text-sm font-black">
                                <span className="text-slate-500">Tiến độ</span>
                                <span className={isCompleted ? "text-emerald-500" : "text-blue-600"}>{percent}%</span>
                              </div>
                              <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                                <div
                                  className={`h-full rounded-full transition-all ${isCompleted ? "bg-emerald-500" : "bg-blue-600"}`}
                                  style={{ width: `${Math.min(100, percent)}%` }}
                                />
                              </div>
                            </div>



                            <div className="mt-6 flex gap-3">
                              <Link
                                href={`/learn/${course.id}`}
                                className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl border border-blue-600 text-sm font-black text-blue-600 transition hover:bg-blue-600 hover:text-white"
                              >
                                {isCompleted ? "Ôn tập lại" : "Vào lớp học"}
                                <Play className="h-4 w-4 fill-current" />
                              </Link>

                              {isCompleted && (
                                <button
                                  type="button"
                                  onClick={() => handleClaimCertificate(course.id)}
                                  disabled={claimingCertificateId === course.id}
                                  className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-50 text-sm font-black text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
                                >
                                  {claimingCertificateId === course.id ? "Đang xử lý..." : "Chứng chỉ"}
                                </button>
                              )}
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </section>
              </div>

              <aside className="space-y-6">
                <section className="rounded-[1.5rem] bg-[#eef2ff] p-6">
                  <h2 className="text-2xl font-black tracking-tight">Khám phá thêm</h2>
                  <p className="mt-4 text-sm font-medium leading-relaxed text-slate-600">
                    Tìm thêm khóa học phù hợp với mục tiêu học tập hiện tại của bạn.
                  </p>
                  <Link href="/courses" className="mt-6 flex h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-sm font-black text-blue-600 shadow-sm hover:bg-blue-600 hover:text-white">
                    Xem đề xuất
                  </Link>
                </section>
              </aside>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
