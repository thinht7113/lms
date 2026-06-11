"use client";

import React, { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Clock,
  Code2,
  Download,
  FileText,
  ImageIcon,
  PlayCircle,
  RefreshCw,
  ShieldCheck,
  Lock,
  ClipboardList,
  ArrowRight,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { apiService, CourseDetail, CourseProgress, Lesson, LessonContent, Quiz } from "@/services/api";
import dynamic from 'next/dynamic';

const PdfViewer = dynamic(() => import('@/components/PdfViewer'), { ssr: false });


const normalizeContentType = (value?: string) => (value || "").toLowerCase();

const formatDuration = (seconds?: number) => {
  if (!seconds || seconds <= 0) return "Chưa cập nhật";
  const minutes = Math.max(1, Math.round(seconds / 60));
  return `${minutes} phút`;
};

const getLessonCount = (course: CourseDetail | null) =>
  course?.chuong_hoc?.reduce((total, section) => total + (section.bai_hoc?.length || 0), 0) || 0;

const getErrorMessage = (err: unknown, fallback: string) =>
  err instanceof Error ? err.message : fallback;

export default function LearnSpacePage() {
  const params = useParams();
  const courseId = params?.courseId ? Number(params.courseId) : 0;

  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [activeLessonContent, setActiveLessonContent] = useState<Lesson | null>(null);
  const [completedLessons, setCompletedLessons] = useState<Record<number, boolean>>({});
  const [courseProgress, setCourseProgress] = useState<CourseProgress | null>(null);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [secondsSpent, setSecondsSpent] = useState(0);
  const [loading, setLoading] = useState(true);
  const [lessonLoading, setLessonLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [videoResumeSeconds, setVideoResumeSeconds] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);

  const flatLessons = React.useMemo(() => {
    if (!course?.chuong_hoc) return [];
    const sortedSections = [...course.chuong_hoc].sort((a, b) => a.thu_tu - b.thu_tu);
    return sortedSections.flatMap((section) => {
      const sortedLessons = [...(section.bai_hoc || [])].sort((a, b) => a.thu_tu - b.thu_tu);
      return sortedLessons;
    });
  }, [course]);

  const isLessonLocked = React.useCallback((lessonId: number) => {
    const idx = flatLessons.findIndex((l) => l.id === lessonId);
    if (idx <= 0) return false;
    const prevLesson = flatLessons[idx - 1];
    return !completedLessons[prevLesson.id];
  }, [flatLessons, completedLessons]);

  const allLessonsCompleted = React.useMemo(() => {
    if (flatLessons.length === 0) return false;
    return flatLessons.every((l) => completedLessons[l.id]);
  }, [flatLessons, completedLessons]);

  const isQuizLocked = React.useCallback((quizId: number) => {
    if (!allLessonsCompleted) return true;
    const idx = quizzes.findIndex((q) => q.id === quizId);
    if (idx <= 0) return false;
    const prevQuiz = quizzes[idx - 1];
    return !prevQuiz.passed;
  }, [quizzes, allLessonsCompleted]);

  const formatRemainingTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}p ${s}s`;
  };

  useEffect(() => {
    setSecondsSpent(0);
    if (!activeLesson) return;
    const timer = setInterval(() => {
      setSecondsSpent((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [activeLesson?.id]);

  const totalLessons = getLessonCount(course);
  const progressPercent = Math.max(0, Math.min(100, Math.round(courseProgress?.progress_percentage || 0)));

  const refreshCourseProgress = async () => {
    if (!courseId) return;
    try {
      const progress = await apiService.getCourseProgress(courseId);
      setCourseProgress(progress);
    } catch (err) {
      console.warn("Course progress load error:", err);
      setCourseProgress(null);
    }
  };

  useEffect(() => {
    if (!courseId) return;

    async function loadCourse() {
      setLoading(true);
      setError(null);

      try {
        const [detail, progress, quizzesData] = await Promise.all([
          apiService.getCourseDetail(courseId),
          apiService.getCourseProgress(courseId).catch(() => null),
          apiService.getCourseQuizzes(courseId).catch(() => []),
        ]);
        if (!detail) {
          setError("Không tìm thấy khóa học hoặc khóa học chưa khả dụng.");
          return;
        }

        setCourse(detail);
        setCourseProgress(progress);
        setQuizzes(quizzesData);

        const sortedSections = [...(detail.chuong_hoc || [])].sort((a, b) => a.thu_tu - b.thu_tu);
        const firstLesson = sortedSections.flatMap((section) => [...(section.bai_hoc || [])].sort((a, b) => a.thu_tu - b.thu_tu))?.[0];
        setActiveLesson(firstLesson || null);
      } catch (err: unknown) {
        setError(getErrorMessage(err, "Không thể tải lớp học."));
      } finally {
        setLoading(false);
      }
    }

    loadCourse();
  }, [courseId]);

  useEffect(() => {
    const handleFocus = () => {
      if (courseId) {
        apiService.getCourseProgress(courseId).then(setCourseProgress).catch(() => null);
        apiService.getCourseQuizzes(courseId).then(setQuizzes).catch(() => null);
      }
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [courseId]);

  useEffect(() => {
    if (!courseId || !activeLesson) return;
    const lesson = activeLesson;

    async function loadLesson() {
      setLessonLoading(true);
      setError(null);
      setActiveLessonContent(null);
      setVideoResumeSeconds(0);

      try {
        const lessonDetail = await apiService.getLessonLearningContent(courseId, lesson.id);
        setActiveLessonContent(lessonDetail);

        try {
          const progress = await apiService.getLessonProgress(lesson.id);
          setVideoResumeSeconds(progress.video_resume_seconds || 0);
          if (progress.da_hoan_thanh) {
            setCompletedLessons((prev) => ({ ...prev, [lesson.id]: true }));
          }
        } catch (progressErr) {
          console.warn("Lesson progress load error:", progressErr);
        }
      } catch (err: unknown) {
        setError(getErrorMessage(err, "Bạn chưa có quyền truy cập bài học này."));
      } finally {
        setLessonLoading(false);
      }
    }

    loadLesson();
  }, [activeLesson, courseId]);

  useEffect(() => {
    const hasVideo = activeLessonContent?.noi_dung?.some(
      (content) => normalizeContentType(content.loai_noi_dung) === "video",
    );
    if (!activeLessonContent || !hasVideo) return;

    const interval = window.setInterval(() => {
      const currentTime = Math.floor(videoRef.current?.currentTime || 0);
      if (currentTime <= 0) return;

      apiService
        .updateLessonProgress(activeLessonContent.id, completedLessons[activeLessonContent.id] || false, currentTime)
        .catch((err) => console.warn("Auto progress save error:", err));
    }, 5000);

    return () => window.clearInterval(interval);
  }, [activeLessonContent, completedLessons]);

  const handleMarkCompleted = async () => {
    if (!activeLesson) return;

    try {
      const currentTime = Math.floor(videoRef.current?.currentTime || 0);
      await apiService.updateLessonProgress(activeLesson.id, true, currentTime);
      setCompletedLessons((prev) => ({ ...prev, [activeLesson.id]: true }));
      await refreshCourseProgress();
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Không thể lưu tiến trình bài học."));
    }
  };

  const handleSpeedChange = (rate: number) => {
    setPlaybackRate(rate);
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
  };

  const renderContentBlock = (content: LessonContent, index: number) => {
    const type = normalizeContentType(content.loai_noi_dung);
    const title = content.loai_noi_dung ? content.loai_noi_dung.toUpperCase() : `Nội dung ${index + 1}`;

    if (type === "video") {
      const isYouTube = content.duong_dan_file?.includes("youtube.com") || content.duong_dan_file?.includes("youtu.be");
      const videoUrl = content.duong_dan_file || "";
      const embedUrl = isYouTube && videoUrl ? (() => {
        const match = videoUrl.match(/^.*(youtu.be\/|v\/|vi\/|u\/\w\/|embed\/|shorts\/|watch\?v=|\&v=)([^#\&\?]*).*/);
        return match && match[2].length === 11 ? `https://www.youtube.com/embed/${match[2]}` : videoUrl;
      })() : "";

      return (
        <div key={content.id || index} className="my-10">
          {content.duong_dan_file ? (
            <div className="relative overflow-hidden rounded-2xl bg-slate-950">
              {isYouTube ? (
                <iframe
                  className="aspect-video w-full object-contain bg-black"
                  src={embedUrl}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <>
                  <video
                    ref={index === 0 ? videoRef : undefined}
                    src={content.duong_dan_file}
                    controls
                    className="aspect-video w-full object-contain"
                    onLoadedMetadata={() => {
                      if (index === 0 && videoRef.current && videoResumeSeconds > 0) {
                        videoRef.current.currentTime = videoResumeSeconds;
                      }
                    }}
                  />
                  <div className="absolute right-4 top-4 flex items-center gap-1 rounded-full bg-black/60 p-1 text-white backdrop-blur">
                    {[1, 1.25, 1.5, 2].map((rate) => (
                      <button
                        key={rate}
                        onClick={() => handleSpeedChange(rate)}
                        className={`rounded-full px-3 py-1 text-xs font-semibold transition ${playbackRate === rate ? "bg-white text-slate-950" : "text-white/75 hover:text-white"
                          }`}
                      >
                        {rate}x
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : (
            <EmptyContent icon={<PlayCircle className="h-10 w-10" />} title="Bài học chưa có video." />
          )}
        </div>
      );
    }

    if (type === "pdf") {
      return (
        <div key={content.id || index} className="my-10">
          {content.duong_dan_file ? (
            <PdfViewer url={content.duong_dan_file} />
          ) : (
            <EmptyContent icon={<FileText className="h-10 w-10" />} title="Bài học chưa có tài liệu PDF." />
          )}
        </div>
      );
    }

    if (type === "image") {
      return (
        <figure key={content.id || index} className="my-10">
          {content.duong_dan_file ? (
            <img
              src={content.duong_dan_file}
              alt={activeLesson?.tieu_de || "Nội dung bài học"}
              className="mx-auto h-auto max-h-[72vh] w-auto max-w-full rounded-2xl object-contain"
            />
          ) : (
            <EmptyContent icon={<ImageIcon className="h-10 w-10" />} title="Bài học chưa có hình ảnh." />
          )}
        </figure>
      );
    }

    if (type === "code") {
      return (
        <div key={content.id || index} className="my-10">
          <div className="mb-4 flex items-center gap-3 text-sm font-semibold text-slate-800">
            <Code2 className="h-5 w-5 text-blue-600" />
            Khối mã nguồn
          </div>
          <pre className="overflow-x-auto rounded-2xl bg-slate-950 p-6 text-sm leading-7 text-slate-100">
            <code>{content.noi_dung_text || "Bài học hiện chưa có nội dung mã nguồn."}</code>
          </pre>
        </div>
      );
    }

    return (
      <div key={content.id || index} className="my-8">
        {index > 0 && title !== "TEXT" && (
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.24em] text-blue-600">{title}</p>
        )}
        <div
          className="text-[17px] leading-9 text-slate-700"
          dangerouslySetInnerHTML={{ __html: content.noi_dung_text || "Bài đọc hiện chưa có nội dung văn bản cụ thể." }}
        />
      </div>
    );
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="flex min-h-screen items-center justify-center bg-white pt-20">
          <RefreshCw className="h-9 w-9 animate-spin text-blue-600" />
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-white pt-20 text-slate-950 lg:pt-24">
        <div className="grid min-h-[calc(100vh-6rem)] grid-cols-1 lg:grid-cols-[minmax(0,1fr)_390px]">
          <article className="px-5 py-8 sm:px-8 lg:px-10 xl:px-14">
            {error && (
              <div className="mx-auto mb-8 flex max-w-4xl items-start gap-4 text-red-700">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  <h2 className="font-bold">Không thể mở bài học</h2>
                  <p className="mt-1 text-sm leading-6">{error}</p>
                </div>
              </div>
            )}

            <header className="mx-auto mb-10 flex max-w-4xl flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="mb-3 text-sm font-semibold uppercase tracking-[0.28em] text-blue-600">
                  {course?.tieu_de || "Không có thông tin khóa học"}
                </p>
                <h1 className="max-w-4xl text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                  {activeQuiz ? activeQuiz.tieu_de : (activeLesson?.tieu_de || "Chưa có bài học")}
                </h1>
                <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-slate-500">
                  <span className="inline-flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    {totalLessons} bài học
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {activeQuiz 
                      ? (activeQuiz.thoi_gian_lam_bai ? `${activeQuiz.thoi_gian_lam_bai} phút` : "Không giới hạn")
                      : formatDuration(activeLesson?.thoi_luong)
                    }
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4" />
                    Nội dung thuộc khóa học đã đăng ký
                  </span>
                </div>
              </div>

              {!activeQuiz && (
                <button
                  onClick={handleMarkCompleted}
                  // Tạm thời tắt tính năng 10p mới được hoàn thành bài học
                  disabled={!activeLesson || lessonLoading || !!completedLessons[activeLesson.id]}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-6 py-3.5 text-sm font-bold uppercase tracking-widest text-white shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <CheckCircle2 className="h-5 w-5" />
                  {activeLesson && completedLessons[activeLesson.id]
                    ? "Đã hoàn thành"
                    : "Hoàn thành"}
                </button>
              )}
            </header>

            {lessonLoading && (
              <div className="mx-auto flex min-h-[360px] max-w-4xl items-center justify-center">
                <div className="text-center">
                  <RefreshCw className="mx-auto h-9 w-9 animate-spin text-blue-600" />
                  <p className="mt-4 text-sm font-semibold text-slate-500">Đang tải bài giảng...</p>
                </div>
              </div>
            )}

            {!lessonLoading && !error && activeQuiz && (
              <div className="mx-auto max-w-2xl bg-white border border-slate-200 rounded-[2rem] p-8 sm:p-10 shadow-xl text-center space-y-6">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                  <ClipboardList className="h-8 w-8" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-blue-600">Bài kiểm tra cuối khóa</p>
                  <h2 className="mt-2 text-2xl font-black text-slate-995">{activeQuiz.tieu_de}</h2>
                </div>
                <div className="mx-auto max-w-md divide-y divide-slate-100 rounded-2xl border border-slate-100 bg-slate-50/50 p-5 text-left text-sm font-semibold">
                  <div className="flex justify-between py-2.5">
                    <span className="text-slate-500">Điểm tối thiểu cần đạt</span>
                    <span className="text-slate-900 font-bold">{Number(activeQuiz.diem_dat)}/10</span>
                  </div>
                  <div className="flex justify-between py-2.5">
                    <span className="text-slate-500">Thời gian làm bài</span>
                    <span className="text-slate-900 font-bold">{activeQuiz.thoi_gian_lam_bai ? `${activeQuiz.thoi_gian_lam_bai} phút` : "Không giới hạn"}</span>
                  </div>
                  <div className="flex justify-between py-2.5">
                    <span className="text-slate-500">Số lượt làm tối đa</span>
                    <span className="text-slate-900 font-bold">{activeQuiz.so_luot_lam_toi_da} lượt</span>
                  </div>
                  {activeQuiz.attempts_count !== undefined && activeQuiz.attempts_count > 0 && (
                    <div className="flex justify-between py-2.5">
                      <span className="text-slate-500">Điểm cao nhất của bạn</span>
                      <span className={`font-bold ${activeQuiz.passed ? "text-emerald-600" : "text-rose-600"}`}>
                        {activeQuiz.highest_score}/10 ({activeQuiz.passed ? "Đã đạt" : "Chưa đạt"})
                      </span>
                    </div>
                  )}
                </div>
                <div className="pt-4">
                  {activeQuiz.passed ? (
                    <div className="text-center text-sm font-bold text-emerald-700 bg-emerald-50 rounded-2xl p-5 border border-dashed border-emerald-200 flex flex-col items-center gap-2">
                      <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                      <span>Chúc mừng! Bạn đã vượt qua bài kiểm tra này và không phải làm lại.</span>
                    </div>
                  ) : isQuizLocked(activeQuiz.id) ? (
                    <div className="text-center text-sm font-bold text-slate-400 bg-slate-100/80 rounded-2xl p-4 border border-dashed border-slate-200">
                      Bạn phải hoàn thành toàn bộ bài học và các bài kiểm tra trước đó mới có thể làm bài này!
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {activeQuiz.attempts_count !== undefined && activeQuiz.attempts_count >= activeQuiz.so_luot_lam_toi_da ? (
                        <div className="text-center text-sm font-bold text-rose-600 bg-rose-50 rounded-2xl p-4 border border-dashed border-rose-200">
                          Bạn đã hết số lượt làm bài cho phép ({activeQuiz.so_luot_lam_toi_da} lượt).
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => window.open(`/quiz/${activeQuiz.id}`, "_blank")}
                          className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-8 text-sm font-bold uppercase tracking-widest text-white shadow-lg shadow-blue-200 hover:bg-blue-700 transition"
                        >
                          Bắt đầu làm bài thi
                          <ArrowRight className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {!lessonLoading && !error && activeLessonContent && !activeQuiz && (
              <div className="mx-auto max-w-4xl">
                {activeLessonContent.noi_dung?.length ? (
                  activeLessonContent.noi_dung
                    .slice()
                    .sort((a, b) => (a.thu_tu || 0) - (b.thu_tu || 0))
                    .map(renderContentBlock)
                ) : (
                  <EmptyContent icon={<FileText className="h-10 w-10" />} title="Bài học này chưa có nội dung." />
                )}
              </div>
            )}

            {!lessonLoading && !error && !activeLesson && !activeQuiz && (
              <EmptyContent icon={<BookOpen className="h-10 w-10" />} title="Khóa học chưa có bài học để hiển thị." />
            )}
          </article>

          <aside className="border-t border-slate-200 bg-white lg:sticky lg:top-20 lg:h-[calc(100vh-5rem)] lg:overflow-y-auto lg:border-l lg:border-t-0">
            <div className="border-b border-slate-200 p-6">
              <h2 className="text-xl font-black uppercase tracking-[0.18em] text-slate-900">Nội dung học tập</h2>
              <div className="mt-5 space-y-2">
                <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-slate-500">
                  <span>Tiến trình</span>
                  <span className="text-emerald-600">{progressPercent}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${progressPercent}%` }} />
                </div>
              </div>
            </div>

            <div className="space-y-6 p-5">
              {/* Sorted chapters */}
              {[...(course?.chuong_hoc || [])]
                .sort((a, b) => a.thu_tu - b.thu_tu)
                .map((section) => (
                  <section key={section.id} className="space-y-3">
                    <h3 className="px-1 text-xs font-black uppercase tracking-widest text-blue-600">
                      {section.tieu_de}
                    </h3>
                    <div className="space-y-2">
                      {[...(section.bai_hoc || [])]
                        .sort((a, b) => a.thu_tu - b.thu_tu)
                        .map((lesson) => {
                          const isSelected = activeLesson?.id === lesson.id && !activeQuiz;
                          const isCompleted = !!completedLessons[lesson.id];
                          const locked = isLessonLocked(lesson.id);

                          return (
                            <button
                              key={lesson.id}
                              disabled={locked}
                              onClick={() => {
                                setActiveLesson(lesson);
                                setActiveQuiz(null);
                              }}
                              className={`w-full border-l-2 px-3 py-3 text-left transition ${isSelected
                                  ? "border-blue-600 bg-blue-50/60"
                                  : "border-transparent hover:border-blue-200 hover:bg-slate-50"
                                } ${locked ? "opacity-50 cursor-not-allowed" : ""}`}
                            >
                              <div className="flex items-start gap-3">
                                {locked ? (
                                  <Lock className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
                                ) : isCompleted ? (
                                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                                ) : (
                                  <PlayCircle className={`mt-0.5 h-5 w-5 shrink-0 ${isSelected ? "text-blue-600" : "text-slate-400"}`} />
                                )}
                                <div>
                                  <p className={`line-clamp-2 text-sm font-semibold leading-6 ${isSelected ? "text-blue-600" : "text-slate-800"}`}>
                                    {lesson.tieu_de}
                                  </p>
                                  <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-slate-500">
                                    <Clock className="h-3.5 w-3.5" />
                                    {formatDuration(lesson.thoi_luong)}
                                  </p>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                    </div>
                  </section>
                ))}

              {/* Course final quizzes in Sidebar */}
              {quizzes.length > 0 && (
                <section className="space-y-3 pt-4 border-t border-slate-200">
                  <h3 className="px-1 text-xs font-black uppercase tracking-widest text-blue-600 flex items-center gap-1.5">
                    <ClipboardList className="w-4 h-4" />
                    Bài kiểm tra cuối khóa
                  </h3>
                  <div className="space-y-2">
                    {quizzes.map((quiz) => {
                      const isSelected = activeQuiz?.id === quiz.id;
                      const locked = isQuizLocked(quiz.id);

                      return (
                        <button
                          key={quiz.id}
                          onClick={() => {
                            setActiveQuiz(quiz);
                            setActiveLesson(null);
                          }}
                          className={`w-full border-l-2 px-3 py-3 text-left transition ${isSelected
                              ? "border-blue-600 bg-blue-50/60"
                              : "border-transparent hover:border-blue-200 hover:bg-slate-50"
                            } ${locked ? "opacity-50" : ""}`}
                        >
                          <div className="flex items-start gap-3">
                            {locked ? (
                              <Lock className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
                            ) : quiz.passed ? (
                              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                            ) : (
                              <ClipboardList className={`mt-0.5 h-5 w-5 shrink-0 ${isSelected ? "text-blue-600" : "text-slate-400"}`} />
                            )}
                            <div>
                              <p className={`line-clamp-2 text-sm font-semibold leading-6 ${isSelected ? "text-blue-600" : "text-slate-800"}`}>
                                {quiz.tieu_de}
                              </p>
                              <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-slate-500">
                                <Clock className="h-3.5 w-3.5" />
                                {quiz.thoi_gian_lam_bai ? `${quiz.thoi_gian_lam_bai} phút` : "Không giới hạn"}
                              </p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </section>
              )}
            </div>
          </aside>
        </div>
      </main>
    </>
  );
}

function EmptyContent({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex min-h-[280px] items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
      <div>
        <div className="mx-auto mb-4 flex justify-center text-slate-300">{icon}</div>
        <p className="font-semibold">{title}</p>
      </div>
    </div>
  );
}
