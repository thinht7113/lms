"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BookOpen, ClipboardList, Edit3, Layers, Plus, RefreshCw, Users } from "lucide-react";
import { apiService, Course } from "@/services/api";

const statusLabel: Record<string, string> = {
  draft: "Bản nháp",
  pending: "Đang đợi phê duyệt",
  approved: "Đã duyệt",
  rejected: "Từ chối",
};

const statusClass: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600",
  pending: "bg-amber-100 text-amber-700 ring-1 ring-amber-200",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-rose-100 text-rose-700",
};

export default function InstructorCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCourses() {
      setLoading(true);
      setError(null);
      try {
        setCourses(await apiService.getInstructorCourses());
      } catch (err: any) {
        setError(err.message || "Không thể tải khóa học");
      } finally {
        setLoading(false);
      }
    }
    loadCourses();
  }, []);

  const metrics = useMemo(() => {
    return {
      total: courses.length,
      pending: courses.filter((course) => course.trang_thai_phe_duyet === "pending").length,
      approved: courses.filter((course) => course.trang_thai_phe_duyet === "approved").length,
      students: courses.reduce((sum, course) => sum + Number(course.so_luong_hoc_vien || 0), 0),
    };
  }, [courses]);

  const pendingCourses = useMemo(
    () => courses.filter((course) => course.trang_thai_phe_duyet === "pending"),
    [courses]
  );

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col gap-4 rounded-[2rem] bg-white border border-slate-200 p-8 text-slate-900 shadow-sm relative overflow-hidden sm:flex-row sm:items-center sm:justify-between">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-purple-50 to-blue-50 mix-blend-multiply"></div>
        <div className="relative z-10">
          <p className="text-xs font-black uppercase tracking-widest text-purple-600">Quản lý học liệu</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">Khóa học của tôi</h1>
          <p className="mt-2 max-w-2xl text-sm font-medium text-slate-500">
            Tạo khóa học, xây dựng chương học, thêm bài học multimedia và gửi admin duyệt trước khi công khai.
          </p>
        </div>
        <Link
          href="/instructor/courses/create"
          className="relative z-10 inline-flex items-center justify-center gap-2 rounded-2xl bg-purple-600 px-5 py-4 text-sm font-black text-white shadow-lg shadow-purple-950/40 hover:bg-purple-500"
        >
          <Plus className="h-4 w-4" />
          Tạo khóa học
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: "Tổng khóa học", value: metrics.total, icon: BookOpen },
          { label: "Đang đợi phê duyệt", value: metrics.pending, icon: RefreshCw },
          { label: "Đã duyệt", value: metrics.approved, icon: Layers },
          { label: "Học viên", value: metrics.students, icon: Users },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
              <Icon className="h-5 w-5 text-purple-600" />
              <p className="mt-4 text-2xl font-black text-slate-950">{item.value}</p>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500">{item.label}</p>
            </div>
          );
        })}
      </div>

      {pendingCourses.length > 0 && (
        <section className="rounded-[1.5rem] border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-start gap-3">
            <RefreshCw className="mt-0.5 h-5 w-5 text-amber-600" />
            <div>
              <h2 className="text-sm font-black text-amber-900">Khóa học đang đợi admin phê duyệt</h2>
              <p className="mt-1 text-sm font-medium text-amber-800">
                Các khóa học này chưa được công khai cho học viên cho đến khi admin duyệt.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {pendingCourses.map((course) => (
                  <Link
                    key={course.id}
                    href={`/instructor/courses/${course.id}/edit`}
                    className="rounded-full bg-white px-4 py-2 text-xs font-black text-amber-700 shadow-sm ring-1 ring-amber-100 hover:bg-amber-100"
                  >
                    {course.tieu_de}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">{error}</div>}

      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-5">
          <h2 className="text-lg font-black text-slate-950">Danh sách khóa học</h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-12">
            <RefreshCw className="h-8 w-8 animate-spin text-purple-600" />
          </div>
        ) : courses.length === 0 ? (
          <div className="p-12 text-center">
            <BookOpen className="mx-auto h-12 w-12 text-slate-300" />
            <h3 className="mt-4 text-xl font-black text-slate-950">Bạn chưa có khóa học nào</h3>
            <p className="mt-2 text-sm font-medium text-slate-500">Hãy tạo khóa học đầu tiên rồi thêm chương và bài học.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {courses.map((course) => (
              <article key={course.id} className="grid gap-4 p-5 lg:grid-cols-[120px_1fr_auto] lg:items-center">
                <div className="h-24 overflow-hidden rounded-2xl bg-slate-100">
                  {course.anh_dai_dien ? (
                    <img src={course.anh_dai_dien} alt={course.tieu_de} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-slate-400"><BookOpen className="h-8 w-8" /></div>
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${statusClass[course.trang_thai_phe_duyet] || "bg-purple-50 text-purple-700"}`}>
                      {statusLabel[course.trang_thai_phe_duyet] || course.trang_thai_phe_duyet}
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-600">
                      {course.da_xuat_ban ? "Đang công khai" : "Chưa công khai"}
                    </span>
                  </div>
                  <h3 className="mt-3 truncate text-lg font-black text-slate-950">{course.tieu_de}</h3>
                  <p className="mt-1 line-clamp-2 text-sm font-medium text-slate-500">{course.mo_ta || "Chưa có mô tả"}</p>
                  <p className="mt-2 text-sm font-black text-purple-700">{Number(course.gia_tien).toLocaleString("vi-VN")} đ</p>
                </div>

                <div className="flex flex-wrap gap-2 lg:justify-end">
                  <Link href={`/instructor/courses/${course.id}/sections`} className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-xs font-black text-white hover:bg-purple-500 shadow-sm">
                    <Layers className="h-4 w-4" />
                    Nội dung
                  </Link>
                  <Link href={`/instructor/courses/${course.id}/edit`} className="inline-flex items-center gap-2 rounded-xl bg-purple-50 px-4 py-2.5 text-xs font-black text-purple-700 hover:bg-purple-100">
                    <Edit3 className="h-4 w-4" />
                    Sửa
                  </Link>
                  <Link href={`/instructor/courses/${course.id}/students`} className="inline-flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-2.5 text-xs font-black text-emerald-700 hover:bg-emerald-100">
                    <Users className="h-4 w-4" />
                    Học viên
                  </Link>
                  <Link href={`/instructor/courses/${course.id}/quizzes`} className="inline-flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-2.5 text-xs font-black text-amber-700 hover:bg-amber-100">
                    <ClipboardList className="h-4 w-4" />
                    Quiz
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
