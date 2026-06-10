"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Edit3, FileText, Plus, RefreshCw, Trash2, Video } from "lucide-react";
import { apiService, CourseDetail, Lesson } from "@/services/api";

export default function InstructorLessonsPage() {
  const params = useParams();
  const courseId = Number(params.id);
  const sectionId = Number(params.sectionId);
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const loadCourse = async () => {
    setLoading(true);
    setError(null);
    try {
      setCourse(await apiService.getCourseDetailWithAuth(courseId));
    } catch (err: any) {
      setError(err.message || "Không thể tải bài học");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (courseId) loadCourse();
  }, [courseId]);

  const section = useMemo(() => course?.chuong_hoc?.find((item) => item.id === sectionId), [course, sectionId]);
  const lessons = useMemo(() => [...(section?.bai_hoc || [])].sort((a, b) => a.thu_tu - b.thu_tu), [section]);

  const deleteLesson = async (lesson: Lesson) => {
    if (!confirm(`Xóa bài học "${lesson.tieu_de}"?`)) return;
    setDeletingId(lesson.id);
    setError(null);
    try {
      await apiService.deleteLesson(lesson.id);
      await loadCourse();
    } catch (err: any) {
      setError(err.message || "Không thể xóa bài học");
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return <div className="flex min-h-[50vh] items-center justify-center"><RefreshCw className="h-10 w-10 animate-spin text-purple-600" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/instructor/courses/${courseId}/sections`} className="rounded-2xl border border-slate-200 bg-white p-3 text-slate-500 hover:text-purple-700">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-purple-600">{course?.tieu_de}</p>
            <h1 className="text-3xl font-black tracking-tight text-slate-950">{section?.tieu_de || "Bài học"}</h1>
          </div>
        </div>
        <Link href={`/instructor/courses/${courseId}/sections/${sectionId}/lessons/create`} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-purple-600 px-5 py-4 text-sm font-black text-white shadow-lg shadow-purple-200 hover:bg-purple-700">
          <Plus className="h-4 w-4" />
          Tạo bài học
        </Link>
      </div>

      {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">{error}</div>}

      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-5">
          <h2 className="text-lg font-black text-slate-950">Danh sách bài học</h2>
        </div>
        {lessons.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="mx-auto h-12 w-12 text-slate-300" />
            <h3 className="mt-4 text-xl font-black text-slate-950">Chưa có bài học</h3>
            <p className="mt-2 text-sm font-medium text-slate-500">Tạo bài học đầu tiên và thêm các block multimedia.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {lessons.map((lesson) => (
              <article key={lesson.id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-purple-50 text-sm font-black text-purple-700">
                    {lesson.thu_tu}
                  </div>
                  <div>
                    <h3 className="font-black text-slate-950">{lesson.tieu_de}</h3>
                    <p className="mt-1 text-sm font-medium text-slate-500">
                      {Math.floor(Number(lesson.thoi_luong || 0) / 60)} phút • {lesson.noi_dung?.length || 0} block nội dung
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {lesson.xem_truoc && <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-700">Học thử</span>}
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-600">{lesson.da_xuat_ban ? "Công khai" : "Nháp"}</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link href={`/learn/${courseId}?lesson=${lesson.id}`} className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2.5 text-xs font-black text-slate-700 hover:bg-slate-200">
                    <Video className="h-4 w-4" />
                    Xem thử
                  </Link>
                  <Link href={`/instructor/courses/${courseId}/sections/${sectionId}/lessons/${lesson.id}/edit`} className="inline-flex items-center gap-2 rounded-xl bg-purple-50 px-4 py-2.5 text-xs font-black text-purple-700 hover:bg-purple-100">
                    <Edit3 className="h-4 w-4" />
                    Sửa
                  </Link>
                  <button onClick={() => deleteLesson(lesson)} disabled={deletingId === lesson.id} className="inline-flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-2.5 text-xs font-black text-rose-700 hover:bg-rose-100 disabled:opacity-60">
                    {deletingId === lesson.id ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    Xóa
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
