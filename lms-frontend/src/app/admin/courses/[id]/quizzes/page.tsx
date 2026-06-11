"use client";

import React, { useState, useEffect } from "react";
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

  // Load quizzes on mount
  useEffect(() => {
    if (courseId) {
      fetchQuizzes();
      fetchCourseDetail();
    }
  }, [courseId]);

  const fetchCourseDetail = async () => {
    try {
      const course = await apiService.getCourseDetail(courseId);
      if (course) {
        setCourseTitle(course.tieu_de);
      }
    } catch (err: any) {
      console.error("Không thể tải thông tin khóa học", err);
    }
  };

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

  const fetchQuizzes = async () => {
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
  };

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
      fetchQuizzes();
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
      fetchQuizzes();
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
    <div className="min-h-full flex flex-col space-y-6 pb-12">
      {/* Header section with back button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.push("/admin/courses")}
            className="group p-2.5 bg-card hover:bg-secondary border border-border/80 rounded-2xl transition-all flex items-center space-x-2 text-muted-foreground font-bold text-sm shadow-sm"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            <span>Quay lại Khóa học</span>
          </button>
          <div className="flex flex-col">
            <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center space-x-2">
              <ClipboardList className="w-6 h-6 text-blue-500" />
              <span>Quản lý bài kiểm tra</span>
            </h1>
            <p className="text-xs text-muted-foreground font-medium">
              Khóa học: <span className="font-extrabold text-blue-600">{courseTitle || `ID: #${courseId}`}</span>
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsCreateQuizOpen(true)}
          className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-2.5 px-5 rounded-2xl shadow-md transition-all hover:scale-[1.02] active:scale-[0.98] text-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Tạo bài kiểm tra</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side: Quiz List */}
        <div className="lg:col-span-7 flex flex-col space-y-4">
          <div className="bg-card rounded-[2rem] border border-border/50 p-6 shadow-sm flex flex-col space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border/40">
              <h2 className="text-lg font-extrabold text-foreground flex items-center space-x-2">
                <span>Danh sách bài kiểm tra</span>
                <span className="bg-blue-50 text-blue-600 text-xs px-2.5 py-1 rounded-full font-black">
                  {quizzes.length}
                </span>
              </h2>
            </div>

            {isLoadingQuizzes ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-3">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm text-muted-foreground font-medium animate-pulse">Đang tải danh sách bài kiểm tra...</p>
              </div>
            ) : quizzes.length === 0 ? (
              <div className="py-16 text-center flex flex-col items-center justify-center space-y-4">
                <div className="p-4 bg-muted rounded-full text-muted-foreground/80">
                  <ClipboardList className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-foreground">Chưa có bài kiểm tra nào</p>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">Tạo bài kiểm tra đầu tiên để đánh giá kết quả học tập của học viên.</p>
                </div>
                <button
                  onClick={() => setIsCreateQuizOpen(true)}
                  className="text-xs bg-secondary hover:bg-secondary/80 font-bold px-4 py-2 rounded-xl transition-all border border-border/80"
                >
                  Tạo bài kiểm tra ngay
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border/40 text-xs font-black text-muted-foreground tracking-wider uppercase">
                      <th className="py-3 px-4">Tiêu đề</th>
                      <th className="py-3 px-3 text-center">Điểm đạt</th>
                      <th className="py-3 px-3 text-center">Thời gian</th>
                      <th className="py-3 px-3 text-center">Lượt làm</th>
                      <th className="py-3 px-4 text-center">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {quizzes.map((quiz) => {
                      const isSelected = selectedQuiz?.id === quiz.id;
                      return (
                        <tr
                          key={quiz.id}
                          className={`group text-sm transition-colors duration-150 ${isSelected ? "bg-blue-50/45 dark:bg-blue-950/20" : "hover:bg-muted/30"
                            }`}
                        >
                          <td className="py-3.5 px-4 font-bold text-foreground max-w-[200px] truncate">
                            {quiz.tieu_de}
                          </td>
                          <td className="py-3.5 px-3 text-center font-medium">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                              {Number(quiz.diem_dat).toFixed(1)}/10
                            </span>
                          </td>
                          <td className="py-3.5 px-3 text-center font-medium text-muted-foreground text-xs">
                            {quiz.thoi_gian_lam_bai ? (
                              <span className="inline-flex items-center space-x-1">
                                <Clock className="w-3.5 h-3.5 text-muted-foreground/70" />
                                <span>{quiz.thoi_gian_lam_bai}p</span>
                              </span>
                            ) : "Không giới hạn"}
                          </td>
                          <td className="py-3.5 px-3 text-center font-medium text-muted-foreground text-xs">
                            {quiz.so_luot_lam_toi_da ? `${quiz.so_luot_lam_toi_da} lần` : "Không giới hạn"}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center space-x-2">
                              <button
                                onClick={() => fetchQuizDetail(quiz.id)}
                                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm ${isSelected
                                    ? "bg-blue-600 text-white"
                                    : "bg-card border border-border/80 hover:bg-secondary text-foreground"
                                  }`}
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Chi tiết</span>
                              </button>
                              <button
                                onClick={() => handleDeleteQuiz(quiz.id, quiz.tieu_de)}
                                className="p-1.5 bg-card hover:bg-rose-50 hover:text-rose-600 border border-border/80 rounded-xl transition-all shadow-sm"
                                title="Xóa bài kiểm tra"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
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
            <div className="bg-card rounded-[2rem] border border-border/50 p-6 shadow-sm py-20 flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm text-muted-foreground font-medium animate-pulse">Đang tải chi tiết câu hỏi...</p>
            </div>
          ) : selectedQuiz ? (
            <div className="bg-card rounded-[2rem] border border-border/50 p-6 shadow-sm flex flex-col space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-200">
              <div className="flex flex-col space-y-2 pb-4 border-b border-border/40">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-black tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                      Chi tiết bài kiểm tra
                    </span>
                    <h3 className="text-lg font-black text-foreground max-w-[280px] leading-tight">
                      {selectedQuiz.tieu_de}
                    </h3>
                  </div>
                  <button
                    onClick={() => setSelectedQuiz(null)}
                    className="p-1 text-muted-foreground hover:bg-secondary rounded-lg transition-colors border border-border/40"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-bold text-muted-foreground pt-2">
                  <div className="flex items-center space-x-1.5 p-2 bg-muted/40 rounded-xl">
                    <Award className="w-4 h-4 text-emerald-500" />
                    <span>Điểm đạt: {Number(selectedQuiz.diem_dat).toFixed(1)}/10</span>
                  </div>
                  <div className="flex items-center space-x-1.5 p-2 bg-muted/40 rounded-xl">
                    <Clock className="w-4 h-4 text-blue-500" />
                    <span>{selectedQuiz.thoi_gian_lam_bai ? `${selectedQuiz.thoi_gian_lam_bai} phút` : "Không giới hạn"}</span>
                  </div>
                </div>
              </div>

              {/* Questions List */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-black text-foreground flex items-center space-x-2">
                    <span>Danh sách câu hỏi</span>
                    <span className="bg-muted text-muted-foreground text-xs px-2 py-0.5 rounded-full font-bold">
                      {selectedQuiz.cau_hoi?.length || 0}
                    </span>
                  </h4>
                  <button
                    onClick={() => setIsAddQuestionOpen(true)}
                    className="flex items-center space-x-1 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 py-1.5 px-3.5 rounded-xl transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thêm câu hỏi</span>
                  </button>
                </div>

                {!selectedQuiz.cau_hoi || selectedQuiz.cau_hoi.length === 0 ? (
                  <div className="py-12 border border-dashed border-border/80 rounded-2xl text-center flex flex-col items-center justify-center space-y-3">
                    <HelpCircle className="w-6 h-6 text-muted-foreground/60" />
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-foreground">Chưa có câu hỏi nào</p>
                      <p className="text-[10px] text-muted-foreground">Nhấn vào nút Thêm câu hỏi ở trên để bắt đầu thêm câu hỏi trắc nghiệm.</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                    {selectedQuiz.cau_hoi.map((question, idx) => (
                      <div
                        key={question.id}
                        className="p-4 bg-muted/35 border border-border/50 rounded-2xl flex flex-col space-y-3 relative group"
                      >
                        <button
                          onClick={() => handleDeleteQuestion(question.id)}
                          className="absolute top-3 right-3 p-1.5 bg-card hover:bg-rose-50 hover:text-rose-600 border border-border/40 rounded-lg text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Xóa câu hỏi"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>

                        <div className="flex items-start space-x-2">
                          <span className="flex items-center justify-center w-5 h-5 bg-blue-600 text-white rounded-full text-[10px] font-black shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          <p className="text-sm font-bold text-foreground pr-6 whitespace-pre-line leading-relaxed">
                            {question.noi_dung}
                          </p>
                        </div>

                        {/* Options List */}
                        <div className="space-y-1.5 pl-7">
                          {question.cac_lua_chon.map((option) => (
                            <div
                              key={option.id}
                              className={`flex items-start space-x-2 p-2 rounded-xl text-xs font-medium border ${option.is_correct
                                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-800 dark:text-emerald-300 font-bold"
                                  : "bg-card border-border/40 text-muted-foreground"
                                }`}
                            >
                              <div className="mt-0.5 shrink-0">
                                {option.is_correct ? (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                ) : (
                                  <div className="w-3.5 h-3.5 border border-border rounded-full" />
                                )}
                              </div>
                              <span className="flex-1 leading-snug">{option.text}</span>
                            </div>
                          ))}
                        </div>

                        {/* Explanation */}
                        {question.giai_thich && (
                          <div className="pl-7 pt-1">
                            <div className="p-3 bg-blue-500/5 border border-blue-500/10 rounded-xl flex items-start space-x-1.5">
                              <AlertCircle className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                              <div className="space-y-0.5">
                                <span className="text-[10px] font-black text-blue-600 uppercase tracking-wider block">Giải thích:</span>
                                <p className="text-[11px] text-muted-foreground leading-relaxed">{question.giai_thich}</p>
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
            <div className="bg-card rounded-[2rem] border border-border/50 p-6 shadow-sm py-24 text-center flex flex-col items-center justify-center space-y-4">
              <div className="p-4 bg-muted/50 rounded-full text-muted-foreground/60">
                <BookOpen className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-foreground">Xem chi tiết câu hỏi</p>
                <p className="text-xs text-muted-foreground max-w-[240px] mx-auto">
                  Chọn nút <strong className="text-blue-500">Chi tiết</strong> ở bảng bên cạnh để xem và quản lý câu hỏi của bài thi.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal - Create Quiz */}
      {isCreateQuizOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-card rounded-3xl border border-border p-6 shadow-xl w-full max-w-md space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-border/40">
              <h3 className="text-lg font-black text-foreground flex items-center space-x-2">
                <ClipboardList className="w-5 h-5 text-blue-500" />
                <span>Tạo bài kiểm tra mới</span>
              </h3>
              <button
                onClick={() => setIsCreateQuizOpen(false)}
                className="p-1 hover:bg-secondary rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateQuizSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-foreground uppercase tracking-wider">Tiêu đề bài kiểm tra</label>
                <input
                  type="text"
                  value={quizForm.tieu_de}
                  onChange={(e) => setQuizForm({ ...quizForm, tieu_de: e.target.value })}
                  placeholder="Ví dụ: Kiểm tra cuối khóa chương 1"
                  className="w-full text-sm font-medium px-4 py-2.5 bg-background border border-border/80 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl transition-all"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1 space-y-1.5">
                  <label className="text-xs font-extrabold text-foreground uppercase tracking-wider">Điểm đạt</label>
                  <input
                    type="number"
                    value={quizForm.diem_dat}
                    onChange={(e) => setQuizForm({ ...quizForm, diem_dat: parseFloat(e.target.value) })}
                    min="0"
                    max="10"
                    step="0.1"
                    className="w-full text-sm font-medium px-3 py-2.5 bg-background border border-border/80 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl transition-all text-center"
                    required
                  />
                </div>
                <div className="col-span-1 space-y-1.5">
                  <label className="text-xs font-extrabold text-foreground uppercase tracking-wider">Thời gian (phút)</label>
                  <input
                    type="number"
                    value={quizForm.thoi_gian_lam_bai || ""}
                    onChange={(e) => setQuizForm({ ...quizForm, thoi_gian_lam_bai: e.target.value ? parseInt(e.target.value) : 0 })}
                    placeholder="Không giới hạn"
                    min="0"
                    className="w-full text-sm font-medium px-3 py-2.5 bg-background border border-border/80 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl transition-all text-center"
                  />
                </div>
                <div className="col-span-1 space-y-1.5">
                  <label className="text-xs font-extrabold text-foreground uppercase tracking-wider">Số lượt làm</label>
                  <input
                    type="number"
                    value={quizForm.so_luot_lam_toi_da || ""}
                    onChange={(e) => setQuizForm({ ...quizForm, so_luot_lam_toi_da: e.target.value ? parseInt(e.target.value) : 0 })}
                    placeholder="Không giới hạn"
                    min="0"
                    className="w-full text-sm font-medium px-3 py-2.5 bg-background border border-border/80 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl transition-all text-center"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-border/40">
                <button
                  type="button"
                  onClick={() => setIsCreateQuizOpen(false)}
                  className="px-4 py-2 text-sm font-bold text-muted-foreground hover:bg-secondary rounded-xl transition-colors border border-border/80"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingQuiz}
                  className="px-5 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-xl shadow-md transition-colors flex items-center space-x-2"
                >
                  {isSubmittingQuiz ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-card rounded-3xl border border-border p-6 shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-border/40">
              <div className="space-y-0.5">
                <h3 className="text-base font-black text-foreground flex items-center space-x-2">
                  <HelpCircle className="w-5 h-5 text-blue-500" />
                  <span>Thêm câu hỏi trắc nghiệm</span>
                </h3>
                <span className="text-[10px] font-bold text-muted-foreground uppercase block">
                  Bài thi: {selectedQuiz.tieu_de}
                </span>
              </div>
              <button
                onClick={() => setIsAddQuestionOpen(false)}
                className="p-1 hover:bg-secondary rounded-lg transition-colors border border-border/40"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateQuestionSubmit} className="space-y-4">
              {/* Question Text */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-foreground uppercase tracking-wider block">Nội dung câu hỏi</label>
                <textarea
                  value={questionForm.noi_dung}
                  onChange={(e) => setQuestionForm({ ...questionForm, noi_dung: e.target.value })}
                  placeholder="Nhập nội dung câu hỏi trắc nghiệm..."
                  rows={3}
                  className="w-full text-sm font-medium px-4 py-2.5 bg-background border border-border/80 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl transition-all resize-y"
                  required
                />
              </div>

              {/* Options List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-1 border-b border-border/20">
                  <label className="text-xs font-extrabold text-foreground uppercase tracking-wider">Danh sách các đáp án</label>
                  <button
                    type="button"
                    onClick={addOptionField}
                    className="flex items-center space-x-1 text-[11px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 py-1 px-2.5 rounded-lg transition-all"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Thêm lựa chọn</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {questionForm.cac_lua_chon.map((option, idx) => (
                    <div
                      key={idx}
                      className="flex items-center space-x-2.5 p-2 bg-muted/30 border border-border/40 rounded-xl"
                    >
                      {/* Checkbox for is_correct */}
                      <div className="flex flex-col items-center justify-center shrink-0">
                        <label className="text-[9px] font-black text-muted-foreground uppercase mb-0.5">Đúng?</label>
                        <input
                          type="checkbox"
                          checked={option.is_correct}
                          onChange={(e) => handleOptionCorrectChange(idx, e.target.checked)}
                          className="w-4.5 h-4.5 text-blue-600 bg-background border-border rounded focus:ring-blue-500"
                        />
                      </div>

                      {/* Option Text Input */}
                      <div className="flex-1">
                        <input
                          type="text"
                          value={option.text}
                          onChange={(e) => handleOptionTextChange(idx, e.target.value)}
                          placeholder={`Lựa chọn ${idx + 1}`}
                          className="w-full text-xs font-bold px-3 py-2 bg-background border border-border/80 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-lg transition-all"
                          required={idx < 2} // At least first two options are required
                        />
                      </div>

                      {/* Remove Option Button */}
                      {questionForm.cac_lua_chon.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeOptionField(idx)}
                          className="p-1.5 hover:bg-rose-50 hover:text-rose-600 border border-border/30 rounded-lg text-muted-foreground transition-all mt-3"
                          title="Xóa lựa chọn này"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Explanation Field */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-foreground uppercase tracking-wider block">Giải thích đáp án (tùy chọn)</label>
                <textarea
                  value={questionForm.giai_thich}
                  onChange={(e) => setQuestionForm({ ...questionForm, giai_thich: e.target.value })}
                  placeholder="Giải thích vì sao đáp án này là đúng hoặc hướng dẫn làm bài..."
                  rows={2}
                  className="w-full text-sm font-medium px-4 py-2.5 bg-background border border-border/80 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl transition-all resize-y"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-border/40">
                <button
                  type="button"
                  onClick={() => setIsAddQuestionOpen(false)}
                  className="px-4 py-2 text-sm font-bold text-muted-foreground hover:bg-secondary rounded-xl transition-colors border border-border/80"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingQuestion}
                  className="px-5 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-xl shadow-md transition-colors flex items-center space-x-2"
                >
                  {isSubmittingQuestion ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
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
