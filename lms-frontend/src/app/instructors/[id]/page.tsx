"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiFetch, formatPrice } from "@/lib/api";

interface CourseItem {
  id: number;
  tieu_de: string;
  mo_ta: string | null;
  gia_tien: string;
  trinh_do: string;
  danh_gia_trung_binh: string;
  so_luong_hoc_vien: number;
}

interface InstructorDetail {
  id: number;
  ho_ten: string;
  avatar_url: string | null;
  so_luong_khoa_hoc: number;
  so_luong_hoc_vien: number;
  khoa_hoc: CourseItem[];
}

export default function InstructorDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [instructor, setInstructor] = useState<InstructorDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await apiFetch(`/instructors/${id}`);
        if (res.ok) {
          setInstructor(await res.json());
        } else {
          setError("Không tìm thấy giảng viên");
        }
      } catch {
        setError("Lỗi kết nối");
      }
      setLoading(false);
    };
    if (id) load();
  }, [id]);

  const getLevelLabel = (level: string) => {
    switch (level) {
      case "beginner": return "Cơ bản";
      case "intermediate": return "Trung cấp";
      case "advanced": return "Nâng cao";
      default: return level;
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case "beginner": return "bg-success/10 text-success";
      case "intermediate": return "bg-warning/10 text-warning";
      case "advanced": return "bg-error/10 text-error";
      default: return "bg-surface-container text-on-surface-variant";
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <i className="ph ph-spinner-gap animate-spin text-4xl text-secondary"></i>
      </div>
    );
  }

  if (error || !instructor) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-24 h-24 bg-error/10 rounded-full flex items-center justify-center mb-6">
          <i className="ph-fill ph-warning text-5xl text-error"></i>
        </div>
        <h2 className="text-2xl font-bold text-on-surface mb-2">{error || "Không tìm thấy"}</h2>
        <Link href="/instructors" className="mt-4 px-6 py-3 bg-secondary text-on-secondary rounded-xl font-bold hover:bg-secondary/90 transition-colors">
          <i className="ph-bold ph-arrow-left mr-2"></i>Quay lại danh sách
        </Link>
      </div>
    );
  }

  return (
    <div className="animate-slide-up pb-12">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-on-surface-variant mb-8">
        <Link href="/" className="hover:text-primary transition-colors flex items-center gap-1">
          <i className="ph ph-house"></i> Trang chủ
        </Link>
        <i className="ph ph-caret-right text-xs"></i>
        <Link href="/instructors" className="hover:text-secondary transition-colors">
          Giảng viên
        </Link>
        <i className="ph ph-caret-right text-xs"></i>
        <span className="text-on-surface font-medium">{instructor.ho_ten}</span>
      </nav>

      {/* Instructor Hero */}
      <div className="glass-panel bg-surface border border-outline-variant/50 rounded-[32px] overflow-hidden mb-10 relative">
        <div className="absolute top-0 left-0 w-full h-40 bg-gradient-to-br from-secondary/20 via-primary/10 to-transparent"></div>
        <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-end gap-6 p-8 pt-16">
          <div className="w-32 h-32 rounded-full border-[6px] border-surface shadow-xl overflow-hidden bg-surface-container flex items-center justify-center text-5xl font-black text-secondary shrink-0">
            {instructor.avatar_url ? (
              <img src={instructor.avatar_url} alt={instructor.ho_ten} className="w-full h-full object-cover" />
            ) : (
              instructor.ho_ten.charAt(0).toUpperCase()
            )}
          </div>
          <div className="text-center sm:text-left flex-1 pb-2">
            <h1 className="text-3xl font-black text-on-surface mb-1">{instructor.ho_ten}</h1>
            <p className="text-sm font-bold text-secondary uppercase tracking-wider mb-4">Giảng viên</p>
            <div className="flex gap-8 justify-center sm:justify-start">
              <div className="text-center">
                <div className="text-2xl font-black text-on-surface">{instructor.so_luong_khoa_hoc}</div>
                <div className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Khóa học</div>
              </div>
              <div className="w-px bg-outline-variant/50"></div>
              <div className="text-center">
                <div className="text-2xl font-black text-on-surface">{instructor.so_luong_hoc_vien}</div>
                <div className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Học viên</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Courses Section */}
      <div className="mb-6 flex items-center gap-3">
        <i className="ph-fill ph-book-open text-2xl text-secondary"></i>
        <h2 className="text-2xl font-black text-on-surface">Khóa học của {instructor.ho_ten}</h2>
        <span className="ml-2 px-3 py-1 bg-secondary/10 text-secondary text-sm font-black rounded-full">{instructor.khoa_hoc.length}</span>
      </div>

      {instructor.khoa_hoc.length === 0 ? (
        <div className="glass-panel bg-surface border border-outline-variant/50 rounded-2xl p-16 text-center">
          <div className="w-20 h-20 bg-surface-container-high rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="ph ph-book-open text-4xl text-on-surface-variant"></i>
          </div>
          <h3 className="text-xl font-bold text-on-surface mb-2">Chưa có khóa học</h3>
          <p className="text-on-surface-variant">Giảng viên này chưa xuất bản khóa học nào.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {instructor.khoa_hoc.map((course, idx) => (
            <Link
              key={course.id}
              href={`/courses/${course.id}`}
              className="glass-panel group bg-surface border border-outline-variant/50 rounded-2xl overflow-hidden hover:border-primary/50 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/10 transition-all flex flex-col h-full"
              style={{ animationDelay: `${idx * 0.06}s`, animationFillMode: "both" }}
            >
              {/* Course thumbnail placeholder */}
              <div className="h-40 bg-gradient-to-br from-primary/15 via-secondary/10 to-tertiary/10 flex items-center justify-center relative overflow-hidden">
                <i className="ph-fill ph-graduation-cap text-6xl text-primary/30 group-hover:scale-110 transition-transform duration-500"></i>
                <div className="absolute top-3 right-3">
                  <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${getLevelColor(course.trinh_do)}`}>
                    {getLevelLabel(course.trinh_do)}
                  </span>
                </div>
              </div>

              <div className="p-5 flex flex-col flex-1">
                <h3 className="text-lg font-bold text-on-surface mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                  {course.tieu_de}
                </h3>
                {course.mo_ta && (
                  <p className="text-sm text-on-surface-variant line-clamp-2 mb-4 flex-1">{course.mo_ta}</p>
                )}

                <div className="flex items-center gap-4 text-xs text-on-surface-variant mb-4">
                  <span className="flex items-center gap-1">
                    <i className="ph-fill ph-star text-amber-500"></i>
                    {parseFloat(course.danh_gia_trung_binh).toFixed(1)}
                  </span>
                  <span className="flex items-center gap-1">
                    <i className="ph-fill ph-users"></i>
                    {course.so_luong_hoc_vien} học viên
                  </span>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-outline-variant/50">
                  <span className="text-xl font-black text-primary">
                    {parseFloat(course.gia_tien) === 0 ? "Miễn phí" : formatPrice(course.gia_tien)}
                  </span>
                  <span className="text-xs font-bold text-secondary flex items-center gap-1 group-hover:gap-2 transition-all">
                    Xem chi tiết <i className="ph-bold ph-arrow-right"></i>
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
