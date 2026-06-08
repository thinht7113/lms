"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, ClipboardList, Plus, RefreshCw, Save, ListChecks, Trash2 } from "lucide-react";
import { apiService, CourseDetail, Quiz, QuizDetail } from "@/services/api";
import { useToast } from "@/contexts/ToastContext";

type OptionDraft = {
  text: string;
  is_correct: boolean;
};

const emptyOptions = (): OptionDraft[] => [
  { text: "", is_correct: true },
  { text: "", is_correct: false },
  { text: "", is_correct: false },
  { text: "", is_correct: false },
];

export default function InstructorCourseQuizzesPage() {
  const params = useParams();
  const courseId = Number(params.id);
  const toast = useToast();
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [selectedQuizId, setSelectedQuizId] = useState<number | null>(null);
  const [selectedQuizDetail, setSelectedQuizDetail] = useState<QuizDetail | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [savingQuiz, setSavingQuiz] = useState(false);
  const [savingQuestion, setSavingQuestion] = useState(false);
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  
  const [quizForm, setQuizForm] = useState({
    tieu_de: "",
    diem_dat: 8,
    thoi_gian_lam_bai: 30,
    so_luot_lam_toi_da: 3,
  });
  const [questionText, setQuestionText] = useState("");
  const [explanation, setExplanation] = useState("");
  const [options, setOptions] = useState<OptionDraft[]>(emptyOptions);

  async function loadData() {
    setLoading(true);
    try {
      const [courseDetail, quizList] = await Promise.all([
        apiService.getCourseDetailWithAuth(courseId),
        apiService.getCourseQuizzes(courseId),
      ]);
      setCourse(courseDetail);
      setQuizzes(quizList);
      setSelectedQuizId((current) => current || quizList[0]?.id || null);
    } catch (err: any) {
      toast.error(err.message || "Không thể tải dữ liệu quiz");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (courseId) loadData();
  }, [courseId]);

  useEffect(() => {
    async function fetchQuizDetail() {
      if (!selectedQuizId) {
        setSelectedQuizDetail(null);
        return;
      }
      setLoadingDetail(true);
      try {
        const detail = await apiService.getQuizDetail(selectedQuizId);
        setSelectedQuizDetail(detail);
      } catch (err: any) {
        console.error(err);
      } finally {
        setLoadingDetail(false);
      }
    }
    fetchQuizDetail();
  }, [selectedQuizId]);

  const selectedQuiz = useMemo(
    () => quizzes.find((quiz) => quiz.id === selectedQuizId) || null,
    [quizzes, selectedQuizId]
  );

  const handleCreateQuiz = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!quizForm.tieu_de.trim()) {
      toast.error("Vui lòng nhập tiêu đề bài kiểm tra");
      return;
    }

    setSavingQuiz(true);
    try {
      const quiz = await apiService.createQuiz(courseId, {
        tieu_de: quizForm.tieu_de.trim(),
        diem_dat: Number(quizForm.diem_dat),
        thoi_gian_lam_bai: Number(quizForm.thoi_gian_lam_bai) || null,
        so_luot_lam_toi_da: Number(quizForm.so_luot_lam_toi_da) || null,
      });
      setQuizzes((prev) => [quiz, ...prev]);
      setSelectedQuizId(quiz.id);
      setQuizForm({ tieu_de: "", diem_dat: 8, thoi_gian_lam_bai: 30, so_luot_lam_toi_da: 3 });
      toast.success("Đã tạo bài kiểm tra");
    } catch (err: any) {
      toast.error(err.message || "Không thể tạo bài kiểm tra");
    } finally {
      setSavingQuiz(false);
    }
  };

  const handleDeleteQuiz = async (quizId: number) => {
    if (!confirm("CẢNH BÁO: Bạn có chắc chắn muốn xóa bài kiểm tra này? Toàn bộ câu hỏi và lịch sử làm bài của học viên sẽ bị xóa vĩnh viễn!")) return;
    
    try {
      await apiService.deleteQuiz(courseId, quizId);
      
      const newQuizzes = quizzes.filter(q => q.id !== quizId);
      setQuizzes(newQuizzes);
      setSelectedQuizId(newQuizzes.length > 0 ? newQuizzes[0].id : null);
      
      toast.success("Đã xóa bài kiểm tra");
    } catch (err: any) {
      toast.error(err.message || "Không thể xóa bài kiểm tra");
    }
  };

  const handleCreateQuestion = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedQuizId) {
      toast.error("Vui lòng chọn bài kiểm tra");
      return;
    }
    if (!questionText.trim()) {
      toast.error("Vui lòng nhập nội dung câu hỏi");
      return;
    }
    const cleanedOptions = options
      .map((option) => ({ ...option, text: option.text.trim() }))
      .filter((option) => option.text);
    if (cleanedOptions.length < 2) {
      toast.error("Câu hỏi cần ít nhất 2 lựa chọn");
      return;
    }
    if (!cleanedOptions.some((option) => option.is_correct)) {
      toast.error("Cần chọn ít nhất một đáp án đúng");
      return;
    }

    setSavingQuestion(true);
    try {
      const newQuestion = await apiService.createQuestion(selectedQuizId, {
        noi_dung: questionText.trim(),
        giai_thich: explanation.trim() || undefined,
        cac_lua_chon: cleanedOptions,
      });
      
      // Update UI state with new question
      if (selectedQuizDetail) {
        setSelectedQuizDetail({
          ...selectedQuizDetail,
          cau_hoi: [...(selectedQuizDetail.cau_hoi || []), newQuestion as any]
        });
      }

      setQuestionText("");
      setExplanation("");
      setOptions(emptyOptions());
      setIsQuestionModalOpen(false);
      toast.success("Đã thêm câu hỏi vào quiz");
    } catch (err: any) {
      toast.error(err.message || "Không thể thêm câu hỏi");
    } finally {
      setSavingQuestion(false);
    }
  };

  const handleDeleteQuestion = async (questionId: number) => {
    if (!confirm("Bạn có chắc chắn muốn xóa câu hỏi này không?")) return;
    
    try {
      await apiService.deleteQuestion(questionId);
      
      // Update UI state
      if (selectedQuizDetail) {
        setSelectedQuizDetail({
          ...selectedQuizDetail,
          cau_hoi: selectedQuizDetail.cau_hoi?.filter(q => q.id !== questionId) || []
        });
      }
      toast.success("Đã xóa câu hỏi");
    } catch (err: any) {
      toast.error(err.message || "Không thể xóa câu hỏi");
    }
  };

  const updateOption = (index: number, patch: Partial<OptionDraft>) => {
    setOptions((prev) => prev.map((option, idx) => idx === index ? { ...option, ...patch } : option));
  };

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="rounded-[2rem] bg-white border border-slate-200 p-8 text-slate-900 shadow-sm relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-50 to-blue-50 mix-blend-multiply"></div>
        <div className="relative z-10">
            <Link href="/instructor/courses" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-purple-600 hover:text-purple-800 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Quay lại khóa học
            </Link>
            <h1 className="mt-4 text-3xl font-black tracking-tight">Hệ thống Bài kiểm tra</h1>
            <p className="mt-2 max-w-3xl text-sm font-medium text-slate-500">
            {course?.tieu_de || "Khóa học"} • Bạn có thể tạo nhiều bài kiểm tra (như Giữa kỳ, Cuối kỳ) và thêm vô hạn câu hỏi trắc nghiệm vào mỗi bài.
            </p>
        </div>
      </div>

      {loading ? (
        <div className="flex h-80 items-center justify-center rounded-[2rem] border border-slate-200 bg-white">
          <RefreshCw className="h-8 w-8 animate-spin text-purple-600" />
        </div>
      ) : (
        <div className="space-y-8">
            
          {/* STEP 1: QUIZ MANAGEMENT */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 text-sm text-purple-600">1</span>
                    Danh sách Bài kiểm tra
                </h2>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Add New Quiz Card */}
                <div className="rounded-2xl border-2 border-dashed border-purple-200 bg-purple-50/50 p-6 flex flex-col justify-center transition-all hover:bg-purple-50">
                    <form onSubmit={handleCreateQuiz} className="space-y-4">
                        <h3 className="font-bold text-purple-900 text-sm flex items-center gap-2">
                            <Plus className="w-4 h-4" /> Tạo bài kiểm tra mới
                        </h3>
                        <input
                            value={quizForm.tieu_de}
                            onChange={(event) => setQuizForm((prev) => ({ ...prev, tieu_de: event.target.value }))}
                            placeholder="Tên bài (VD: Giữa kỳ)"
                            className="w-full rounded-xl border border-purple-200 bg-white px-3 py-2 text-sm font-bold outline-none focus:border-purple-400"
                        />
                        <div className="grid grid-cols-2 gap-2">
                            <label className="space-y-1 text-[10px] font-bold text-slate-500 uppercase">
                                Điểm đạt (Thang 10)
                                <input
                                    type="number" min={1} max={10} step={0.5} value={quizForm.diem_dat}
                                    onChange={(event) => setQuizForm((prev) => ({ ...prev, diem_dat: Number(event.target.value) }))}
                                    className="w-full rounded-lg border border-purple-200 bg-white px-2 py-1.5 text-sm outline-none"
                                />
                            </label>
                            <label className="space-y-1 text-[10px] font-bold text-slate-500 uppercase">
                                Phút (0 = Vô hạn)
                                <input
                                    type="number" min={0} value={quizForm.thoi_gian_lam_bai}
                                    onChange={(event) => setQuizForm((prev) => ({ ...prev, thoi_gian_lam_bai: Number(event.target.value) }))}
                                    className="w-full rounded-lg border border-purple-200 bg-white px-2 py-1.5 text-sm outline-none"
                                />
                            </label>
                        </div>
                        <button disabled={savingQuiz} className="w-full rounded-xl bg-purple-600 py-2 text-xs font-black uppercase tracking-widest text-white hover:bg-purple-500 disabled:opacity-50">
                            {savingQuiz ? "Đang tạo..." : "Tạo bài mới"}
                        </button>
                    </form>
                </div>

                {/* Existing Quizzes */}
                {quizzes.map((quiz) => (
                    <button
                        key={quiz.id}
                        type="button"
                        onClick={() => setSelectedQuizId(quiz.id)}
                        className={`rounded-2xl border-2 p-6 text-left transition-all relative overflow-hidden group ${
                            selectedQuizId === quiz.id 
                            ? "border-purple-600 bg-purple-50 shadow-md" 
                            : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
                        }`}
                    >
                        {selectedQuizId === quiz.id && (
                            <div className="absolute top-4 right-4 flex items-center gap-2">
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteQuiz(quiz.id);
                                    }}
                                    className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-100 rounded-lg transition-colors"
                                    title="Xóa bài thi"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                                <CheckCircle2 className="w-6 h-6 text-purple-600" />
                            </div>
                        )}
                        <h3 className={`text-lg font-black pr-8 ${selectedQuizId === quiz.id ? "text-purple-900" : "text-slate-900"}`}>
                            {quiz.tieu_de}
                        </h3>
                        <div className={`mt-4 space-y-2 text-sm font-medium ${selectedQuizId === quiz.id ? "text-purple-700" : "text-slate-500"}`}>
                            <p className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-current"></span> 
                                Cần {Number(quiz.diem_dat)} điểm để qua môn
                            </p>
                            <p className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-current"></span> 
                                {quiz.thoi_gian_lam_bai ? `Làm trong ${quiz.thoi_gian_lam_bai} phút` : "Không giới hạn thời gian"}
                            </p>
                        </div>
                    </button>
                ))}
            </div>
          </section>

          {/* STEP 2: QUESTION MANAGEMENT */}
          {selectedQuizId && selectedQuiz && (
            <section className="space-y-4 pt-8 border-t border-slate-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-sm text-amber-600">2</span>
                        Ngân hàng câu hỏi: {selectedQuiz.tieu_de}
                    </h2>
                    <button 
                        onClick={() => setIsQuestionModalOpen(true)}
                        className="flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-sm font-black text-white hover:bg-amber-500 transition-colors shadow-sm"
                    >
                        <Plus className="w-4 h-4" /> Thêm câu hỏi mới
                    </button>
                </div>

                <div className="rounded-[2rem] border border-slate-200 bg-white p-6 md:p-8 shadow-sm">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
                        <h3 className="text-lg font-black text-slate-900">
                            Đã thêm ({selectedQuizDetail?.cau_hoi?.length || 0} câu)
                        </h3>
                        {loadingDetail && <RefreshCw className="h-4 w-4 animate-spin text-slate-400" />}
                    </div>

                    <div className="space-y-4">
                        {!selectedQuizDetail ? (
                            <p className="text-center text-sm font-medium text-slate-500 py-8">Đang tải dữ liệu...</p>
                        ) : selectedQuizDetail.cau_hoi && selectedQuizDetail.cau_hoi.length > 0 ? (
                            selectedQuizDetail.cau_hoi.map((q: any, i: number) => (
                                <div key={q.id} className="relative rounded-2xl border border-slate-100 bg-slate-50 p-5 transition-all hover:border-slate-300 group">
                                    <button 
                                        onClick={() => handleDeleteQuestion(q.id)}
                                        className="absolute top-4 right-4 p-2 text-rose-500 bg-rose-50 hover:bg-rose-100 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                        title="Xóa câu hỏi"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                    <p className="font-bold text-sm text-slate-900 mb-4 leading-relaxed pr-8">
                                        <span className="inline-flex w-7 h-7 rounded-lg bg-blue-100 text-blue-600 items-center justify-center mr-2">{i + 1}</span>
                                        {q.noi_dung}
                                    </p>
                                    <div className="space-y-2 pl-9">
                                        {q.cac_lua_chon?.map((opt: any, j: number) => (
                                            <div key={opt.id} className={`text-xs p-2 rounded-lg border ${opt.is_correct ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-bold' : 'bg-white border-slate-200 text-slate-600'} flex items-start gap-2`}>
                                                <span className="font-black min-w-[20px]">{String.fromCharCode(65 + j)}.</span>
                                                <span>{opt.text}</span>
                                                {opt.is_correct && <CheckCircle2 className="w-4 h-4 ml-auto text-emerald-500" />}
                                            </div>
                                        ))}
                                    </div>
                                    {q.giai_thich && (
                                        <div className="mt-4 ml-9 p-3 rounded-xl bg-amber-50 border border-amber-100 text-xs text-amber-800">
                                            <strong>Giải thích:</strong> {q.giai_thich}
                                        </div>
                                    )}
                                </div>
                            ))
                        ) : (
                            <div className="rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center">
                                <ClipboardList className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                                <p className="text-sm font-bold text-slate-500">Chưa có câu hỏi nào</p>
                                <p className="text-xs text-slate-400 mt-1">Hãy bấm nút bên trên để thêm câu hỏi đầu tiên</p>
                            </div>
                        )}
                    </div>
                </div>
            </section>
          )}

        </div>
      )}

      {/* Modal Thêm Câu Hỏi */}
      {isQuestionModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                  <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                      <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                          <Plus className="w-5 h-5 text-amber-600" />
                          Thêm câu hỏi mới
                      </h3>
                      <button 
                          onClick={() => setIsQuestionModalOpen(false)}
                          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
                      >
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                      </button>
                  </div>
                  
                  <div className="p-6 overflow-y-auto flex-1">
                      <form id="question-form" onSubmit={handleCreateQuestion} className="space-y-6">
                          <div className="space-y-2">
                              <label className="text-xs font-black uppercase tracking-widest text-slate-500">Nội dung câu hỏi</label>
                              <textarea
                                  value={questionText}
                                  onChange={(event) => setQuestionText(event.target.value)}
                                  placeholder="Nhập nội dung câu hỏi..."
                                  className="min-h-32 w-full rounded-2xl border border-slate-200 p-4 text-sm font-medium outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-400/10 transition-all bg-white"
                              />
                          </div>
                          
                          <div className="space-y-3">
                              <label className="text-xs font-black uppercase tracking-widest text-slate-500">Các lựa chọn đáp án</label>
                              <div className="grid gap-3 sm:grid-cols-2">
                                  {options.map((option, index) => (
                                      <div key={index} className={`flex flex-col gap-2 rounded-2xl border p-3 transition-all ${option.is_correct ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-white'}`}>
                                          <div className="flex items-center justify-between">
                                              <span className="text-xs font-black text-slate-400">Đáp án {String.fromCharCode(65 + index)}</span>
                                              <label className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest cursor-pointer px-2 py-1 rounded-lg transition-colors ${option.is_correct ? 'text-emerald-700 bg-emerald-200/50' : 'text-slate-400 hover:bg-slate-100'}`}>
                                                  <input
                                                      type="radio"
                                                      name="correct_answer_modal"
                                                      checked={option.is_correct}
                                                      onChange={() => {
                                                          const newOptions = options.map((opt, i) => ({
                                                              ...opt,
                                                              is_correct: i === index
                                                          }));
                                                          setOptions(newOptions);
                                                      }}
                                                      className="hidden"
                                                  />
                                                  Đúng
                                              </label>
                                          </div>
                                          <textarea
                                              value={option.text}
                                              onChange={(event) => updateOption(index, { text: event.target.value })}
                                              placeholder={`Nhập đáp án...`}
                                              className="bg-transparent text-sm font-medium outline-none w-full resize-none h-16"
                                          />
                                      </div>
                                  ))}
                              </div>
                          </div>

                          <div className="space-y-2">
                              <label className="text-xs font-black uppercase tracking-widest text-slate-500">Giải thích (Không bắt buộc)</label>
                              <textarea
                                  value={explanation}
                                  onChange={(event) => setExplanation(event.target.value)}
                                  placeholder="Giải thích vì sao đáp án đó đúng (sẽ hiện sau khi học viên nộp bài)..."
                                  className="min-h-24 w-full rounded-2xl border border-slate-200 p-4 text-sm font-medium outline-none focus:border-amber-400 bg-white"
                              />
                          </div>
                      </form>
                  </div>

                  <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                      <button
                          type="button"
                          onClick={() => setIsQuestionModalOpen(false)}
                          className="px-6 py-3 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-200 transition-colors"
                      >
                          Hủy
                      </button>
                      <button
                          type="submit"
                          form="question-form"
                          disabled={savingQuestion || !selectedQuizId}
                          className="flex items-center justify-center gap-2 rounded-xl bg-amber-600 px-8 py-3 text-sm font-black text-white hover:bg-amber-500 transition-colors disabled:opacity-50 shadow-lg"
                      >
                          {savingQuestion ? (
                              <><RefreshCw className="h-4 w-4 animate-spin" /> Đang lưu...</>
                          ) : (
                              <><CheckCircle2 className="h-4 w-4" /> Lưu câu hỏi</>
                          )}
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}
