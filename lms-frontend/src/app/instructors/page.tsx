"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, GraduationCap, RefreshCw, Users } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { apiService } from "@/services/api";

type PublicInstructor = {
  id: number;
  ho_ten: string;
  avatar_url?: string | null;
  so_luong_khoa_hoc: number;
  so_luong_hoc_vien: number;
};

export default function InstructorsPage() {
  const [instructors, setInstructors] = useState<PublicInstructor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadInstructors() {
      setLoading(true);
      try {
        setInstructors(await apiService.getPublicInstructors());
      } finally {
        setLoading(false);
      }
    }

    loadInstructors();
  }, []);

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[#F8FAFC] pt-28">
        <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="rounded-[2.5rem] border border-blue-100 bg-white p-8 shadow-sm md:p-12">
            <div className="max-w-3xl">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-xs font-black uppercase tracking-widest text-blue-700">
                <GraduationCap className="h-4 w-4" />
                Đội ngũ giảng viên
              </div>
              <h1 className="text-4xl font-black tracking-tight text-slate-950 md:text-5xl">
                Học cùng các giảng viên đang xây dựng khóa học trên LuminaLMS
              </h1>
            </div>
          </div>

          <div className="mt-10">
            {loading ? (
              <div className="flex min-h-72 items-center justify-center rounded-[2rem] border border-slate-200 bg-white">
                <RefreshCw className="h-9 w-9 animate-spin text-blue-600" />
              </div>
            ) : instructors.length === 0 ? (
              <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white p-12 text-center">
                <GraduationCap className="mx-auto h-12 w-12 text-slate-300" />
                <h2 className="mt-4 text-xl font-black text-slate-950">Chưa có giảng viên công khai</h2>
                <Link
                  href="/become-instructor"
                  className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white hover:bg-blue-700"
                >
                  Trở thành giảng viên
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {instructors.map((instructor) => {
                  const avatar = instructor.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(instructor.ho_ten)}`;
                  return (
                    <article key={instructor.id} className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
                      <div className="flex items-center gap-4">
                        <img src={avatar} alt={instructor.ho_ten} className="h-16 w-16 rounded-2xl border border-slate-200 bg-blue-50 object-cover" />
                        <div>
                          <h2 className="text-lg font-black text-slate-950">{instructor.ho_ten}</h2>
                          <p className="text-xs font-black uppercase tracking-widest text-blue-600">Giảng viên Lumina</p>
                        </div>
                      </div>

                      <div className="mt-6 grid grid-cols-2 gap-3">
                        <div className="rounded-2xl bg-slate-50 p-4">
                          <BookOpen className="h-5 w-5 text-blue-600" />
                          <p className="mt-3 text-2xl font-black text-slate-950">{instructor.so_luong_khoa_hoc}</p>
                          <p className="text-xs font-bold text-slate-500">Khóa học</p>
                        </div>
                        <div className="rounded-2xl bg-slate-50 p-4">
                          <Users className="h-5 w-5 text-emerald-600" />
                          <p className="mt-3 text-2xl font-black text-slate-950">{instructor.so_luong_hoc_vien}</p>
                          <p className="text-xs font-bold text-slate-500">Học viên</p>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
