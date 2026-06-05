"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import Link from "next/link";

type Enrollment = {
  id: number;
  ma_nguoi_dung: number;
  ma_khoa_hoc: number;
  ngay_dang_ky: string;
  nguoi_dung: { id: number; ho_ten: string } | null;
  khoa_hoc: { id: number; tieu_de: string } | null;
};

type UserMinimal = { id: number; ho_ten: string; email: string };
type CourseMinimal = { id: number; tieu_de: string };

export default function EnrollmentsAdminPage() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [users, setUsers] = useState<UserMinimal[]>([]);
  const [courses, setCourses] = useState<CourseMinimal[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [selectedUser, setSelectedUser] = useState<number | "">("");
  const [selectedCourse, setSelectedCourse] = useState<number | "">("");

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resEnr, resUsers, resCourses] = await Promise.all([
        api.get("/admin/enrollments"),
        api.get("/admin/users"),
        api.get("/admin/courses")
      ]);
      setEnrollments(resEnr.data);
      setUsers(resUsers.data);
      setCourses(resCourses.data);
    } catch (err) {
      console.error("Lỗi tải dữ liệu:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !selectedCourse) {
      setErrorMsg("Vui lòng chọn cả Học viên và Khóa học.");
      return;
    }

    try {
      await api.post("/admin/enrollments", {
        ma_nguoi_dung: Number(selectedUser),
        ma_khoa_hoc: Number(selectedCourse)
      });
      setIsModalOpen(false);
      setSelectedUser("");
      setSelectedCourse("");
      fetchData();
      alert("Đã cấp quyền học thành công!");
    } catch (error: any) {
      setErrorMsg(error.response?.data?.detail || "Đã xảy ra lỗi khi cấp quyền.");
    }
  };

  const handleRevoke = async (id: number) => {
    if (!window.confirm("Thu hồi quyền truy cập sẽ xóa mọi tiến trình học tập của học viên này trong khóa học. Bạn có chắc chắn?")) return;
    try {
      await api.delete(`/admin/enrollments/${id}`);
      setEnrollments(enrollments.filter(e => e.id !== id));
      alert("Thu hồi quyền truy cập thành công.");
    } catch (err: any) {
      alert("Lỗi khi thu hồi: " + (err.response?.data?.detail || err.message));
    }
  };

  if (loading) {
    return <div className="p-8 text-center"><i className="ph ph-spinner-gap animate-spin text-3xl"></i></div>;
  }

  return (
    <div className="animate-fade-in space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-on-surface-variant mb-6">
        <Link href="/admin" className="hover:text-primary transition-colors flex items-center gap-1">
          <i className="ph-fill ph-shield-star"></i> Quản trị
        </Link>
        <i className="ph ph-caret-right text-xs"></i>
        <span className="text-on-surface font-medium">Ghi danh</span>
      </nav>

      <div className="flex items-center justify-between mb-8">
        <button
          onClick={() => { setErrorMsg(""); setIsModalOpen(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-xl font-bold shadow-md hover:bg-primary/90 transition-colors"
        >
          <i className="ph-bold ph-plus"></i> Cấp quyền thủ công
        </button>
      </div>

      <div className="bg-surface rounded-2xl border border-outline-variant shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-surface-container-lowest text-on-surface-variant font-semibold uppercase text-[11px] tracking-wider border-b border-outline-variant">
              <tr>
                <th className="px-6 py-4">ID</th>
                <th className="px-6 py-4">Học viên</th>
                <th className="px-6 py-4">Khóa học</th>
                <th className="px-6 py-4">Ngày cấp quyền</th>
                <th className="px-6 py-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {enrollments.map((enr) => (
                <tr key={enr.id} className="hover:bg-surface-container-lowest/50 transition-colors">
                  <td className="px-6 py-4 font-medium">#{enr.id}</td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-on-surface">{enr.nguoi_dung?.ho_ten || `ID: ${enr.ma_nguoi_dung}`}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-semibold text-primary truncate max-w-[250px]" title={enr.khoa_hoc?.tieu_de}>
                      {enr.khoa_hoc?.tieu_de || `ID: ${enr.ma_khoa_hoc}`}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-on-surface-variant">
                    {format(new Date(enr.ngay_dang_ky), "dd MMM yyyy, HH:mm", { locale: vi })}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleRevoke(enr.id)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-error hover:bg-error-container transition-colors ml-auto"
                      title="Thu hồi quyền truy cập"
                    >
                      <i className="ph ph-prohibit text-lg"></i>
                    </button>
                  </td>
                </tr>
              ))}
              {enrollments.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-on-surface-variant">
                    Chưa có dữ liệu ghi danh.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-surface w-full max-w-md rounded-3xl shadow-2xl p-8 transform transition-all">
            <h2 className="text-xl font-bold text-on-surface mb-6">
              Cấp quyền khóa học
            </h2>

            {errorMsg && (
              <div className="mb-4 p-3 bg-error-container text-error rounded-xl text-sm font-medium">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleEnroll} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-on-surface mb-2">Học viên <span className="text-error">*</span></label>
                <select
                  value={selectedUser}
                  onChange={e => setSelectedUser(Number(e.target.value))}
                  className="w-full px-4 py-3 rounded-xl bg-surface-container-lowest border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-on-surface outline-none"
                >
                  <option value="">-- Chọn Học viên --</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.ho_ten} ({u.email})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-on-surface mb-2">Khóa học <span className="text-error">*</span></label>
                <select
                  value={selectedCourse}
                  onChange={e => setSelectedCourse(Number(e.target.value))}
                  className="w-full px-4 py-3 rounded-xl bg-surface-container-lowest border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-on-surface outline-none"
                >
                  <option value="">-- Chọn Khóa học --</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>{c.tieu_de}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-3 rounded-xl bg-surface-container text-on-surface-variant font-bold hover:bg-outline-variant transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 rounded-xl bg-primary text-on-primary font-bold hover:bg-primary/90 transition-colors shadow-md"
                >
                  Cấp quyền
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
