"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, RefreshCw, UserRound, Users } from "lucide-react";
import { apiService, CourseDetail, User } from "@/services/api";

export default function InstructorCourseStudentsPage() {
  const params = useParams();
  const courseId = Number(params.id);
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [students, setStudents] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [detail, studentList] = await Promise.all([
          apiService.getCourseDetailWithAuth(courseId),
          apiService.getCourseStudents(courseId),
        ]);
        setCourse(detail);
        setStudents(studentList);
      } catch (err: any) {
        setError(err.message || "Không thể tải danh sách học viên");
      } finally {
        setLoading(false);
      }
    }
    if (courseId) load();
  }, [courseId]);

  if (loading) {
    return <div className="flex min-h-[50vh] items-center justify-center"><RefreshCw className="h-10 w-10 animate-spin text-purple-600" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/instructor/courses" className="rounded-2xl border border-slate-200 bg-white p-3 text-slate-500 hover:text-purple-700">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-purple-600">Học viên đã ghi danh</p>
          <h1 className="text-3xl font-black tracking-tight text-slate-950">{course?.tieu_de || "Khóa học"}</h1>
        </div>
      </div>

      {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">{error}</div>}

      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <h2 className="text-lg font-black text-slate-950">Danh sách học viên</h2>
          <span className="rounded-full bg-purple-50 px-4 py-2 text-xs font-black text-purple-700">{students.length} học viên</span>
        </div>

        {students.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="mx-auto h-12 w-12 text-slate-300" />
            <h3 className="mt-4 text-xl font-black text-slate-950">Chưa có học viên</h3>
            <p className="mt-2 text-sm font-medium text-slate-500">Khi học viên mua khóa học, danh sách sẽ hiển thị tại đây.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {students.map((student) => (
              <article key={student.id} className="flex items-center gap-4 p-5">
                <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-purple-50 text-purple-700">
                  {student.avatar_url ? (
                    <img src={student.avatar_url} alt={student.ho_ten} className="h-full w-full object-cover" />
                  ) : (
                    <UserRound className="h-6 w-6" />
                  )}
                </div>
                <div>
                  <h3 className="font-black text-slate-950">{student.ho_ten}</h3>
                  <p className="text-sm font-medium text-slate-500">{student.email}</p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
