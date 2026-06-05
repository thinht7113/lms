"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useUser } from "@/context/user-context";
import { apiFetch, formatDuration } from "@/lib/api";
import Link from "next/link";

interface Lesson { id: number; tieu_de: string; thoi_luong: number; thu_tu: number; xem_truoc: boolean; da_xuat_ban: boolean; trang_thai_phe_duyet: string; }
interface Section { id: number; tieu_de: string; thu_tu: number; bai_hoc: Lesson[]; }
interface Prerequisite { id: number; ma_khoa_hoc_chinh: number; ma_khoa_hoc_tien_quyet: number; khoa_hoc_tien_quyet: { id: number; tieu_de: string }; }
interface CourseDetail { id: number; tieu_de: string; da_xuat_ban: boolean; chuong_hoc: Section[]; dieu_kien_tien_quyet: Prerequisite[]; }
interface QuizInfo { id: number; tieu_de: string; diem_dat: string; thoi_gian_lam_bai: number | null; so_luot_lam_toi_da: number; }

export default function InstructorCourseManagePage() {
  const params = useParams();
  const courseId = params.id as string;
  const { role, token, isAuthenticated } = useUser();

  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [quizzes, setQuizzes] = useState<QuizInfo[]>([]);
  const [loading, setLoading] = useState(true);

  // Create section
  const [showSectionForm, setShowSectionForm] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [creatingSec, setCreatingSec] = useState(false);

  // Create quiz
  const [showQuizForm, setShowQuizForm] = useState(false);
  const [newQuiz, setNewQuiz] = useState({ tieu_de: "", diem_dat: "6.00", thoi_gian_lam_bai: 15, so_luot_lam_toi_da: 3 });
  const [creatingQuiz, setCreatingQuiz] = useState(false);

  // Create question
  const [showQuestionForm, setShowQuestionForm] = useState<number | null>(null);
  const [newQuestion, setNewQuestion] = useState({ noi_dung: "", options: [{ text: "", is_correct: false }, { text: "", is_correct: false }, { text: "", is_correct: false }, { text: "", is_correct: false }] });
  const [creatingQuestion, setCreatingQuestion] = useState(false);

  // Prerequisites
  const [allCourses, setAllCourses] = useState<{ id: number; tieu_de: string }[]>([]);
  const [selectedPrereqId, setSelectedPrereqId] = useState<string>("");
  const [addingPrereq, setAddingPrereq] = useState(false);

  const loadCourse = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await apiFetch(`/courses/${courseId}`, token);
      if (res.ok) setCourse(await res.json());
      // Load quizzes
      try {
        const qRes = await apiFetch(`/courses/${courseId}/quizzes`, token);
        if (qRes.ok) setQuizzes(await qRes.json());
      } catch { /* ignore */ }
      // Load all courses
      try {
        const cAllRes = await apiFetch("/courses", token);
        if (cAllRes.ok) {
          setAllCourses(await cAllRes.json());
        }
      } catch { /* ignore */ }
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { loadCourse(); }, [token, courseId]);

  const createSection = async () => {
    if (!token || !newSectionTitle) return;
    setCreatingSec(true);
    try {
      const order = course ? course.chuong_hoc.length + 1 : 1;
      const res = await apiFetch(`/courses/${courseId}/sections`, token, {
        method: "POST",
        body: JSON.stringify({ tieu_de: newSectionTitle, thu_tu: order }),
      });
      if (res.ok) { setShowSectionForm(false); setNewSectionTitle(""); loadCourse(); }
      else { const e = await res.json(); alert(e.detail || "Lỗi"); }
    } catch { alert("Lỗi kết nối"); }
    setCreatingSec(false);
  };

  const updateLessonStatus = async (lesson: Lesson, nextStatus: string) => {
    if (!token) return;
    try {
      const body: any = { trang_thai_phe_duyet: nextStatus };
      if (nextStatus === "draft") {
        body.da_xuat_ban = false;
      }
      const res = await apiFetch(`/lessons/${lesson.id}`, token, {
        method: "PUT",
        body: JSON.stringify(body),
      });
      if (res.ok) loadCourse();
      else { const e = await res.json(); alert(e.detail || "Lỗi"); }
    } catch { alert("Lỗi kết nối"); }
  };

  const deleteLesson = async (lessonId: number) => {
    if (!token || !confirm("Xác nhận xóa bài học này?")) return;
    try {
      const res = await apiFetch(`/lessons/${lessonId}`, token, { method: "DELETE" });
      if (res.ok) loadCourse();
    } catch { alert("Lỗi kết nối"); }
  };

  const handleCreateQuiz = async () => {
    if (!token || !newQuiz.tieu_de) return;
    setCreatingQuiz(true);
    try {
      const res = await apiFetch(`/courses/${courseId}/quizzes`, token, {
        method: "POST",
        body: JSON.stringify({
          tieu_de: newQuiz.tieu_de,
          diem_dat: parseFloat(newQuiz.diem_dat),
          thoi_gian_lam_bai: newQuiz.thoi_gian_lam_bai,
          so_luot_lam_toi_da: newQuiz.so_luot_lam_toi_da,
        }),
      });
      if (res.ok) { setShowQuizForm(false); setNewQuiz({ tieu_de: "", diem_dat: "6.00", thoi_gian_lam_bai: 15, so_luot_lam_toi_da: 3 }); loadCourse(); }
      else { const e = await res.json(); alert(e.detail || "Lỗi"); }
    } catch { alert("Lỗi kết nối"); }
    setCreatingQuiz(false);
  };

  const handleCreateQuestion = async (quizId: number) => {
    if (!token || !newQuestion.noi_dung) return;
    setCreatingQuestion(true);
    try {
      const hasCorrect = newQuestion.options.some(o => o.is_correct);
      if (!hasCorrect) { alert("Phải chọn ít nhất 1 đáp án đúng!"); setCreatingQuestion(false); return; }
      const res = await apiFetch(`/quizzes/${quizId}/questions`, token, {
        method: "POST",
        body: JSON.stringify({
          noi_dung: newQuestion.noi_dung,
          cac_lua_chon: newQuestion.options.filter(o => o.text),
        }),
      });
      if (res.ok) {
        setShowQuestionForm(null);
        setNewQuestion({ noi_dung: "", options: [{ text: "", is_correct: false }, { text: "", is_correct: false }, { text: "", is_correct: false }, { text: "", is_correct: false }] });
        loadCourse();
      } else { const e = await res.json(); alert(e.detail || "Lỗi"); }
    } catch { alert("Lỗi kết nối"); }
    setCreatingQuestion(false);
  };

  const handleAddPrereq = async () => {
    if (!token || !selectedPrereqId) return;
    setAddingPrereq(true);
    try {
      const res = await apiFetch(`/courses/${courseId}/prerequisites`, token, {
        method: "POST",
        body: JSON.stringify({
          ma_khoa_hoc_tien_quyet: parseInt(selectedPrereqId)
        })
      });
      if (res.ok) {
        setSelectedPrereqId("");
        loadCourse();
      } else {
        const e = await res.json();
        alert(e.detail || "Lỗi khi thêm điều kiện tiên quyết");
      }
    } catch {
      alert("Lỗi kết nối");
    }
    setAddingPrereq(false);
  };

  const handleDeletePrereq = async (prereqId: number) => {
    if (!token || !confirm("Xác nhận xóa điều kiện tiên quyết này?")) return;
    try {
      const res = await apiFetch(`/courses/${courseId}/prerequisites/${prereqId}`, token, {
        method: "DELETE"
      });
      if (res.ok) {
        loadCourse();
      } else {
        const e = await res.json();
        alert(e.detail || "Lỗi khi xóa điều kiện tiên quyết");
      }
    } catch {
      alert("Lỗi kết nối");
    }
  };

  if (!isAuthenticated || role !== "instructor") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] px-4">
        <div className="bg-white/80 backdrop-blur-xl p-10 rounded-3xl text-center border border-slate-200/60 max-w-md w-full shadow-2xl">
          <div className="text-5xl mb-6">🚫</div>
          <h2 className="text-2xl font-black text-slate-800 mb-2">Quyền truy cập bị từ chối</h2>
          <p className="text-slate-500 mb-8 font-medium">Bạn cần đăng nhập với tài khoản <strong>Giảng viên</strong>.</p>
          <Link href="/login" className="inline-block w-full px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold shadow-md transition-all">
            Đăng nhập ngay
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 bg-[#f8fafc]">
      <div className="w-full max-w-[95%] mx-auto px-4 md:px-8 mt-10">
        {loading ? (
          <div className="flex flex-col justify-center items-center py-24 gap-3">
            <i className="ph-bold ph-spinner-gap animate-spin text-4xl text-indigo-600"></i>
            <span className="text-sm font-bold text-slate-400">Đang tải nội dung...</span>
          </div>
        ) : !course ? (
          <div className="bg-white border border-slate-100 p-16 text-center rounded-3xl shadow-sm mt-10">
            <div className="text-5xl mb-6">😢</div>
            <h3 className="text-xl font-black text-slate-700">Không tìm thấy thông tin khóa học</h3>
          </div>
        ) : (
          <>
            {/* Header section */}
            <div className="mb-8">
              <Link href="/instructor" className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-indigo-600 transition-colors mb-4 bg-white border border-slate-100 px-4 py-2 rounded-xl shadow-sm">
                <i className="ph-bold ph-arrow-left"></i> Bảng điều khiển
              </Link>
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 uppercase tracking-widest mb-2">
                <span className="w-2 h-2 rounded-full bg-indigo-600"></span> Chi tiết
              </div>
              <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight mb-2">
                Quản lý nội dung
              </h1>
              <p className="text-slate-500 text-sm font-medium leading-relaxed">
                Khóa học: <strong className="text-slate-700">{course.tieu_de}</strong>
                <span className="mx-2 text-slate-300">•</span> {course.chuong_hoc.length} Chương
                <span className="mx-2 text-slate-300">•</span> {course.chuong_hoc.reduce((s, sec) => s + sec.bai_hoc.length, 0)} Bài học
              </p>
            </div>

            {/* ===== SECTIONS & LESSONS ===== */}
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-black text-slate-500 uppercase tracking-wider flex items-center gap-2">
                  <i className="ph-fill ph-folder-open text-indigo-600 text-base"></i> Chương và Bài học
                </h2>
              </div>
              
              {course.chuong_hoc.sort((a, b) => a.thu_tu - b.thu_tu).map((section) => (
                <div key={section.id} className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
                  {/* Section Accordion Header */}
                  <div className="px-6 py-5 bg-slate-50/50 flex justify-between items-center border-b border-slate-100">
                    <h3 className="text-sm font-extrabold text-slate-700 flex items-center gap-2.5">
                      <i className="ph-bold ph-folder-open text-indigo-600"></i> {section.tieu_de}
                    </h3>
                    <Link
                      href={`/instructor/courses/${courseId}/lessons/new?sectionId=${section.id}`}
                      className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                    >
                      <i className="ph-bold ph-plus"></i> Thêm bài học
                    </Link>
                  </div>

                  {/* Lessons list */}
                  <div className="divide-y divide-slate-100">
                    {section.bai_hoc.length === 0 ? (
                      <div className="px-6 py-6 text-center text-slate-400 font-medium text-xs">
                        Chưa có bài học nào trong chương này.
                      </div>
                    ) : (
                      section.bai_hoc.sort((a, b) => a.thu_tu - b.thu_tu).map((lesson) => (
                        <div key={lesson.id} className="px-6 py-4.5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-slate-50/20 transition-all">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                              <i className={`text-lg ${lesson.da_xuat_ban ? "ph-fill ph-play-circle text-emerald-500" : "ph-fill ph-file-text"}`}></i>
                            </div>
                            <div className="truncate">
                              <span className={`text-sm font-bold text-slate-700 ${lesson.da_xuat_ban ? "" : "text-slate-400 line-through"}`}>
                                {lesson.tieu_de}
                              </span>
                              <div className="flex items-center gap-2 mt-1.5">
                                <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                                  {formatDuration(lesson.thoi_luong)}
                                </span>
                                {(() => {
                                  switch (lesson.trang_thai_phe_duyet) {
                                    case "pending":
                                      return (
                                        <span className="text-[9px] uppercase font-black px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-500 border border-amber-500/15 animate-pulse">
                                          Chờ duyệt
                                        </span>
                                      );
                                    case "approved":
                                      return (
                                        <span className="text-[9px] uppercase font-black px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-500 border border-emerald-500/15">
                                          Đã duyệt
                                        </span>
                                      );
                                    case "rejected":
                                      return (
                                        <span className="text-[9px] uppercase font-black px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-500 border border-rose-500/15">
                                          Từ chối
                                        </span>
                                      );
                                    case "draft":
                                    default:
                                      return (
                                        <span className="text-[9px] uppercase font-black px-2 py-0.5 rounded-md bg-slate-100 text-slate-400 border border-slate-200">
                                          Nháp
                                        </span>
                                      );
                                  }
                                })()}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2.5 w-full md:w-auto shrink-0">
                            {(() => {
                              switch (lesson.trang_thai_phe_duyet) {
                                case "pending":
                                  return (
                                    <button
                                      onClick={() => updateLessonStatus(lesson, "draft")}
                                      className="px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border border-slate-200 text-slate-500 hover:bg-slate-50"
                                      title="Rút lại yêu cầu phê duyệt"
                                    >
                                      Rút yêu cầu
                                    </button>
                                  );
                                case "approved":
                                  return (
                                    <button
                                      onClick={() => updateLessonStatus(lesson, "draft")}
                                      className="px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border border-rose-200 text-rose-500 hover:bg-rose-50"
                                      title="Gỡ bài học xuống bản nháp"
                                    >
                                      Gỡ bài
                                    </button>
                                  );
                                case "rejected":
                                  return (
                                    <button
                                      onClick={() => updateLessonStatus(lesson, "pending")}
                                      className="px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border border-amber-200 text-amber-500 hover:bg-amber-50"
                                      title="Gửi lại yêu cầu duyệt cho Admin"
                                    >
                                      Duyệt lại
                                    </button>
                                  );
                                case "draft":
                                default:
                                  return (
                                    <button
                                      onClick={() => updateLessonStatus(lesson, "pending")}
                                      className="px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border border-emerald-200 text-emerald-500 hover:bg-emerald-50"
                                      title="Gửi duyệt cho Admin"
                                    >
                                      Gửi duyệt
                                    </button>
                                  );
                              }
                            })()}
                            <button
                              onClick={() => deleteLesson(lesson.id)}
                              className="px-3 py-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg text-[10px] font-bold transition-all"
                            >
                              Xóa
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Add Section Button */}
            <div className="mt-6">
              {!showSectionForm ? (
                <button
                  onClick={() => setShowSectionForm(true)}
                  className="w-full py-4.5 rounded-3xl border border-dashed border-slate-200 bg-white hover:bg-slate-50 hover:border-indigo-500/50 cursor-pointer font-bold text-xs text-slate-400 hover:text-indigo-600 transition-all flex justify-center items-center gap-2 shadow-sm"
                >
                  <i className="ph-bold ph-plus-circle text-base"></i> Thêm chương học mới
                </button>
              ) : (
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4 items-center animate-scale-up">
                  <input 
                    className="flex-1 w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 outline-none text-sm text-slate-800 font-medium" 
                    value={newSectionTitle} 
                    onChange={(e) => setNewSectionTitle(e.target.value)} 
                    placeholder="Nhập tên chương học..." 
                    autoFocus 
                  />
                  <div className="flex gap-2 w-full md:w-auto shrink-0">
                    <button onClick={() => setShowSectionForm(false)} className="flex-1 md:flex-none px-5 py-3 border border-slate-200 rounded-xl font-bold text-xs hover:bg-slate-50 transition-colors">
                      Hủy
                    </button>
                    <button onClick={createSection} disabled={creatingSec} className="flex-1 md:flex-none px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold text-xs shadow-md hover:bg-indigo-500 transition-colors">
                      {creatingSec ? "Đang tạo..." : "Tạo chương"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ===== QUIZZES ===== */}
            <div className="mt-16 pt-10 border-t border-slate-100">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-sm font-black text-slate-500 uppercase tracking-wider flex items-center gap-2">
                  <i className="ph-fill ph-exam text-indigo-600 text-base"></i> Bài kiểm tra
                </h2>
                <button
                  onClick={() => setShowQuizForm(!showQuizForm)}
                  className="px-4 py-2.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100/80 rounded-xl font-bold text-xs transition-colors flex items-center gap-1.5"
                >
                  <i className="ph-bold ph-plus"></i> Tạo bài thi
                </button>
              </div>

              {showQuizForm && (
                <div className="bg-white p-6 rounded-3xl border border-slate-100 mb-8 shadow-sm animate-scale-up">
                  <h3 className="font-extrabold text-sm text-slate-700 mb-4">Tạo bài thi mới</h3>
                  <div className="space-y-4">
                    <input 
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none text-sm font-medium text-slate-800" 
                      value={newQuiz.tieu_de} 
                      onChange={(e) => setNewQuiz({ ...newQuiz, tieu_de: e.target.value })} 
                      placeholder="Tiêu đề bài kiểm tra *" 
                    />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Điểm đạt (Thang 10)</label>
                        <input className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none text-sm font-bold text-slate-700" value={newQuiz.diem_dat} onChange={(e) => setNewQuiz({ ...newQuiz, diem_dat: e.target.value })} />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Thời gian (phút)</label>
                        <input className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none text-sm font-bold text-slate-700" type="number" value={newQuiz.thoi_gian_lam_bai} onChange={(e) => setNewQuiz({ ...newQuiz, thoi_gian_lam_bai: parseInt(e.target.value) })} />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Số lượt tối đa</label>
                        <input className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none text-sm font-bold text-slate-700" type="number" value={newQuiz.so_luot_lam_toi_da} onChange={(e) => setNewQuiz({ ...newQuiz, so_luot_lam_toi_da: parseInt(e.target.value) })} />
                      </div>
                    </div>
                    <div className="flex justify-end pt-2 gap-2">
                      <button onClick={() => setShowQuizForm(false)} className="px-5 py-2.5 rounded-xl font-bold text-xs text-slate-400 hover:bg-slate-50 transition-colors">Hủy</button>
                      <button onClick={handleCreateQuiz} disabled={creatingQuiz} className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl shadow-md hover:bg-indigo-500 transition-colors text-xs">
                        {creatingQuiz ? "Đang lưu..." : "Lưu bài thi"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {quizzes.length === 0 ? (
                <div className="text-center py-12 bg-white border border-slate-100 rounded-3xl text-slate-400 font-medium text-xs shadow-sm">
                  Chưa có bài kiểm tra nào trong khóa học.
                </div>
              ) : (
                <div className="space-y-4">
                  {quizzes.map((quiz) => (
                    <div key={quiz.id} className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
                      <div className="px-6 py-5 flex justify-between items-center bg-slate-50/50 border-b border-slate-100">
                        <div>
                          <h3 className="font-extrabold text-slate-700 text-sm flex items-center gap-2">
                            <i className="ph-fill ph-seal-question text-violet-500"></i> {quiz.tieu_de}
                          </h3>
                          <span className="text-[11px] font-bold text-slate-400 mt-1 block">
                            Điểm đạt: <strong className="text-slate-600">{quiz.diem_dat}</strong> • 
                            Thời gian: <strong className="text-slate-600">{quiz.thoi_gian_lam_bai ? `${quiz.thoi_gian_lam_bai} phút` : "Không giới hạn"}</strong> • 
                            Lượt thi: <strong className="text-slate-600">{quiz.so_luot_lam_toi_da}</strong>
                          </span>
                        </div>
                        <button
                          onClick={() => setShowQuestionForm(showQuestionForm === quiz.id ? null : quiz.id)}
                          className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl font-bold text-xs transition-colors flex items-center gap-1.5"
                        >
                          <i className="ph-bold ph-plus"></i> Thêm câu hỏi
                        </button>
                      </div>

                      {showQuestionForm === quiz.id && (
                        <div className="p-6 bg-white border-t border-slate-100 animate-scale-up">
                          <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">Câu hỏi *</label>
                          <input 
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/30 focus:border-indigo-500 focus:bg-white outline-none text-sm font-medium text-slate-800 mb-5 transition-all" 
                            value={newQuestion.noi_dung} 
                            onChange={(e) => setNewQuestion({ ...newQuestion, noi_dung: e.target.value })} 
                            placeholder="Nhập nội dung câu hỏi..." 
                          />
                          <div className="space-y-3 mb-6">
                            <label className="block text-xs font-black text-slate-500 uppercase tracking-wider">Các lựa chọn đáp án</label>
                            {newQuestion.options.map((opt, i) => (
                              <div key={i} className={`flex items-center gap-3 p-2 rounded-xl border transition-colors ${opt.is_correct ? 'border-emerald-500 bg-emerald-500/5' : 'border-slate-200 bg-white'}`}>
                                <input
                                  type="radio"
                                  name="correct"
                                  className="w-4.5 h-4.5 accent-emerald-500 ml-2 cursor-pointer"
                                  checked={opt.is_correct}
                                  onChange={() => {
                                    const opts = newQuestion.options.map((o, j) => ({ ...o, is_correct: j === i }));
                                    setNewQuestion({ ...newQuestion, options: opts });
                                  }}
                                />
                                <input 
                                  className="flex-1 px-3 py-2 rounded-lg bg-transparent border-none outline-none text-sm font-bold text-slate-700" 
                                  value={opt.text} 
                                  onChange={(e) => {
                                    const opts = [...newQuestion.options];
                                    opts[i] = { ...opts[i], text: e.target.value };
                                    setNewQuestion({ ...newQuestion, options: opts });
                                  }} 
                                  placeholder={`Nhập đáp án ${i + 1}...`} 
                                />
                              </div>
                            ))}
                            <p className="text-[10px] font-bold text-amber-500 flex items-center gap-1 mt-2">
                              <i className="ph-fill ph-warning-circle text-xs"></i> Đánh dấu radio button ở đáp án đúng!
                            </p>
                          </div>
                          <div className="flex gap-2 justify-end">
                            <button onClick={() => setShowQuestionForm(null)} className="px-5 py-2.5 rounded-xl font-bold text-xs text-slate-400 hover:bg-slate-50 transition-colors">Hủy</button>
                            <button 
                              onClick={() => handleCreateQuestion(quiz.id)} 
                              disabled={creatingQuestion} 
                              className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-xl shadow-md hover:bg-indigo-500 transition-colors text-xs"
                            >
                              {creatingQuestion ? "Đang xử lý..." : "Lưu câu hỏi"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ===== PREREQUISITES ===== */}
            <div className="mt-16 pt-10 border-t border-slate-100 animate-slide-up">
              <h2 className="text-sm font-black text-slate-500 uppercase tracking-wider flex items-center gap-2 mb-8">
                <i className="ph-fill ph-link text-indigo-600 text-base"></i> Khóa học tiên quyết (Prerequisites)
              </h2>

              {/* Form thêm điều kiện tiên quyết */}
              <div className="bg-white p-6 rounded-3xl border border-slate-100 mb-8 shadow-sm">
                <h3 className="font-extrabold text-sm text-slate-700 mb-4">Thêm khóa học làm điều kiện tiên quyết</h3>
                <div className="flex flex-col md:flex-row gap-4 items-end">
                  <div className="flex-1 w-full">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Chọn khóa học</label>
                    <select
                      value={selectedPrereqId}
                      onChange={(e) => setSelectedPrereqId(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none text-sm font-medium text-slate-700 bg-white"
                    >
                      <option value="">-- Chọn khóa học từ hệ thống --</option>
                      {allCourses
                        .filter(c => course && c.id !== course.id && !course.dieu_kien_tien_quyet?.some(p => p.ma_khoa_hoc_tien_quyet === c.id))
                        .map(c => (
                          <option key={c.id} value={c.id}>{c.tieu_de}</option>
                        ))
                      }
                    </select>
                  </div>
                  <button
                    onClick={handleAddPrereq}
                    disabled={addingPrereq || !selectedPrereqId}
                    className="w-full md:w-auto px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-md hover:bg-indigo-500 transition-colors text-xs disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    {addingPrereq ? "Đang thêm..." : "Liên kết điều kiện"}
                  </button>
                </div>
              </div>

              {/* Danh sách điều kiện tiên quyết đã gán */}
              {!course.dieu_kien_tien_quyet || course.dieu_kien_tien_quyet.length === 0 ? (
                <div className="text-center py-12 bg-white border border-slate-100 rounded-3xl text-slate-400 font-medium text-xs shadow-sm">
                  Chưa có điều kiện tiên quyết nào được thiết lập cho khóa học này.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {course.dieu_kien_tien_quyet.map((prereq) => (
                    <div key={prereq.id} className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                          <i className="ph-fill ph-book-open text-xl"></i>
                        </div>
                        <div>
                          <h4 className="font-extrabold text-slate-700 text-sm">{prereq.khoa_hoc_tien_quyet?.tieu_de}</h4>
                          <span className="text-[10px] font-bold text-slate-400">ID khóa học: {prereq.ma_khoa_hoc_tien_quyet}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeletePrereq(prereq.ma_khoa_hoc_tien_quyet)}
                        className="px-3 py-1.5 text-rose-500 hover:bg-rose-50 rounded-lg text-[10px] font-bold transition-all border border-rose-100 shrink-0"
                      >
                        Gỡ bỏ
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
