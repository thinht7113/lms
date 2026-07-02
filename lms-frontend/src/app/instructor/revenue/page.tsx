"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BarChart3, RefreshCw, TrendingUp, CreditCard, Wallet, ArrowUpRight, Receipt, Calendar, BookOpen } from "lucide-react";
import { apiService } from "@/services/api";
import { useToast } from "@/contexts/ToastContext";

export default function InstructorRevenuePage() {
    const router = useRouter();
    const toast = useToast();
    const [stats, setStats] = useState<any>(null);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [statsData, txData] = await Promise.all([
                    apiService.getInstructorStudioStats(),
                    apiService.getInstructorStudioTransactions()
                ]);
                setStats(statsData);
                setTransactions(txData);
            } catch (err: any) {
                toast.error(err.message || "Không thể tải dữ liệu doanh thu");
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [toast]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <RefreshCw className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    const cards = [
        { 
            title: "Tổng doanh thu", 
            value: `${(stats?.total_revenue || 0).toLocaleString('vi-VN')} đ`, 
            icon: Wallet, 
            color: "text-primary", 
            bg: "bg-primary/10",
            desc: "Tổng số tiền tích lũy từ trước đến nay"
        },
        { 
            title: "Doanh thu tháng này", 
            value: `${(stats?.revenue_this_month || 0).toLocaleString('vi-VN')} đ`, 
            icon: TrendingUp, 
            color: "text-emerald-600", 
            bg: "bg-emerald-50",
            desc: "Tính từ đầu tháng đến hiện tại"
        },
        { 
            title: "Số dư khả dụng", 
            value: `${((stats?.total_revenue || 0) * 0.7).toLocaleString('vi-VN')} đ`, 
            icon: CreditCard, 
            color: "text-blue-600", 
            bg: "bg-blue-50",
            desc: "Sau khi trừ phí nền tảng (30%)"
        },
    ];

    return (
        <div className="space-y-10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">Quản lý doanh thu</h1>
                    <p className="text-sm font-medium text-slate-500">Theo dõi dòng tiền và yêu cầu quyết toán thu nhập của bạn.</p>
                </div>
                <button 
                    onClick={() => router.push('/instructor/revenue/withdraw')}
                    className="w-fit inline-flex items-center gap-2 bg-primary hover:bg-primary/95 text-white px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-lg shadow-blue-200"
                >
                    <ArrowUpRight className="w-4 h-4" /> Rút tiền
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {cards.map((card, idx) => {
                    const Icon = card.icon;
                    return (
                        <div key={idx} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between mb-4">
                                <div className={`p-3 rounded-2xl ${card.bg} ${card.color}`}>
                                    <Icon className="w-6 h-6" />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Live</span>
                            </div>
                            <h3 className="text-sm font-bold text-slate-500 mb-1">{card.title}</h3>
                            <p className="text-2xl font-black text-slate-900">{card.value}</p>
                            <p className="mt-4 text-xs font-medium text-slate-400 leading-relaxed">{card.desc}</p>
                        </div>
                    );
                })}
            </div>
            
            <div className="bg-white border border-slate-200 rounded-[2rem] p-8 overflow-hidden shadow-sm">
                <h3 className="text-lg font-black text-slate-900 mb-6">Lịch sử đơn hàng</h3>
                {transactions.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                        <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p className="text-sm font-medium">Bạn chưa có giao dịch nào được thực hiện.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Mã Đơn</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Khóa học</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Học viên</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Số tiền (VNĐ)</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Thời gian</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {transactions.map((tx, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <Receipt className="w-4 h-4 text-slate-400" />
                                                <span className="font-bold text-slate-700 text-sm">#{tx.order_id}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 max-w-[200px] truncate">
                                            <div className="flex items-center gap-2 text-slate-700">
                                                <BookOpen className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                                                <span className="text-sm font-medium truncate" title={tx.course_title}>{tx.course_title}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-bold text-slate-900">
                                            {tx.student_name}
                                        </td>
                                        <td className="px-6 py-4 text-sm font-black text-emerald-600">
                                            +{tx.amount.toLocaleString('vi-VN')} đ
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-slate-500">
                                                <Calendar className="w-3.5 h-3.5" />
                                                <span className="text-xs">{new Date(tx.date).toLocaleDateString('vi-VN')} - {new Date(tx.date).toLocaleTimeString('vi-VN')}</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
