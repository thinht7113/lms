"use client";

import React, { useEffect, useState } from "react";
import { Plus, RefreshCw, ShieldCheck, Trash2 } from "lucide-react";
import { apiService, Enrollment } from "@/services/api";
import { useToast } from "@/contexts/ToastContext";

export default function AdminEnrollmentsPage() {
  const toast = useToast();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ma_nguoi_dung: "", ma_khoa_hoc: "" });

  async function loadEnrollments() {
    setLoading(true);
    try {
      setEnrollments(await apiService.getAdminEnrollments());
    } catch (err: any) {
      toast.error(err.message || "Không thể tải danh sách ghi danh");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEnrollments();
  }, []);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    const userId = Number(form.ma_nguoi_dung);
    const courseId = Number(form.ma_khoa_hoc);
    if (!userId || !courseId) {
      toast.error("Vui lòng nhập ID học viên và ID khóa học");
      return;
    }

    setSaving(true);
    try {
      const enrollment = await apiService.createAdminEnrollment({
        ma_nguoi_dung: userId,
        ma_khoa_hoc: courseId,
      });
      setEnrollments((prev) => [enrollment, ...prev]);
      setForm({ ma_nguoi_dung: "", ma_khoa_hoc: "" });
      toast.success("Đã cấp quyền học");
    } catch (err: any) {
      toast.error(err.message || "Không thể cấp quyền học");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (enrollment: Enrollment) => {
    if (!confirm("Bạn muốn thu hồi quyền học này?")) return;
    try {
      await apiService.deleteAdminEnrollment(enrollment.id);
      setEnrollments((prev) => prev.filter((item) => item.id !== enrollment.id));
      toast.success("Đã thu hồi quyền học");
    } catch (err: any) {
      toast.error(err.message || "Không thể thu hồi quyền học");
    }
  };

  return (
    <div className="space-y-8">
      <section className="rounded-[2rem] bg-white p-7 shadow-sm border border-border/60">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-600">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-950">Quản lý ghi danh</h1>
            <p className="mt-1 text-sm font-medium text-slate-500">
              Cấp hoặc thu hồi quyền học của học viên vào khóa học khi cần xử lý thủ công.
            </p>
          </div>
        </div>
      </section>

      <form onSubmit={handleCreate} className="grid gap-4 rounded-[2rem] border border-border/60 bg-white p-6 shadow-sm md:grid-cols-[1fr_1fr_auto] md:items-end">
        <label className="space-y-2 text-xs font-black uppercase tracking-widest text-slate-500">
          ID học viên
          <input
            value={form.ma_nguoi_dung}
            onChange={(event) => setForm((prev) => ({ ...prev, ma_nguoi_dung: event.target.value }))}
            type="number"
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-950 outline-none focus:border-emerald-300"
          />
        </label>
        <label className="space-y-2 text-xs font-black uppercase tracking-widest text-slate-500">
          ID khóa học
          <input
            value={form.ma_khoa_hoc}
            onChange={(event) => setForm((prev) => ({ ...prev, ma_khoa_hoc: event.target.value }))}
            type="number"
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-950 outline-none focus:border-emerald-300"
          />
        </label>
        <button disabled={saving} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-6 text-xs font-black uppercase tracking-widest text-white hover:bg-emerald-500 disabled:opacity-50">
          <Plus className="h-4 w-4" />
          {saving ? "Đang cấp..." : "Cấp quyền"}
        </button>
      </form>

      <section className="overflow-hidden rounded-[2rem] border border-border/60 bg-white shadow-sm">
        <div className="border-b border-border/40 px-6 py-5">
          <h2 className="text-lg font-black text-slate-950">Danh sách ghi danh ({enrollments.length})</h2>
        </div>

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <RefreshCw className="h-8 w-8 animate-spin text-emerald-600" />
          </div>
        ) : enrollments.length === 0 ? (
          <div className="p-12 text-center text-sm font-bold text-slate-500">Chưa có ghi danh nào.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-black uppercase tracking-widest text-slate-500">
                <tr>
                  <th className="px-6 py-4">ID</th>
                  <th className="px-6 py-4">Học viên</th>
                  <th className="px-6 py-4">Khóa học</th>
                  <th className="px-6 py-4">Ngày ghi danh</th>
                  <th className="px-6 py-4 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {enrollments.map((enrollment) => (
                  <tr key={enrollment.id}>
                    <td className="px-6 py-4 font-bold text-slate-500">#{enrollment.id}</td>
                    <td className="px-6 py-4 font-bold">
                      {enrollment.nguoi_dung?.ho_ten || `User #${enrollment.ma_nguoi_dung}`}
                    </td>
                    <td className="px-6 py-4">
                      {enrollment.khoa_hoc?.tieu_de || `Khóa học #${enrollment.ma_khoa_hoc}`}
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {new Date(enrollment.ngay_dang_ky).toLocaleDateString("vi-VN")}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDelete(enrollment)}
                        className="inline-flex rounded-xl bg-rose-50 p-2 text-rose-600 hover:bg-rose-100"
                        title="Thu hồi quyền học"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
