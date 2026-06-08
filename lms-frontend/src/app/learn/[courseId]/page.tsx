"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { PlayCircle, FileText, CheckCircle2, ChevronRight, MessageSquare, BookOpen, Download, Plus, Clock, RefreshCw, AlertCircle, Volume2, HelpCircle } from "lucide-react";
import Navbar from "@/components/Navbar";
import { apiService, CourseDetail, Lesson, Section } from "@/services/api";

interface Note {
  timestamp: string;
  seconds: number;
  text: string;
}

interface Question {
  timestamp?: string;
  author: string;
  content: string;
  replies: string[];
}

const normalizeContentType = (value?: string) => (value || "").toLowerCase();

export default function LearnSpacePage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params?.courseId ? Number(params.courseId) : 0;

  // DB States
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [activeLesson, setActiveLesson] = useState<any | null>(null);
  const [activeLessonContent, setActiveLessonContent] = useState<Lesson | null>(null);
  const [completedLessons, setCompletedLessons] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [lessonLoading, setLessonLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tab States (Q&A, Notes, Resources)
  const [activeTab, setActiveTab] = useState<"qa" | "notes" | "resources">("qa");
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState("");
  const [questions, setQuestions] = useState<Question[]>([
    {
      author: "Trần Văn Nam",
      timestamp: "01:23",
      content: "Cho em hỏi vì sao ở đây connection pool lại đặt size là 10 vậy thầy? Đặt cao hơn có lỗi gì không ạ?",
      replies: ["Giảng viên Lumina: Chào em, pool size 10 là mức mặc định hợp lý cho dự án vừa. Nếu đặt quá cao mà PostgreSQL không chịu nổi max_connections thì sẽ báo lỗi 'too many clients already'. Nhớ config khớp cả hai nhé."]
    }
  ]);
  const [newQuestion, setNewQuestion] = useState("");

  // Video Ref & Speeds
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [videoResumeSeconds, setVideoResumeSeconds] = useState(0);

  // Fetch course details on mount
  useEffect(() => {
    if (!courseId) return;

    async function loadCourse() {
      setLoading(true);
      setError(null);
      try {
        const detail = await apiService.getCourseDetail(courseId);
        if (detail) {
          setCourse(detail);
          
          // Find first lesson to auto-select
          if (detail.chuong_hoc?.length > 0 && detail.chuong_hoc[0].bai_hoc?.length > 0) {
            const firstLesson = detail.chuong_hoc[0].bai_hoc[0];
            setActiveLesson(firstLesson);
          }
        }
      } catch (err: any) {
        setError(err.message || "Không thể tải nội dung lớp học.");
      } finally {
        setLoading(false);
      }
    }

    loadCourse();
  }, [courseId]);

  // Load lesson content & progress when active lesson changes
  useEffect(() => {
    if (!courseId || !activeLesson) return;

    async function loadLesson() {
      setLessonLoading(true);
      setError(null);
      setActiveLessonContent(null);
      try {
        // Fetch lesson detail (checks enrollment internally)
        const lessonDetail = await apiService.getLessonLearningContent(courseId, activeLesson.id);
        setActiveLessonContent(lessonDetail);

        // Fetch lesson progress
        const prog = await apiService.getLessonProgress(activeLesson.id);
        setVideoResumeSeconds(prog.video_resume_seconds || 0);
        
        if (prog.da_hoan_thanh) {
          setCompletedLessons(prev => ({ ...prev, [activeLesson.id]: true }));
        }

        // Set resume time in player if exists
        if (videoRef.current && prog.video_resume_seconds > 0) {
          videoRef.current.currentTime = prog.video_resume_seconds;
        }
      } catch (err: any) {
        setError(err.message || "Bạn chưa đăng ký mua khóa học này.");
      } finally {
        setLessonLoading(false);
      }
    }

    loadLesson();
  }, [activeLesson, courseId]);

  // Periodic progress autosave for video
  useEffect(() => {
    if (!activeLessonContent || !activeLessonContent.noi_dung?.some((content) => normalizeContentType(content.loai_noi_dung) === "video")) return;

    const interval = setInterval(() => {
      if (videoRef.current) {
        const currSeconds = Math.floor(videoRef.current.currentTime);
        if (currSeconds > 0) {
          // Save locally
          localStorage.setItem(`resume_lesson_${activeLessonContent.id}`, String(currSeconds));
          // Call API silently
          apiService.updateLessonProgress(activeLessonContent.id, completedLessons[activeLessonContent.id] || false, currSeconds)
            .catch(err => console.warn("Auto progress save error:", err));
        }
      }
    }, 5000); // every 5 seconds

    return () => clearInterval(interval);
  }, [activeLessonContent, completedLessons]);

  const handleMarkCompleted = async () => {
    if (!activeLesson) return;
    try {
      const currSeconds = videoRef.current ? Math.floor(videoRef.current.currentTime) : 0;
      await apiService.updateLessonProgress(activeLesson.id, true, currSeconds);
      setCompletedLessons((prev) => ({ ...prev, [activeLesson.id]: true }));
      
      // Auto-unlock next lesson if possible
      alert("Chúc mừng! Bạn đã hoàn thành bài học này.");
    } catch (err: any) {
      alert(err.message || "Không thể lưu tiến trình bài học.");
    }
  };

  const handleSpeedChange = (rate: number) => {
    setPlaybackRate(rate);
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
  };

  // Helpers for timestamp recording
  const formatSeconds = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    const currentSeconds = videoRef.current ? videoRef.current.currentTime : 0;
    const timestampStr = formatSeconds(currentSeconds);

    const noteObj: Note = {
      timestamp: timestampStr,
      seconds: currentSeconds,
      text: newNote
    };

    setNotes([...notes, noteObj].sort((a, b) => a.seconds - b.seconds));
    setNewNote("");
  };

  const handleAddQuestion = () => {
    if (!newQuestion.trim()) return;
    const currentSeconds = videoRef.current ? videoRef.current.currentTime : 0;
    const timestampStr = formatSeconds(currentSeconds);

    const qObj: Question = {
      author: "Học viên",
      timestamp: timestampStr,
      content: newQuestion,
      replies: []
    };

    setQuestions([qObj, ...questions]);
    setNewQuestion("");
  };

  const seekTo = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = seconds;
      videoRef.current.play();
    }
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

  // Find active content
  const activeContent = activeLessonContent?.noi_dung?.[0];
  const activeContentType = normalizeContentType(activeContent?.loai_noi_dung);

  return (
    <>
      <Navbar />

      <main className="pt-20 lg:pt-24 min-h-screen bg-background text-foreground flex flex-col">
        {/* Main classroom splitter layout */}
        <div className="flex-grow grid grid-cols-1 lg:grid-cols-12">
          {/* Left Area: Player & Tabs (Col span 8 or 9) */}
          <div className="lg:col-span-8 xl:col-span-9 flex flex-col p-4 lg:p-8 space-y-8">
            
            {/* Error handling */}
            {error && (
              <div className="p-6 rounded-[1.5rem] bg-destructive/10 border border-destructive/20 text-destructive flex items-start gap-4">
                <AlertCircle className="h-6 w-6 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-base tracking-tight">Không thể mở bài học</h3>
                  <p className="text-sm mt-1 leading-relaxed">{error}</p>
                </div>
              </div>
            )}

            {/* Content Display Space */}
            {!error && (
              <div className="space-y-6">
                {/* Heading details */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tighter leading-snug">
                      {activeLesson?.tieu_de}
                    </h1>
                    <p className="text-xs font-bold text-primary uppercase tracking-widest mt-2">{course?.tieu_de}</p>
                  </div>
                  <button
                    onClick={handleMarkCompleted}
                    className="self-start sm:self-auto bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3.5 px-6 rounded-2xl flex items-center gap-2 text-xs uppercase tracking-widest shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
                  >
                    <CheckCircle2 className="h-4.5 w-4.5" />
                    <span>Hoàn thành</span>
                  </button>
                </div>

                {/* Lesson loading spinner */}
                {lessonLoading && (
                  <div className="aspect-video w-full rounded-[2rem] bg-secondary border border-border/50 flex flex-col items-center justify-center space-y-4">
                    <RefreshCw className="h-10 w-10 text-primary animate-spin" />
                    <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Đang tải bài giảng...</span>
                  </div>
                )}

                {/* Dynamic Content View based on block type */}
                {!lessonLoading && activeLessonContent && !activeContent && (
                  <div className="rounded-[2rem] border border-dashed border-border/60 bg-card p-10 text-center shadow-sm">
                    <FileText className="mx-auto h-12 w-12 text-muted-foreground/40" />
                    <p className="mt-4 text-sm font-black text-muted-foreground">Bài học này chưa có nội dung.</p>
                  </div>
                )}

                {!lessonLoading && activeLessonContent && activeContent && (
                  <div className="bg-card text-card-foreground border border-border/60 rounded-[2rem] overflow-hidden shadow-2xl">
                    {/* VIDEO PLAYER */}
                    {activeContentType === "video" && (
                      <div className="relative bg-slate-900 aspect-video w-full flex flex-col justify-between overflow-hidden group">
                        {activeContent.duong_dan_file ? (
                          <video
                            ref={videoRef}
                            src={activeContent.duong_dan_file}
                            controls
                            className="h-full w-full object-contain"
                            onLoadedMetadata={() => {
                              if (videoRef.current && videoResumeSeconds > 0) {
                                videoRef.current.currentTime = videoResumeSeconds;
                              }
                            }}
                          />
                        ) : (
                          <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center text-white">
                            <FileText className="h-12 w-12 text-white/40" />
                            <p className="text-lg font-black">Bài học chưa có video</p>
                            <p className="max-w-md text-sm text-white/60">Giảng viên chưa tải nội dung video cho bài học này.</p>
                          </div>
                        )}

                        {/* Top Overlay controls for speed */}
                        {activeContent.duong_dan_file && (
                        <div className="absolute top-4 right-4 flex items-center space-x-2 bg-black/60 backdrop-blur-md p-1.5 rounded-xl border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <span className="text-[10px] font-black text-white uppercase tracking-widest px-2">Tốc độ</span>
                          {[1, 1.25, 1.5, 2].map((s) => (
                            <button
                              key={s}
                              onClick={() => handleSpeedChange(s)}
                              className={`px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                                playbackRate === s ? "bg-primary text-white" : "text-zinc-400 hover:text-white hover:bg-white/10"
                              }`}
                            >
                              {s}x
                            </button>
                          ))}
                        </div>
                        )}
                      </div>
                    )}

                    {/* PDF READER */}
                    {activeContentType === "pdf" && (
                      <div className="flex flex-col space-y-0 h-[70vh]">
                        <div className="flex items-center justify-between bg-secondary p-4 px-6 border-b border-border/60">
                          <div className="flex items-center space-x-2 text-foreground">
                            <FileText className="h-5 w-5 text-primary" />
                            <span className="text-sm font-bold uppercase tracking-widest">Tài liệu đính kèm (PDF)</span>
                          </div>
                          {activeContent.duong_dan_file && (
                            <a
                              href={activeContent.duong_dan_file}
                              download
                              className="bg-primary hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-xl flex items-center space-x-2 cursor-pointer text-xs uppercase tracking-widest transition-all shadow-md shadow-primary/20"
                            >
                              <Download className="h-4 w-4" />
                              <span>Tải xuống</span>
                            </a>
                          )}
                        </div>
                        {activeContent.duong_dan_file ? (
                          <iframe
                            src={`${activeContent.duong_dan_file}#toolbar=0`}
                            className="w-full flex-grow bg-slate-100"
                          />
                        ) : (
                          <div className="flex flex-grow flex-col items-center justify-center gap-3 bg-slate-100 p-8 text-center">
                            <FileText className="h-12 w-12 text-slate-300" />
                            <p className="font-black text-slate-700">Bài học chưa có tài liệu PDF</p>
                            <p className="max-w-md text-sm text-slate-500">Giảng viên chưa tải tệp PDF cho bài học này.</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* TEXT ARTICLE READOUT */}
                    {activeContentType === "text" && (
                      <div className="p-10 md:p-16 prose prose-slate dark:prose-invert max-w-none text-base leading-relaxed text-foreground space-y-8">
                        <div className="font-sans text-sm border-l-4 border-primary pl-5 py-3 italic bg-primary/5 rounded-r-2xl font-medium">
                          Lumina Tips: Hãy đọc kỹ tài liệu lý thuyết này trước khi bắt tay vào thực hành code trên IDE của bạn.
                        </div>
                        <div className="whitespace-pre-line tracking-wide">
                          {activeContent.noi_dung_text || "Bài đọc hiện chưa có nội dung văn bản cụ thể."}
                        </div>
                      </div>
                    )}

                    {activeContentType === "code" && (
                      <div className="p-8">
                        <pre className="overflow-x-auto rounded-2xl bg-slate-950 p-6 text-sm leading-relaxed text-slate-100">
                          <code>{activeContent.noi_dung_text || "Bài học hiện chưa có nội dung code."}</code>
                        </pre>
                      </div>
                    )}

                    {activeContentType === "image" && (
                      <div className="flex min-h-[60vh] items-center justify-center bg-slate-100 p-8">
                        {activeContent.duong_dan_file ? (
                          <img src={activeContent.duong_dan_file} alt={activeLesson?.tieu_de || "Nội dung bài học"} className="max-h-[70vh] max-w-full rounded-2xl object-contain shadow-xl" />
                        ) : (
                          <div className="text-center">
                            <FileText className="mx-auto h-12 w-12 text-slate-300" />
                            <p className="mt-3 font-black text-slate-700">Bài học chưa có ảnh</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Bottom Utilities Tab (Q&A, Notes, Resources) */}
            <div className="space-y-6 pt-8">
              <div className="flex overflow-x-auto border-b border-border/60 custom-scrollbar">
                <button
                  onClick={() => setActiveTab("qa")}
                  className={`pb-4 px-2 text-sm font-black uppercase tracking-widest border-b-2 transition-all mr-8 cursor-pointer whitespace-nowrap ${
                    activeTab === "qa" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Hỏi đáp lớp
                </button>
                <button
                  onClick={() => setActiveTab("notes")}
                  className={`pb-4 px-2 text-sm font-black uppercase tracking-widest border-b-2 transition-all mr-8 cursor-pointer whitespace-nowrap ${
                    activeTab === "notes" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Sổ ghi chú
                </button>
                <button
                  onClick={() => setActiveTab("resources")}
                  className={`pb-4 px-2 text-sm font-black uppercase tracking-widest border-b-2 transition-all mr-8 cursor-pointer whitespace-nowrap ${
                    activeTab === "resources" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Tài nguyên
                </button>
              </div>

              {/* TAB Q&A CONTENT */}
              {activeTab === "qa" && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="text"
                      placeholder="Đặt câu hỏi về bài giảng..."
                      value={newQuestion}
                      onChange={(e) => setNewQuestion(e.target.value)}
                      className="flex-grow bg-card text-foreground text-sm font-medium rounded-2xl py-3.5 px-6 border border-border/60 focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-sm transition-all"
                    />
                    <button
                      onClick={handleAddQuestion}
                      className="bg-primary hover:bg-blue-700 text-white font-bold px-6 py-3.5 rounded-2xl flex items-center justify-center space-x-2 cursor-pointer text-xs uppercase tracking-widest shadow-lg shadow-primary/20 transition-all shrink-0"
                    >
                      <Plus className="h-4.5 w-4.5" />
                      <span>Gửi câu hỏi</span>
                    </button>
                  </div>

                  <div className="space-y-4 pt-2">
                    {questions.map((q, idx) => (
                      <div key={idx} className="bg-card border border-border/60 rounded-[1.5rem] p-6 space-y-4 shadow-sm">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-black text-foreground">{q.author}</span>
                          {q.timestamp && (
                            <button 
                                onClick={() => {
                                    if(q.timestamp) {
                                        const parts = q.timestamp.split(':');
                                        if (parts.length === 2) {
                                            const secs = parseInt(parts[0]) * 60 + parseInt(parts[1]);
                                            seekTo(secs);
                                        }
                                    }
                                }}
                                className="bg-primary/10 text-primary font-bold px-3 py-1.5 rounded-lg flex items-center space-x-1.5 hover:bg-primary hover:text-white transition-colors cursor-pointer"
                            >
                              <Clock className="h-3.5 w-3.5" />
                              <span>{q.timestamp}</span>
                            </button>
                          )}
                        </div>
                        <p className="text-foreground/90 leading-relaxed font-medium text-sm">{q.content}</p>
                        
                        {q.replies.map((rep, rIdx) => (
                          <div key={rIdx} className="bg-secondary/50 border-l-4 border-primary p-4 rounded-r-2xl mt-4 font-medium text-sm text-muted-foreground leading-relaxed">
                            {rep}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB NOTES CONTENT */}
              {activeTab === "notes" && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="text"
                      placeholder="Ghi chú nhanh tại mốc thời gian này..."
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      className="flex-grow bg-card text-foreground text-sm font-medium rounded-2xl py-3.5 px-6 border border-border/60 focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-sm transition-all"
                    />
                    <button
                      onClick={handleAddNote}
                      className="bg-primary hover:bg-blue-700 text-white font-bold px-6 py-3.5 rounded-2xl flex items-center justify-center space-x-2 cursor-pointer text-xs uppercase tracking-widest shadow-lg shadow-primary/20 transition-all shrink-0"
                    >
                      <Plus className="h-4.5 w-4.5" />
                      <span>Lưu lại</span>
                    </button>
                  </div>

                  <div className="space-y-4 pt-2">
                    {notes.length === 0 ? (
                      <div className="bg-secondary/40 border border-dashed border-border rounded-3xl p-10 text-center">
                          <p className="text-sm font-bold text-muted-foreground">Chưa có ghi chú nào. Hãy tạo thói quen ghi chép nhé!</p>
                      </div>
                    ) : (
                      notes.map((n, idx) => (
                        <div key={idx} className="flex items-center justify-between p-5 bg-card border border-border/60 rounded-[1.5rem] shadow-sm gap-4">
                          <p className="text-foreground font-medium text-sm leading-relaxed">{n.text}</p>
                          <button
                            onClick={() => seekTo(n.seconds)}
                            className="bg-secondary hover:bg-primary text-primary hover:text-white font-bold px-4 py-2 rounded-xl flex items-center space-x-2 shrink-0 transition-colors shadow-sm"
                          >
                            <Clock className="h-4 w-4" />
                            <span className="text-xs">{n.timestamp}</span>
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* TAB RESOURCES CONTENT */}
              {activeTab === "resources" && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex items-center justify-between p-6 bg-card border border-border/60 rounded-[1.5rem] shadow-sm">
                    <div className="flex items-center space-x-4 text-foreground">
                      <div className="bg-primary/10 p-3 rounded-xl text-primary">
                          <FileText className="h-6 w-6" />
                      </div>
                      <div>
                          <p className="font-bold text-sm">Source Code Mẫu (Zip)</p>
                          <p className="text-xs text-muted-foreground mt-1">Dành riêng cho chương này</p>
                      </div>
                    </div>
                    <button className="text-primary bg-secondary hover:bg-primary hover:text-white px-5 py-2.5 rounded-xl font-bold flex items-center space-x-2 cursor-pointer transition-all text-xs uppercase tracking-widest shadow-sm">
                      <Download className="h-4 w-4" />
                      <span className="hidden sm:inline">Tải về</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Area: Course Outline Accordion (Col span 4 or 3) */}
          <aside className="lg:col-span-4 xl:col-span-3 border-l border-border/40 bg-card/40 flex flex-col h-[calc(100vh-64px)] lg:sticky lg:top-16">
            <div className="p-6 border-b border-border/40 bg-background/50 backdrop-blur-md">
                <h2 className="font-black text-base text-foreground uppercase tracking-widest">
                Nội dung học tập
                </h2>
                {/* Progress bar logic could be added here if needed */}
                <div className="mt-4 space-y-2">
                    <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                        <span>Tiến trình</span>
                        <span className="text-success">50%</span>
                    </div>
                    <div className="progress-track">
                        <div className="progress-fill" style={{ width: '50%' }} />
                    </div>
                </div>
            </div>

            <div className="flex-grow overflow-y-auto custom-scrollbar p-4 space-y-4">
              {course?.chuong_hoc?.map((section) => (
                <div key={section.id} className="space-y-3">
                  <h3 className="text-xs font-black text-primary uppercase tracking-widest px-2 pt-2">
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
                          className={`w-full flex items-start text-left p-4 rounded-[1.25rem] transition-all border cursor-pointer ${
                            isSelected
                              ? "bg-primary/10 border-primary shadow-sm"
                              : "bg-background border-border/50 hover:bg-secondary hover:border-primary/30"
                          }`}
                        >
                          <div className="shrink-0 mt-0.5 mr-3">
                            {isCompleted ? (
                              <CheckCircle2 className="h-5 w-5 text-emerald-500 fill-emerald-500/10" />
                            ) : (
                              <PlayCircle className={`h-5 w-5 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                            )}
                          </div>
                          <div className="space-y-1 flex-grow">
                            <p className={`text-sm font-bold line-clamp-2 leading-snug ${isSelected ? 'text-primary' : 'text-foreground'}`}>{lesson.tieu_de}</p>
                            <p className="text-[10px] text-muted-foreground font-semibold flex items-center space-x-1 uppercase tracking-widest">
                              <Clock className="w-3 h-3" />
                              <span>{lesson.thoi_luong ? `${Math.round(lesson.thoi_luong / 60)} phút` : "Chưa cập nhật"}</span>
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </main>
    </>
  );
}
