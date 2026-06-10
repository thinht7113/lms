"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, BookOpen, Edit3, Layers, Plus, RefreshCw, Save, Trash2 } from "lucide-react";
import { apiService, CourseDetail, Section } from "@/services/api";

export default function InstructorCourseSectionsPage() {
  const params = useParams();
  const courseId = Number(params.id);
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ tieu_de: "", thu_tu: 1 });

  const loadCourse = async () => {
    setLoading(true);
    setError(null);
    try {
      const detail = await apiService.getCourseDetailWithAuth(courseId);
      detail.chuong_hoc = [...(detail.chuong_hoc || [])].sort((a, b) => a.thu_tu - b.thu_tu);
      setCourse(detail);
    } catch (err: any) {
      setError(err.message || "Không thể tải khóa học");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (courseId) loadCourse();
  }, [courseId]);

  const resetForm = () => {
    setEditingId(null);
    setForm({ tieu_de: "", thu_tu: (course?.chuong_hoc?.length || 0) + 1 });
  };

  const startEdit = (section: Section) => {
    setEditingId(section.id);
    setForm({ tieu_de: section.tieu_de, thu_tu: section.thu_tu });
  };

  const saveSection = async () => {
    if (!form.tieu_de.trim()) {
      setError("Vui lòng nhập tiêu đề chương học.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (editingId) {
        await apiService.updateSection(editingId, form);
      } else {
        await apiService.createSection(courseId, form);
      }
      resetForm();
      await loadCourse();
    } catch (err: any) {
      setError(err.message || "Không thể lưu chương học");
    } finally {
      setSaving(false);
    }
  };

  const deleteSection = async (section: Section) => {
    if (!confirm(`Xóa chương "${section.tieu_de}"? Tất cả bài học bên trong cũng sẽ bị xóa.`)) return;
    setSaving(true);
    setError(null);
    try {
      await apiService.deleteSection(section.id);
      await loadCourse();
    } catch (err: any) {
      setError(err.message || "Không thể xóa chương học");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex min-h-[50vh] items-center justify-center"><RefreshCw className="h-10 w-10 animate-spin text-purple-600" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link href="/instructor/courses" className="rounded-2xl border border-slate-200 bg-white p-3 text-slate-500 hover:text-purple-700">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-purple-600">Biên soạn khóa học</p>
            <h1 className="text-3xl font-black tracking-tight text-slate-950">{course?.tieu_de || "Khóa học"}</h1>
          </div>
        </div>
        <Link href={`/instructor/courses/${courseId}/edit`} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-purple-50 px-5 py-3 text-sm font-black text-purple-700 hover:bg-purple-100">
          <Edit3 className="h-4 w-4" />
          Sửa thông tin khóa
        </Link>
      </div>

      {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">{error}</div>}

      <section className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-black text-slate-950">{editingId ? "Sửa chương học" : "Thêm chương học"}</h2>
          <div className="mt-5 space-y-4">
            <div>
              <label className="text-xs font-black uppercase tracking-widest text-slate-500">Tiêu đề chương</label>
              <input
                value={form.tieu_de}
                onChange={(e) => setForm((prev) => ({ ...prev, tieu_de: e.target.value }))}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-purple-400 focus:bg-white"
                placeholder="Ví dụ: Cơ bản FastAPI & Routing"
              />
            </div>
            <div>
              <label className="text-xs font-black uppercase tracking-widest text-slate-500">Thứ tự</label>
              <input
                type="number"
                value={form.thu_tu}
                onChange={(e) => setForm((prev) => ({ ...prev, thu_tu: Number(e.target.value || 0) }))}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-purple-400 focus:bg-white"
              />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <button onClick={saveSection} disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-purple-600 px-4 py-3 text-sm font-black text-white hover:bg-purple-700 disabled:opacity-60">
                {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {editingId ? "Cập nhật" : "Thêm chương"}
              </button>
              <button onClick={resetForm} className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-200">
                Làm mới
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-5">
            <h2 className="text-lg font-black text-slate-950">Cấu trúc chương học</h2>
          </div>
          {course?.chuong_hoc?.length ? (
            <div className="divide-y divide-slate-100">
              {course.chuong_hoc.map((section) => (
                <article key={section.id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-purple-50 text-sm font-black text-purple-700">
                      {section.thu_tu}
                    </div>
                    <div>
                      <h3 className="font-black text-slate-950">{section.tieu_de}</h3>
                      <p className="mt-1 text-sm font-medium text-slate-500">{section.bai_hoc?.length || 0} bài học</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link href={`/instructor/courses/${courseId}/sections/${section.id}/lessons`} className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-xs font-black text-white hover:bg-purple-500 shadow-sm">
                      <BookOpen className="h-4 w-4" />
                      Bài học
                    </Link>
                    <button onClick={() => startEdit(section)} className="inline-flex items-center gap-2 rounded-xl bg-purple-50 px-4 py-2.5 text-xs font-black text-purple-700 hover:bg-purple-100">
                      <Edit3 className="h-4 w-4" />
                      Sửa
                    </button>
                    <button onClick={() => deleteSection(section)} className="inline-flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-2.5 text-xs font-black text-rose-700 hover:bg-rose-100">
                      <Trash2 className="h-4 w-4" />
                      Xóa
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center">
              <Layers className="mx-auto h-12 w-12 text-slate-300" />
              <h3 className="mt-4 text-xl font-black text-slate-950">Chưa có chương học</h3>
              <p className="mt-2 text-sm font-medium text-slate-500">Thêm chương đầu tiên để bắt đầu xây dựng bài học.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
