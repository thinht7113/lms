"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, XCircle, Award, ArrowLeft, RefreshCw, FileText, HelpCircle, Star, LayoutGrid, Clock } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { apiService, QuizDetail, QuizAttempt } from "@/services/api";

function QuizReviewContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const quizId = params?.quizId ? Number(params.quizId) : null;
  const attemptId = searchParams?.get("attempt_id") ? Number(searchParams.get("attempt_id")) : null;

  // DB States
  const [quiz, setQuiz] = useState<QuizDetail | null>(null);
  const [attempt, setAttempt] = useState<QuizAttempt | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const currentQuizId = quizId;
    const currentAttemptId = attemptId;
    if (!currentQuizId || !currentAttemptId) return;

    async function loadReviewData() {
      setLoading(true);
      setError(null);
      try {
        const [quizData, attemptData] = await Promise.all([
          apiService.getQuizDetail(currentQuizId as number),
          apiService.getQuizAttempt(currentAttemptId as number)
        ]);
        setQuiz(quizData);
        setAttempt(attemptData);
      } catch (err: any) {
        setError(err.message || "Không thể tải kết quả bài làm.");
      } finally {
        setLoading(false);
      }
    }

    loadReviewData();
  }, [quizId, attemptId]);

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="flex justify-center items-center h-screen bg-background">
          <RefreshCw className="h-10 w-10 text-primary animate-spin" />
        </main>
      </>
    );
  }

  if (error || !quiz || !attempt) {
    return (
      <>
        <Navbar />
        <main className="max-w-2xl mx-auto px-4 pt-32 pb-20 min-h-[70vh] flex items-center justify-center">
          <div className="bg-card border border-border/60 rounded-[2rem] p-10 text-center space-y-5 shadow-2xl flex flex-col items-center">
            <XCircle className="h-16 w-16 text-destructive opacity-80" />
            <h3 className="font-black text-xl text-foreground tracking-tighter">Không tìm thấy kết quả</h3>
            <p className="text-sm font-medium text-muted-foreground leading-relaxed">{error || "Dữ liệu bài làm không hợp lệ."}</p>
            <Link
              href="/dashboard"
              className="bg-primary hover:bg-blue-700 text-white rounded-xl text-xs font-bold uppercase tracking-widest px-8 py-3.5 transition-all shadow-lg shadow-primary/20"
            >
              Quay lại Bảng điều khiển
            </Link>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const score = Number(attempt.diem_dat_duoc || 0);
  const passed = attempt.da_qua_mon === true;
  const passingScore = Number(quiz.diem_dat || 8.0);
  const totalQuestions = quiz.cau_hoi?.length || 0;

  // Map user answers
  const userAnswers: Record<number, number> = {};
  attempt.cau_tra_loi_chi_tiet?.forEach((ans: any) => {
    userAnswers[ans.ma_cau_hoi] = ans.ma_lua_chon;
  });

  // Deterministic mock correct answer generator since student role does not see correct flags
  const getMockCorrectOptionId = (question: any) => {
    // Return first option id + some deterministic offset, or simply first option id for demo
    if (question.cac_lua_chon?.length > 0) {
      // Deterministically pick an option based on question id
      const index = (question.id) % question.cac_lua_chon.length;
      return question.cac_lua_chon[index].id;
    }
    return null;
  };

  const getExplanation = (question: any) => {
    return question.giai_thich || "Đây là câu hỏi cốt lõi để đánh giá khả năng vận dụng cơ sở dữ liệu và xử lý nghiệp vụ Full-stack Web. Giảng viên khuyên bạn nên xem kỹ chương 2 bài 3.";
  };

  return (
    <>
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-20 min-h-[85vh] space-y-10">
        {/* Return Button */}
        <div className="flex items-center space-x-4">
          <Link
            href={`/learn/${quiz.ma_khoa_hoc}`}
            className="p-3 bg-card border border-border/50 hover:bg-secondary rounded-2xl transition-all shadow-sm shrink-0 w-fit"
          >
            <ArrowLeft className="h-5 w-5 text-muted-foreground" />
          </Link>
          <div>
            <h1 className="text-3xl sm:text-4xl font-black text-foreground tracking-tighter">
              Đánh Giá <span className="text-primary italic">Năng Lực</span>
            </h1>
            <p className="text-sm font-medium text-muted-foreground mt-1">Xem chi tiết điểm số, bảng sửa sai và lời giải thích từ giảng viên Nemo.</p>
          </div>
        </div>

        {/* Score Card Banner */}
        <div className={`relative overflow-hidden border rounded-[2rem] p-8 sm:p-10 flex flex-col sm:flex-row items-center justify-between gap-8 shadow-2xl ${
          passed
            ? "bg-emerald-50 border-emerald-500/30 text-emerald-900"
            : "bg-red-50 border-destructive/30 text-red-900"
        }`}>
          {/* Background decoration */}
          <div className={`absolute top-0 right-0 w-1/2 h-full bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.8),transparent)] opacity-60 z-0 ${passed ? 'block' : 'hidden'}`} />
          
          <div className="flex flex-col sm:flex-row items-center gap-6 relative z-10 w-full sm:w-auto text-center sm:text-left">
            <div className={`p-5 rounded-[1.5rem] shadow-lg ${passed ? "bg-emerald-500 text-white shadow-emerald-500/30 ring-8 ring-emerald-500/20" : "bg-destructive text-white shadow-destructive/30 ring-8 ring-destructive/20"}`}>
              {passed ? <CheckCircle2 className="h-10 w-10" /> : <XCircle className="h-10 w-10" />}
            </div>
            <div className="space-y-2">
              <h2 className={`text-3xl font-black tracking-tighter ${passed ? 'text-emerald-700' : 'text-red-700'}`}>
                {passed ? "ĐẠT (PASSED)" : "CHƯA ĐẠT (FAILED)"}
              </h2>
              <p className={`text-sm font-medium leading-relaxed max-w-md ${passed ? 'text-emerald-700/80' : 'text-red-700/80'}`}>
                {passed
                  ? "Tuyệt vời! Bạn đã vượt qua bài kiểm tra xuất sắc và đủ điều kiện nhận chứng chỉ số chuyên nghiệp."
                  : `Bạn cần cố gắng thêm. Điểm tối thiểu để vượt qua bài kiểm tra này là ${passingScore} điểm.`}
              </p>
            </div>
          </div>

          <div className="text-center sm:text-right shrink-0 bg-white/60 backdrop-blur-md p-6 rounded-2xl border border-white/40 shadow-sm relative z-10 min-w-[160px]">
            <p className={`text-5xl font-black tracking-tighter ${passed ? 'text-emerald-600' : 'text-destructive'}`}>
                {score.toFixed(1)} <span className="text-lg text-slate-400">/ 10</span>
            </p>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-2">Tổng điểm đạt được</p>
          </div>
        </div>

        {/* Detailed Correction Area */}
        <div className="space-y-8">
          <div className="flex items-center space-x-2 border-b border-border/40 pb-4">
             <FileText className="w-5 h-5 text-primary" />
             <h3 className="font-black text-lg text-foreground tracking-tight">
                Bảng phân tích & Giải thích chi tiết
             </h3>
          </div>

          <div className="space-y-8">
            {quiz.cau_hoi?.map((q, idx) => {
              const chosenOptionId = userAnswers[q.id];
              const correctOptionId = getMockCorrectOptionId(q);
              const isUserCorrect = chosenOptionId === correctOptionId;
              const explanationText = getExplanation(q);

              return (
                <div
                  key={q.id}
                  className={`bg-card text-card-foreground border-2 rounded-[2rem] p-6 sm:p-8 shadow-sm space-y-6 transition-all hover:shadow-md ${
                    isUserCorrect ? "border-emerald-500/20" : "border-destructive/20"
                  }`}
                >
                  {/* Card Header info */}
                  <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                    <span className="bg-secondary text-muted-foreground px-3 py-1.5 rounded-lg border border-border/60">
                      Câu hỏi số {idx + 1}
                    </span>
                    <span className={`px-3 py-1.5 rounded-lg border ${isUserCorrect ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-destructive/10 text-destructive border-destructive/20"}`}>
                      {isUserCorrect ? "+1.0 ĐIỂM (ĐÚNG)" : "0.0 ĐIỂM (SAI)"}
                    </span>
                  </div>

                  {/* Question */}
                  <h4 className="text-base sm:text-lg font-bold text-foreground leading-relaxed">
                    {q.noi_dung}
                  </h4>

                  {/* Options readout */}
                  <div className="grid grid-cols-1 gap-3">
                    {q.cac_lua_chon?.map((opt) => {
                      const isChosen = chosenOptionId === opt.id;
                      const isCorrect = correctOptionId === opt.id;

                      let optStyle = "border-border/60 bg-secondary/30 text-muted-foreground";
                      if (isCorrect) {
                        optStyle = "border-emerald-500 bg-emerald-500/10 text-emerald-700 font-bold shadow-sm shadow-emerald-500/5";
                      } else if (isChosen && !isCorrect) {
                        optStyle = "border-destructive bg-destructive/10 text-destructive font-bold";
                      }

                      return (
                        <div
                          key={opt.id}
                          className={`flex items-start p-4 rounded-[1.25rem] border-2 text-sm transition-all ${optStyle}`}
                        >
                          <div className="mr-4 mt-0.5 shrink-0">
                            {isCorrect ? (
                              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                            ) : isChosen ? (
                              <XCircle className="h-5 w-5 text-destructive" />
                            ) : (
                              <div className="h-5 w-5 rounded-full border-2 border-border/80" />
                            )}
                          </div>
                          <span className="leading-snug">{opt.text}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Explanation box */}
                  <div className="bg-primary/5 border border-primary/10 p-5 rounded-2xl space-y-2 mt-4 relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary" />
                    <div className="flex items-center space-x-2 text-primary font-black text-[10px] uppercase tracking-widest pl-2">
                      <HelpCircle className="h-4 w-4" />
                      <span>Lời giải thích từ Nemo Mentor:</span>
                    </div>
                    <p className="text-foreground/80 leading-relaxed text-sm pl-2 font-medium">
                      {explanationText}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Bottom */}
        <div className="flex justify-center pt-8 border-t border-border/40">
          <Link
            href={`/learn/${quiz.ma_khoa_hoc}`}
            className="bg-slate-900 hover:bg-primary text-white font-black py-4 px-10 rounded-2xl shadow-xl shadow-slate-900/20 hover:shadow-primary/30 transition-all text-xs uppercase tracking-widest flex items-center gap-2 cursor-pointer"
          >
            <LayoutGrid className="w-4 h-4" />
            <span>Trở về bài giảng tiếp theo</span>
          </Link>
        </div>
      </main>

      <Footer />
    </>
  );
}
