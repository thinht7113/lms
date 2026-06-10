"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Edit3, FileText, Plus, RefreshCw, Trash2, Video, Send } from "lucide-react";
import { apiService, CourseDetail, Lesson } from "@/services/api";
import { useToast } from "@/contexts/ToastContext";

export default function InstructorLessonsPage() {
  const params = useParams();
  const toast = useToast();
  const courseId = Number(params.id);
  const sectionId = Number(params.sectionId);
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [submittingAll, setSubmittingAll] = useState(false);
  const [submittingLessonId, setSubmittingLessonId] = useState<number | null>(null);
  const [previewLesson, setPreviewLesson] = useState<Lesson | null>(null);

  const loadCourse = async () => {
    setLoading(true);
    setError(null);
    try {
      setCourse(await apiService.getCourseDetailWithAuth(courseId));
    } catch (err: any) {
      setError(err.message || "Không thể tải bài học");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (courseId) loadCourse();
  }, [courseId]);

  useEffect(() => {
    if (previewLesson) {
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
  }, [previewLesson]);

  const section = useMemo(() => course?.chuong_hoc?.find((item) => item.id === sectionId), [course, sectionId]);
  const lessons = useMemo(() => [...(section?.bai_hoc || [])].sort((a, b) => a.thu_tu - b.thu_tu), [section]);

  const deleteLesson = async (lesson: Lesson) => {
    if (!confirm(`Xóa bài học "${lesson.tieu_de}"?`)) return;
    setDeletingId(lesson.id);
    setError(null);
    try {
      await apiService.deleteLesson(lesson.id);
      await loadCourse();
    } catch (err: any) {
      setError(err.message || "Không thể xóa bài học");
    } finally {
      setDeletingId(null);
    }
  };

  const submitLessonForApproval = async (lesson: Lesson) => {
    setSubmittingLessonId(lesson.id);
    try {
      await apiService.updateLesson(lesson.id, { trang_thai_phe_duyet: "pending" });
      toast.success(`Đã gửi yêu cầu duyệt bài học "${lesson.tieu_de}"`);
      await loadCourse();
    } catch (err: any) {
      toast.error(err.message || "Không thể gửi yêu cầu duyệt");
    } finally {
      setSubmittingLessonId(null);
    }
  };

  const submitAllForApproval = async () => {
    const draftOrRejectedLessons = lessons.filter(
      (l) => l.trang_thai_phe_duyet === "draft" || l.trang_thai_phe_duyet === "rejected"
    );

    if (draftOrRejectedLessons.length === 0) {
      toast.info("Không có bài học nào cần gửi duyệt");
      return;
    }

    if (!confirm(`Gửi yêu cầu duyệt cho tất cả ${draftOrRejectedLessons.length} bài học chưa được duyệt?`)) return;

    setSubmittingAll(true);
    try {
      await Promise.all(
        draftOrRejectedLessons.map((lesson) =>
          apiService.updateLesson(lesson.id, { trang_thai_phe_duyet: "pending" })
        )
      );
      toast.success("Đã gửi yêu cầu duyệt tất cả bài học thành công!");
      await loadCourse();
    } catch (err: any) {
      toast.error(err.message || "Có lỗi xảy ra khi gửi duyệt hàng loạt");
    } finally {
      setSubmittingAll(false);
    }
  };

  if (loading) {
    return <div className="flex min-h-[50vh] items-center justify-center"><RefreshCw className="h-10 w-10 animate-spin text-purple-600" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/instructor/courses/${courseId}/sections`} className="rounded-2xl border border-slate-200 bg-white p-3 text-slate-500 hover:text-purple-700">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-purple-600">{course?.tieu_de}</p>
            <h1 className="text-3xl font-black tracking-tight text-slate-950">{section?.tieu_de || "Bài học"}</h1>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {lessons.some(l => l.trang_thai_phe_duyet === "draft" || l.trang_thai_phe_duyet === "rejected") && (
            <button
              onClick={submitAllForApproval}
              disabled={submittingAll}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-500 px-5 py-4 text-sm font-black text-white shadow-lg shadow-amber-200 hover:bg-amber-600 disabled:opacity-60 transition-all active:scale-[0.98]"
            >
              {submittingAll ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Gửi duyệt tất cả
            </button>
          )}
          <Link href={`/instructor/courses/${courseId}/sections/${sectionId}/lessons/create`} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-purple-600 px-5 py-4 text-sm font-black text-white shadow-lg shadow-purple-200 hover:bg-purple-700">
            <Plus className="h-4 w-4" />
            Tạo bài học
          </Link>
        </div>
      </div>

      {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">{error}</div>}

      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-5">
          <h2 className="text-lg font-black text-slate-950">Danh sách bài học</h2>
        </div>
        {lessons.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="mx-auto h-12 w-12 text-slate-300" />
            <h3 className="mt-4 text-xl font-black text-slate-950">Chưa có bài học</h3>
            <p className="mt-2 text-sm font-medium text-slate-500">Tạo bài học đầu tiên và thêm các block multimedia.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {lessons.map((lesson) => (
              <article key={lesson.id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-purple-50 text-sm font-black text-purple-700">
                    {lesson.thu_tu}
                  </div>
                  <div>
                    <h3 className="font-black text-slate-950">{lesson.tieu_de}</h3>
                    <p className="mt-1 text-sm font-medium text-slate-500">
                      {Math.floor(Number(lesson.thoi_luong || 0) / 60)} phút • {lesson.noi_dung?.length || 0} block nội dung
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {lesson.xem_truoc && (
                        <span className="rounded-full bg-emerald-50 border border-emerald-200/30 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-700">Học thử</span>
                      )}
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-600">{lesson.da_xuat_ban ? "Công khai" : "Nháp"}</span>
                      
                      {/* Status Badges */}
                      {lesson.trang_thai_phe_duyet === "draft" && (
                        <span className="rounded-full bg-slate-50 border border-slate-200/50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-600">Bản nháp</span>
                      )}
                      {lesson.trang_thai_phe_duyet === "pending" && (
                        <span className="rounded-full bg-amber-50 border border-amber-200/50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-amber-700">Chờ duyệt</span>
                      )}
                      {lesson.trang_thai_phe_duyet === "approved" && (
                        <span className="rounded-full bg-emerald-50 border border-emerald-200/50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-700">Đã duyệt</span>
                      )}
                      {lesson.trang_thai_phe_duyet === "rejected" && (
                        <span className="rounded-full bg-rose-50 border border-rose-200/50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-rose-700">Bị từ chối</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {lesson.trang_thai_phe_duyet !== "approved" && lesson.trang_thai_phe_duyet !== "pending" && (
                    <button
                      onClick={() => submitLessonForApproval(lesson)}
                      disabled={submittingLessonId === lesson.id}
                      className="inline-flex items-center gap-2 rounded-xl bg-amber-500/10 px-4 py-2.5 text-xs font-black text-amber-700 hover:bg-amber-500/20 disabled:opacity-60 transition-all"
                    >
                      {submittingLessonId === lesson.id ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                      Gửi duyệt
                    </button>
                  )}
                  <button
                    onClick={() => setPreviewLesson(lesson)}
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2.5 text-xs font-black text-slate-700 hover:bg-slate-200"
                  >
                    <Video className="h-4 w-4" />
                    Xem thử
                  </button>
                  <Link href={`/instructor/courses/${courseId}/sections/${sectionId}/lessons/${lesson.id}/edit`} className="inline-flex items-center gap-2 rounded-xl bg-purple-50 px-4 py-2.5 text-xs font-black text-purple-700 hover:bg-purple-100">
                    <Edit3 className="h-4 w-4" />
                    Sửa
                  </Link>
                  <button onClick={() => deleteLesson(lesson)} disabled={deletingId === lesson.id} className="inline-flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-2.5 text-xs font-black text-rose-700 hover:bg-rose-100 disabled:opacity-60">
                    {deletingId === lesson.id ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    Xóa
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Lesson Preview Modal */}
      {previewLesson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-purple-600">Xem thử bài học</span>
                <h2 className="text-xl font-black text-slate-900 mt-1">{previewLesson.tieu_de}</h2>
              </div>
              <button 
                onClick={() => setPreviewLesson(null)}
                className="rounded-xl border border-slate-200 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <span className="sr-only">Đóng</span>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 custom-scrollbar">
              {(!previewLesson.noi_dung || previewLesson.noi_dung.length === 0) ? (
                <div className="py-12 text-center text-slate-400">
                  <FileText className="mx-auto h-12 w-12 text-slate-300 mb-3" />
                  <p className="text-sm font-bold">Bài học này chưa có khối nội dung nào.</p>
                </div>
              ) : (
                previewLesson.noi_dung.map((block, index) => {
                  const type = (block.loai_noi_dung || "").toLowerCase();
                  return (
                    <div key={block.id || index} className="border-b border-slate-100 last:border-b-0 pb-6 last:pb-0">
                      {type === "video" && (
                        <div className="space-y-2">
                          <p className="text-[10px] font-black uppercase tracking-wider text-purple-500 mb-2">Video</p>
                          {block.duong_dan_file ? (
                            block.duong_dan_file.includes("youtube.com") || block.duong_dan_file.includes("youtu.be") ? (
                              <iframe
                                className="w-full aspect-video rounded-2xl overflow-hidden border border-slate-200"
                                src={block.duong_dan_file.replace("watch?v=", "embed/").replace("youtu.be/", "youtube.com/embed/")}
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                              />
                            ) : (
                              <video controls className="w-full aspect-video rounded-2xl bg-black">
                                <source src={block.duong_dan_file} />
                              </video>
                            )
                          ) : (
                            <p className="text-xs text-rose-500">Chưa có đường dẫn video</p>
                          )}
                        </div>
                      )}

                      {type === "pdf" && (
                        <div className="space-y-2">
                          <p className="text-[10px] font-black uppercase tracking-wider text-purple-500 mb-2">Tài liệu PDF</p>
                          {block.duong_dan_file ? (
                            <div className="w-full h-[450px] flex flex-col border border-slate-200 rounded-2xl overflow-hidden">
                              <iframe
                                src={`${block.duong_dan_file}#toolbar=0`}
                                className="w-full h-full flex-1"
                                title="Document Preview"
                              />
                            </div>
                          ) : (
                            <p className="text-xs text-rose-500">Chưa có đường dẫn PDF</p>
                          )}
                        </div>
                      )}

                      {type === "image" && (
                        <div className="space-y-2">
                          <p className="text-[10px] font-black uppercase tracking-wider text-purple-500 mb-2">Hình ảnh</p>
                          {block.duong_dan_file ? (
                            <img
                              src={block.duong_dan_file}
                              alt="Xem thử ảnh"
                              className="mx-auto h-auto max-h-[50vh] w-auto max-w-full rounded-2xl object-contain border border-slate-100"
                            />
                          ) : (
                            <p className="text-xs text-rose-500">Chưa có đường dẫn ảnh</p>
                          )}
                        </div>
                      )}

                      {type === "code" && (
                        <div className="space-y-2">
                          <p className="text-[10px] font-black uppercase tracking-wider text-purple-500 mb-2">Khối Code</p>
                          <pre className="overflow-x-auto rounded-2xl bg-slate-900 p-5 text-sm font-mono text-slate-100 leading-relaxed">
                            <code>{block.noi_dung_text || ""}</code>
                          </pre>
                        </div>
                      )}

                      {type === "text" && (
                        <div className="space-y-2">
                          <p className="text-[10px] font-black uppercase tracking-wider text-purple-500 mb-2">Văn bản</p>
                          <div
                            className="prose prose-sm max-w-none text-slate-800 leading-relaxed font-semibold"
                            dangerouslySetInnerHTML={{ __html: block.noi_dung_text || "" }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end shrink-0">
              <button
                onClick={() => setPreviewLesson(null)}
                className="rounded-2xl border border-slate-200 bg-white px-6 py-3 text-sm font-black text-slate-600 hover:text-slate-800 hover:bg-slate-50 shadow-sm"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
