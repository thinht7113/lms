"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useToast } from "@/contexts/ToastContext";
import { apiService, Quiz, QuizPayload, QuestionPayload } from "@/services/api";
import {
  ArrowLeft,
  ClipboardList,
  Eye,
  Trash2,
  Plus,
  X,
  BookOpen,
  Clock,
  Award,
  RotateCcw,
  CheckCircle2,
  HelpCircle,
  AlertCircle,
  PlusCircle,
  Calendar
} from "lucide-react";

interface AdminOption {
  id: number;
  text: string;
  is_correct: boolean;
}

interface AdminQuestion {
  id: number;
  ma_bai_kiem_tra: number;
  noi_dung: string;
  giai_thich?: string;
  cac_lua_chon: AdminOption[];
}

interface AdminQuizDetail extends Quiz {
  cau_hoi: AdminQuestion[];
}

export default function AdminQuizzesPage() {
  const router = useRouter();
  const params = useParams();
  const toast = useToast();
  const courseId = Number(params.id);

  // States
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [selectedQuiz, setSelectedQuiz] = useState<AdminQuizDetail | null>(null);
  const [isLoadingQuizzes, setIsLoadingQuizzes] = useState(true);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [courseTitle, setCourseTitle] = useState<string>("");

  // Modal States
  const [isCreateQuizOpen, setIsCreateQuizOpen] = useState(false);
  const [isAddQuestionOpen, setIsAddQuestionOpen] = useState(false);
  const [isSubmittingQuiz, setIsSubmittingQuiz] = useState(false);
  const [isSubmittingQuestion, setIsSubmittingQuestion] = useState(false);

  // Form States - Create Quiz
  const [quizForm, setQuizForm] = useState({
    tieu_de: "",
    diem_dat: 8.0,
    thoi_gian_lam_bai: 30,
    so_luot_lam_toi_da: 3,
  });

  // Form States - Add Question
  const [questionForm, setQuestionForm] = useState({
    noi_dung: "",
    giai_thich: "",
    cac_lua_chon: [
      { text: "", is_correct: false },
      { text: "", is_correct: false },
      { text: "", is_correct: false },
      { text: "", is_correct: false },
    ],
  });

  const fetchCourseDetail = useCallback(async () => {
    try {
      const course = await apiService.getCourseDetail(courseId);
      if (course) {
        setCourseTitle(course.tieu_de);
      }
    } catch (err: any) {
      console.error("Không thể tải thông tin khóa học", err);
    }
  }, [courseId]);

  useEffect(() => {
    if (isCreateQuizOpen || isAddQuestionOpen) {
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    };
  }, [isCreateQuizOpen, isAddQuestionOpen]);

  const fetchQuizzes = useCallback(async () => {
    setIsLoadingQuizzes(true);
    try {
      const data = await apiService.getCourseQuizzes(courseId);
      setQuizzes(data);
    } catch (err: any) {
      console.error(err);
      toast.error("Không thể tải danh sách bài kiểm tra");
    } finally {
      setIsLoadingQuizzes(false);
    }
  }, [courseId, toast]);

  // Load quizzes on mount
  useEffect(() => {
    if (!courseId) return;
    queueMicrotask(() => {
      void fetchQuizzes();
      void fetchCourseDetail();
    });
  }, [courseId, fetchCourseDetail, fetchQuizzes]);

  const fetchQuizDetail = async (quizId: number) => {
    setIsLoadingDetail(true);
    try {
      const detail = await apiService.getAdminQuizDetail(quizId);
      setSelectedQuiz(detail);
    } catch (err: any) {
      console.error(err);
      toast.error("Không thể tải chi tiết bài kiểm tra");
    } finally {
      setIsLoadingDetail(false);
    }
  };

  // Handlers - Create Quiz
  const handleCreateQuizSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quizForm.tieu_de.trim()) {
      toast.error("Tiêu đề bài kiểm tra không được để trống");
      return;
    }

    setIsSubmittingQuiz(true);
    try {
      const payload: QuizPayload = {
        tieu_de: quizForm.tieu_de,
        diem_dat: Number(quizForm.diem_dat),
        thoi_gian_lam_bai: quizForm.thoi_gian_lam_bai ? Number(quizForm.thoi_gian_lam_bai) : null,
        so_luot_lam_toi_da: quizForm.so_luot_lam_toi_da ? Number(quizForm.so_luot_lam_toi_da) : null,
      };

      await apiService.createQuiz(courseId, payload);
      toast.success("Tạo bài kiểm tra thành công");
      setIsCreateQuizOpen(false);
      setQuizForm({
        tieu_de: "",
        diem_dat: 8.0,
        thoi_gian_lam_bai: 30,
        so_luot_lam_toi_da: 3,
      });
      void fetchQuizzes();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Không thể tạo bài kiểm tra");
    } finally {
      setIsSubmittingQuiz(false);
    }
  };

  // Handlers - Delete Quiz
  const handleDeleteQuiz = async (quizId: number, tieuDe: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa bài kiểm tra "${tieuDe}"?`)) return;

    try {
      await apiService.deleteQuiz(courseId, quizId);
      toast.success("Xóa bài kiểm tra thành công");
      if (selectedQuiz && selectedQuiz.id === quizId) {
        setSelectedQuiz(null);
      }
      void fetchQuizzes();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Không thể xóa bài kiểm tra");
    }
  };

  // Handlers - Add Question
  const handleOptionTextChange = (index: number, val: string) => {
    const updated = [...questionForm.cac_lua_chon];
    updated[index].text = val;
    setQuestionForm({ ...questionForm, cac_lua_chon: updated });
  };

  const handleOptionCorrectChange = (index: number, checked: boolean) => {
    const updated = [...questionForm.cac_lua_chon];
    updated[index].is_correct = checked;
    setQuestionForm({ ...questionForm, cac_lua_chon: updated });
  };

  const addOptionField = () => {
    setQuestionForm({
      ...questionForm,
      cac_lua_chon: [...questionForm.cac_lua_chon, { text: "", is_correct: false }],
    });
  };

  const removeOptionField = (index: number) => {
    if (questionForm.cac_lua_chon.length <= 2) {
      toast.error("Phải có ít nhất 2 câu trả lời");
      return;
    }
    const updated = questionForm.cac_lua_chon.filter((_, i) => i !== index);
    setQuestionForm({ ...questionForm, cac_lua_chon: updated });
  };

  const handleCreateQuestionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQuiz) return;

    if (!questionForm.noi_dung.trim()) {
      toast.error("Nội dung câu hỏi không được để trống");
      return;
    }

    // Validate options
    const filledOptions = questionForm.cac_lua_chon.filter(opt => opt.text.trim() !== "");
    if (filledOptions.length < 2) {
      toast.error("Phải điền ít nhất 2 đáp án");
      return;
    }

    const hasCorrect = filledOptions.some(opt => opt.is_correct);
    if (!hasCorrect) {
      toast.error("Phải chọn ít nhất một đáp án đúng");
      return;
    }

    setIsSubmittingQuestion(true);
    try {
      const payload: QuestionPayload = {
        noi_dung: questionForm.noi_dung,
        giai_thich: questionForm.giai_thich.trim() || undefined,
        cac_lua_chon: filledOptions.map(opt => ({
          text: opt.text.trim(),
          is_correct: opt.is_correct,
        })),
      };

      await apiService.createQuestion(selectedQuiz.id, payload);
      toast.success("Thêm câu hỏi thành công");
      setIsAddQuestionOpen(false);
      setQuestionForm({
        noi_dung: "",
        giai_thich: "",
        cac_lua_chon: [
          { text: "", is_correct: false },
          { text: "", is_correct: false },
          { text: "", is_correct: false },
          { text: "", is_correct: false },
        ],
      });
      fetchQuizDetail(selectedQuiz.id);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Không thể tạo câu hỏi");
    } finally {
      setIsSubmittingQuestion(false);
    }
  };

  // Handlers - Delete Question
  const handleDeleteQuestion = async (questionId: number) => {
    if (!confirm("Bạn có chắc chắn muốn xóa câu hỏi này?")) return;
    if (!selectedQuiz) return;

    try {
      await apiService.deleteQuestion(questionId);
      toast.success("Xóa câu hỏi thành công");
      fetchQuizDetail(selectedQuiz.id);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Không thể xóa câu hỏi");
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col space-y-8 pb-12 relative font-sans">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-blue-50/80 via-white/50 to-transparent dark:from-blue-950/20 dark:via-slate-900/50 -z-10 pointer-events-none rounded-t-xl" />
      <div className="absolute top-20 right-10 w-96 h-96 bg-indigo-500/10 dark:bg-indigo-500/5 blur-[120px] rounded-full -z-10 pointer-events-none" />
      <div className="absolute top-40 left-10 w-80 h-80 bg-blue-500/10 dark:bg-blue-500/5 blur-[100px] rounded-full -z-10 pointer-events-none" />

      {/* Header section with back button */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10 px-2 pt-2">
        <div className="flex items-center space-x-5">
          <button
            onClick={() => router.push("/admin/courses")}
            className="group p-3 bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-800 backdrop-blur-md border border-white/40 dark:border-slate-700/50 rounded-lg transition-all duration-300 flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold shadow-sm hover:shadow-md hover:-translate-x-1"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center space-x-3">
            <p className="text-sm text-slate-600 dark:text-slate-300 font-medium flex items-center space-x-1.5">
              <span>Khóa học:</span>
              <span className="font-bold text-blue-700 dark:text-blue-400 bg-blue-50/80 dark:bg-blue-900/30 px-2.5 py-1 rounded-md border border-blue-100 dark:border-blue-800/50 shadow-sm backdrop-blur-sm truncate max-w-[300px] md:max-w-[400px]">
                {courseTitle || `ID: #${courseId}`}
              </span>
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsCreateQuizOpen(true)}
          className="group relative overflow-hidden flex items-center space-x-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:via-indigo-500 hover:to-purple-500 text-white font-bold py-3 px-6 rounded-lg shadow-[0_8px_25px_rgba(79,70,229,0.3)] transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0"
        >
          <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out" />
          <Plus className="w-5 h-5 relative z-10 group-hover:rotate-90 transition-transform duration-300" />
          <span className="relative z-10 text-sm">Tạo bài kiểm tra</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative z-10">
        {/* Left Side: Quiz List */}
        <div className="lg:col-span-7 flex flex-col space-y-4">
          <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/40 dark:border-slate-700/50 rounded-xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] flex flex-col space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200/50 dark:border-slate-700/50">
              <h2 className="text-xl font-extrabold text-slate-800 dark:text-white flex items-center space-x-3">
                <span>Danh sách Bài kiểm tra</span>
                <span className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-xs px-3 py-1 rounded-full font-black shadow-sm">
                  {quizzes.length}
                </span>
              </h2>
            </div>

            {isLoadingQuizzes ? (
              <div className="py-16 flex flex-col items-center justify-center space-y-4">
                <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-600 rounded-full animate-spin"></div>
                <p className="text-sm text-slate-500 font-medium animate-pulse">Đang tải danh sách bài kiểm tra...</p>
              </div>
            ) : quizzes.length === 0 ? (
              <div className="py-20 text-center flex flex-col items-center justify-center space-y-5">
                <div className="p-5 bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-900 rounded-full shadow-inner">
                  <ClipboardList className="w-10 h-10 text-slate-400" />
                </div>
                <div className="space-y-1.5">
                  <p className="text-base font-bold text-slate-700 dark:text-slate-300">Chưa có bài kiểm tra nào</p>
                  <p className="text-sm text-slate-500 max-w-xs mx-auto leading-relaxed">Tạo bài kiểm tra đầu tiên để đánh giá kết quả học tập của học viên.</p>
                </div>
                <button
                  onClick={() => setIsCreateQuizOpen(true)}
                  className="text-sm bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-bold px-5 py-2.5 rounded-xl transition-all border border-blue-100 dark:border-blue-900/50 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-200 shadow-sm"
                >
                  Tạo ngay
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-2 px-2">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b-2 border-slate-100 dark:border-slate-800 text-xs font-black text-slate-400 dark:text-slate-500 tracking-wider uppercase">
                      <th className="py-4 px-4">Tiêu đề</th>
                      <th className="py-4 px-3 text-center">Điểm đạt</th>
                      <th className="py-4 px-3 text-center">Thời gian</th>
                      <th className="py-4 px-3 text-center">Lượt làm</th>
                      <th className="py-4 px-4 text-center">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/80 dark:divide-slate-800/80">
                    {quizzes.map((quiz) => {
                      const isSelected = selectedQuiz?.id === quiz.id;
                      return (
                        <tr
                          key={quiz.id}
                          className={`group text-sm transition-all duration-300 ${isSelected 
                            ? "bg-gradient-to-r from-blue-50/80 to-indigo-50/80 dark:from-blue-900/20 dark:to-indigo-900/20 shadow-sm" 
                            : "hover:bg-slate-50/80 dark:hover:bg-slate-800/40 hover:shadow-sm"
                            } rounded-lg`}
                        >
                          <td className="py-4 px-4 font-bold text-slate-700 dark:text-slate-200 max-w-[180px] truncate rounded-l-2xl">
                            {quiz.tieu_de}
                          </td>
                          <td className="py-4 px-3 text-center font-medium">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-black bg-emerald-100/50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-500/20">
                              {Number(quiz.diem_dat).toFixed(1)}/10
                            </span>
                          </td>
                          <td className="py-4 px-3 text-center font-medium text-slate-500 text-xs">
                            {quiz.thoi_gian_lam_bai ? (
                              <span className="inline-flex items-center space-x-1.5 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">
                                <Clock className="w-3.5 h-3.5 text-slate-400" />
                                <span>{quiz.thoi_gian_lam_bai}p</span>
                              </span>
                            ) : (
                              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 bg-slate-100/50 dark:bg-slate-800/50 px-2 py-1 rounded-md">Không g.hạn</span>
                            )}
                          </td>
                          <td className="py-4 px-3 text-center font-medium text-slate-500 text-xs">
                            {quiz.so_luot_lam_toi_da ? (
                              <span className="inline-flex items-center space-x-1.5 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">
                                <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                                <span>{quiz.so_luot_lam_toi_da} lần</span>
                              </span>
                            ) : (
                              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 bg-slate-100/50 dark:bg-slate-800/50 px-2 py-1 rounded-md">Không g.hạn</span>
                            )}
                          </td>
                          <td className="py-4 px-4 text-center rounded-r-2xl">
                            <div className="flex items-center justify-center space-x-2 opacity-80 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => fetchQuizDetail(quiz.id)}
                                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-300 shadow-sm hover:scale-105 active:scale-95 ${isSelected
                                    ? "bg-blue-600 text-white shadow-blue-500/30"
                                    : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-300 hover:text-blue-600 dark:text-slate-300"
                                  }`}
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Chi tiết</span>
                              </button>
                              <button
                                onClick={() => handleDeleteQuiz(quiz.id, quiz.tieu_de)}
                                className="p-1.5 bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400 border border-slate-200 dark:border-slate-700 hover:border-rose-200 dark:hover:border-rose-500/30 rounded-xl transition-all duration-300 shadow-sm hover:scale-105 active:scale-95"
                                title="Xóa bài kiểm tra"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
        {/* Right Side: Quiz Detail & Questions */}
        <div className="lg:col-span-5 flex flex-col space-y-4">
          {isLoadingDetail ? (
            <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/40 dark:border-slate-700/50 rounded-xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] py-24 flex flex-col items-center justify-center space-y-4">
              <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-600 rounded-full animate-spin"></div>
              <p className="text-sm text-slate-500 font-medium animate-pulse">Đang tải chi tiết bài thi...</p>
            </div>
          ) : selectedQuiz ? (
            <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/40 dark:border-slate-700/50 rounded-xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
              {/* Quiz Detail Header */}
              <div className="flex flex-col space-y-3 pb-5 border-b border-slate-200/50 dark:border-slate-700/50 relative">
                <button
                  onClick={() => setSelectedQuiz(null)}
                  className="absolute right-0 top-0 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="space-y-1.5 pr-8">
                  <span className="inline-block text-[10px] uppercase font-black tracking-widest text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded border border-indigo-100 dark:border-indigo-800/50">
                    Chi tiết Bài kiểm tra
                  </span>
                  <h3 className="text-xl font-black text-slate-800 dark:text-white leading-tight">
                    {selectedQuiz.tieu_de}
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-3">
                  <div className="flex items-center space-x-2.5 p-3 bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/20 dark:to-slate-900/20 border border-emerald-100 dark:border-emerald-900/30 rounded-lg shadow-sm">
                    <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/50 rounded-lg">
                      <Award className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Điểm đạt</span>
                      <span className="text-sm font-black text-emerald-700 dark:text-emerald-400">{Number(selectedQuiz.diem_dat).toFixed(1)}/10</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2.5 p-3 bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/20 dark:to-slate-900/20 border border-blue-100 dark:border-blue-900/30 rounded-lg shadow-sm">
                    <div className="p-1.5 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                      <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Thời gian</span>
                      <span className="text-sm font-black text-blue-700 dark:text-blue-400">{selectedQuiz.thoi_gian_lam_bai ? `${selectedQuiz.thoi_gian_lam_bai} phút` : "Không g.hạn"}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Questions List */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-black text-slate-800 dark:text-white flex items-center space-x-2">
                    <span>Danh sách Câu hỏi</span>
                    <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs px-2 py-0.5 rounded-full font-bold">
                      {selectedQuiz.cau_hoi?.length || 0}
                    </span>
                  </h4>
                  <button
                    onClick={() => setIsAddQuestionOpen(true)}
                    className="flex items-center space-x-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 py-1.5 px-3 rounded-xl transition-all border border-blue-100 dark:border-blue-800/50"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thêm câu hỏi</span>
                  </button>
                </div>

                {!selectedQuiz.cau_hoi || selectedQuiz.cau_hoi.length === 0 ? (
                  <div className="py-12 border-2 border-dashed border-slate-200 dark:border-slate-700/70 rounded-xl text-center flex flex-col items-center justify-center space-y-3 bg-slate-50/50 dark:bg-slate-800/20">
                    <div className="p-3 bg-white dark:bg-slate-800 rounded-full shadow-sm">
                      <HelpCircle className="w-6 h-6 text-slate-400" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-slate-600 dark:text-slate-300">Chưa có câu hỏi nào</p>
                      <p className="text-[10px] text-slate-400 max-w-[200px] mx-auto">Nhấn Thêm câu hỏi để bắt đầu xây dựng bài thi.</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                    {selectedQuiz.cau_hoi.map((question, idx) => (
                      <div
                        key={question.id}
                        className="p-4 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-lg flex flex-col space-y-3 relative group hover:shadow-md transition-shadow duration-300"
                      >
                        <button
                          onClick={() => handleDeleteQuestion(question.id)}
                          className="absolute top-3 right-3 p-1.5 bg-slate-50 dark:bg-slate-900 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-400 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-400 opacity-0 group-hover:opacity-100 transition-all shadow-sm hover:scale-105"
                          title="Xóa câu hỏi"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>

                        <div className="flex items-start space-x-3">
                          <span className="flex items-center justify-center w-6 h-6 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-lg text-xs font-black shrink-0 mt-0.5 shadow-sm shadow-blue-500/20">
                            {idx + 1}
                          </span>
                          <p className="text-sm font-bold text-slate-700 dark:text-slate-200 pr-8 whitespace-pre-line leading-relaxed">
                            {question.noi_dung}
                          </p>
                        </div>

                        {/* Options List */}
                        <div className="space-y-2 pl-9">
                          {question.cac_lua_chon.map((option) => (
                            <div
                              key={option.id}
                              className={`flex items-start space-x-2.5 p-2.5 rounded-xl text-xs font-medium border transition-colors ${option.is_correct
                                  ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300 font-bold shadow-sm"
                                  : "bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-800 text-slate-500"
                                }`}
                            >
                              <div className="mt-0.5 shrink-0">
                                {option.is_correct ? (
                                  <CheckCircle2 className="w-4 h-4 text-emerald-500 drop-shadow-sm" />
                                ) : (
                                  <div className="w-4 h-4 border-2 border-slate-200 dark:border-slate-700 rounded-full" />
                                )}
                              </div>
                              <span className="flex-1 leading-snug">{option.text}</span>
                            </div>
                          ))}
                        </div>

                        {/* Explanation */}
                        {question.giai_thich && (
                          <div className="pl-9 pt-1">
                            <div className="p-3 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/30 rounded-xl flex items-start space-x-2">
                              <AlertCircle className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                              <div className="space-y-0.5">
                                <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider block">Giải thích:</span>
                                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed font-medium">{question.giai_thich}</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/40 dark:border-slate-700/50 rounded-xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] py-28 text-center flex flex-col items-center justify-center space-y-5">
              <div className="relative">
                <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full" />
                <div className="relative p-5 bg-gradient-to-br from-slate-100 to-white dark:from-slate-800 dark:to-slate-900 rounded-full shadow-inner border border-white/60 dark:border-slate-700">
                  <BookOpen className="w-10 h-10 text-slate-400" />
                </div>
              </div>
              <div className="space-y-1.5">
                <p className="text-base font-bold text-slate-700 dark:text-slate-300">Xem chi tiết câu hỏi</p>
                <p className="text-xs text-slate-500 max-w-[260px] mx-auto leading-relaxed">
                  Chọn nút <strong className="text-blue-500 font-black px-1">Chi tiết</strong> ở bảng bên cạnh để xem và quản lý câu hỏi của bài thi.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal - Create Quiz */}
      {isCreateQuizOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/50 dark:border-slate-800 p-7 shadow-2xl w-full max-w-md space-y-5 animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-xl font-black text-slate-800 dark:text-white flex items-center space-x-2.5">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-xl text-blue-600 dark:text-blue-400">
                  <ClipboardList className="w-5 h-5" />
                </div>
                <span>Tạo Bài kiểm tra</span>
              </h3>
              <button
                onClick={() => setIsCreateQuizOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateQuizSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">Tiêu đề</label>
                <input
                  type="text"
                  value={quizForm.tieu_de}
                  onChange={(e) => setQuizForm({ ...quizForm, tieu_de: e.target.value })}
                  placeholder="VD: Kiểm tra cuối khóa chương 1"
                  className="w-full text-sm font-bold px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-lg transition-all"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1 space-y-2">
                  <label className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">Điểm đạt</label>
                  <input
                    type="number"
                    value={quizForm.diem_dat}
                    onChange={(e) => setQuizForm({ ...quizForm, diem_dat: parseFloat(e.target.value) })}
                    min="0"
                    max="10"
                    step="0.1"
                    className="w-full text-sm font-bold px-3 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 rounded-lg transition-all text-center text-emerald-600 dark:text-emerald-400"
                    required
                  />
                </div>
                <div className="col-span-1 space-y-2">
                  <label className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">Thời gian (p)</label>
                  <input
                    type="number"
                    value={quizForm.thoi_gian_lam_bai || ""}
                    onChange={(e) => setQuizForm({ ...quizForm, thoi_gian_lam_bai: e.target.value ? parseInt(e.target.value) : 0 })}
                    placeholder="Không"
                    min="0"
                    className="w-full text-sm font-bold px-3 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-lg transition-all text-center text-blue-600 dark:text-blue-400"
                  />
                </div>
                <div className="col-span-1 space-y-2">
                  <label className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">Lượt làm</label>
                  <input
                    type="number"
                    value={quizForm.so_luot_lam_toi_da || ""}
                    onChange={(e) => setQuizForm({ ...quizForm, so_luot_lam_toi_da: e.target.value ? parseInt(e.target.value) : 0 })}
                    placeholder="Không"
                    min="0"
                    className="w-full text-sm font-bold px-3 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 rounded-lg transition-all text-center text-purple-600 dark:text-purple-400"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsCreateQuizOpen(false)}
                  className="px-5 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingQuiz}
                  className="px-6 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 rounded-xl shadow-lg shadow-blue-500/30 transition-all hover:-translate-y-0.5 active:translate-y-0 flex items-center space-x-2"
                >
                  {isSubmittingQuiz ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Đang tạo...</span>
                    </>
                  ) : (
                    <span>Tạo bài kiểm tra</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal - Add Question */}
      {isAddQuestionOpen && selectedQuiz && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/50 dark:border-slate-800 p-7 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto space-y-5 animate-in zoom-in-95 duration-300 custom-scrollbar">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10">
              <div className="space-y-1">
                <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center space-x-2.5">
                  <div className="p-1.5 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                    <HelpCircle className="w-5 h-5" />
                  </div>
                  <span>Thêm Câu hỏi Trắc nghiệm</span>
                </h3>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block pl-10">
                  Bài thi: <span className="text-blue-500">{selectedQuiz.tieu_de}</span>
                </span>
              </div>
              <button
                onClick={() => setIsAddQuestionOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateQuestionSubmit} className="space-y-6">
              {/* Question Text */}
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest block">Nội dung câu hỏi</label>
                <textarea
                  value={questionForm.noi_dung}
                  onChange={(e) => setQuestionForm({ ...questionForm, noi_dung: e.target.value })}
                  placeholder="Nhập nội dung câu hỏi..."
                  rows={3}
                  className="w-full text-sm font-bold px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-lg transition-all resize-y"
                  required
                />
              </div>

              {/* Options List */}
              <div className="space-y-3 bg-slate-50/50 dark:bg-slate-900/50 p-4 rounded-lg border border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/50 dark:border-slate-700/50">
                  <label className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">Các đáp án</label>
                  <button
                    type="button"
                    onClick={addOptionField}
                    className="flex items-center space-x-1.5 text-xs font-bold text-blue-600 bg-blue-100/50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 py-1.5 px-3 rounded-xl transition-all"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Thêm đáp án</span>
                  </button>
                </div>

                <div className="space-y-2.5 pt-2">
                  {questionForm.cac_lua_chon.map((option, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center space-x-3 p-2.5 rounded-xl border transition-all ${
                        option.is_correct 
                        ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30' 
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm'
                      }`}
                    >
                      <div className="flex flex-col items-center justify-center shrink-0 pl-1">
                        <label className={`text-[9px] font-black uppercase mb-1 ${option.is_correct ? 'text-emerald-600' : 'text-slate-400'}`}>Đúng?</label>
                        <input
                          type="checkbox"
                          checked={option.is_correct}
                          onChange={(e) => handleOptionCorrectChange(idx, e.target.checked)}
                          className="w-5 h-5 text-emerald-500 bg-slate-100 border-slate-300 rounded focus:ring-emerald-500 cursor-pointer transition-colors"
                        />
                      </div>

                      <div className="flex-1">
                        <input
                          type="text"
                          value={option.text}
                          onChange={(e) => handleOptionTextChange(idx, e.target.value)}
                          placeholder={`Nội dung lựa chọn ${idx + 1}`}
                          className={`w-full text-sm font-bold px-3 py-2.5 bg-transparent border-none focus:ring-0 ${option.is_correct ? 'text-emerald-800 dark:text-emerald-300' : 'text-slate-700 dark:text-slate-200'}`}
                          required={idx < 2}
                        />
                      </div>

                      {questionForm.cac_lua_chon.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeOptionField(idx)}
                          className="p-2 hover:bg-rose-100 hover:text-rose-600 dark:hover:bg-rose-900/30 dark:hover:text-rose-400 rounded-lg text-slate-300 transition-all mt-4"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Explanation Field */}
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest block">Giải thích (Tùy chọn)</label>
                <textarea
                  value={questionForm.giai_thich}
                  onChange={(e) => setQuestionForm({ ...questionForm, giai_thich: e.target.value })}
                  placeholder="Giải thích vì sao đáp án này là đúng..."
                  rows={2}
                  className="w-full text-sm font-medium px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-lg transition-all resize-y text-slate-600 dark:text-slate-400"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddQuestionOpen(false)}
                  className="px-5 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingQuestion}
                  className="px-6 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 rounded-xl shadow-lg shadow-blue-500/30 transition-all hover:-translate-y-0.5 active:translate-y-0 flex items-center space-x-2"
                >
                  {isSubmittingQuestion ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <span>Lưu câu hỏi</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
