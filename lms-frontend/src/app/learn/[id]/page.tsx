"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useUser } from "@/context/user-context";
import { apiFetch, formatDuration } from "@/lib/api";
import Link from "next/link";

interface LessonContent { id: number; loai_noi_dung: string; noi_dung_text: string | null; duong_dan_file: string | null; }
interface Lesson { id: number; tieu_de: string; thoi_luong: number; thu_tu: number; xem_truoc: boolean; da_xuat_ban: boolean; noi_dung: LessonContent[]; }
interface Section { id: number; tieu_de: string; thu_tu: number; bai_hoc: Lesson[]; }
interface CourseDetail { id: number; tieu_de: string; chuong_hoc: Section[]; }
interface Progress { course_id: number; total_lessons: number; completed_lessons: number; progress_percentage: number; }
interface QuizInfo { id: number; tieu_de: string; diem_dat: string; thoi_gian_lam_bai: number | null; so_luot_lam_toi_da: number; }
interface QuizQuestion { id: number; noi_dung: string; cac_lua_chon: { id: number; text: string }[]; }
interface QuizDetail { id: number; tieu_de: string; diem_dat: string; thoi_gian_lam_bai: number | null; cau_hoi: QuizQuestion[]; }

export default function LearnPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.id as string;
  const { role, token, isAuthenticated, isLoading } = useUser();

  // 1. Immediate client-side check using localStorage to avoid flash/loader if definitely unauthorized
  let isDefinitelyMismatched = false;
  if (typeof window !== "undefined") {
    const savedToken = localStorage.getItem("lms_token");
    const savedUserStr = localStorage.getItem("lms_user");
    if (!savedToken) {
      isDefinitelyMismatched = true;
    } else if (savedUserStr) {
      try {
        const u = JSON.parse(savedUserStr);
        if (u.vai_tro !== "student") {
          isDefinitelyMismatched = true;
        }
      } catch {
        isDefinitelyMismatched = true;
      }
    }
  }

  // 2. Perform redirect in useEffect when status is resolved
  useEffect(() => {
    if (!isLoading && (!isAuthenticated || role !== "student")) {
      router.replace(isAuthenticated ? "/" : "/login");
    }
  }, [isLoading, isAuthenticated, role, router]);

  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [completedLessons, setCompletedLessons] = useState<Set<number>>(new Set());
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [lessonContent, setLessonContent] = useState<LessonContent[] | null>(null);
  const [loadingLesson, setLoadingLesson] = useState(false);
  const [lessonError, setLessonError] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);
  const [loading, setLoading] = useState(true);

  // Quiz state
  const [quizzes, setQuizzes] = useState<QuizInfo[]>([]);
  const [activeQuiz, setActiveQuiz] = useState<QuizDetail | null>(null);
  const [attemptId, setAttemptId] = useState<number | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [quizResult, setQuizResult] = useState<{ score: string; passed: boolean; correct_count: number; total_count: number; message?: string } | null>(null);
  const [quizLoading, setQuizLoading] = useState(false);
  const [showQuizTab, setShowQuizTab] = useState(false);

  // Certificate
  const [certificate, setCertificate] = useState<{ uuid: string; duong_dan_chung_chi: string } | null>(null);

  // Review state
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [review, setReview] = useState({ so_sao: 5, binh_luan: "" });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  // Custom Toast Notification State
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const showNotification = (message: string, type: "success" | "error" | "info" = "error") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // All published lessons flat list for drip logic
  const allLessons: Lesson[] = course
    ? course.chuong_hoc.sort((a, b) => a.thu_tu - b.thu_tu).flatMap(s => s.bai_hoc.filter(l => l.da_xuat_ban).sort((a, b) => a.thu_tu - b.thu_tu))
    : [];

  const refreshProgress = useCallback(async () => {
    if (!token) return;
    try {
      const pRes = await apiFetch(`/learn/courses/${courseId}/progress`, token);
      if (pRes.ok) {
        const p = await pRes.json();
        setProgress(p);
        // Check certificate
        if (p.progress_percentage >= 100) {
          try {
            const cRes = await apiFetch(`/certificates/${courseId}/download`, token);
            if (cRes.ok) {
              const cert = await cRes.json();
              setCertificate({ uuid: cert.uuid, duong_dan_chung_chi: cert.duong_dan_chung_chi });
            }
          } catch { /* ignore */ }
        }
      }
    } catch { /* ignore */ }
  }, [token, courseId]);

  const detectCompleted = useCallback(async () => {
    if (!token || allLessons.length === 0) return;
    const completed = new Set<number>();
    for (let i = 0; i < allLessons.length; i++) {
      const lesson = allLessons[i];
      try {
        const res = await apiFetch(`/learn/courses/${courseId}/lessons/${lesson.id}`, token);
        if (res.ok && i > 0) {
          completed.add(allLessons[i - 1].id);
        }
      } catch { /* ignore */ }
    }
    if (progress && progress.completed_lessons === progress.total_lessons && progress.total_lessons > 0) {
      allLessons.forEach(l => completed.add(l.id));
    }
    setCompletedLessons(completed);
  }, [token, courseId, allLessons.length, progress]);

  useEffect(() => {
    const load = async () => {
      if (!token) return;
      setLoading(true);
      try {
        const cRes = await apiFetch(`/courses/${courseId}`, token);
        if (cRes.ok) setCourse(await cRes.json());
        try {
          const qRes = await apiFetch(`/courses/${courseId}/quizzes`, token);
          if (qRes.ok) setQuizzes(await qRes.json());
        } catch { /* ignore */ }
      } catch { /* ignore */ }
      await refreshProgress();
      setLoading(false);
    };
    load();
  }, [token, courseId]);

  useEffect(() => {
    if (course && progress) detectCompleted();
  }, [course, progress]);

  const loadLesson = async (lesson: Lesson) => {
    if (!token) return;
    setSelectedLesson(lesson);
    setLessonContent(null);
    setLessonError(null);
    setLoadingLesson(true);
    setShowQuizTab(false);
    setActiveQuiz(null);
    setQuizResult(null);

    try {
      const res = await apiFetch(`/learn/courses/${courseId}/lessons/${lesson.id}`, token);
      if (res.ok) {
        const data = await res.json();
        setLessonContent(data.noi_dung || []);
      } else {
        const err = await res.json();
        setLessonError(err.detail || "Không thể truy cập bài học này.");
      }
    } catch {
      setLessonError("Lỗi kết nối");
    }
    setLoadingLesson(false);
  };

  const completeLesson = async () => {
    if (!token || !selectedLesson) return;
    setCompleting(true);
    try {
      const res = await apiFetch(`/progress/lessons/${selectedLesson.id}`, token, {
        method: "PUT",
        body: JSON.stringify({ da_hoan_thanh: true }),
      });
      if (res.ok) {
        setCompletedLessons(prev => new Set([...prev, selectedLesson.id]));
        await refreshProgress();
        const idx = allLessons.findIndex(l => l.id === selectedLesson.id);
        if (idx < allLessons.length - 1) {
          setTimeout(() => loadLesson(allLessons[idx + 1]), 500);
        }
      } else {
        const err = await res.json();
        showNotification(err.detail || "Lỗi");
      }
    } catch { showNotification("Lỗi kết nối"); }
    setCompleting(false);
  };

  const startQuiz = async (quiz: QuizInfo) => {
    if (!token) return;
    setQuizLoading(true);
    setShowQuizTab(true);
    setActiveQuiz(null);
    setQuizResult(null);
    setSelectedAnswers({});
    setSelectedLesson(null);
    setLessonContent(null);

    try {
      const dRes = await apiFetch(`/quizzes/${quiz.id}`, token);
      if (dRes.ok) setActiveQuiz(await dRes.json());
      const sRes = await apiFetch(`/quizzes/${quiz.id}/start`, token, { method: "POST" });
      if (sRes.ok) {
        const attempt = await sRes.json();
        setAttemptId(attempt.id);
      } else {
        const err = await sRes.json();
        showNotification(err.detail || "Lỗi bắt đầu bài kiểm tra");
      }
    } catch { showNotification("Lỗi kết nối"); }
    setQuizLoading(false);
  };

  const submitQuiz = async () => {
    if (!token || !activeQuiz || !attemptId) return;
    setQuizLoading(true);
    try {
      const answers = Object.entries(selectedAnswers).map(([qId, optId]) => ({
        question_id: parseInt(qId),
        chosen_option_id: optId,
      }));
      const res = await apiFetch(`/quizzes/${activeQuiz.id}/submit`, token, {
        method: "POST",
        body: JSON.stringify({ attempt_id: attemptId, answers }),
      });
      if (res.ok) {
        setQuizResult(await res.json());
        await refreshProgress();
      } else {
        const err = await res.json();
        showNotification(err.detail || "Lỗi nộp bài");
      }
    } catch { showNotification("Lỗi kết nối"); }
    setQuizLoading(false);
  };

  const submitReview = async () => {
    if (!token) return;
    setSubmittingReview(true);
    setReviewError(null);
    try {
      const res = await apiFetch(`/courses/${courseId}/reviews`, token, {
        method: "POST",
        body: JSON.stringify(review)
      });
      if (res.ok) {
        setShowReviewModal(false);
        setReview({ so_sao: 5, binh_luan: "" });
      } else {
        const e = await res.json();
        setReviewError(e.detail || "Lỗi gửi đánh giá");
      }
    } catch {
      setReviewError("Lỗi kết nối");
    }
    setSubmittingReview(false);
  };

  if (isLoading && !isDefinitelyMismatched) {
    return (
      <div className="flex justify-center items-center min-h-[70vh] text-on-surface-variant bg-surface-container-lowest">
        <div className="flex flex-col items-center gap-4">
          <i className="ph ph-spinner-gap animate-spin text-5xl text-primary"></i>
          <p className="font-medium tracking-wide">Đang kiểm tra quyền truy cập...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || role !== "student") {
    return null;
  }

  if (loading) return (
    <div className="flex justify-center items-center min-h-[70vh] text-on-surface-variant">
      <i className="ph ph-spinner-gap animate-spin text-3xl text-primary mr-2"></i> Đang tải không gian học tập...
    </div>
  );

  const percentage = progress?.progress_percentage || 0;

  return (
    <div className="flex h-[calc(100vh-80px)] -m-8 relative border-t border-outline-variant bg-surface-container-lowest">
      {/* ===== SECONDARY SIDEBAR (Curriculum) ===== */}
      <aside className="w-80 flex-shrink-0 border-r border-outline-variant bg-surface flex flex-col z-10 overflow-hidden shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
        {/* Header */}
        <div className="p-5 border-b border-outline-variant bg-surface-container-low">
          <Link href="/my-courses" className="text-xs font-semibold text-on-surface-variant hover:text-primary flex items-center gap-1 mb-2 transition-colors">
            <i className="ph-bold ph-arrow-left"></i> Khóa học của tôi
          </Link>
          <h2 className="text-base font-bold text-on-surface line-clamp-2 leading-tight">
            {course?.tieu_de}
          </h2>
          {/* Progress */}
          <div className="mt-4">
            <div className="flex justify-between text-xs mb-1.5 font-medium">
              <span className="text-on-surface-variant">
                {progress ? `${progress.completed_lessons}/${progress.total_lessons} bài` : "..."}
              </span>
              <span className={percentage >= 100 ? "text-success font-bold" : "text-primary font-bold"}>
                {percentage.toFixed(0)}%
              </span>
            </div>
            <div className="w-full h-1.5 bg-surface-container-highest rounded-full overflow-hidden mb-4">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${percentage >= 100 ? "bg-success" : "bg-primary"}`} 
                style={{ width: `${percentage}%` }} 
              />
            </div>
            {percentage > 0 && (
              <button 
                onClick={() => setShowReviewModal(true)} 
                className="w-full py-2 bg-surface-container hover:bg-surface-container-high border border-outline-variant rounded-lg text-xs font-bold text-on-surface-variant transition-colors flex items-center justify-center gap-1.5"
              >
                <i className="ph-fill ph-star text-warning"></i> Đánh giá khóa học
              </button>
            )}
          </div>
        </div>

        {/* Lesson List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {course?.chuong_hoc.sort((a, b) => a.thu_tu - b.thu_tu).map((section) => (
            <div key={section.id}>
              <div className="px-5 py-3 text-[11px] font-bold text-on-surface-variant uppercase tracking-wider bg-surface-container-lowest border-y border-outline-variant/50 sticky top-0 z-10 backdrop-blur-md flex items-center gap-2">
                <i className="ph-fill ph-folder-open text-primary/70"></i> {section.tieu_de}
              </div>
              {section.bai_hoc.filter(l => l.da_xuat_ban).sort((a, b) => a.thu_tu - b.thu_tu).map((lesson) => {
                const isCompleted = completedLessons.has(lesson.id);
                const isSelected = selectedLesson?.id === lesson.id;
                const lessonIdx = allLessons.findIndex(l => l.id === lesson.id);
                const canAccess = lessonIdx === 0 || completedLessons.has(allLessons[lessonIdx - 1]?.id);

                return (
                  <button
                    key={lesson.id}
                    onClick={() => loadLesson(lesson)}
                    className={`w-full text-left px-5 py-3.5 flex items-start gap-3 border-b border-outline-variant/30 transition-all ${
                      isSelected ? "bg-primary-container/10 border-l-2 border-l-primary" : 
                      !canAccess && !isCompleted ? "opacity-60 cursor-not-allowed hover:bg-transparent" : 
                      "hover:bg-surface-container-low border-l-2 border-l-transparent"
                    }`}
                    disabled={!canAccess && !isCompleted}
                  >
                    <span className="text-lg mt-0.5 flex-shrink-0">
                      {isCompleted ? <i className="ph-fill ph-check-circle text-success"></i> : 
                       !canAccess ? <i className="ph-fill ph-lock-key text-on-surface-variant/60"></i> : 
                       <i className={`ph-fill ph-play-circle ${isSelected ? "text-primary" : "text-on-surface-variant"}`}></i>}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm leading-tight mb-1 truncate ${isSelected ? "font-bold text-primary" : "font-medium text-on-surface"}`}>
                        {lesson.tieu_de}
                      </div>
                      <div className="text-[11px] font-medium text-on-surface-variant flex items-center gap-1">
                        <i className="ph ph-clock"></i> {formatDuration(lesson.thoi_luong)}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ))}

          {/* Quiz Section in Sidebar */}
          {quizzes.length > 0 && (
            <div>
              <div className="px-5 py-3 text-[11px] font-bold text-warning uppercase tracking-wider bg-warning-container/20 border-y border-warning/20 sticky top-0 z-10 backdrop-blur-md flex items-center gap-2">
                <i className="ph-fill ph-exam text-warning"></i> Bài kiểm tra
              </div>
              {quizzes.map((quiz) => (
                <button
                  key={quiz.id}
                  onClick={() => startQuiz(quiz)}
                  className={`w-full text-left px-5 py-3.5 flex items-start gap-3 border-b border-outline-variant/30 transition-all ${
                    showQuizTab && activeQuiz?.id === quiz.id ? "bg-warning-container/10 border-l-2 border-l-warning" : 
                    "hover:bg-surface-container-low border-l-2 border-l-transparent"
                  }`}
                >
                  <span className="text-lg mt-0.5 flex-shrink-0">
                    <i className={`ph-fill ph-exam ${showQuizTab && activeQuiz?.id === quiz.id ? "text-warning" : "text-on-surface-variant"}`}></i>
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm leading-tight mb-1 truncate ${showQuizTab && activeQuiz?.id === quiz.id ? "font-bold text-warning" : "font-medium text-on-surface"}`}>
                      {quiz.tieu_de}
                    </div>
                    <div className="text-[11px] font-medium text-on-surface-variant flex items-center gap-2">
                      <span className="flex items-center gap-1"><i className="ph ph-target"></i> {quiz.diem_dat}</span>
                      <span className="flex items-center gap-1"><i className="ph ph-timer"></i> {quiz.thoi_gian_lam_bai ? `${quiz.thoi_gian_lam_bai}p` : "∞"}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </aside>

      {/* ===== MAIN CONTENT ===== */}
      <main className="flex-1 overflow-y-auto bg-background relative custom-scrollbar">
        {/* Certificate Banner */}
        {certificate && (
          <div className="bg-success-container/30 border-b border-success/20 px-8 py-4 flex items-center justify-between sticky top-0 z-20 backdrop-blur-md">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center text-success text-xl">
                <i className="ph-fill ph-certificate"></i>
              </div>
              <div>
                <div className="text-sm font-bold text-on-surface">Chúc mừng! Bạn đã đủ điều kiện nhận chứng chỉ</div>
                <div className="text-xs font-medium text-on-surface-variant flex items-center gap-1 mt-0.5">
                  <i className="ph-bold ph-fingerprint text-success"></i> UUID: <code className="bg-surface-container px-1 py-0.5 rounded">{certificate.uuid}</code>
                </div>
              </div>
            </div>
            <button 
              onClick={() => {
                if (certificate?.duong_dan_chung_chi) {
                  window.open(certificate.duong_dan_chung_chi, "_blank");
                }
              }}
              className="px-4 py-2 bg-success text-on-success text-sm font-bold rounded-lg shadow-sm hover:bg-success/90 transition-colors flex items-center gap-2"
            >
              <i className="ph-bold ph-download-simple"></i> Tải chứng chỉ
            </button>
          </div>
        )}

        <div className="max-w-4xl mx-auto px-8 py-10 pb-24">
          {/* No content selected */}
          {!selectedLesson && !showQuizTab && (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center animate-fade-in">
              <div className="w-24 h-24 bg-surface-container rounded-full flex items-center justify-center mb-6">
                <i className="ph-fill ph-student text-5xl text-on-surface-variant/50"></i>
              </div>
              <h2 className="text-2xl font-bold text-on-surface mb-2">Sẵn sàng học tập</h2>
              <p className="text-on-surface-variant max-w-sm">Chọn một bài học hoặc bài kiểm tra từ danh sách bên trái để bắt đầu nội dung.</p>
            </div>
          )}

          {/* Lesson Content */}
          {selectedLesson && !showQuizTab && (
            <div className="animate-slide-up">
              <div className="mb-8 border-b border-outline-variant pb-6">
                <h1 className="text-3xl font-bold text-on-surface leading-tight mb-4">
                  {selectedLesson.tieu_de}
                </h1>
                <div className="flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-1.5 text-on-surface-variant font-medium px-3 py-1 bg-surface-container rounded-lg">
                    <i className="ph-fill ph-clock text-secondary"></i> {formatDuration(selectedLesson.thoi_luong)}
                  </span>
                  {completedLessons.has(selectedLesson.id) && (
                    <span className="flex items-center gap-1.5 text-success font-bold px-3 py-1 bg-success/10 border border-success/20 rounded-lg">
                      <i className="ph-bold ph-check-circle"></i> Đã hoàn thành
                    </span>
                  )}
                </div>
              </div>

              {loadingLesson ? (
                <div className="flex flex-col items-center justify-center py-20 text-on-surface-variant">
                  <i className="ph ph-spinner-gap animate-spin text-4xl text-primary mb-4"></i>
                  <p className="font-medium">Đang tải nội dung bài học...</p>
                </div>
              ) : lessonError ? (
                <div className="glass-panel border-l-4 border-l-error p-8 rounded-2xl flex flex-col items-center text-center bg-error-container/10">
                  <i className="ph-fill ph-lock-key text-5xl text-error mb-4"></i>
                  <h3 className="text-lg font-bold text-error mb-2">Nội dung bị khóa</h3>
                  <p className="text-on-surface-variant">{lessonError}</p>
                </div>
              ) : (
                <>
                  {/* Content Blocks */}
                  <div className="space-y-6">
                    {lessonContent && lessonContent.length > 0 ? (
                      lessonContent.map((content) => (
                        <div key={content.id} className="glass-panel p-6 sm:p-8 rounded-2xl border border-outline-variant bg-surface">
                          {content.loai_noi_dung === "video" && content.duong_dan_file && (
                            <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black mb-6 shadow-xl border border-outline-variant/30">
                              <iframe
                                className="w-full h-full"
                                src={content.duong_dan_file.includes("youtube.com/watch?v=") ? content.duong_dan_file.replace("watch?v=", "embed/") : content.duong_dan_file}
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                              ></iframe>
                            </div>
                          )}
                          {content.loai_noi_dung === "pdf" && content.duong_dan_file && (
                            <div className="w-full h-[80vh] min-h-[650px] rounded-2xl overflow-hidden bg-slate-100 mb-6 shadow-md border border-slate-200">
                              <iframe
                                className="w-full h-full border-none"
                                src={`${content.duong_dan_file}#navpanes=0`}
                              ></iframe>
                            </div>
                          )}
                          {content.loai_noi_dung === "text" && content.noi_dung_text && (
                            <div className="prose prose-sm sm:prose-base max-w-none text-on-surface leading-relaxed">
                              {content.noi_dung_text}
                            </div>
                          )}
                          {content.loai_noi_dung === "code" && content.noi_dung_text && (
                            <div className="relative group">
                              <div className="absolute top-0 right-0 bg-surface-container-highest px-3 py-1 text-xs font-mono text-on-surface-variant rounded-bl-lg rounded-tr-xl opacity-0 group-hover:opacity-100 transition-opacity">
                                Code
                              </div>
                              <pre className="bg-[#1E1E1E] text-[#D4D4D4] p-6 rounded-xl text-sm overflow-x-auto font-mono leading-relaxed shadow-inner">
                                {content.noi_dung_text}
                              </pre>
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="glass-panel p-12 text-center rounded-2xl border border-outline-variant bg-surface-container-lowest text-on-surface-variant border-dashed">
                        <i className="ph-fill ph-empty text-4xl mb-3 opacity-50"></i>
                        <p>Nội dung bài học này đang được giáo viên cập nhật.</p>
                      </div>
                    )}
                  </div>

                  {/* Complete Button */}
                  {!completedLessons.has(selectedLesson.id) && !lessonError && (
                    <div className="mt-12 flex justify-end">
                      <button
                        onClick={completeLesson}
                        disabled={completing}
                        className="px-8 py-3.5 bg-primary hover:bg-primary/90 text-on-primary rounded-xl font-bold text-sm transition-all shadow-md flex items-center justify-center gap-2 group"
                      >
                        {completing ? (
                          <><i className="ph ph-spinner-gap animate-spin text-lg"></i> Đang cập nhật...</>
                        ) : (
                          <>Đánh dấu hoàn thành <i className="ph-bold ph-check-circle text-lg group-hover:scale-125 transition-transform"></i></>
                        )}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Quiz Content */}
          {showQuizTab && (
            <div className="animate-slide-up">
              {quizLoading && !activeQuiz ? (
                <div className="flex flex-col items-center justify-center py-20 text-on-surface-variant">
                  <i className="ph ph-spinner-gap animate-spin text-4xl text-warning mb-4"></i>
                  <p className="font-medium">Đang chuẩn bị bài kiểm tra...</p>
                </div>
              ) : quizResult ? (
                /* Quiz Result */
                <div className="glass-panel border border-outline-variant rounded-3xl p-10 md:p-16 text-center bg-surface relative overflow-hidden">
                  <div className={`absolute top-0 left-0 w-full h-2 ${quizResult.passed ? 'bg-success' : 'bg-danger'}`}></div>
                  
                  <div className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-6 text-5xl border-4 shadow-lg ${
                    quizResult.passed ? 'bg-success/10 border-success text-success' : 'bg-danger/10 border-danger text-danger'
                  }`}>
                    <i className={`ph-bold ${quizResult.passed ? 'ph-check' : 'ph-x'}`}></i>
                  </div>
                  
                  <h2 className="text-3xl font-black text-on-surface mb-2">
                    {quizResult.passed ? "Chúc mừng! Bạn đã vượt qua!" : "Chưa đạt yêu cầu"}
                  </h2>
                  <p className="text-on-surface-variant mb-8 font-medium">
                    {quizResult.passed ? "Kết quả rất ấn tượng. Hãy tiếp tục phát huy nhé!" : "Đừng buồn, bạn có thể ôn tập lại và thử sức lần nữa."}
                  </p>
                  
                  <div className="inline-flex flex-col items-center p-6 rounded-2xl bg-surface-container-lowest border border-outline-variant shadow-inner min-w-[200px]">
                    <span className="text-sm font-bold text-on-surface-variant uppercase tracking-wider mb-2">Điểm số của bạn</span>
                    <div className={`text-6xl font-black tracking-tighter ${quizResult.passed ? "text-success" : "text-danger"}`}>
                      {parseFloat(quizResult.score).toFixed(1)}
                    </div>
                    <div className="mt-3 text-sm font-semibold text-on-surface bg-surface-container-high px-4 py-1.5 rounded-full">
                      Đúng {quizResult.correct_count} / {quizResult.total_count} câu
                    </div>
                  </div>
                  
                  {quizResult.message && (
                    <div className="mt-8 p-4 bg-surface-container rounded-xl text-sm text-on-surface-variant font-medium max-w-md mx-auto">
                      <i className="ph-fill ph-info text-primary mr-1.5 text-lg align-text-bottom"></i> {quizResult.message}
                    </div>
                  )}
                </div>
              ) : activeQuiz ? (
                /* Quiz Questions */
                <div>
                  <div className="mb-8 border-b border-outline-variant pb-6">
                    <h1 className="text-3xl font-bold text-on-surface leading-tight mb-4 flex items-center gap-3">
                      <i className="ph-fill ph-exam text-warning"></i> {activeQuiz.tieu_de}
                    </h1>
                    <div className="flex flex-wrap gap-4 text-sm">
                      <span className="flex items-center gap-1.5 text-on-surface-variant font-medium px-3 py-1 bg-surface-container rounded-lg">
                        <i className="ph-fill ph-target text-primary"></i> Điểm đạt: <strong className="text-on-surface">{activeQuiz.diem_dat}</strong>
                      </span>
                      <span className="flex items-center gap-1.5 text-on-surface-variant font-medium px-3 py-1 bg-surface-container rounded-lg">
                        <i className="ph-fill ph-timer text-secondary"></i> {activeQuiz.thoi_gian_lam_bai ? `${activeQuiz.thoi_gian_lam_bai} phút` : "Không giới hạn thời gian"}
                      </span>
                      <span className="flex items-center gap-1.5 text-on-surface-variant font-medium px-3 py-1 bg-surface-container rounded-lg">
                        <i className="ph-fill ph-list-numbers text-tertiary"></i> <strong className="text-on-surface">{activeQuiz.cau_hoi.length}</strong> câu hỏi
                      </span>
                    </div>
                  </div>

                  <div className="space-y-8">
                    {activeQuiz.cau_hoi.map((q, qIdx) => (
                      <div key={q.id} className="glass-panel p-6 sm:p-8 rounded-2xl border border-outline-variant bg-surface shadow-sm">
                        <h3 className="text-lg font-bold text-on-surface mb-6 flex gap-3">
                          <span className="flex-shrink-0 w-8 h-8 bg-warning/20 text-warning rounded-lg flex items-center justify-center text-sm font-black">
                            {qIdx + 1}
                          </span>
                          <span className="mt-1 leading-relaxed">{q.noi_dung}</span>
                        </h3>
                        
                        <div className="space-y-3 pl-0 sm:pl-11">
                          {q.cac_lua_chon.map((opt) => {
                            const isSelected = selectedAnswers[q.id] === opt.id;
                            return (
                              <button
                                key={opt.id}
                                onClick={() => setSelectedAnswers(prev => ({ ...prev, [q.id]: opt.id }))}
                                className={`w-full text-left p-4 rounded-xl border transition-all flex items-start gap-4 ${
                                  isSelected 
                                    ? "bg-primary-container/10 border-primary shadow-[0_0_0_1px_var(--color-primary)]" 
                                    : "bg-surface-container-lowest border-outline-variant hover:border-primary/40 hover:bg-surface-container-low"
                                }`}
                              >
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 border-2 transition-colors ${
                                  isSelected ? "border-primary" : "border-outline-variant"
                                }`}>
                                  {isSelected && <div className="w-2.5 h-2.5 bg-primary rounded-full"></div>}
                                </div>
                                <span className={`text-[15px] leading-relaxed ${isSelected ? "font-semibold text-on-surface" : "font-medium text-on-surface-variant"}`}>
                                  {opt.text}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-12 flex justify-between items-center bg-surface-container px-6 py-4 rounded-2xl border border-outline-variant sticky bottom-8 shadow-xl backdrop-blur-md bg-opacity-90">
                    <div className="text-sm font-bold text-on-surface-variant">
                      Đã làm: <span className="text-primary text-lg">{Object.keys(selectedAnswers).length}</span> / {activeQuiz.cau_hoi.length} câu
                    </div>
                    <button
                      onClick={submitQuiz}
                      disabled={quizLoading || Object.keys(selectedAnswers).length < activeQuiz.cau_hoi.length}
                      className={`px-8 py-3 rounded-xl font-bold text-sm transition-all shadow-md flex items-center gap-2 ${
                        Object.keys(selectedAnswers).length < activeQuiz.cau_hoi.length
                          ? "bg-surface-container-highest text-outline cursor-not-allowed"
                          : "bg-primary hover:bg-primary/90 text-on-primary"
                      }`}
                    >
                      {quizLoading ? (
                        <><i className="ph ph-spinner-gap animate-spin text-lg"></i> Đang chấm điểm...</>
                      ) : (
                        <>Nộp bài kiểm tra <i className="ph-bold ph-paper-plane-tilt text-lg"></i></>
                      )}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* Review Modal */}
        {showReviewModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 animate-fade-in">
            <div className="glass-panel w-full max-w-md bg-surface p-8 rounded-3xl shadow-2xl relative animate-slide-up border border-outline-variant/50">
              <button 
                onClick={() => {
                  setShowReviewModal(false);
                  setReviewError(null);
                }}
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface-variant transition-colors"
              >
                <i className="ph-bold ph-x"></i>
              </button>
              
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-warning-container/20 rounded-full flex items-center justify-center mx-auto mb-4 text-warning text-3xl">
                  <i className="ph-fill ph-star"></i>
                </div>
                <h3 className="text-xl font-bold text-on-surface">Đánh giá khóa học</h3>
                <p className="text-sm text-on-surface-variant mt-1">Chia sẻ trải nghiệm của bạn với khóa học này</p>
              </div>

              {reviewError && (
                <div className="mb-4 p-3 bg-error-container/10 border border-error/20 rounded-xl text-xs text-error font-bold flex items-center gap-2">
                  <i className="ph-fill ph-warning-circle text-base"></i>
                  {reviewError}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-on-surface mb-2 text-center">Chất lượng (1-5 sao)</label>
                  <div className="flex gap-2 justify-center mb-4">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button 
                        key={star}
                        onClick={() => {
                          setReview({...review, so_sao: star});
                          setReviewError(null);
                        }}
                        className="text-3xl transition-transform hover:scale-110"
                      >
                        <i className={star <= review.so_sao ? "ph-fill ph-star text-warning" : "ph ph-star text-outline-variant"}></i>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-on-surface mb-2">Nhận xét của bạn</label>
                  <textarea 
                    className="w-full px-4 py-3 rounded-xl border border-outline-variant bg-surface-container-lowest focus:border-primary focus:ring-1 outline-none font-medium min-h-[120px] resize-y" 
                    placeholder="Khóa học này giúp ích gì cho bạn?..."
                    value={review.binh_luan}
                    onChange={(e) => {
                      setReview({...review, binh_luan: e.target.value});
                      setReviewError(null);
                    }}
                  ></textarea>
                </div>
                <button 
                  onClick={submitReview}
                  disabled={submittingReview}
                  className="w-full py-3.5 bg-primary text-on-primary rounded-xl font-bold shadow-md hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
                >
                  {submittingReview ? <i className="ph-bold ph-spinner-gap animate-spin"></i> : "Gửi đánh giá"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Custom Toast Notification Banner */}
        {notification && (
          <div className={`fixed bottom-8 right-8 z-[200] px-6 py-4 rounded-2xl shadow-2xl border flex items-center gap-3 animate-slide-up ${
            notification.type === "success" 
              ? "bg-success/10 border-success/30 text-success" 
              : notification.type === "error"
              ? "bg-error/10 border-error/30 text-error"
              : "bg-primary/10 border-primary/30 text-primary"
          }`}>
            {notification.type === "success" ? (
              <i className="ph-fill ph-check-circle text-xl"></i>
            ) : (
              <i className="ph-fill ph-warning-circle text-xl"></i>
            )}
            <span className="font-bold text-sm">{notification.message}</span>
            <button onClick={() => setNotification(null)} className="ml-2 hover:opacity-80">
              <i className="ph-bold ph-x text-xs"></i>
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
