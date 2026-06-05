"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

import Link from "next/link";

type Review = {
  id: number;
  so_sao: number;
  binh_luan: string;
  ngay_tao: string;
  nguoi_dung: { id: number; ho_ten: string };
  khoa_hoc: { id: number; tieu_de: string };
};

export default function ReviewsAdminPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReviews = async () => {
    try {
      const res = await api.get("/admin/reviews");
      setReviews(res.data);
    } catch (err) {
      console.error("Failed to load reviews:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const handleDelete = async (id: number) => {
    if (!window.confirm("Bạn có chắc muốn xóa đánh giá này? Hành động này không thể hoàn tác.")) return;
    try {
      await api.delete(`/admin/reviews/${id}`);
      setReviews(reviews.filter((r) => r.id !== id));
    } catch (err: any) {
      console.error("Lỗi khi xóa: " + (err.response?.data?.detail || err.message));
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
        <span className="text-on-surface font-medium">Đánh giá</span>
      </nav>

      <div className="bg-surface rounded-2xl border border-outline-variant shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-surface-container-lowest text-on-surface-variant font-semibold uppercase text-[11px] tracking-wider border-b border-outline-variant">
              <tr>
                <th className="px-6 py-4">ID</th>
                <th className="px-6 py-4">Khóa học</th>
                <th className="px-6 py-4">Học viên</th>
                <th className="px-6 py-4">Đánh giá</th>
                <th className="px-6 py-4">Ngày tạo</th>
                <th className="px-6 py-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {reviews.map((review) => (
                <tr key={review.id} className="hover:bg-surface-container-lowest/50 transition-colors">
                  <td className="px-6 py-4 font-medium">#{review.id}</td>
                  <td className="px-6 py-4 text-primary font-medium truncate max-w-[200px]" title={review.khoa_hoc?.tieu_de}>
                    {review.khoa_hoc?.tieu_de || "N/A"}
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-semibold text-on-surface">{review.nguoi_dung?.ho_ten || "N/A"}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1 text-amber-500 mb-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <i key={i} className={i < review.so_sao ? "ph-fill ph-star" : "ph ph-star"}></i>
                      ))}
                    </div>
                    <div className="text-xs text-on-surface-variant truncate max-w-[250px]" title={review.binh_luan}>
                      {review.binh_luan || <span className="italic text-outline">Không có bình luận</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-on-surface-variant">
                    {format(new Date(review.ngay_tao), "dd MMM yyyy", { locale: vi })}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleDelete(review.id)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-error hover:bg-error-container transition-colors"
                      title="Xóa đánh giá"
                    >
                      <i className="ph ph-trash text-lg"></i>
                    </button>
                  </td>
                </tr>
              ))}
              {reviews.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-on-surface-variant">
                    Chưa có đánh giá nào trong hệ thống.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
