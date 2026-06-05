"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useParams, useRouter } from "next/navigation";

type Option = {
  id: number;
  text: string;
  is_correct: boolean;
};

type Question = {
  id: number;
  noi_dung: string;
  cac_lua_chon: Option[];
  dap_an_dung: string;
  giai_thich: string | null;
};

type QuizDetail = {
  id: number;
  tieu_de: string;
  diem_dat: number;
  thoi_gian_lam_bai: number | null;
  so_luot_lam_toi_da: number;
  khoa_hoc: { id: number; tieu_de: string } | null;
  cau_hoi: Question[];
};

export default function AdminQuizDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [quiz, setQuiz] = useState<QuizDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        const res = await api.get(`/admin/quizzes/${id}`);
        setQuiz(res.data);
      } catch (err) {
        console.error("Lỗi khi lấy thông tin quiz:", err);
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchQuiz();
  }, [id]);

  if (loading) {
    return <div className="p-8 text-center"><i className="ph ph-spinner-gap animate-spin text-3xl"></i></div>;
  }

  if (!quiz) {
    return <div className="p-8 text-center text-error font-bold">Không tìm thấy bài kiểm tra</div>;
  }

  return (
    <div className="animate-fade-in max-w-4xl mx-auto space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <button onClick={() => router.back()} className="text-primary hover:underline text-sm font-semibold flex items-center gap-1 mb-2">
            <i className="ph-bold ph-arrow-left"></i> Quay lại danh sách
          </button>
          <h1 className="text-2xl font-black text-on-surface">
            Bài kiểm tra
          </h1>
          <p className="text-on-surface-variant text-sm mt-1">
            Khóa học: <span className="font-bold text-primary">{quiz.khoa_hoc?.tieu_de || "N/A"}</span>
          </p>
        </div>
      </div>

      <div className="bg-surface rounded-2xl border border-outline-variant shadow-sm p-6 mb-6">
        <h2 className="text-lg font-bold mb-4 text-on-surface">{quiz.tieu_de}</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-surface-container-lowest p-3 rounded-xl border border-outline-variant">
            <div className="text-xs text-on-surface-variant mb-1 uppercase tracking-wider font-bold">Thời gian làm bài</div>
            <div className="font-medium">{quiz.thoi_gian_lam_bai ? `${quiz.thoi_gian_lam_bai} phút` : "Không giới hạn"}</div>
          </div>
          <div className="bg-surface-container-lowest p-3 rounded-xl border border-outline-variant">
            <div className="text-xs text-on-surface-variant mb-1 uppercase tracking-wider font-bold">Điểm qua môn</div>
            <div className="font-medium">{quiz.diem_dat} / 10</div>
          </div>
          <div className="bg-surface-container-lowest p-3 rounded-xl border border-outline-variant">
            <div className="text-xs text-on-surface-variant mb-1 uppercase tracking-wider font-bold">Lượt làm tối đa</div>
            <div className="font-medium">{quiz.so_luot_lam_toi_da} lượt</div>
          </div>
        </div>
      </div>

      <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
        <i className="ph-fill ph-question text-primary"></i> Ngân hàng câu hỏi ({quiz.cau_hoi.length})
      </h2>

      {quiz.cau_hoi.length === 0 ? (
        <div className="text-center py-12 text-on-surface-variant bg-surface-container-lowest rounded-xl border border-dashed border-outline-variant">
          Chưa có câu hỏi nào trong bài kiểm tra này.
        </div>
      ) : (
        <div className="space-y-4">
          {quiz.cau_hoi.map((q, idx) => (
            <div key={q.id} className="bg-surface rounded-2xl border border-outline-variant shadow-sm overflow-hidden">
              <div className="bg-surface-container-lowest px-5 py-4 border-b border-outline-variant">
                <h3 className="font-bold text-on-surface flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <span>{q.noi_dung}</span>
                </h3>
              </div>
              <div className="p-5 space-y-3">
                {q.cac_lua_chon.map((opt) => (
                  <div key={opt.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${opt.is_correct ? "border-success/30 bg-success-container/10" : "border-outline-variant bg-surface-container-lowest"}`}>
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${opt.is_correct ? "bg-success text-on-success" : "bg-outline-variant/30 text-transparent"}`}>
                      {opt.is_correct && <i className="ph-bold ph-check text-xs"></i>}
                    </div>
                    <span className={`${opt.is_correct ? "font-bold text-success" : "text-on-surface"}`}>{opt.text}</span>
                  </div>
                ))}

                {q.giai_thich && (
                  <div className="mt-4 p-4 rounded-xl bg-info-container/20 border border-info-container">
                    <div className="text-xs font-bold text-info uppercase tracking-wider mb-1 flex items-center gap-1">
                      <i className="ph-fill ph-info"></i> Giải thích đáp án
                    </div>
                    <div className="text-sm text-on-surface">{q.giai_thich}</div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
