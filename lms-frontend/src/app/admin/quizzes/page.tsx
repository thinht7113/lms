"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import Link from "next/link";

type Quiz = {
  id: number;
  tieu_de: string;
  diem_dat: number;
  thoi_gian_lam_bai: number | null;
  so_luot_lam_toi_da: number;
  ngay_tao: string;
  khoa_hoc: { id: number; tieu_de: string } | null;
};

export default function QuizzesAdminPage() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchQuizzes = async () => {
    try {
      const res = await api.get("/admin/quizzes");
      setQuizzes(res.data);
    } catch (err) {
      console.error("Failed to load quizzes:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuizzes();
  }, []);

  const handleDelete = async (id: number) => {
    if (!window.confirm("BẠN CÓ CHẮC CHẮN MUỐN XÓA BÀI KIỂM TRA NÀY?\nToàn bộ câu hỏi, đáp án, và lịch sử làm bài của học viên sẽ bị xóa vĩnh viễn!")) return;
    try {
      await api.delete(`/admin/quizzes/${id}`);
      setQuizzes(quizzes.filter((q) => q.id !== id));
      alert("Đã xóa bài kiểm tra thành công.");
    } catch (err: any) {
      alert("Lỗi khi xóa: " + (err.response?.data?.detail || err.message));
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
        <span className="text-on-surface font-medium">Bài kiểm tra</span>
      </nav>

      <div className="bg-surface rounded-2xl border border-outline-variant shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-surface-container-lowest text-on-surface-variant font-semibold uppercase text-[11px] tracking-wider border-b border-outline-variant">
              <tr>
                <th className="px-6 py-4">ID</th>
                <th className="px-6 py-4">Tiêu đề Quiz</th>
                <th className="px-6 py-4">Thuộc khóa học</th>
                <th className="px-6 py-4">Thông số</th>
                <th className="px-6 py-4">Ngày tạo</th>
                <th className="px-6 py-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {quizzes.map((quiz) => (
                <tr key={quiz.id} className="hover:bg-surface-container-lowest/50 transition-colors">
                  <td className="px-6 py-4 font-medium">#{quiz.id}</td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-on-surface max-w-[250px] truncate" title={quiz.tieu_de}>
                      {quiz.tieu_de}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-primary font-medium truncate max-w-[200px]" title={quiz.khoa_hoc?.tieu_de}>
                    {quiz.khoa_hoc?.tieu_de || <span className="text-error italic">N/A</span>}
                  </td>
                  <td className="px-6 py-4 space-y-1">
                    <div className="flex items-center gap-1 text-xs text-on-surface-variant">
                      <i className="ph-fill ph-target text-success"></i> Điểm đạt: <span className="font-bold">{quiz.diem_dat}</span>/10
                    </div>
                    <div className="flex items-center gap-1 text-xs text-on-surface-variant">
                      <i className="ph-fill ph-clock text-info"></i> Thời gian: <span className="font-bold">{quiz.thoi_gian_lam_bai ? `${quiz.thoi_gian_lam_bai} phút` : "Không giới hạn"}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-on-surface-variant">
                    {format(new Date(quiz.ngay_tao), "dd MMM yyyy", { locale: vi })}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-2">
                      <Link href={`/admin/quizzes/${quiz.id}`} className="w-8 h-8 rounded-full bg-primary-container text-primary flex items-center justify-center hover:bg-primary hover:text-on-primary transition-colors" title="Xem chi tiết câu hỏi">
                        <i className="ph-bold ph-eye"></i>
                      </Link>
                      <button
                        onClick={() => handleDelete(quiz.id)}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-error bg-error-container hover:bg-error hover:text-on-error transition-colors"
                        title="Xóa ép buộc"
                      >
                        <i className="ph-bold ph-trash"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {quizzes.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-on-surface-variant">
                    Chưa có bài kiểm tra nào trong hệ thống.
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
