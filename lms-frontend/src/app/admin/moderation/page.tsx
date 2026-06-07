"use client";

import React, { useState, useEffect } from "react";
import { CheckCircle2, XCircle, Search, RefreshCw, Eye, AlertCircle, FileText } from "lucide-react";
import { tokenHelper, Course, apiService } from "@/services/api";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export default function ModerationPage() {
    const [pendingCourses, setPendingCourses] = useState<Course[]>([]);
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [rejectReason, setRejectReason] = useState("");
    const [showRejectForm, setShowRejectForm] = useState(false);

    const fetchPendingCourses = async () => {
        setIsLoading(true);
        try {
            // Note: The dynamic router can be filtered via searchParams
            // but we'll fetch all courses and filter for now if the API doesn't support complex filters directly.
            // Ideally, we have a custom endpoint or pass ?trang_thai_phe_duyet=pending
            const data = await apiService.getCourses({ limit: 100 }); 
            const pending = data.filter(c => c.trang_thai_phe_duyet === "pending" || c.trang_thai_phe_duyet === "draft"); // Show drafts too for demo if needed, but strict is pending
            setPendingCourses(pending);
            if (pending.length > 0 && !selectedCourse) {
                setSelectedCourse(pending[0]);
            } else if (pending.length === 0) {
                setSelectedCourse(null);
            }
        } catch (err) {
            console.error("Error fetching pending courses", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchPendingCourses();
    }, []);

    const handleApprove = async () => {
        if (!selectedCourse) return;
        if (!confirm("Bạn có chắc chắn phê duyệt khóa học này để xuất bản công khai?")) return;
        
        setActionLoading(true);
        try {
            const token = tokenHelper.getToken();
            const res = await fetch(`${API_BASE_URL}/admin/courses/${selectedCourse.id}/approve`, {
                method: "PUT",
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (!res.ok) throw new Error("Lỗi khi phê duyệt");
            
            alert("Phê duyệt thành công!");
            fetchPendingCourses();
        } catch (err: any) {
            alert(err.message || "Có lỗi xảy ra");
        } finally {
            setActionLoading(false);
        }
    };

    const handleReject = async () => {
        if (!selectedCourse) return;
        if (!rejectReason.trim()) {
            alert("Vui lòng nhập lý do từ chối để giảng viên khắc phục.");
            return;
        }
        
        setActionLoading(true);
        try {
            const token = tokenHelper.getToken();
            // Note: Our current backend API for reject might not take a reason parameter yet, 
            // but we simulate sending it.
            const res = await fetch(`${API_BASE_URL}/admin/courses/${selectedCourse.id}/reject`, {
                method: "PUT",
                headers: { 
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json" 
                },
                body: JSON.stringify({ reason: rejectReason })
            });
            if (!res.ok) throw new Error("Lỗi khi từ chối");
            
            alert("Đã từ chối khóa học.");
            setShowRejectForm(false);
            setRejectReason("");
            fetchPendingCourses();
        } catch (err: any) {
            alert(err.message || "Có lỗi xảy ra");
        } finally {
            setActionLoading(false);
        }
    };

    return (
        <div className="h-full flex flex-col md:flex-row gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Left Column: Pending List */}
            <div className="w-full md:w-1/3 flex flex-col bg-card border border-border/60 rounded-[2rem] shadow-sm overflow-hidden h-[calc(100vh-8rem)]">
                <div className="p-6 border-b border-border/40 bg-slate-50/50 flex justify-between items-center shrink-0">
                    <h2 className="text-lg font-black tracking-tight">Hàng chờ duyệt</h2>
                    <span className="bg-amber-500/10 text-amber-600 text-xs font-bold px-2.5 py-1 rounded-full border border-amber-500/20">
                        {pendingCourses.length} yêu cầu
                    </span>
                </div>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
                    {isLoading ? (
                        <div className="py-10 text-center text-muted-foreground flex flex-col items-center">
                            <RefreshCw className="w-6 h-6 animate-spin mb-2" />
                            <span className="text-xs font-bold">Đang tải...</span>
                        </div>
                    ) : pendingCourses.length === 0 ? (
                        <div className="py-10 text-center text-muted-foreground">
                            <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-500/50" />
                            <span className="text-sm font-medium">Tuyệt vời! Không còn khóa học nào cần duyệt.</span>
                        </div>
                    ) : (
                        pendingCourses.map(course => (
                            <button
                                key={course.id}
                                onClick={() => { setSelectedCourse(course); setShowRejectForm(false); }}
                                className={`w-full text-left p-4 rounded-2xl border transition-all ${
                                    selectedCourse?.id === course.id 
                                    ? "bg-primary/5 border-primary shadow-sm" 
                                    : "bg-background border-border/60 hover:border-primary/40 hover:bg-secondary/50"
                                }`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded-md">ID: {course.id}</span>
                                    <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">Pending</span>
                                </div>
                                <h3 className="font-bold text-sm text-foreground line-clamp-2 leading-snug mb-1">{course.tieu_de}</h3>
                                <p className="text-xs text-muted-foreground">GV ID: {course.ma_giang_vien}</p>
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* Right Column: Preview & Action */}
            <div className="w-full md:w-2/3 bg-card border border-border/60 rounded-[2rem] shadow-sm overflow-hidden flex flex-col h-[calc(100vh-8rem)]">
                {selectedCourse ? (
                    <>
                        <div className="p-6 border-b border-border/40 bg-slate-50/50 flex justify-between items-center shrink-0">
                            <h2 className="text-lg font-black tracking-tight flex items-center gap-2">
                                <Eye className="w-5 h-5 text-primary" />
                                Chi tiết xét duyệt
                            </h2>
                            <a 
                                href={`/courses/${selectedCourse.id}`} 
                                target="_blank" 
                                className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                            >
                                Xem trước trang <ExternalLinkIcon className="w-3 h-3" />
                            </a>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-10 space-y-8">
                            <div className="flex flex-col md:flex-row gap-6">
                                <div className="w-full md:w-1/3 aspect-video bg-slate-100 rounded-xl overflow-hidden shrink-0 border border-border/50">
                                    {selectedCourse.anh_dai_dien ? (
                                        <img src={selectedCourse.anh_dai_dien} alt="Thumbnail" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-muted-foreground/50">Không có ảnh</div>
                                    )}
                                </div>
                                <div className="space-y-3">
                                    <h1 className="text-2xl font-black text-foreground leading-tight">{selectedCourse.tieu_de}</h1>
                                    <p className="text-sm font-medium text-muted-foreground leading-relaxed">{selectedCourse.mo_ta}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                <div className="bg-secondary p-4 rounded-xl border border-border/60">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Giá bán</p>
                                    <p className="font-bold text-foreground">{Number(selectedCourse.gia_tien).toLocaleString()} đ</p>
                                </div>
                                <div className="bg-secondary p-4 rounded-xl border border-border/60">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Trình độ</p>
                                    <p className="font-bold text-foreground capitalize">{selectedCourse.trinh_do}</p>
                                </div>
                                <div className="bg-secondary p-4 rounded-xl border border-border/60">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Danh mục ID</p>
                                    <p className="font-bold text-foreground">{selectedCourse.ma_danh_muc}</p>
                                </div>
                                <div className="bg-secondary p-4 rounded-xl border border-border/60">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Cấu trúc</p>
                                    <p className="font-bold text-foreground">Click "Xem trước" để xem</p>
                                </div>
                            </div>

                            {/* Action Form */}
                            <div className="border-t border-border/60 pt-8 mt-4">
                                {!showRejectForm ? (
                                    <div className="flex gap-4">
                                        <button 
                                            onClick={handleApprove}
                                            disabled={actionLoading}
                                            className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-black py-3.5 rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
                                        >
                                            <CheckCircle2 className="w-5 h-5" />
                                            <span>Phê duyệt xuất bản</span>
                                        </button>
                                        <button 
                                            onClick={() => setShowRejectForm(true)}
                                            className="flex-1 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 font-black py-3.5 rounded-xl transition-all flex items-center justify-center gap-2"
                                        >
                                            <AlertCircle className="w-5 h-5" />
                                            <span>Từ chối & Yêu cầu sửa</span>
                                        </button>
                                    </div>
                                ) : (
                                    <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 space-y-4 animate-in fade-in slide-in-from-top-2">
                                        <h3 className="font-black text-rose-800 flex items-center gap-2">
                                            <FileText className="w-4 h-4" /> Ghi chú từ chối
                                        </h3>
                                        <textarea
                                            value={rejectReason}
                                            onChange={e => setRejectReason(e.target.value)}
                                            placeholder="Nêu rõ lý do từ chối (Ví dụ: Video bài 1 bị rè, mô tả chưa đủ chi tiết...)"
                                            rows={4}
                                            className="w-full bg-white border border-rose-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/30"
                                        />
                                        <div className="flex justify-end gap-3">
                                            <button 
                                                onClick={() => setShowRejectForm(false)}
                                                className="px-6 py-2 text-sm font-bold text-muted-foreground hover:bg-white rounded-lg transition-colors"
                                            >
                                                Hủy bỏ
                                            </button>
                                            <button 
                                                onClick={handleReject}
                                                disabled={actionLoading}
                                                className="px-6 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold rounded-lg shadow-md transition-all flex items-center gap-2"
                                            >
                                                <span>Xác nhận từ chối</span>
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground space-y-4">
                        <FileText className="w-16 h-16 opacity-20" />
                        <p className="font-medium text-sm">Chọn một khóa học bên trái để xem chi tiết</p>
                    </div>
                )}
            </div>
        </div>
    );
}

function ExternalLinkIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" x2="21" y1="14" y2="3" />
    </svg>
  );
}
