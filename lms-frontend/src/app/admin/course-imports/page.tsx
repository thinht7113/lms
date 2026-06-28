"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  DownloadCloud,
  ExternalLink,
  FileText,
  Loader2,
  Play,
  RefreshCw,
} from "lucide-react";
import { apiService, Category, CourseImportDraft, CourseImportJob, tokenHelper } from "@/services/api";
import { useToast } from "@/contexts/ToastContext";

type CrawlForm = {
  source_url: string;
  limit: number;
  checkout_free: boolean;
  headless: boolean;
};

type ImportForm = {
  publish: boolean;
  approve: boolean;
  category_id: string;
};

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function statusClass(status: string) {
  switch (status) {
    case "completed":
      return "bg-emerald-50 text-emerald-700 border-emerald-100";
    case "imported":
      return "bg-blue-50 text-blue-700 border-blue-100";
    case "failed":
      return "bg-rose-50 text-rose-700 border-rose-100";
    case "running":
      return "bg-amber-50 text-amber-700 border-amber-100";
    default:
      return "bg-slate-50 text-slate-600 border-slate-100";
  }
}

function formatDate(value?: string) {
  if (!value) return "-";
  return new Date(value).toLocaleString("vi-VN");
}

function getImportErrorTitle(error: Record<string, unknown>, index: number) {
  const message = typeof error.message === "string" ? error.message : "";
  const code = typeof error.code === "string" ? error.code : "";
  return message || code || `Lỗi #${index + 1}`;
}

function stripHtml(value?: string) {
  return (value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getLessonTitle(lesson: unknown, index: number) {
  if (lesson && typeof lesson === "object" && "title" in lesson && typeof lesson.title === "string") {
    return lesson.title;
  }
  return `Bài ${index + 1}`;
}

function countCourseLessons(course: CourseImportDraft) {
  return (course.sections || []).reduce((total, section) => total + (section.lessons?.length || 0), 0);
}

export default function AdminCourseImportsPage() {
  const toast = useToast();
  const [jobs, setJobs] = useState<CourseImportJob[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [importing, setImporting] = useState(false);
  const [previewConfirmed, setPreviewConfirmed] = useState(false);
  const [form, setForm] = useState<CrawlForm>({
    source_url: "https://hoctapgiare.top/home/courses?category=all&price=free&level=all&language=all&rating=all&sort_by=newest",
    limit: 5,
    checkout_free: true,
    headless: true,
  });
  const [importForm, setImportForm] = useState<ImportForm>({
    publish: false,
    approve: true,
    category_id: "",
  });

  const selectedJob = useMemo(
    () => jobs.find((job) => job.id === selectedJobId) || jobs[0] || null,
    [jobs, selectedJobId],
  );

  const draftCourses = selectedJob?.draft_data?.courses || [];
  const crawlerErrors = selectedJob?.draft_data?.errors || [];
  const mirrorErrors = selectedJob?.draft_data?.asset_mirror_errors || [];
  const summary = selectedJob?.draft_data?.summary;

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [jobData, categoryData] = await Promise.all([
        apiService.getCourseImportJobs(50),
        apiService.getCategories(),
      ]);
      setJobs(jobData);
      setCategories(categoryData);
      setSelectedJobId((current) => current ?? jobData[0]?.id ?? null);
    } catch (error) {
      toast.error(getErrorMessage(error, "Không thể tải dữ liệu import khóa học"));
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    queueMicrotask(() => void loadData());
  }, [loadData]);

  const handleRunCrawler = async (event: React.FormEvent) => {
    event.preventDefault();
    const currentUser = tokenHelper.getCurrentUser();
    if (currentUser?.vai_tro !== "admin") {
      toast.error("Chỉ quản trị viên mới được sử dụng chức năng crawl khóa học");
      return;
    }

    if (!form.source_url.trim()) {
      toast.error("Vui lòng nhập URL nguồn cần crawl");
      return;
    }

    setRunning(true);
    try {
      const job = await apiService.createHoctapgiareImportJob({
        source_url: form.source_url.trim(),
        limit: Number(form.limit),
        checkout_free: form.checkout_free,
        headless: form.headless,
      });
      setJobs((previous) => [job, ...previous.filter((item) => item.id !== job.id)]);
      setSelectedJobId(job.id);
      setPreviewConfirmed(false);
      if (job.status === "failed") {
        toast.error(job.error_message || "Crawler không lấy được khóa học nào");
      } else {
        toast.success("Đã chạy crawler và tạo draft import");
      }
    } catch (error) {
      toast.error(getErrorMessage(error, "Không thể chạy crawler"));
    } finally {
      setRunning(false);
    }
  };

  const handleImport = async () => {
    if (!selectedJob) return;
    if (selectedJob.status !== "completed") {
      toast.error("Chỉ có thể import job đã crawl thành công");
      return;
    }
    if (draftCourses.length === 0) {
      toast.error("Không có bản nháp khóa học để import");
      return;
    }
    if (!previewConfirmed) {
      toast.error("Vui lòng xem bản nháp và xác nhận trước khi import vào CSDL");
      return;
    }

    setImporting(true);
    try {
      const updated = await apiService.importCourseImportJob(selectedJob.id, {
        confirmed_preview: previewConfirmed,
        publish: importForm.publish,
        approve: importForm.approve,
        category_id: importForm.category_id ? Number(importForm.category_id) : null,
      });
      setJobs((previous) => previous.map((job) => (job.id === updated.id ? updated : job)));
      setSelectedJobId(updated.id);
      toast.success("Đã import khóa học vào LMS");
    } catch (error) {
      toast.error(getErrorMessage(error, "Không thể import khóa học"));
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-8">
      <section className="rounded-[2rem] border border-border/60 bg-white p-7 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-blue-50 p-3 text-blue-600">
              <DownloadCloud className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-950">Nhập khóa học từ nguồn ngoài</h1>
              <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-500">
                Công cụ này crawl khóa học miễn phí từ hoctapgiare.top, tạo bản nháp, sau đó import vào LMS. Link YouTube được giữ dưới dạng nội dung nhúng, còn MP4/PDF/ảnh sẽ được backend đưa vào MinIO khi import.
              </p>
            </div>
          </div>

          <button
            onClick={() => void loadData()}
            disabled={loading || running || importing}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-xs font-black uppercase tracking-widest text-slate-700 shadow-sm hover:border-blue-200 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Tải lại
          </button>
        </div>
      </section>

      <form
        onSubmit={handleRunCrawler}
        className="grid gap-4 rounded-[2rem] border border-border/60 bg-white p-6 shadow-sm xl:grid-cols-[1fr_120px_170px_140px_auto] xl:items-end"
      >
        <label className="space-y-2 text-xs font-black uppercase tracking-widest text-slate-500">
          URL nguồn
          <input
            value={form.source_url}
            onChange={(event) => setForm((previous) => ({ ...previous, source_url: event.target.value }))}
            disabled={running}
            className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold normal-case tracking-normal text-slate-950 outline-none focus:border-blue-300 disabled:bg-slate-50"
            placeholder="https://hoctapgiare.top/home/courses?category=all&price=free&level=all&language=all&rating=all&sort_by=newest"
          />
        </label>

        <label className="space-y-2 text-xs font-black uppercase tracking-widest text-slate-500">
          Số khóa
          <input
            type="number"
            min={1}
            max={50}
            value={form.limit}
            onChange={(event) => setForm((previous) => ({ ...previous, limit: Number(event.target.value) }))}
            disabled={running}
            className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold normal-case tracking-normal text-slate-950 outline-none focus:border-blue-300 disabled:bg-slate-50"
          />
        </label>

        <label className="flex h-12 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-xs font-black uppercase tracking-widest text-slate-600">
          <input
            type="checkbox"
            checked={form.checkout_free}
            onChange={(event) => setForm((previous) => ({ ...previous, checkout_free: event.target.checked }))}
            disabled={running}
            className="h-4 w-4 rounded border-slate-300"
          />
          Đăng ký 0đ
        </label>

        <label className="flex h-12 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-xs font-black uppercase tracking-widest text-slate-600">
          <input
            type="checkbox"
            checked={form.headless}
            onChange={(event) => setForm((previous) => ({ ...previous, headless: event.target.checked }))}
            disabled={running}
            className="h-4 w-4 rounded border-slate-300"
          />
          Headless
        </label>

        <button
          disabled={running}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-blue-600/20 hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          {running ? "Đang crawl" : "Chạy crawler"}
        </button>
      </form>

      <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
        <section className="overflow-hidden rounded-[2rem] border border-border/60 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-border/40 px-6 py-5">
            <div>
              <h2 className="text-lg font-black text-slate-950">Lịch sử job</h2>
              <p className="mt-1 text-xs font-bold text-slate-500">{jobs.length} lần crawl gần nhất</p>
            </div>
            <Database className="h-5 w-5 text-blue-600" />
          </div>

          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : jobs.length === 0 ? (
            <div className="p-8 text-center text-sm font-bold text-slate-500">Chưa có job crawler nào.</div>
          ) : (
            <div className="max-h-[680px] divide-y divide-border/40 overflow-y-auto">
              {jobs.map((job) => (
                <button
                  key={job.id}
                  onClick={() => {
                    setSelectedJobId(job.id);
                    setPreviewConfirmed(false);
                  }}
                  className={`block w-full px-5 py-4 text-left transition hover:bg-slate-50 ${
                    selectedJob?.id === job.id ? "bg-blue-50/70" : "bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-black text-slate-950">Job #{job.id}</span>
                    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase ${statusClass(job.status)}`}>
                      {job.status}
                    </span>
                  </div>
                  <p className="mt-2 line-clamp-1 text-xs font-semibold text-slate-500">{job.source_url}</p>
                  <p className="mt-2 text-[11px] font-bold text-slate-400">{formatDate(job.created_at)}</p>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-6">
          {!selectedJob ? (
            <div className="rounded-[2rem] border border-dashed border-slate-200 bg-white p-12 text-center text-sm font-bold text-slate-500">
              Chọn một job để xem chi tiết.
            </div>
          ) : (
            <>
              <div className="rounded-[2rem] border border-border/60 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-xl font-black text-slate-950">Job #{selectedJob.id}</h2>
                      <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase ${statusClass(selectedJob.status)}`}>
                        {selectedJob.status}
                      </span>
                    </div>
                    <a
                      href={selectedJob.source_url}
                      target="_blank"
                      className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-500"
                    >
                      {selectedJob.source_url}
                      <ExternalLink className="h-4 w-4" />
                    </a>
                    <p className="mt-2 text-xs font-bold text-slate-400">Cập nhật: {formatDate(selectedJob.updated_at)}</p>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="rounded-2xl bg-slate-50 px-4 py-3">
                      <p className="text-lg font-black text-slate-950">{summary?.requested_limit ?? "-"}</p>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Yêu cầu</p>
                    </div>
                    <div className="rounded-2xl bg-emerald-50 px-4 py-3">
                      <p className="text-lg font-black text-emerald-700">{summary?.success_count ?? draftCourses.length}</p>
                      <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Draft</p>
                    </div>
                    <div className="rounded-2xl bg-rose-50 px-4 py-3">
                      <p className="text-lg font-black text-rose-700">{summary?.error_count ?? crawlerErrors.length}</p>
                      <p className="text-[10px] font-black uppercase tracking-widest text-rose-500">Lỗi</p>
                    </div>
                  </div>
                </div>

                {selectedJob.error_message && (
                  <div className="mt-5 flex gap-3 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm font-semibold text-rose-700">
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                    <span>{selectedJob.error_message}</span>
                  </div>
                )}
              </div>

              <div className="rounded-[2rem] border border-border/60 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <h3 className="text-lg font-black text-slate-950">Import vào LMS</h3>
                    <p className="mt-1 text-sm font-medium text-slate-500">
                      Backend sẽ tạo khóa học, chương, bài học và mirror MP4/PDF/ảnh vào MinIO.
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-[220px_140px_140px_auto] sm:items-end">
                    <label className="space-y-2 text-xs font-black uppercase tracking-widest text-slate-500">
                      Danh mục
                      <select
                        value={importForm.category_id}
                        onChange={(event) => setImportForm((previous) => ({ ...previous, category_id: event.target.value }))}
                        className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold normal-case tracking-normal text-slate-950 outline-none focus:border-blue-300"
                      >
                        <option value="">Không gán</option>
                        {categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.ten_danh_muc}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="flex h-11 items-center gap-2 rounded-2xl bg-slate-50 px-3 text-xs font-black uppercase tracking-widest text-slate-600">
                      <input
                        type="checkbox"
                        checked={importForm.publish}
                        onChange={(event) => setImportForm((previous) => ({ ...previous, publish: event.target.checked }))}
                      />
                      Xuất bản
                    </label>

                    <label className="flex h-11 items-center gap-2 rounded-2xl bg-slate-50 px-3 text-xs font-black uppercase tracking-widest text-slate-600">
                      <input
                        type="checkbox"
                        checked={importForm.approve}
                        onChange={(event) => setImportForm((previous) => ({ ...previous, approve: event.target.checked }))}
                      />
                      Duyệt
                    </label>

                    <label className="flex min-h-11 items-center gap-2 rounded-2xl border border-blue-100 bg-blue-50 px-3 text-xs font-black uppercase tracking-widest text-blue-700 sm:col-span-3">
                      <input
                        type="checkbox"
                        checked={previewConfirmed}
                        onChange={(event) => setPreviewConfirmed(event.target.checked)}
                        disabled={selectedJob.status !== "completed" || draftCourses.length === 0}
                        className="h-4 w-4 rounded border-blue-300"
                      />
                      Đã xem bản nháp khóa học và đồng ý import vào CSDL
                    </label>

                    <button
                      onClick={() => void handleImport()}
                      disabled={importing || selectedJob.status !== "completed" || draftCourses.length === 0 || !previewConfirmed}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 text-xs font-black uppercase tracking-widest text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      Import
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid gap-6 2xl:grid-cols-2">
                <div className="rounded-[2rem] border border-border/60 bg-white p-6 shadow-sm">
                  <h3 className="text-lg font-black text-slate-950">Draft khóa học ({draftCourses.length})</h3>
                  <div className="mt-4 space-y-3">
                    {draftCourses.length === 0 ? (
                      <p className="rounded-2xl bg-slate-50 p-5 text-sm font-bold text-slate-500">Chưa có draft khóa học.</p>
                    ) : (
                      draftCourses.map((course, index) => (
                        <div key={`${course.source_url || index}`} className="rounded-2xl border border-slate-100 p-4">
                          <div className="flex items-start gap-4">
                            {course.thumbnail_url ? (
                              <Image
                                src={course.thumbnail_url}
                                alt={course.title || "Course thumbnail"}
                                width={96}
                                height={64}
                                unoptimized
                                className="h-16 w-24 rounded-xl object-cover"
                              />
                            ) : (
                              <div className="flex h-16 w-24 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                                <FileText className="h-6 w-6" />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <h4 className="line-clamp-2 text-sm font-black text-slate-950">{course.title || "Khóa học chưa có tiêu đề"}</h4>
                              <p className="mt-1 text-xs font-semibold text-slate-500">
                                {course.sections?.length || 0} chương · {course.raw?.mp4_count || 0} MP4 · {course.raw?.youtube_count || 0} YouTube · {course.raw?.pdf_count || 0} PDF
                              </p>
                              {course.source_url && (
                                <a href={course.source_url} target="_blank" className="mt-2 inline-flex text-xs font-bold text-blue-600">
                                  Mở nguồn
                                </a>
                              )}
                            </div>
                          </div>
                          <details className="mt-4 rounded-2xl bg-slate-50 p-4">
                            <summary className="cursor-pointer text-xs font-black uppercase tracking-widest text-blue-600">
                              Xem trước nội dung khóa học
                            </summary>
                            <div className="mt-4 space-y-4">
                              <p className="line-clamp-4 text-sm font-medium leading-6 text-slate-600">
                                {stripHtml(course.description) || "Khóa học chưa có mô tả."}
                              </p>
                              <div className="grid gap-3 text-xs font-bold text-slate-600 sm:grid-cols-3">
                                <div className="rounded-xl bg-white p-3">
                                  <span className="block text-slate-400">Chương</span>
                                  <span className="text-slate-950">{course.sections?.length || 0}</span>
                                </div>
                                <div className="rounded-xl bg-white p-3">
                                  <span className="block text-slate-400">Bài học</span>
                                  <span className="text-slate-950">{countCourseLessons(course)}</span>
                                </div>
                                <div className="rounded-xl bg-white p-3">
                                  <span className="block text-slate-400">Nguồn</span>
                                  <span className="text-slate-950">{course.source || "hoctapgiare"}</span>
                                </div>
                              </div>
                              <div className="space-y-3">
                                {(course.sections || []).slice(0, 4).map((section, sectionIndex) => (
                                  <div key={`${course.source_url || index}-section-${sectionIndex}`} className="rounded-xl bg-white p-3">
                                    <p className="text-sm font-black text-slate-900">
                                      {section.title || `Chương ${sectionIndex + 1}`}
                                      <span className="ml-2 text-xs font-bold text-slate-400">
                                        ({section.lessons?.length || 0} bài)
                                      </span>
                                    </p>
                                    <ul className="mt-2 space-y-1 text-xs font-semibold text-slate-500">
                                      {(section.lessons || []).slice(0, 5).map((lesson, lessonIndex) => (
                                        <li key={`${course.source_url || index}-lesson-${sectionIndex}-${lessonIndex}`}>
                                          {lessonIndex + 1}. {getLessonTitle(lesson, lessonIndex)}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </details>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-[2rem] border border-border/60 bg-white p-6 shadow-sm">
                  <h3 className="text-lg font-black text-slate-950">Lỗi và cảnh báo</h3>
                  <div className="mt-4 space-y-3">
                    {[...crawlerErrors, ...mirrorErrors].length === 0 ? (
                      <p className="rounded-2xl bg-emerald-50 p-5 text-sm font-bold text-emerald-700">Chưa ghi nhận lỗi.</p>
                    ) : (
                      [...crawlerErrors, ...mirrorErrors].map((error, index) => (
                        <details key={index} className="rounded-2xl border border-rose-100 bg-rose-50 p-4">
                          <summary className="cursor-pointer text-sm font-black text-rose-700">
                            {getImportErrorTitle(error, index)}
                          </summary>
                          <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap rounded-xl bg-white p-3 text-xs font-semibold text-slate-700">
                            {JSON.stringify(error, null, 2)}
                          </pre>
                        </details>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
