"use client";
 
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useParams, useRouter } from "next/navigation";

type Lesson = {
  id: number;
  tieu_de: string;
  thoi_luong: number;
  thu_tu: number;
  trang_thai_phe_duyet: string;
};

type Section = {
  id: number;
  tieu_de: string;
  thu_tu: number;
  bai_hoc: Lesson[];
};

type Course = {
  id: number;
  tieu_de: string;
  trang_thai_phe_duyet: string;
  chuong_hoc: Section[];
};

export default function AdminCourseContentPage() {
  const { id } = useParams();
  const router = useRouter();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCourse = async () => {
    try {
      const res = await api.get(`/courses/${id}`);
      setCourse(res.data);
    } catch (err) {
      console.error("Lỗi khi lấy thông tin khóa học:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchCourse();
  }, [id]);

  const handleCourseAction = async (action: "approve" | "reject") => {
    if (!id) return;
    try {
      await api.put(`/admin/courses/${id}/${action}`, {});
      alert(action === "approve" ? "Đã phê duyệt khóa học thành công!" : "Đã từ chối khóa học!");
      fetchCourse();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Lỗi xử lý.");
    }
  };

  const handleLessonAction = async (lessonId: number, action: "approve" | "reject") => {
    try {
      await api.put(`/admin/lessons/${lessonId}/${action}`, {});
      alert(action === "approve" ? "Đã duyệt bài học!" : "Đã từ chối bài học!");
      fetchCourse();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Lỗi xử lý.");
    }
  };

  if (loading) {
    return <div className="p-8 text-center"><i className="ph ph-spinner-gap animate-spin text-3xl"></i></div>;
  }

  if (!course) {
    return <div className="p-8 text-center text-error font-bold">Không tìm thấy khóa học</div>;
  }

  return (
    <div className="animate-fade-in max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <button onClick={() => router.back()} className="text-primary hover:underline text-sm font-semibold flex items-center gap-1 mb-2">
            <i className="ph-bold ph-arrow-left"></i> Quay lại
          </button>
          <p className="text-on-surface-variant text-sm mt-1 flex items-center gap-2 flex-wrap">
            Khóa học: <span className="font-bold text-primary">{course.tieu_de}</span>
            {(() => {
              switch (course.trang_thai_phe_duyet) {
                case "pending":
                  return <span className="px-2.5 py-0.5 bg-amber-500/10 text-amber-600 border border-amber-500/20 text-[10px] font-black rounded uppercase">Chờ duyệt</span>;
                case "approved":
                  return <span className="px-2.5 py-0.5 bg-success/10 text-success border border-success/20 text-[10px] font-black rounded uppercase">Đã xuất bản</span>;
                case "rejected":
                  return <span className="px-2.5 py-0.5 bg-error/10 text-error border border-error/20 text-[10px] font-black rounded uppercase">Từ chối</span>;
                case "draft":
                default:
                  return <span className="px-2.5 py-0.5 bg-surface-container-highest text-on-surface-variant border border-outline-variant text-[10px] font-black rounded uppercase">Nháp</span>;
              }
            })()}
          </p>
        </div>
      </div>

      {course.trang_thai_phe_duyet === "pending" && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5 flex flex-col md:flex-row justify-between items-center gap-4 animate-slide-up shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-600 flex items-center justify-center shrink-0">
              <i className="ph-fill ph-warning-octagon text-xl"></i>
            </div>
            <div>
              <h3 className="font-bold text-on-surface text-sm md:text-base">Khóa học này đang chờ phê duyệt</h3>
              <p className="text-xs text-on-surface-variant">Vui lòng kiểm tra kỹ nội dung chương học bên dưới trước khi phê duyệt.</p>
            </div>
          </div>
          <div className="flex gap-2 w-full md:w-auto shrink-0">
            <button
              onClick={() => handleCourseAction("reject")}
              className="flex-1 md:flex-none px-4 py-2 bg-error/10 hover:bg-error/20 text-error border border-error/20 rounded-xl text-sm font-bold transition-colors"
            >
              Từ chối duyệt
            </button>
            <button
              onClick={() => handleCourseAction("approve")}
              className="flex-1 md:flex-none px-4 py-2 bg-success text-white hover:bg-success/90 rounded-xl text-sm font-bold transition-colors shadow-sm"
            >
              Phê duyệt
            </button>
          </div>
        </div>
      )}

      <div className="bg-surface rounded-2xl border border-outline-variant shadow-sm p-6">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <i className="ph-fill ph-list-numbers text-primary"></i> Cấu trúc chương & bài học
        </h2>

        {course.chuong_hoc.length === 0 ? (
          <div className="text-center py-8 text-on-surface-variant bg-surface-container-lowest rounded-xl border border-dashed border-outline-variant">
            Khóa học này chưa có nội dung.
          </div>
        ) : (
          <div className="space-y-4">
            {course.chuong_hoc
              .sort((a, b) => a.thu_tu - b.thu_tu)
              .map((section, idx) => (
                <div key={section.id} className="border border-outline-variant rounded-xl overflow-hidden">
                  <div className="bg-surface-container-lowest px-4 py-3 border-b border-outline-variant font-bold text-on-surface flex justify-between items-center">
                    <span>Chương {idx + 1}: {section.tieu_de}</span>
                    <span className="text-xs font-normal text-on-surface-variant bg-surface-container px-2 py-1 rounded-md">
                      {section.bai_hoc.length} bài học
                    </span>
                  </div>
                  <div className="bg-surface p-2 space-y-1">
                    {section.bai_hoc.length === 0 ? (
                      <div className="text-xs text-on-surface-variant p-2 text-center">Chưa có bài học</div>
                    ) : (
                      section.bai_hoc
                        .sort((a, b) => a.thu_tu - b.thu_tu)
                        .map((lesson, lIdx) => (
                          <div key={lesson.id} className="flex flex-col md:flex-row md:items-center justify-between p-3 hover:bg-surface-container-lowest rounded-lg transition-colors gap-3">
                            <div className="flex items-center gap-3">
                              <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">
                                {lIdx + 1}
                              </div>
                              <span className="text-sm font-medium text-on-surface">{lesson.tieu_de}</span>
                              {(() => {
                                switch (lesson.trang_thai_phe_duyet) {
                                  case "pending":
                                    return <span className="px-1.5 py-0.5 bg-amber-500/10 text-amber-600 border border-amber-500/20 text-[9px] font-bold rounded">Chờ duyệt</span>;
                                  case "approved":
                                    return <span className="px-1.5 py-0.5 bg-success/10 text-success border border-success/20 text-[9px] font-bold rounded">Đã duyệt</span>;
                                  case "rejected":
                                    return <span className="px-1.5 py-0.5 bg-error/10 text-error border border-error/20 text-[9px] font-bold rounded">Từ chối</span>;
                                  case "draft":
                                  default:
                                    return <span className="px-1.5 py-0.5 bg-surface-container-highest text-on-surface-variant border border-outline-variant text-[9px] font-bold rounded">Nháp</span>;
                                }
                              })()}
                            </div>
                            
                            <div className="flex items-center gap-4 self-end md:self-auto">
                              <span className="text-xs text-on-surface-variant flex items-center gap-1">
                                <i className="ph-fill ph-clock"></i> {Math.floor(lesson.thoi_luong / 60)} phút
                              </span>
                              
                              {lesson.trang_thai_phe_duyet === "pending" && (
                                <div className="flex items-center gap-1.5 border-l border-outline-variant/60 pl-3">
                                  <button
                                    onClick={() => handleLessonAction(lesson.id, "reject")}
                                    className="px-2.5 py-1 bg-error/10 hover:bg-error/20 text-error border border-error/20 rounded-md text-[11px] font-bold transition-colors"
                                    title="Từ chối bài học này"
                                  >
                                    Từ chối
                                  </button>
                                  <button
                                    onClick={() => handleLessonAction(lesson.id, "approve")}
                                    className="px-2.5 py-1 bg-success text-white hover:bg-success/90 rounded-md text-[11px] font-bold transition-colors"
                                    title="Duyệt bài học này"
                                  >
                                    Duyệt
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
