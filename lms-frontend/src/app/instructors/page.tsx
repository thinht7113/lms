"use client";

import { useEffect, useState, Suspense } from "react";
import { apiFetch } from "@/lib/api";
import Link from "next/link";

interface Instructor {
  id: number;
  ho_ten: string;
  avatar_url: string | null;
  so_luong_khoa_hoc: number;
  so_luong_hoc_vien: number;
}

function InstructorsContent() {
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await apiFetch("/instructors");
        if (res.ok) {
          setInstructors(await res.json());
        }
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };
    load();
  }, []);

  return (
    <div className="animate-slide-up pb-12">
      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pt-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="glass-panel rounded-[32px] h-[350px] animate-pulse bg-surface-container"></div>
          ))}
        </div>
      ) : instructors.length === 0 ? (
        <div className="text-center py-20 bg-surface/50 rounded-[32px] border border-outline-variant/40 shadow-sm">
          <div className="w-24 h-24 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <i className="ph-fill ph-users text-5xl text-secondary drop-shadow-sm"></i>
          </div>
          <h3 className="text-2xl font-black text-on-surface mb-3">Chưa có giảng viên nào</h3>
          <p className="text-on-surface-variant font-medium">Hệ thống đang cập nhật danh sách giảng viên.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pt-4">
          {instructors.map((instructor, idx) => (
            <Link
              key={instructor.id}
              href={`/instructors/${instructor.id}`}
              className="glass-panel group rounded-[32px] border border-outline-variant/50 overflow-hidden hover:border-secondary/50 transition-all flex flex-col h-full hover:-translate-y-2 hover:shadow-xl hover:shadow-secondary/10 bg-surface relative cursor-pointer"
              style={{ animationDelay: `${idx * 0.05}s`, animationFillMode: "both" }}
            >
              <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-secondary/20 to-primary/10 group-hover:opacity-80 transition-opacity"></div>

              <div className="relative z-10 flex flex-col items-center text-center p-8 pt-10">
                <div className="w-28 h-28 rounded-full border-[6px] border-surface shadow-lg overflow-hidden mb-5 bg-surface-container flex items-center justify-center text-4xl font-black text-secondary group-hover:scale-110 transition-transform duration-500">
                  {instructor.avatar_url ? (
                    <img src={instructor.avatar_url} alt={instructor.ho_ten} className="w-full h-full object-cover" />
                  ) : (
                    instructor.ho_ten.charAt(0).toUpperCase()
                  )}
                </div>

                <h3 className="text-2xl font-black text-on-surface mb-1 group-hover:text-secondary transition-colors">{instructor.ho_ten}</h3>
                <p className="text-xs font-bold text-secondary mb-6 uppercase tracking-wider bg-secondary/10 px-3 py-1 rounded-full">Chuyên gia hệ thống</p>

                <div className="w-full h-px bg-outline-variant/50 mb-6"></div>

                <div className="flex w-full justify-around gap-4 text-center">
                  <div>
                    <div className="text-3xl font-black text-on-surface tracking-tight">{instructor.so_luong_khoa_hoc}</div>
                    <div className="text-[11px] font-black text-on-surface-variant uppercase tracking-wider mt-1">Khóa học</div>
                  </div>
                  <div className="w-px bg-outline-variant/50"></div>
                  <div>
                    <div className="text-3xl font-black text-on-surface tracking-tight">{instructor.so_luong_hoc_vien}</div>
                    <div className="text-[11px] font-black text-on-surface-variant uppercase tracking-wider mt-1">Học viên</div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function InstructorsPage() {
  return (
    <Suspense fallback={<div className="flex justify-center p-20"><i className="ph ph-spinner-gap animate-spin text-4xl text-secondary"></i></div>}>
      <InstructorsContent />
    </Suspense>
  );
}
