"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {AlertTriangle,CheckCircle2,Database,DownloadCloud,ExternalLink,FileText,Loader2,Play,RefreshCw,} from "lucide-react";
import {apiService,Category,CourseImportConfigStatus,CourseImportDraft,CourseImportErrorDetail,CourseImportJob,tokenHelper,} from "@/services/api";
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
};

const DEFAULT_SOURCE_URL =
  "https://hoctapgiare.top/home/courses?category=all&price=free&level=all&language=all&rating=all&sort_by=newest";

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function formatDate(value?: string) {
  if (!value) return "-";
  return new Date(value).toLocaleString("vi-VN");
}

function stripHtml(value?: string) {
  return (value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function statusMeta(status: string) {
  switch (status) {
    case "completed":
      return { label: "Hoàn tất", className: "border-emerald-200 bg-emerald-50 text-emerald-700" };
    case "imported":
      return { label: "Đã nhập", className: "border-blue-200 bg-blue-50 text-blue-700" };
    case "failed":
      return { label: "Lỗi", className: "border-rose-200 bg-rose-50 text-rose-700" };
    case "running":
      return { label: "Đang chạy", className: "border-amber-200 bg-amber-50 text-amber-700" };
    default:
      return { label: status || "Mới", className: "border-slate-200 bg-slate-50 text-slate-600" };
  }
}

function countCourseLessons(course: CourseImportDraft) {
  return (course.sections || []).reduce((total, section) => total + (section.lessons?.length || 0), 0);
}

function formatCourseAssetSummary(course: CourseImportDraft) {
  const raw = course.raw || {};
  const videoCount = Number(raw.video_count || 0);
  const youtubeCount = Number(raw.youtube_count || 0);
  const mp4Count = Number(raw.mp4_count || 0);
  const externalVideoCount = Number(raw.external_video_count || 0);
  const pdfCount = Number(raw.pdf_count || 0);
  const parts = [
    `${course.sections?.length || 0} chương`,
    `${countCourseLessons(course)} bài`,
    `${videoCount} video`,
    `${youtubeCount} YouTube`,
  ];

  if (mp4Count > 0) parts.push(`${mp4Count} MP4`);
  if (externalVideoCount > 0) parts.push(`${externalVideoCount} video ngoài`);
  if (pdfCount > 0) parts.push(`${pdfCount} PDF`);

  return parts.join(" · ");
}

function getLessonTitle(lesson: unknown, index: number) {
  if (lesson && typeof lesson === "object" && "title" in lesson && typeof lesson.title === "string") {
    return lesson.title;
  }
  return `Bài ${index + 1}`;
}

function getCourseDraftKey(course: CourseImportDraft, index: number) {
  return course.source_url || course.title || `draft-course-${index}`;
}

function getImportErrorTitle(error: CourseImportErrorDetail, index: number) {
  return error.message || error.code || `Lỗi #${index + 1}`;
}

function getImportantErrorDetails(error: CourseImportErrorDetail) {
  const details = error.details || {};
  const bodyPreview = typeof details.body_preview === "string" ? details.body_preview : "";
  const currentUrl = typeof details.current_url === "string" ? details.current_url : "";
  const siteTitle = typeof details.title === "string" ? details.title : "";

  return [
    error.stage ? `Giai đoạn: ${error.stage}` : "",
    error.url ? `URL lỗi: ${error.url}` : "",
    currentUrl ? `URL hiện tại: ${currentUrl}` : "",
    siteTitle ? `Tiêu đề trang: ${siteTitle}` : "",
    bodyPreview ? `Nội dung trang: ${bodyPreview}` : "",
  ].filter(Boolean);
}

function SmallStat({
  label,
  value,
  tone = "slate",
}: {
  label: string;
  value: React.ReactNode;
  tone?: "slate" | "emerald" | "rose";
}) {
  const toneClass = {
    slate: "bg-slate-50 text-slate-900",
    emerald: "bg-emerald-50 text-emerald-700",
    rose: "bg-rose-50 text-rose-700",
  }[tone];

  return (
    <div className={`rounded-md px-2 py-1.5 text-center ${toneClass}`}>
      <p className="text-sm font-black leading-none">{value}</p>
      <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wider opacity-70">{label}</p>
    </div>
  );
}

export default function AdminCourseImportsPage() {
  const toast = useToast();
  const [jobs, setJobs] = useState<CourseImportJob[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [crawlerConfig, setCrawlerConfig] = useState<CourseImportConfigStatus | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [importing, setImporting] = useState(false);
  const [previewConfirmed, setPreviewConfirmed] = useState(false);
  const [form, setForm] = useState<CrawlForm>({
    source_url: DEFAULT_SOURCE_URL,
    limit: 5,
    checkout_free: true,
    headless: true,
  });
  const [importForm, setImportForm] = useState<ImportForm>({
    publish: false,
    approve: true,
  });
  const [courseCategoryMap, setCourseCategoryMap] = useState<Record<string, string>>({});

  const selectedJob = useMemo(
    () => jobs.find((job) => job.id === selectedJobId) || jobs[0] || null,
    [jobs, selectedJobId],
  );

  const draftCourses = useMemo(() => selectedJob?.draft_data?.courses || [], [selectedJob]);
  const crawlerErrors = selectedJob?.draft_data?.errors || [];
  const mirrorErrors = selectedJob?.draft_data?.asset_mirror_errors || [];
  const allErrors = [...crawlerErrors, ...mirrorErrors];
  const hasCrawlerConfigError = allErrors.some((error) => error.code === "missing_crawler_credentials");
  const canCheckoutFree = crawlerConfig?.can_checkout_free ?? true;
  const effectiveCheckoutFree = form.checkout_free && canCheckoutFree;
  const summary = selectedJob?.draft_data?.summary;
  const selectedStatus = selectedJob ? statusMeta(selectedJob.status) : null;
  const canImportDraft =
    !!selectedJob &&
    draftCourses.length > 0 &&
    (selectedJob.status === "completed" || selectedJob.status === "failed");

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [jobData, categoryData, configData] = await Promise.all([
        apiService.getCourseImportJobs(50),
        apiService.getCategories(),
        apiService.getCourseImportConfig(),
      ]);
      setJobs(jobData);
      setCategories(categoryData);
      setCrawlerConfig(configData);
      setSelectedJobId((current) => current ?? jobData[0]?.id ?? null);
    } catch (error) {
      toast.error(getErrorMessage(error, "Không thể tải dữ liệu nhập khóa học"));
    } finally {
      if (!silent) setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadData();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadData]);

  useEffect(() => {
    if (!jobs.some((job) => job.status === "running" || job.status === "pending")) return;

    const intervalId = window.setInterval(() => {
      void loadData(true);
    }, 3000);

    return () => window.clearInterval(intervalId);
  }, [jobs, loadData]);

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

    if (form.checkout_free && !canCheckoutFree) {
      toast.error("Chưa cấu hình tài khoản hoctapgiare.top nên không thể đăng ký khóa 0đ tự động");
      return;
    }

    setRunning(true);
    try {
      const job = await apiService.createHoctapgiareImportJob({
        source_url: form.source_url.trim(),
        limit: Number(form.limit),
        checkout_free: effectiveCheckoutFree,
        headless: form.headless,
      });

      setJobs((previous) => [job, ...previous.filter((item) => item.id !== job.id)]);
      setSelectedJobId(job.id);
      setPreviewConfirmed(false);
      setCourseCategoryMap({});

      if (job.status === "failed") {
        toast.error(job.error_message || "Crawler không lấy được khóa học nào");
      } else {
        toast.success("Đã tạo job crawler. Hệ thống sẽ tự cập nhật trạng thái.");
      }
    } catch (error) {
      toast.error(getErrorMessage(error, "Không thể chạy crawler"));
    } finally {
      setRunning(false);
    }
  };

  const handleImport = async () => {
    if (!selectedJob) return;

    if (!canImportDraft) {
      toast.error("Job chưa có bản nháp hợp lệ để import");
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
      const courseCategoryPayload = draftCourses.reduce<Record<string, number | null>>((payload, course, index) => {
        const key = getCourseDraftKey(course, index);
        const selectedCategory = courseCategoryMap[key];
        payload[key] = selectedCategory ? Number(selectedCategory) : null;
        return payload;
      }, {});

      const updated = await apiService.importCourseImportJob(selectedJob.id, {
        confirmed_preview: previewConfirmed,
        publish: importForm.publish,
        approve: importForm.approve,
        course_category_map: courseCategoryPayload,
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
    <div className="space-y-2 text-slate-800">
      <section className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="rounded-md bg-blue-50 p-1.5 text-blue-600">
              <DownloadCloud className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-black tracking-tight text-slate-950">Nhập khóa học từ nguồn ngoài</h1>
            </div>
          </div>

          <button
            onClick={() => void loadData()}
            disabled={loading || running || importing}
            className="inline-flex h-8 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-[10px] font-black uppercase tracking-wider text-slate-700 hover:border-blue-200 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
            Tải lại
          </button>
        </div>
      </section>

      <form
        onSubmit={handleRunCrawler}
        className="grid gap-2 rounded-lg border border-slate-200 bg-white p-3 shadow-sm 2xl:grid-cols-[minmax(320px,1fr)_78px_118px_108px_auto] 2xl:items-end"
      >
        <label className="space-y-1 text-[9px] font-black uppercase tracking-wider text-slate-500">
          URL nguồn
          <input
            value={form.source_url}
            onChange={(event) => setForm((previous) => ({ ...previous, source_url: event.target.value }))}
            disabled={running}
            className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold normal-case tracking-normal text-slate-950 outline-none focus:border-blue-300 disabled:bg-slate-50"
            placeholder={DEFAULT_SOURCE_URL}
          />
        </label>

        <label className="space-y-1 text-[9px] font-black uppercase tracking-wider text-slate-500">
          Số khóa
          <input
            type="number"
            min={1}
            max={50}
            value={form.limit}
            onChange={(event) => setForm((previous) => ({ ...previous, limit: Number(event.target.value) }))}
            disabled={running}
            className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-bold normal-case tracking-normal text-slate-950 outline-none focus:border-blue-300 disabled:bg-slate-50"
          />
        </label>

        <label className="flex h-8 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-[11px] font-black uppercase tracking-wider text-slate-600">
          <input
            type="checkbox"
            checked={effectiveCheckoutFree}
            onChange={(event) => setForm((previous) => ({ ...previous, checkout_free: event.target.checked }))}
            disabled={running || !canCheckoutFree}
            className="h-3 w-3 rounded border-slate-300"
          />
          Đăng ký 0đ
        </label>

        <label className="flex h-8 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-[11px] font-black uppercase tracking-wider text-slate-600">
          <input
            type="checkbox"
            checked={form.headless}
            onChange={(event) => setForm((previous) => ({ ...previous, headless: event.target.checked }))}
            disabled={running}
            className="h-3 w-3 rounded border-slate-300"
          />
          Headless
        </label>

        <button
          disabled={running}
          className="inline-flex h-8 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-[9px] font-black uppercase tracking-wider text-white shadow-sm hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {running ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
          {running ? "Đang tạo job" : "Chạy crawler"}
        </button>
      </form>

      <div className="grid items-start gap-3 xl:grid-cols-[260px_minmax(0,1fr)]">
        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2.5">
            <div>
              <h2 className="text-xs font-black text-slate-950">Lịch sử job</h2>
              <p className="text-[11px] font-bold text-slate-500">{jobs.length} lần crawl gần nhất</p>
            </div>
            <Database className="h-4 w-4 text-blue-600" />
          </div>

          {loading ? (
            <div className="flex h-44 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            </div>
          ) : jobs.length === 0 ? (
            <div className="p-4 text-center text-xs font-bold text-slate-500">Chưa có job crawler nào.</div>
          ) : (
            <div className="max-h-[560px] divide-y divide-slate-100 overflow-y-auto">
              {jobs.map((job) => {
                const meta = statusMeta(job.status);

                return (
                  <button
                    key={job.id}
                    onClick={() => {
                      setSelectedJobId(job.id);
                      setPreviewConfirmed(false);
                      setCourseCategoryMap({});
                    }}
                    className={`block w-full px-3 py-2.5 text-left transition hover:bg-slate-50 ${
                      selectedJob?.id === job.id ? "bg-blue-50/70" : "bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-black text-slate-950">Job #{job.id}</span>
                      <span className={`rounded-md border px-2 py-0.5 text-[9px] font-black uppercase ${meta.className}`}>
                        {meta.label}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-1 text-[11px] font-semibold text-slate-500">{job.source_url}</p>
                    <p className="mt-1 text-[10px] font-bold text-slate-400">{formatDate(job.created_at)}</p>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {!selectedJob ? (
          <div className="rounded-lg border border-dashed border-slate-200 bg-white p-5 text-center text-xs font-bold text-slate-500">
            Chọn một job để xem chi tiết.
          </div>
        ) : (
          <section className="min-w-0 space-y-2">
            <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_190px]">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-black text-slate-950">Job #{selectedJob.id}</h2>
                    {selectedStatus && (
                      <span className={`rounded-md border px-2 py-0.5 text-[9px] font-black uppercase ${selectedStatus.className}`}>
                        {selectedStatus.label}
                      </span>
                    )}
                  </div>
                  <a
                    href={selectedJob.source_url}
                    target="_blank"
                    className="mt-1.5 inline-flex max-w-full items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-500"
                  >
                    <span className="truncate">{selectedJob.source_url}</span>
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                  <p className="mt-1 text-[10px] font-bold text-slate-400">Cập nhật: {formatDate(selectedJob.updated_at)}</p>
                </div>

                <div className="grid grid-cols-3 gap-1.5">
                  <SmallStat label="Yêu cầu" value={summary?.requested_limit ?? "-"} />
                  <SmallStat label="Draft" value={summary?.success_count ?? draftCourses.length} tone="emerald" />
                  <SmallStat label="Lỗi" value={summary?.error_count ?? crawlerErrors.length} tone="rose" />
                </div>
              </div>

              {selectedJob.error_message && (
                <div
                  className={`mt-3 flex gap-2 rounded-lg border p-2.5 text-[11px] font-semibold leading-4 ${
                    hasCrawlerConfigError
                      ? "border-amber-100 bg-amber-50 text-amber-800"
                      : "border-rose-100 bg-rose-50 text-rose-700"
                  }`}
                >
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    {selectedJob.error_message}
                    {hasCrawlerConfigError && (
                      <span className="mt-1 block text-[10px] font-bold">
                        Điền biến trong `lms-backend/.env`, sau đó chạy `docker compose up -d --force-recreate web`.
                      </span>
                    )}
                  </span>
                </div>
              )}

              {selectedJob.status === "running" && draftCourses.length > 0 && (
                <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50 p-2.5 text-[11px] font-bold leading-4 text-blue-700">
                  Job vẫn đang chạy. Các draft hiện tại là dữ liệu tạm đã crawl xong từng phần; danh sách sẽ tăng thêm khi crawler xử lý xong các khóa còn lại.
                </div>
              )}
            </div>

            <div className="grid items-start gap-3 2xl:grid-cols-[minmax(0,1fr)_minmax(280px,320px)]">
              <div className="min-w-0 space-y-2">
                <section className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                  <div className="grid w-full gap-2 md:grid-cols-[96px_86px_96px] md:items-end">
                    <label className="flex h-8 items-center gap-2 rounded-lg bg-slate-50 px-3 text-[11px] font-black uppercase tracking-wider text-slate-600">
                      <input
                        type="checkbox"
                        checked={importForm.publish}
                        onChange={(event) => setImportForm((previous) => ({ ...previous, publish: event.target.checked }))}
                      />
                      Xuất bản
                    </label>

                    <label className="flex h-8 items-center gap-2 rounded-lg bg-slate-50 px-3 text-[11px] font-black uppercase tracking-wider text-slate-600">
                      <input
                        type="checkbox"
                        checked={importForm.approve}
                        onChange={(event) => setImportForm((previous) => ({ ...previous, approve: event.target.checked }))}
                      />
                      Duyệt
                    </label>

                    <button
                      onClick={() => void handleImport()}
                      disabled={importing || !canImportDraft || !previewConfirmed}
                      className="inline-flex h-8 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 text-[10px] font-black uppercase tracking-wider text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {importing ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                      Import
                    </button>

                    <label className="flex min-h-8 items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 text-[11px] font-black uppercase tracking-wider text-blue-700 md:col-span-3">
                      <input
                        type="checkbox"
                        checked={previewConfirmed}
                        onChange={(event) => setPreviewConfirmed(event.target.checked)}
                        disabled={!canImportDraft}
                        className="h-3 w-3 rounded border-blue-300"
                      />
                      Đã xem bản nháp và đồng ý import vào CSDL
                    </label>
                  </div>
                </section>

                <section className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <h3 className="text-xs font-black text-slate-950">Draft khóa học ({draftCourses.length})</h3>
                    <span className="text-[10px] font-bold text-slate-400">
                      {draftCourses.reduce((total, course) => total + countCourseLessons(course), 0)} bài học
                    </span>
                  </div>

                  {draftCourses.length === 0 ? (
                    <p className="rounded-lg bg-slate-50 p-3 text-[11px] font-bold text-slate-500">Chưa có draft khóa học.</p>
                  ) : (
                    <div className="space-y-2">
                      {draftCourses.map((course, index) => {
                        const draftKey = getCourseDraftKey(course, index);

                        return (
                        <article key={draftKey} className="rounded-lg border border-slate-100 p-2.5">
                          <div className="flex gap-3">
                            {course.thumbnail_url ? (
                              <Image
                                src={course.thumbnail_url}
                                alt={course.title || "Ảnh khóa học"}
                                width={76}
                                height={48}
                                unoptimized
                                className="h-12 w-[76px] rounded-md object-cover"
                              />
                            ) : (
                              <div className="flex h-12 w-[76px] items-center justify-center rounded-md bg-slate-100 text-slate-400">
                                <FileText className="h-4 w-4" />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <h4 className="line-clamp-2 text-xs font-black text-slate-950">
                                {course.title || "Khóa học chưa có tiêu đề"}
                              </h4>
                              <p className="mt-1 text-[11px] font-semibold text-slate-500">
                                {formatCourseAssetSummary(course)}
                              </p>
                              <label className="mt-2 grid max-w-xs gap-1 text-[9px] font-black uppercase tracking-wider text-slate-500">
                                Danh mục khóa học
                                <select
                                  value={courseCategoryMap[draftKey] || ""}
                                  onChange={(event) =>
                                    setCourseCategoryMap((previous) => ({
                                      ...previous,
                                      [draftKey]: event.target.value,
                                    }))
                                  }
                                  className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-[11px] font-bold normal-case tracking-normal text-slate-950 outline-none focus:border-blue-300"
                                >
                                  <option value="">Không gán</option>
                                  {categories.map((category) => (
                                    <option key={category.id} value={category.id}>
                                      {category.ten_danh_muc}
                                    </option>
                                  ))}
                                </select>
                              </label>
                            </div>
                          </div>

                          <details className="mt-2 rounded-md bg-slate-50 p-2.5">
                            <summary className="cursor-pointer text-[11px] font-black uppercase tracking-wider text-blue-600">
                              Xem trước nội dung
                            </summary>
                            <p className="mt-2 line-clamp-3 text-[11px] font-medium leading-4 text-slate-600">
                              {stripHtml(course.description) || "Khóa học chưa có mô tả."}
                            </p>
                            <div className="mt-2 grid gap-1.5">
                              {(course.sections || []).slice(0, 4).map((section, sectionIndex) => (
                                <div key={`${draftKey}-section-${sectionIndex}`} className="rounded-md bg-white p-2">
                                  <p className="text-[11px] font-black text-slate-900">
                                    {section.title || `Chương ${sectionIndex + 1}`}
                                    <span className="ml-1 font-bold text-slate-400">({section.lessons?.length || 0} bài)</span>
                                  </p>
                                  <ul className="mt-1 space-y-0.5 text-[11px] font-semibold text-slate-500">
                                    {(section.lessons || []).slice(0, 5).map((lesson, lessonIndex) => (
                                      <li key={`${draftKey}-lesson-${sectionIndex}-${lessonIndex}`}>
                                        {lessonIndex + 1}. {getLessonTitle(lesson, lessonIndex)}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              ))}
                            </div>
                          </details>
                        </article>
                        );
                      })}
                    </div>
                  )}
                </section>
              </div>

              <section className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                <h3 className="text-xs font-black text-slate-950">Lỗi và cảnh báo</h3>

                <div className="mt-2 space-y-2">
                  {allErrors.length === 0 ? (
                    <p className="rounded-lg bg-emerald-50 p-3 text-[11px] font-bold text-emerald-700">Chưa ghi nhận lỗi.</p>
                  ) : (
                    allErrors.map((error, index) => {
                      const isConfigError = error.code === "missing_crawler_credentials";
                      return (
                        <details
                          key={index}
                          open={index === 0}
                          className={`rounded-md border p-2.5 ${
                            isConfigError ? "border-amber-100 bg-amber-50" : "border-rose-100 bg-rose-50"
                          }`}
                        >
                          <summary
                            className={`cursor-pointer text-[11px] font-black leading-4 ${
                              isConfigError ? "text-amber-800" : "text-rose-700"
                            }`}
                          >
                            {getImportErrorTitle(error, index)}
                          </summary>
                          <div className="mt-2 space-y-2">
                            {getImportantErrorDetails(error).map((item) => (
                              <p key={item} className="break-words rounded-md bg-white p-2 text-[10px] font-semibold leading-4 text-slate-700">
                                {item}
                              </p>
                            ))}
                            <pre className="max-h-44 overflow-auto whitespace-pre-wrap break-words rounded-md bg-white p-2 text-[10px] font-semibold text-slate-700">
                              {JSON.stringify(error, null, 2)}
                            </pre>
                          </div>
                        </details>
                      );
                    })
                  )}
                </div>
              </section>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
