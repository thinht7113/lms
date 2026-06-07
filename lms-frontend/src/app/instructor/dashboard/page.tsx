"use client";

import React, { useEffect, useState } from "react";
import { Users, BookOpen, ShoppingCart, TrendingUp, PieChart, Star, PlayCircle } from "lucide-react";
import { tokenHelper } from "@/services/api";
import { useRouter } from "next/navigation";

export default function InstructorDashboardPage() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        const currentUser = tokenHelper.getCurrentUser();
        if (!currentUser || (currentUser.vai_tro !== 'instructor' && currentUser.vai_tro !== 'admin')) {
            router.push("/login");
        } else {
            setUser(currentUser);
        }
    }, [router]);

    const stats = [
        { label: "Tổng học viên", value: "850", icon: Users, color: "text-purple-600", bg: "bg-purple-600/10" },
        { label: "Khóa học đang mở", value: "5", icon: BookOpen, color: "text-indigo-500", bg: "bg-indigo-500/10" },
        { label: "Đánh giá trung bình", value: "4.8", icon: Star, color: "text-amber-500", bg: "bg-amber-500/10" },
        { label: "Doanh thu (tháng)", value: "32.5M đ", icon: TrendingUp, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    ];

    if (!user) return null;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h2 className="text-3xl font-black tracking-tight text-slate-900">Tổng quan Giảng viên</h2>
                <p className="text-slate-500 font-medium mt-1">Xin chào {user.ho_ten}, đây là tình hình hoạt động các khóa học của bạn!</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                {stats.map((stat, idx) => (
                    <div key={idx} className="bg-white border border-slate-200/60 rounded-[1.5rem] p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                        <div className={`absolute -right-6 -top-6 w-24 h-24 ${stat.bg} rounded-full blur-2xl opacity-50`} />
                        <div className="flex justify-between items-start relative z-10">
                            <div className="space-y-2">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
                                <p className="text-3xl font-black text-slate-800">{stat.value}</p>
                            </div>
                            <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color}`}>
                                <stat.icon className="h-6 w-6" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                 {/* Main Chart Area */}
                 <div className="lg:col-span-2 bg-white border border-slate-200/60 rounded-[2rem] p-8 shadow-sm flex flex-col min-h-[400px]">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
                        <h3 className="font-black text-lg text-slate-800 flex items-center gap-2">
                            <PieChart className="w-5 h-5 text-purple-600" />
                            <span>Phân tích Doanh thu</span>
                        </h3>
                        <select className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-600 outline-none">
                            <option>Tháng này</option>
                            <option>Tháng trước</option>
                            <option>Năm nay</option>
                        </select>
                    </div>
                    <div className="flex-grow flex items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                        <p className="text-slate-400 font-medium text-sm">Biểu đồ doanh thu đang được tích hợp...</p>
                    </div>
                 </div>

                 {/* Recent Activity / Next Steps */}
                 <div className="lg:col-span-1 bg-white border border-slate-200/60 rounded-[2rem] p-8 shadow-sm space-y-6">
                    <h3 className="font-black text-lg text-slate-800 border-b border-slate-100 pb-4">Công việc cần làm</h3>
                    
                    <div className="space-y-4">
                        <div className="flex gap-4 p-4 rounded-2xl bg-purple-50 border border-purple-100 items-start">
                            <div className="bg-purple-600/10 p-2 rounded-xl text-purple-600 shrink-0">
                                <PlayCircle className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="font-bold text-sm text-purple-900 leading-tight">Khóa "ReactJS Master" thiếu bài giảng</p>
                                <p className="text-xs text-purple-700/70 mt-1">Chương 3 đang trống nội dung video.</p>
                                <button className="mt-3 text-[10px] font-black uppercase tracking-widest text-purple-600 bg-white px-3 py-1.5 rounded-lg shadow-sm">Bổ sung ngay</button>
                            </div>
                        </div>

                        <div className="flex gap-4 p-4 rounded-2xl bg-amber-50 border border-amber-100 items-start">
                            <div className="bg-amber-500/10 p-2 rounded-xl text-amber-600 shrink-0">
                                <Users className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="font-bold text-sm text-amber-900 leading-tight">25 câu hỏi Q&A mới</p>
                                <p className="text-xs text-amber-700/70 mt-1">Học viên đang chờ bạn giải đáp thắc mắc.</p>
                                <button className="mt-3 text-[10px] font-black uppercase tracking-widest text-amber-600 bg-white px-3 py-1.5 rounded-lg shadow-sm">Trả lời ngay</button>
                            </div>
                        </div>
                    </div>
                 </div>
            </div>
        </div>
    );
}
