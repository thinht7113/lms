"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Clock, CheckSquare, Flag, ArrowRight, AlertCircle, RefreshCw, ChevronRight, ChevronLeft } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { apiService, QuizDetail, QuizAttempt } from "@/services/api";

export default function TakeQuizPage() {
  const params = useParams();
  const router = useRouter();
  const quizId = params?.quizId ? Number(params.quizId) : null;

  // DB States
  const [quiz, setQuiz] = useState<QuizDetail | null>(null);
  const [attempt, setAttempt] = useState<QuizAttempt | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Quiz Taking States
  const [answers, setAnswers] = useState<Record<number, number>>({}); // question_id -> chosen_option_id
  const [flags, setFlags] = useState<Record<number, boolean>>({}); // question_id -> isFlagged
  const [activeQuestionIdx, setActiveQuestionIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number | null>(null); // in seconds

  useEffect(() => {
    const currentQuizId = quizId;
    if (!currentQuizId) return;

    async function initializeQuiz() {
      setLoading(true);
      setError(null);
      try {
        // 1. Fetch quiz detail
        const quizDetail = await apiService.getQuizDetail(currentQuizId as number);
        setQuiz(quizDetail);

        // 2. Start or fetch started attempt
        const activeAttempt = await apiService.startQuiz(currentQuizId as number);
        setAttempt(activeAttempt);

        // Map existing answers if attempt was already started
        if (activeAttempt.cau_tra_loi_chi_tiet?.length > 0) {
          const mapped: Record<number, number> = {};
          activeAttempt.cau_tra_loi_chi_tiet.forEach((ans: any) => {
            mapped[ans.ma_cau_hoi] = ans.ma_lua_chon;
          });
          setAnswers(mapped);
        }

        // Calculate initial countdown timer
        if (quizDetail.thoi_gian_lam_bai) {
          const startTime = new Date(activeAttempt.ngay_bat_dau || new Date()).getTime();
          const limitMs = quizDetail.thoi_gian_lam_bai * 60 * 1000;
          const elapsedMs = Date.now() - startTime;
          const remainingSecs = Math.max(0, Math.floor((limitMs - elapsedMs) / 1000));
          setTimeLeft(remainingSecs);
        }
      } catch (err: any) {
        setError(err.message || "Không thể tải bài thi này.");
      } finally {
        setLoading(false);
      }
    }

    initializeQuiz();
  }, [quizId]);

  // Countdown timer logic
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0 || submitting) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          clearInterval(timer);
          // Auto submit when timeout
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, submitting]);

  const handleSelectOption = (questionId: number, optionId: number) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: optionId
    }));
  };

  const toggleFlag = (questionId: number) => {
    setFlags((prev) => ({
      ...prev,
      [questionId]: !prev[questionId]
    }));
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const handleSubmit = async (isAuto = false) => {
    if (!quiz || !attempt || submitting) return;

    if (!isAuto && Object.keys(answers).length < (quiz.cau_hoi?.length || 0)) {
      const confirmSubmit = window.confirm("Bạn chưa trả lời hết các câu hỏi. Bạn vẫn muốn nộp bài chứ?");
      if (!confirmSubmit) return;
    }

    setSubmitting(true);
    try {
      const payloadAnswers = Object.entries(answers).map(([qId, optId]) => ({
        question_id: Number(qId),
        chosen_option_id: optId
      }));

      const res = await apiService.submitQuiz(quiz.id, attempt.id, payloadAnswers);
      alert(`Nộp bài thành công! Điểm số đạt được: ${res.score} / 10.`);
      router.push(`/quiz/${quiz.id}/review?attempt_id=${res.attempt_id}`);
    } catch (err: any) {
      alert(err.message || "Không thể nộp bài thi.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAutoSubmit = () => {
    alert("Đã hết thời gian làm bài! Hệ thống tự động nộp bài thi của bạn.");
    handleSubmit(true);
  };

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

  if (error || !quiz) {
    return (
      <>
        <Navbar />
        <main className="max-w-2xl mx-auto px-4 pt-32 pb-20 min-h-[70vh] flex items-center justify-center">
          <div className="bg-card border border-border/60 rounded-[2rem] p-10 text-center space-y-5 shadow-2xl flex flex-col items-center">
            <AlertCircle className="h-16 w-16 text-destructive opacity-80" />
            <h3 className="font-black text-xl text-foreground tracking-tighter">Lỗi làm bài thi</h3>
            <p className="text-sm font-medium text-muted-foreground leading-relaxed">{error}</p>
            <Link
              href="/my-courses"
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

  const currentQuestion = quiz.cau_hoi?.[activeQuestionIdx];

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-slate-50 pt-28 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
            {/* Left Area: Active Question display (Col span 3) */}
            <div className="lg:col-span-3 space-y-8">
                {/* Header info */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 bg-card border border-border/60 rounded-[1.5rem] shadow-sm gap-4">
                <div>
                    <h1 className="font-black text-xl text-foreground tracking-tighter leading-snug">{quiz.tieu_de}</h1>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Điểm qua môn: {Number(quiz.diem_dat)}/10 • Tổng số: {quiz.cau_hoi?.length || 0} câu hỏi</p>
                </div>

                {/* Timer & countdown */}
                {timeLeft !== null && (
                    <div className={`flex items-center space-x-2 text-xs font-bold px-4 py-2.5 rounded-xl border shrink-0 self-start sm:self-auto ${timeLeft < 60 ? 'bg-destructive/10 text-destructive border-destructive/20 animate-pulse' : 'bg-primary/10 text-primary border-primary/20'}`}>
                        <Clock className="h-5 w-5" />
                        <span>CÒN LẠI: {formatTime(timeLeft)}</span>
                    </div>
                )}
                </div>

                {/* Question Card Display */}
                {currentQuestion ? (
                <div className="bg-card text-card-foreground border border-border/60 rounded-[2rem] p-8 sm:p-10 shadow-2xl space-y-8">
                    <div className="flex justify-between items-start">
                    <span className="bg-primary/10 text-primary text-[10px] font-black px-4 py-1.5 rounded-lg uppercase tracking-widest">
                        Câu hỏi {activeQuestionIdx + 1} / {quiz.cau_hoi?.length || 0}
                    </span>
                    <button
                        onClick={() => toggleFlag(currentQuestion.id)}
                        className={`flex items-center space-x-1.5 text-xs font-bold px-4 py-1.5 rounded-lg transition-all border cursor-pointer ${
                        flags[currentQuestion.id]
                            ? "bg-amber-500/10 border-amber-500/30 text-amber-600"
                            : "bg-secondary border-border/60 text-muted-foreground hover:bg-secondary/70"
                        }`}
                    >
                        <Flag className={`h-4 w-4 ${flags[currentQuestion.id] ? "fill-amber-500" : ""}`} />
                        <span>Đánh dấu xem lại</span>
                    </button>
                    </div>

                    {/* Content */}
                    <h2 className="text-base sm:text-lg font-bold text-foreground leading-relaxed">
                    {currentQuestion.noi_dung}
                    </h2>

                    {/* Options List */}
                    <div className="grid grid-cols-1 gap-4 pt-2">
                    {currentQuestion.cac_lua_chon?.map((opt) => {
                        const isSelected = answers[currentQuestion.id] === opt.id;
                        return (
                        <button
                            key={opt.id}
                            onClick={() => handleSelectOption(currentQuestion.id, opt.id)}
                            className={`flex items-start p-5 rounded-2xl border-2 text-left text-sm transition-all duration-300 cursor-pointer ${
                            isSelected
                                ? "border-primary bg-primary/5 shadow-md shadow-primary/10 font-bold text-primary"
                                : "border-border/60 bg-background hover:border-primary/30 hover:bg-secondary/40 text-foreground font-medium"
                            }`}
                        >
                            <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center mr-4 mt-0 shrink-0 ${
                            isSelected ? "border-primary bg-primary text-white" : "border-muted-foreground"
                            }`}>
                            {isSelected && <div className="h-2 w-2 rounded-full bg-white" />}
                            </div>
                            <span className="leading-snug">{opt.text}</span>
                        </button>
                        );
                    })}
                    </div>

                    {/* Navigation Buttons inside Card */}
                    <div className="flex justify-between items-center border-t border-border/40 pt-6 mt-8">
                    <button
                        disabled={activeQuestionIdx === 0}
                        onClick={() => setActiveQuestionIdx(prev => prev - 1)}
                        className="flex items-center space-x-2 text-xs font-bold uppercase tracking-widest py-3 px-6 rounded-xl border border-border/60 hover:bg-secondary disabled:opacity-40 cursor-pointer"
                    >
                        <ChevronLeft className="h-4 w-4" />
                        <span>Câu trước</span>
                    </button>
                    <button
                        disabled={activeQuestionIdx === (quiz.cau_hoi?.length || 1) - 1}
                        onClick={() => setActiveQuestionIdx(prev => prev + 1)}
                        className="flex items-center space-x-2 text-xs font-bold uppercase tracking-widest py-3 px-6 rounded-xl border border-border/60 hover:bg-secondary disabled:opacity-40 cursor-pointer"
                    >
                        <span>Câu tiếp</span>
                        <ChevronRight className="h-4 w-4" />
                    </button>
                    </div>
                </div>
                ) : (
                <div className="p-10 text-center text-sm font-medium text-muted-foreground bg-card border border-border/60 rounded-[2rem] shadow-sm italic">Bài kiểm tra không có câu hỏi.</div>
                )}
            </div>

            {/* Right Area: Navigation Sidebar (Col span 1) */}
            <aside className="lg:col-span-1 space-y-6">
                <div className="bg-card text-card-foreground border border-border/60 rounded-[2rem] p-6 shadow-sm space-y-6 sticky top-32">
                <div className="flex items-center space-x-2 pb-4 border-b border-border/40 text-foreground">
                    <CheckSquare className="h-5 w-5 text-primary" />
                    <h3 className="font-black text-sm uppercase tracking-widest">Bảng điều hướng</h3>
                </div>

                {/* Matrix of Question buttons */}
                <div className="grid grid-cols-4 gap-3">
                    {quiz.cau_hoi?.map((q, idx) => {
                    const isAnswered = answers[q.id] !== undefined;
                    const isFlagged = flags[q.id] === true;
                    const isActive = activeQuestionIdx === idx;
                    return (
                        <button
                        key={q.id}
                        onClick={() => setActiveQuestionIdx(idx)}
                        className={`aspect-square rounded-xl text-sm font-black transition-all relative cursor-pointer flex items-center justify-center ${
                            isActive
                            ? "bg-primary text-white shadow-lg shadow-primary/30 scale-110 z-10"
                            : isAnswered
                            ? "bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20"
                            : "bg-secondary text-muted-foreground border border-border/60 hover:border-primary/30"
                        }`}
                        >
                        <span>{idx + 1}</span>
                        {isFlagged && (
                            <span className="absolute -top-1 -right-1 h-3.5 w-3.5 bg-amber-500 text-white rounded-full flex items-center justify-center text-[8px] font-bold border border-white">
                            !
                            </span>
                        )}
                        </button>
                    );
                    })}
                </div>

                {/* Submit Action */}
                <div className="pt-4 border-t border-border/40">
                    <button
                        onClick={() => handleSubmit(false)}
                        disabled={submitting}
                        className="w-full bg-primary hover:bg-blue-700 text-white font-black py-4 rounded-2xl shadow-xl shadow-primary/20 hover:shadow-primary/40 transition-all flex items-center justify-center space-x-2 text-xs uppercase tracking-widest cursor-pointer disabled:opacity-50"
                    >
                        <span>Nộp bài ngay</span>
                        <ArrowRight className="h-4 w-4" />
                    </button>
                </div>
                </div>
            </aside>
            </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
