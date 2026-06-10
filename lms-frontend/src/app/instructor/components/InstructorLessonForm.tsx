"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, FileText, ImageIcon, Plus, RefreshCw, Save, Trash2, UploadCloud, Video } from "lucide-react";
import { apiService, CourseDetail, Lesson, LessonContentPayload } from "@/services/api";
import dynamic from "next/dynamic";

const CKEditorWrapper = dynamic(() => import("@/components/CKEditorWrapper"), {
  ssr: false,
  loading: () => <div className="animate-pulse rounded-2xl bg-slate-100 h-[300px] w-full"></div>,
});

type ContentType = "video" | "pdf" | "text" | "code" | "image";
type UploadableContentType = Extract<ContentType, "video" | "pdf" | "image">;

type ContentBlock = LessonContentPayload & {
  localId: string;
  id?: number;
  isUploading?: boolean;
};

type Props = {
  courseId: number;
  sectionId: number;
  lessonId?: number;
};

const contentOptions: { type: ContentType; label: string; icon: any }[] = [
  { type: "video", label: "Video", icon: Video },
  { type: "pdf", label: "PDF", icon: FileText },
  { type: "text", label: "Văn bản", icon: FileText },
  { type: "code", label: "Code", icon: FileText },
  { type: "image", label: "Ảnh", icon: ImageIcon },
];

const uploadableContentTypes: UploadableContentType[] = ["video", "pdf", "image"];
const fileAcceptByType: Record<UploadableContentType, string> = {
  video: "video/mp4,video/webm,video/quicktime,video/mpeg",
  pdf: "application/pdf",
  image: "image/png,image/jpeg,image/gif,image/webp",
};
const allowedMimeByType: Record<UploadableContentType, string[]> = {
  video: ["video/mp4", "video/webm", "video/quicktime", "video/mpeg"],
  pdf: ["application/pdf"],
  image: ["image/png", "image/jpeg", "image/gif", "image/webp"],
};
const allowedExtensionByType: Record<UploadableContentType, string[]> = {
  video: [".mp4", ".webm", ".mov", ".mpeg", ".mpg"],
  pdf: [".pdf"],
  image: [".png", ".jpg", ".jpeg", ".gif", ".webp"],
};
const uploadAssetByType: Record<UploadableContentType, "video" | "pdf" | "lesson-image"> = {
  video: "video",
  pdf: "pdf",
  image: "lesson-image",
};

const isUploadableType = (type: ContentType): type is UploadableContentType => uploadableContentTypes.includes(type as UploadableContentType);

const validateBlockFile = (type: UploadableContentType, file: File): string | null => {
  const extension = `.${file.name.split(".").pop()?.toLowerCase() || ""}`;
  if (!allowedMimeByType[type].includes(file.type)) return `File không đúng loại cho block ${type}.`;
  if (!allowedExtensionByType[type].includes(extension)) return `Đuôi file ${extension} không được phép cho block ${type}.`;
  return null;
};

const renderEmbeddedPreview = (block: ContentBlock) => {
  if (!block.duong_dan_file || !isUploadableType(block.loai_noi_dung)) return null;

  if (block.loai_noi_dung === "video") {
    const isYouTube = block.duong_dan_file.includes("youtube.com") || block.duong_dan_file.includes("youtu.be");
    
    if (isYouTube) {
      let embedUrl = block.duong_dan_file;
      if (embedUrl.includes("watch?v=")) {
        embedUrl = embedUrl.replace("watch?v=", "embed/").split("&")[0];
      } else if (embedUrl.includes("youtu.be/")) {
        embedUrl = embedUrl.replace("youtu.be/", "youtube.com/embed/").split("?")[0];
      }
      
      return (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-950">
          <iframe 
            src={embedUrl} 
            className="aspect-video w-full bg-black" 
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen 
          />
        </div>
      );
    }
    
    return (
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-950">
        <video src={block.duong_dan_file} controls className="aspect-video w-full bg-black object-contain" />
      </div>
    );
  }

  if (block.loai_noi_dung === "pdf") {
    return (
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-100 px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-500">
          <span>Xem trước PDF</span>
          <a href={block.duong_dan_file} target="_blank" rel="noreferrer" className="text-purple-700 hover:underline">
            Mở toàn màn hình
          </a>
        </div>
        <iframe src={`${block.duong_dan_file}#toolbar=0`} className="h-[460px] w-full bg-slate-50" title="PDF preview" />
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <img src={block.duong_dan_file} alt="Nội dung bài học" className="max-h-[420px] w-full object-contain" />
    </div>
  );
};

export default function InstructorLessonForm({ courseId, sectionId, lessonId }: Props) {
  const router = useRouter();
  const isEdit = Boolean(lessonId);
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletedContentIds, setDeletedContentIds] = useState<number[]>([]);
  const [form, setForm] = useState({
    tieu_de: "",
    thoi_luong: 0,
    thu_tu: 1,
    xem_truoc: false,
    da_xuat_ban: false,
  });
  const [blocks, setBlocks] = useState<ContentBlock[]>([]);

  const backHref = `/instructor/courses/${courseId}/sections/${sectionId}/lessons`;

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const detail = await apiService.getCourseDetailWithAuth(courseId);
        setCourse(detail);
        const currentSection = detail.chuong_hoc?.find((section) => section.id === sectionId);
        const currentLesson = currentSection?.bai_hoc?.find((item) => item.id === lessonId);
        if (isEdit && !currentLesson) throw new Error("Không tìm thấy bài học trong khóa học này");
        if (currentLesson) {
          setLesson(currentLesson);
          setForm({
            tieu_de: currentLesson.tieu_de,
            thoi_luong: Math.floor(Number(currentLesson.thoi_luong || 0) / 60),
            thu_tu: currentLesson.thu_tu,
            xem_truoc: currentLesson.xem_truoc,
            da_xuat_ban: currentLesson.da_xuat_ban,
          });
          setBlocks([...(currentLesson.noi_dung || [])].sort((a, b) => a.thu_tu - b.thu_tu).map((content) => ({
            id: content.id,
            localId: `existing-${content.id}`,
            ma_bai_hoc: content.ma_bai_hoc,
            loai_noi_dung: content.loai_noi_dung as ContentType,
            noi_dung_text: content.noi_dung_text || "",
            duong_dan_file: content.duong_dan_file || "",
            thu_tu: content.thu_tu,
          })));
        }
      } catch (err: any) {
        setError(err.message || "Không thể tải bài học");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [courseId, sectionId, lessonId, isEdit]);

  const sectionTitle = useMemo(() => {
    return course?.chuong_hoc?.find((section) => section.id === sectionId)?.tieu_de || "Chương học";
  }, [course, sectionId]);

  const updateBlock = (localId: string, key: keyof ContentBlock, value: string | number | boolean) => {
    setBlocks((prev) => prev.map((block) => block.localId === localId ? { ...block, [key]: value } : block));
  };

  const addBlock = (type: ContentType) => {
    setBlocks((prev) => [
      ...prev,
      {
        localId: `new-${Date.now()}-${prev.length}`,
        loai_noi_dung: type,
        noi_dung_text: "",
        duong_dan_file: "",
        thu_tu: prev.length + 1,
      },
    ]);
  };

  const removeBlock = (block: ContentBlock) => {
    if (block.id) setDeletedContentIds((prev) => [...prev, block.id!]);
    setBlocks((prev) => prev.filter((item) => item.localId !== block.localId));
  };

  const uploadBlockFile = async (localId: string, file?: File) => {
    if (!file) return;
    const block = blocks.find((item) => item.localId === localId);
    if (!block || !isUploadableType(block.loai_noi_dung)) {
      setError("Block này không hỗ trợ upload file.");
      return;
    }
    const validationError = validateBlockFile(block.loai_noi_dung, file);
    if (validationError) {
      setError(validationError);
      return;
    }

    updateBlock(localId, "isUploading", true);
    setError(null);
    try {
      const uploaded = await apiService.uploadFile(file, uploadAssetByType[block.loai_noi_dung]);
      updateBlock(localId, "duong_dan_file", uploaded.url);
    } catch (err: any) {
      setError(err.message || "Upload file thất bại");
    } finally {
      updateBlock(localId, "isUploading", false);
    }
  };

  const save = async () => {
    if (!form.tieu_de.trim() || form.tieu_de.trim().length < 2) {
      setError("Vui lòng nhập tiêu đề bài học (ít nhất 2 ký tự).");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const orderedBlocks = blocks.map((block, index) => ({ ...block, thu_tu: index + 1 }));
      const lessonPayload = {
        ma_chuong_hoc: sectionId,
        tieu_de: form.tieu_de,
        thoi_luong: Number(form.thoi_luong || 0) * 60,
        thu_tu: Number(form.thu_tu || 0),
        xem_truoc: form.xem_truoc,
        da_xuat_ban: false,
        noi_dung: orderedBlocks.map((block) => ({
          ma_bai_hoc: lessonId || 0,
          loai_noi_dung: block.loai_noi_dung,
          noi_dung_text: block.noi_dung_text || "",
          duong_dan_file: block.duong_dan_file || "",
          thu_tu: block.thu_tu,
        })),
      };

      let savedLesson = lesson;
      if (isEdit && lessonId) {
        savedLesson = await apiService.updateLesson(lessonId, lessonPayload);
        for (const contentId of deletedContentIds) {
          await apiService.deleteLessonContent(contentId);
        }
        for (const block of orderedBlocks) {
          const payload = {
            ma_bai_hoc: lessonId,
            loai_noi_dung: block.loai_noi_dung,
            noi_dung_text: block.noi_dung_text || "",
            duong_dan_file: block.duong_dan_file || "",
            thu_tu: block.thu_tu,
          };
          if (block.id) await apiService.updateLessonContent(block.id, payload);
          else await apiService.createLessonContent(lessonId, payload);
        }
      } else {
        savedLesson = await apiService.createLesson(sectionId, lessonPayload);
      }

      router.push(backHref);
    } catch (err: any) {
      setError(err.message || "Không thể lưu bài học");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex min-h-[50vh] items-center justify-center"><RefreshCw className="h-10 w-10 animate-spin text-purple-600" /></div>;
  }

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link href={backHref} className="rounded-2xl border border-slate-200 bg-white p-3 text-slate-500 hover:text-purple-700">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-purple-600">{sectionTitle}</p>
            <h1 className="text-3xl font-black tracking-tight text-slate-950">{isEdit ? "Chỉnh sửa bài học" : "Tạo bài học mới"}</h1>
          </div>
        </div>
        <button onClick={save} disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-purple-600 px-5 py-4 text-sm font-black text-white shadow-lg shadow-purple-200 hover:bg-purple-700 disabled:opacity-60">
          {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Lưu bài học
        </button>
      </div>

      {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">{error}</div>}

      <section className="flex flex-col gap-6">
        <div className="space-y-5 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-black text-slate-950">Thông tin bài học</h2>
          <div>
            <label className="text-xs font-black uppercase tracking-widest text-slate-500">Tiêu đề</label>
            <input value={form.tieu_de} onChange={(e) => setForm((prev) => ({ ...prev, tieu_de: e.target.value }))} className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-purple-400 focus:bg-white" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-black uppercase tracking-widest text-slate-500">Thời lượng phút</label>
              <input type="number" min={0} value={form.thoi_luong} onChange={(e) => setForm((prev) => ({ ...prev, thoi_luong: Number(e.target.value || 0) }))} className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-purple-400 focus:bg-white" />
            </div>
            <div>
              <label className="text-xs font-black uppercase tracking-widest text-slate-500">Thứ tự</label>
              <input type="number" value={form.thu_tu} onChange={(e) => setForm((prev) => ({ ...prev, thu_tu: Number(e.target.value || 0) }))} className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-purple-400 focus:bg-white" />
            </div>
          </div>
          <label className="flex cursor-pointer items-center justify-between rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-700">
            Cho phép học thử
            <input type="checkbox" checked={form.xem_truoc} onChange={(e) => setForm((prev) => ({ ...prev, xem_truoc: e.target.checked }))} className="h-5 w-5" />
          </label>
          <div className="rounded-2xl bg-amber-50 p-4 text-sm font-medium text-amber-800">
            Bài học do giảng viên tạo sẽ lưu ở trạng thái nháp. Admin duyệt khóa học trước khi công khai cho học viên.
          </div>
        </div>

        <div className="space-y-5 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-black text-slate-950">Nội dung multimedia</h2>
            <div className="flex flex-wrap gap-2">
              {contentOptions.map((item) => {
                const Icon = item.icon;
                return (
                  <button key={item.type} onClick={() => addBlock(item.type)} className="inline-flex items-center gap-1.5 rounded-xl bg-purple-50 px-3 py-2 text-xs font-black text-purple-700 hover:bg-purple-100">
                    <Icon className="h-3.5 w-3.5" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          {blocks.length === 0 ? (
            <div className="rounded-[1.5rem] border border-dashed border-slate-300 p-10 text-center">
              <Plus className="mx-auto h-10 w-10 text-slate-300" />
              <p className="mt-3 text-sm font-bold text-slate-500">Chưa có block nội dung</p>
            </div>
          ) : (
            <div className="space-y-4">
              {blocks.map((block, index) => (
                <div key={block.localId} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <span className="rounded-xl bg-white px-3 py-1.5 text-xs font-black uppercase tracking-widest text-slate-600">
                      #{index + 1} {block.loai_noi_dung}
                    </span>
                    <button onClick={() => removeBlock(block)} className="rounded-xl bg-rose-50 p-2 text-rose-600 hover:bg-rose-100">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {isUploadableType(block.loai_noi_dung) && (
                    <div className="space-y-3">
                      <input value={block.duong_dan_file || ""} onChange={(e) => updateBlock(block.localId, "duong_dan_file", e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium outline-none focus:border-purple-400" placeholder="URL file hoặc upload bên dưới" />
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-purple-700 shadow-sm hover:bg-purple-50">
                        {block.isUploading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                        Upload file
                        <input
                          type="file"
                          accept={fileAcceptByType[block.loai_noi_dung]}
                          className="hidden"
                          onChange={(e) => {
                            uploadBlockFile(block.localId, e.target.files?.[0]);
                            e.currentTarget.value = "";
                          }}
                        />
                      </label>
                      {renderEmbeddedPreview(block)}
                    </div>
                  )}

                  {block.loai_noi_dung === "text" && (
                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                      <CKEditorWrapper
                        value={block.noi_dung_text || ""}
                        onChange={(data) => updateBlock(block.localId, "noi_dung_text", data)}
                        placeholder="Nhập nội dung bài học..."
                        height="300px"
                      />
                    </div>
                  )}

                  {block.loai_noi_dung === "code" && (
                    <textarea value={block.noi_dung_text || ""} onChange={(e) => updateBlock(block.localId, "noi_dung_text", e.target.value)} rows={8} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-mono text-sm outline-none focus:border-purple-400" placeholder="Nhập đoạn code..." />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
