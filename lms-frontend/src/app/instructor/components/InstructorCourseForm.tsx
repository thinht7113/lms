"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ImagePlus, RefreshCw, Save, Send } from "lucide-react";
import { apiService, Category, Course, CoursePayload } from "@/services/api";

type Props = {
  courseId?: number;
};

const emptyPayload: CoursePayload = {
  tieu_de: "",
  mo_ta: "",
  gia_tien: 0,
  ma_danh_muc: null,
  trinh_do: "beginner",
  anh_dai_dien: "",
  trang_thai_phe_duyet: "draft",
};

export default function InstructorCourseForm({ courseId }: Props) {
  const router = useRouter();
  const isEdit = Boolean(courseId);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState<CoursePayload>(emptyPayload);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiService.getCategories().then(setCategories).catch(console.error);

    if (!courseId) return;
    const activeCourseId = courseId;
    async function loadCourse() {
      setLoading(true);
      setError(null);
      try {
        const course = await apiService.getCourseDetailWithAuth(activeCourseId);
        setForm({
          tieu_de: course.tieu_de,
          mo_ta: course.mo_ta || "",
          gia_tien: Number(course.gia_tien || 0),
          ma_danh_muc: course.ma_danh_muc || null,
          trinh_do: course.trinh_do || "beginner",
          anh_dai_dien: course.anh_dai_dien || "",
          trang_thai_phe_duyet: course.trang_thai_phe_duyet || "draft",
          da_xuat_ban: course.da_xuat_ban,
        });
      } catch (err: any) {
        setError(err.message || "Không thể tải khóa học");
      } finally {
        setLoading(false);
      }
    }
    loadCourse();
  }, [courseId]);

  const updateField = (key: keyof CoursePayload, value: string | number | boolean | null) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const uploadThumbnail = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    try {
      const uploaded = await apiService.uploadFile(file, "lesson-image");
      updateField("anh_dai_dien", uploaded.url);
    } catch (err: any) {
      setError(err.message || "Upload ảnh thất bại");
    } finally {
      setUploading(false);
    }
  };

  const submit = async (review: boolean) => {
    if (!form.tieu_de.trim()) {
      setError("Vui lòng nhập tiêu đề khóa học.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const payload: CoursePayload = {
        ...form,
        gia_tien: Number(form.gia_tien || 0),
        ma_danh_muc: form.ma_danh_muc || null,
        trang_thai_phe_duyet: review ? "pending" : "draft",
        da_xuat_ban: false,
      };

      const course: Course = isEdit && courseId
        ? await apiService.updateInstructorCourse(courseId, payload)
        : await apiService.createInstructorCourse(payload);

      router.push(`/instructor/courses/${course.id}/sections`);
    } catch (err: any) {
      setError(err.message || "Không thể lưu khóa học");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <RefreshCw className="h-10 w-10 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link href="/instructor/courses" className="rounded-2xl border border-slate-200 bg-white p-3 text-slate-500 hover:text-purple-700">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-purple-600">Kênh giảng viên</p>
            <h1 className="text-3xl font-black tracking-tight text-slate-950">
              {isEdit ? "Chỉnh sửa khóa học" : "Tạo khóa học mới"}
            </h1>
          </div>
        </div>
        {isEdit && courseId && (
          <Link
            href={`/instructor/courses/${courseId}/sections`}
            className="rounded-2xl bg-purple-600 px-5 py-3 text-sm font-black text-white shadow-lg hover:bg-purple-700"
          >
            Quản lý chương & bài học
          </Link>
        )}
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="space-y-5 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <label className="text-xs font-black uppercase tracking-widest text-slate-500">Tiêu đề khóa học</label>
            <input
              value={form.tieu_de}
              onChange={(e) => updateField("tieu_de", e.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-purple-400 focus:bg-white"
              placeholder="Ví dụ: FastAPI Backend Mastery"
            />
          </div>

          <div>
            <label className="text-xs font-black uppercase tracking-widest text-slate-500">Mô tả</label>
            <textarea
              value={form.mo_ta || ""}
              onChange={(e) => updateField("mo_ta", e.target.value)}
              rows={8}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium leading-relaxed outline-none focus:border-purple-400 focus:bg-white"
              placeholder="Nội dung khóa học, đối tượng học, kết quả đạt được..."
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="text-xs font-black uppercase tracking-widest text-slate-500">Giá tiền</label>
              <input
                type="number"
                min={0}
                value={form.gia_tien}
                onChange={(e) => updateField("gia_tien", Number(e.target.value || 0))}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-purple-400 focus:bg-white"
              />
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-widest text-slate-500">Trình độ</label>
              <select
                value={form.trinh_do}
                onChange={(e) => updateField("trinh_do", e.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-purple-400 focus:bg-white"
              >
                <option value="beginner">Cơ bản</option>
                <option value="intermediate">Trung cấp</option>
                <option value="advanced">Chuyên sâu</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-widest text-slate-500">Danh mục</label>
              <select
                value={form.ma_danh_muc || ""}
                onChange={(e) => updateField("ma_danh_muc", e.target.value ? Number(e.target.value) : null)}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-purple-400 focus:bg-white"
              >
                <option value="">Chưa chọn</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>{category.ten_danh_muc}</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <aside className="space-y-5 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <label className="text-xs font-black uppercase tracking-widest text-slate-500">Ảnh đại diện khóa học</label>
            <div className="mt-3 overflow-hidden rounded-[1.5rem] border border-slate-200 bg-slate-100">
              {form.anh_dai_dien ? (
                <img src={form.anh_dai_dien} alt="Ảnh khóa học" className="h-56 w-full object-cover" />
              ) : (
                <div className="flex h-56 flex-col items-center justify-center text-slate-400">
                  <ImagePlus className="h-10 w-10" />
                  <span className="mt-2 text-sm font-bold">Chưa có ảnh</span>
                </div>
              )}
            </div>
            <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-purple-200 bg-purple-50 px-4 py-3 text-sm font-black text-purple-700 hover:bg-purple-100">
              {uploading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
              {uploading ? "Đang upload..." : "Upload ảnh"}
              <input type="file" accept="image/png,image/jpeg,image/gif,image/webp" className="hidden" onChange={uploadThumbnail} />
            </label>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
            <p className="font-black text-slate-900">Luồng xuất bản</p>
            <p className="mt-1 leading-relaxed">
              Giảng viên lưu nháp để tiếp tục biên soạn. Khi sẵn sàng, bấm gửi duyệt để admin kiểm tra và xuất bản công khai.
            </p>
          </div>

          <div className="grid gap-3">
            <button
              onClick={() => submit(false)}
              disabled={saving}
              className="flex items-center justify-center gap-2 rounded-2xl bg-amber-100 px-5 py-4 text-sm font-black text-amber-700 shadow-sm hover:bg-amber-200 disabled:opacity-60"     
            >
              {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Lưu bản nháp
            </button>
            <button
              onClick={() => submit(true)}
              disabled={saving}
              className="flex items-center justify-center gap-2 rounded-2xl bg-purple-600 px-5 py-4 text-sm font-black text-white shadow-lg hover:bg-purple-700 disabled:opacity-60"
            >
              {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Gửi admin duyệt
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
