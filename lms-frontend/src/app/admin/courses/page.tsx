"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";

import Link from "next/link";

type Course = {
  id: number;
  tieu_de: string;
  mo_ta: string | null;
  gia_tien: number;
  trinh_do: string;
  da_xuat_ban: boolean;
  trang_thai_phe_duyet: string;
  danh_gia_trung_binh: number;
  ngay_tao: string;
};

export default function CoursesAdminPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const res = await api.get("/admin/courses");
      setCourses(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const handleDelete = async (id: number) => {
    if (!window.confirm("BẠN CÓ CHẮC CHẮN MUỐN XÓA KHÓA HỌC NÀY?\nToàn bộ bài học, tiến độ học viên, và đánh giá sẽ bị xóa vĩnh viễn!")) return;
    try {
      await api.delete(`/admin/courses/${id}`);
      fetchCourses();
    } catch (error: any) {
      alert(error.response?.data?.detail || "Lỗi khi xóa.");
    }
  };

  return (
    <div className="animate-slide-up space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-on-surface-variant mb-6">
        <Link href="/admin" className="hover:text-primary transition-colors flex items-center gap-1">
          <i className="ph-fill ph-shield-star"></i> Quản trị
        </Link>
        <i className="ph ph-caret-right text-xs"></i>
        <span className="text-on-surface font-medium">Khóa học</span>
      </nav>

      <div className="bg-surface rounded-2xl border border-outline-variant shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-on-surface-variant">Đang tải dữ liệu...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-surface-container-lowest border-b border-outline-variant text-on-surface-variant">
                <tr>
                  <th className="px-6 py-4 font-bold">ID</th>
                  <th className="px-6 py-4 font-bold">Tiêu đề</th>
                  <th className="px-6 py-4 font-bold">Giá bán</th>
                  <th className="px-6 py-4 font-bold">Trình độ</th>
                  <th className="px-6 py-4 font-bold">Trạng thái</th>
                  <th className="px-6 py-4 font-bold text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {courses.map((course) => (
                  <tr key={course.id} className="hover:bg-surface-container-lowest/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-on-surface-variant">#{course.id}</td>
                    <td className="px-6 py-4 font-bold text-on-surface">
                      <div className="truncate max-w-[300px]" title={course.tieu_de}>{course.tieu_de}</div>
                    </td>
                    <td className="px-6 py-4 text-primary font-bold">
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(course.gia_tien)}
                    </td>
                    <td className="px-6 py-4">
                      <span className="bg-surface-container px-2 py-1 rounded-md text-xs font-semibold capitalize text-on-surface-variant">
                        {course.trinh_do}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {(() => {
                        switch (course.trang_thai_phe_duyet) {
                          case "pending":
                            return (
                              <span className="text-amber-500 font-bold flex items-center gap-1">
                                <i className="ph-fill ph-clock-countdown"></i> Chờ phê duyệt
                              </span>
                            );
                          case "approved":
                            return (
                              <span className="text-success font-bold flex items-center gap-1">
                                <i className="ph-fill ph-check-circle"></i> Đã xuất bản
                              </span>
                            );
                          case "rejected":
                            return (
                              <span className="text-error font-bold flex items-center gap-1">
                                <i className="ph-fill ph-x-circle"></i> Bị từ chối
                              </span>
                            );
                          case "draft":
                          default:
                            return (
                              <span className="text-on-surface-variant font-bold flex items-center gap-1">
                                <i className="ph-fill ph-file-dashed"></i> Bản nháp
                              </span>
                            );
                        }
                      })()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <a href={`/admin/courses/${course.id}`} className="w-8 h-8 rounded-full bg-primary-container text-primary flex items-center justify-center hover:bg-primary hover:text-on-primary transition-colors" title="Xem nội dung chi tiết">
                          <i className="ph-bold ph-eye"></i>
                        </a>
                        <button onClick={() => handleDelete(course.id)} className="w-8 h-8 rounded-full bg-error-container text-error flex items-center justify-center hover:bg-error hover:text-on-error transition-colors" title="Xóa ép buộc">
                          <i className="ph-bold ph-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {courses.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-on-surface-variant">
                      Chưa có khóa học nào.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
