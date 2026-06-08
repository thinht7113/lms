"use client";

import React, { useState, useEffect } from "react";
import { Star, RefreshCw, MessageSquare, Quote, BookOpen } from "lucide-react";
import { apiService } from "@/services/api";
import { useToast } from "@/contexts/ToastContext";

export default function InstructorReviewsPage() {
    const toast = useToast();
    const [reviews, setReviews] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchReviews = async () => {
            try {
                const data = await apiService.getInstructorStudioReviews();
                setReviews(data);
            } catch (err: any) {
                toast.error(err.message || "Không thể tải đánh giá");
            } finally {
                setIsLoading(false);
            }
        };
        fetchReviews();
    }, []);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <RefreshCw className="w-8 h-8 animate-spin text-purple-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">Đánh giá & Phản hồi</h1>
                <p className="text-sm font-medium text-slate-500">Lắng nghe ý kiến của học viên để cải thiện chất lượng bài giảng.</p>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {reviews.length > 0 ? (
                    reviews.map((r) => (
                        <div key={r.id} className="bg-white border border-slate-200 rounded-[2rem] p-6 md:p-8 shadow-sm hover:shadow-md transition-all">
                            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                                <div className="flex gap-4 flex-1">
                                    <div className="w-12 h-12 rounded-2xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200 shadow-inner">
                                        <img 
                                            src={r.nguoi_dung?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${r.nguoi_dung?.ho_ten}`} 
                                            alt={r.nguoi_dung?.ho_ten} 
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <div className="space-y-1 flex-1">
                                        <div className="flex items-center justify-between">
                                            <h3 className="font-bold text-slate-950 text-base">{r.nguoi_dung?.ho_ten}</h3>
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                                                {new Date(r.ngay_tao).toLocaleDateString('vi-VN')}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1.5 py-1">
                                            {[...Array(5)].map((_, i) => (
                                                <Star key={i} className={`w-3.5 h-3.5 ${i < r.so_sao ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} />
                                            ))}
                                            <span className="ml-2 text-xs font-black text-slate-900">{r.so_sao}.0</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-[11px] font-bold text-purple-600 bg-purple-50 w-fit px-2.5 py-1 rounded-lg border border-purple-100 mt-2">
                                            <BookOpen className="w-3 h-3" />
                                            <span>Khóa học: {r.khoa_hoc?.tieu_de}</span>
                                        </div>
                                        <div className="pt-4 relative">
                                            <Quote className="w-8 h-8 text-slate-100 absolute -top-1 -left-2 -z-0" />
                                            <p className="text-sm text-slate-600 leading-relaxed font-medium relative z-10 pl-2">
                                                {r.binh_luan || "Học viên này không để lại bình luận văn bản."}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="flex md:flex-col gap-2">
                                    <button className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-950 text-white text-xs font-black uppercase tracking-widest hover:bg-purple-600 transition-all">
                                        <MessageSquare className="w-3.5 h-3.5" />
                                        Phản hồi
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="bg-white border border-slate-200 rounded-[2.5rem] py-20 text-center text-slate-400 shadow-sm">
                        <Star className="w-16 h-16 mx-auto mb-4 opacity-10" />
                        <p className="text-sm font-bold">Chưa có đánh giá nào từ học viên</p>
                        <p className="text-xs font-medium mt-1">Hãy tạo thêm nội dung chất lượng để nhận được phản hồi!</p>
                    </div>
                )}
            </div>
        </div>
    );
}
