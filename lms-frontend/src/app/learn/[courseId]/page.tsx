"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
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
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { apiService, CourseDetail, CourseProgress, Lesson, LessonContent } from "@/services/api";

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
  const [loading, setLoading] = useState(true);
  const [lessonLoading, setLessonLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [videoResumeSeconds, setVideoResumeSeconds] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);

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
        const [detail, progress] = await Promise.all([
          apiService.getCourseDetail(courseId),
          apiService.getCourseProgress(courseId).catch(() => null),
        ]);
        if (!detail) {
          setError("Không tìm thấy khóa học hoặc khóa học chưa khả dụng.");
          return;
        }

        setCourse(detail);
        setCourseProgress(progress);
        const firstLesson = detail.chuong_hoc?.flatMap((section) => section.bai_hoc || [])?.[0];
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
      return (
        <div key={content.id || index} className="my-10">
          {content.duong_dan_file ? (
            <div className="relative overflow-hidden rounded-2xl bg-slate-950">
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
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                      playbackRate === rate ? "bg-white text-slate-950" : "text-white/75 hover:text-white"
                    }`}
                  >
                    {rate}x
                  </button>
                ))}
              </div>
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
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3 text-sm font-semibold text-slate-800">
              <FileText className="h-5 w-5 text-blue-600" />
              Tài liệu PDF
            </div>
            {content.duong_dan_file && (
              <a
                href={content.duong_dan_file}
                download
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-blue-600 hover:text-blue-600"
              >
                <Download className="h-4 w-4" />
                Tải xuống
              </a>
            )}
          </div>
          {content.duong_dan_file ? (
            <iframe src={`${content.duong_dan_file}#toolbar=0`} className="h-[72vh] w-full rounded-2xl bg-white" />
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
            <Image
              src={content.duong_dan_file}
              alt={activeLesson?.tieu_de || "Nội dung bài học"}
              width={1200}
              height={800}
              unoptimized
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
        <div className="whitespace-pre-line text-[17px] leading-9 text-slate-700">
          {content.noi_dung_text || "Bài đọc hiện chưa có nội dung văn bản cụ thể."}
        </div>
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
                  {activeLesson?.tieu_de || "Chưa có bài học"}
                </h1>
                <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-slate-500">
                  <span className="inline-flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    {totalLessons} bài học
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {formatDuration(activeLesson?.thoi_luong)}
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4" />
                    Nội dung thuộc khóa học đã đăng ký
                  </span>
                </div>
              </div>

              <button
                onClick={handleMarkCompleted}
                disabled={!activeLesson || lessonLoading}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-6 py-3.5 text-sm font-bold uppercase tracking-widest text-white shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <CheckCircle2 className="h-5 w-5" />
                Hoàn thành
              </button>
            </header>

            {lessonLoading && (
              <div className="mx-auto flex min-h-[360px] max-w-4xl items-center justify-center">
                <div className="text-center">
                  <RefreshCw className="mx-auto h-9 w-9 animate-spin text-blue-600" />
                  <p className="mt-4 text-sm font-semibold text-slate-500">Đang tải bài giảng...</p>
                </div>
              </div>
            )}

            {!lessonLoading && !error && activeLessonContent && (
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

            {!lessonLoading && !error && !activeLesson && (
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
              {course?.chuong_hoc?.map((section) => (
                <section key={section.id} className="space-y-3">
                  <h3 className="px-1 text-xs font-black uppercase tracking-widest text-blue-600">
                    {section.tieu_de}
                  </h3>
                  <div className="space-y-2">
                    {section.bai_hoc?.map((lesson) => {
                      const isSelected = activeLesson?.id === lesson.id;
                      const isCompleted = !!completedLessons[lesson.id];

                      return (
                        <button
                          key={lesson.id}
                          onClick={() => setActiveLesson(lesson)}
                          className={`w-full border-l-2 px-3 py-3 text-left transition ${
                            isSelected
                              ? "border-blue-600 bg-blue-50/60"
                              : "border-transparent hover:border-blue-200 hover:bg-slate-50"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            {isCompleted ? (
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
