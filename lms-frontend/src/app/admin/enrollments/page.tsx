"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, RefreshCw, ShieldCheck, Trash2 } from "lucide-react";
import { apiService, Course, Enrollment, fetchWithAuth, User } from "@/services/api";
import { useToast } from "@/contexts/ToastContext";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

type EnrollmentForm = {
  ma_nguoi_dung: string;
  ma_khoa_hoc: string;
};

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

async function getAdminStudents(): Promise<User[]> {
  const response = await fetchWithAuth(`${API_BASE_URL}/admin/users?limit=500&role=student`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || "Không thể tải danh sách học viên");
  }

  const data = await response.json();
  return Array.isArray(data) ? data : [];
}

export default function AdminEnrollmentsPage() {
  const toast = useToast();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<EnrollmentForm>({ ma_nguoi_dung: "", ma_khoa_hoc: "" });

  const selectedStudentId = Number(form.ma_nguoi_dung);
  const selectedCourseId = Number(form.ma_khoa_hoc);

  const alreadyEnrolled = useMemo(() => {
    if (!selectedStudentId || !selectedCourseId) return false;
    return enrollments.some(
      (enrollment) =>
        enrollment.ma_nguoi_dung === selectedStudentId && enrollment.ma_khoa_hoc === selectedCourseId,
    );
  }, [enrollments, selectedCourseId, selectedStudentId]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [enrollmentData, courseData, studentData] = await Promise.all([
        apiService.getAdminEnrollments(),
        apiService.getAdminCourses(),
        getAdminStudents(),
      ]);

      setEnrollments(enrollmentData);
      setCourses(courseData);
      setStudents(studentData);
    } catch (error) {
      toast.error(getErrorMessage(error, "Không thể tải dữ liệu ghi danh"));
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    queueMicrotask(() => void loadData());
  }, [loadData]);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!selectedStudentId || !selectedCourseId) {
      toast.error("Vui lòng chọn học viên và khóa học");
      return;
    }

    if (alreadyEnrolled) {
      toast.error("Học viên này đã có quyền học khóa học đã chọn");
      return;
    }

    setSaving(true);
    try {
      const enrollment = await apiService.createAdminEnrollment({
        ma_nguoi_dung: selectedStudentId,
        ma_khoa_hoc: selectedCourseId,
      });

      setEnrollments((previous) => [enrollment, ...previous]);
      setForm({ ma_nguoi_dung: "", ma_khoa_hoc: "" });
      toast.success("Đã cấp quyền học");
    } catch (error) {
      toast.error(getErrorMessage(error, "Không thể cấp quyền học"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (enrollment: Enrollment) => {
    try {
      await apiService.deleteAdminEnrollment(enrollment.id);
      setEnrollments((previous) => previous.filter((item) => item.id !== enrollment.id));
      toast.success("Đã thu hồi quyền học");
    } catch (error) {
      toast.error(getErrorMessage(error, "Không thể thu hồi quyền học"));
    }
  };

  return (
    <div className="space-y-8">
      <section className="rounded-[2rem] border border-border/60 bg-white p-7 shadow-sm">
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

      <form
        onSubmit={handleCreate}
        className="grid gap-4 rounded-[2rem] border border-border/60 bg-white p-6 shadow-sm md:grid-cols-[1fr_1fr_auto] md:items-end"
      >
        <label className="space-y-2 text-xs font-black uppercase tracking-widest text-slate-500">
          Học viên
          <select
            value={form.ma_nguoi_dung}
            onChange={(event) =>
              setForm((previous) => ({ ...previous, ma_nguoi_dung: event.target.value }))
            }
            disabled={loading || saving}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-950 outline-none focus:border-emerald-300 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
          >
            <option value="">Chọn học viên</option>
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.ho_ten} - {student.email} #{student.id}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2 text-xs font-black uppercase tracking-widest text-slate-500">
          Khóa học
          <select
            value={form.ma_khoa_hoc}
            onChange={(event) =>
              setForm((previous) => ({ ...previous, ma_khoa_hoc: event.target.value }))
            }
            disabled={loading || saving}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-950 outline-none focus:border-emerald-300 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
          >
            <option value="">Chọn khóa học</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.tieu_de} #{course.id}
              </option>
            ))}
          </select>
        </label>

        <button
          disabled={saving || loading || alreadyEnrolled}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-6 text-xs font-black uppercase tracking-widest text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          {saving ? "Đang cấp..." : alreadyEnrolled ? "Đã có quyền" : "Cấp quyền"}
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
                      {enrollment.nguoi_dung?.ho_ten || `Học viên #${enrollment.ma_nguoi_dung}`}
                    </td>
                    <td className="px-6 py-4">
                      {enrollment.khoa_hoc?.tieu_de || `Khóa học #${enrollment.ma_khoa_hoc}`}
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {new Date(enrollment.ngay_dang_ky).toLocaleDateString("vi-VN")}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => void handleDelete(enrollment)}
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
