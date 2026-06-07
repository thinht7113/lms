"use client";

import React, { useEffect, useState } from "react";
import { Users, BookOpen, ShoppingCart, TrendingUp, DollarSign, Activity, RefreshCw } from "lucide-react";
import { apiService, tokenHelper } from "@/services/api";
import { useRouter } from "next/navigation";

export default function AdminDashboardPage() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const currentUser = tokenHelper.getCurrentUser();
        if (!currentUser || currentUser.vai_tro !== 'admin') {
            router.push("/login");
            return;
        }
        setUser(currentUser);

        async function fetchStats() {
            try {
                const data = await apiService.getAdminDashboardStats();
                setStats(data);
            } catch (err) {
                console.error("Failed to fetch dashboard stats", err);
            } finally {
                setLoading(false);
            }
        }
        fetchStats();
    }, [router]);

    if (!user || loading) {
        return (
            <div className="flex h-full items-center justify-center">
                <RefreshCw className="h-8 w-8 text-primary animate-spin" />
            </div>
        );
    }

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(val);
    };

    const metricCards = [
        { label: "Tổng người dùng", value: stats?.total_users || 0, icon: Users, color: "text-blue-500", bg: "bg-blue-500/10" },
        { label: "Tổng khóa học", value: stats?.total_courses || 0, icon: BookOpen, color: "text-emerald-500", bg: "bg-emerald-500/10" },
        { label: "Đơn hàng (Tất cả)", value: stats?.total_orders || 0, icon: ShoppingCart, color: "text-amber-500", bg: "bg-amber-500/10" },
        { label: "Tổng doanh thu", value: formatCurrency(stats?.total_revenue || 0), icon: DollarSign, color: "text-violet-500", bg: "bg-violet-500/10" },
    ];

    // Build a simple CSS Bar Chart
    const maxRev = Math.max(...(stats?.chart_data?.map((d: any) => d.revenue) || [1]));

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h2 className="text-2xl font-black tracking-tight text-foreground">Bảng điều khiển Quản trị viên</h2>
                <p className="text-muted-foreground mt-1">Số liệu thực tế được cập nhật trực tiếp từ cơ sở dữ liệu.</p>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                {metricCards.map((stat, idx) => (
                    <div key={idx} className="bg-card border border-border/60 rounded-[1.5rem] p-6 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start">
                            <div className="space-y-2">
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{stat.label}</p>
                                <p className="text-2xl font-black text-foreground">{stat.value}</p>
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
                 <div className="lg:col-span-2 bg-card border border-border/60 rounded-[2rem] p-8 shadow-sm flex flex-col min-h-[400px]">
                    <div className="flex items-center justify-between border-b border-border/40 pb-4 mb-6">
                        <h3 className="font-black text-lg text-foreground flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-primary" />
                            <span>Doanh thu 6 tháng gần nhất</span>
                        </h3>
                    </div>
                    
                    <div className="flex-grow flex items-end justify-around gap-2 h-64 mt-4">
                        {stats?.chart_data?.map((d: any, idx: number) => {
                            const heightPct = maxRev > 0 ? Math.max((d.revenue / maxRev) * 100, 2) : 2;
                            return (
                                <div key={idx} className="flex flex-col items-center gap-2 w-full group">
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-bold text-primary bg-primary/10 px-2 py-1 rounded">
                                        {formatCurrency(d.revenue)}
                                    </div>
                                    <div className="w-full max-w-[40px] bg-primary/10 rounded-t-lg relative flex items-end">
                                        <div 
                                            className="w-full bg-primary rounded-t-lg transition-all duration-1000"
                                            style={{ height: `${heightPct}%` }}
                                        />
                                    </div>
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase">{d.name}</span>
                                </div>
                            );
                        })}
                    </div>
                 </div>

                 {/* Recent Activity */}
                 <div className="lg:col-span-1 bg-card border border-border/60 rounded-[2rem] p-8 shadow-sm flex flex-col min-h-[400px]">
                    <div className="flex items-center space-x-2 border-b border-border/40 pb-4 mb-6">
                        <Activity className="h-5 w-5 text-primary" />
                        <h3 className="font-black text-lg text-foreground">Hoạt động gần đây</h3>
                    </div>
                    
                    <div className="space-y-6 flex-grow overflow-y-auto custom-scrollbar pr-2">
                        {stats?.recent_activities?.length > 0 ? (
                            stats.recent_activities.map((act: any, idx: number) => (
                                <div key={idx} className="flex gap-4 relative">
                                    {idx !== stats.recent_activities.length - 1 && (
                                        <div className="absolute left-4 top-10 bottom-[-1.5rem] w-px bg-border/60" />
                                    )}
                                    <div className="w-8 h-8 rounded-full bg-secondary border-2 border-card flex items-center justify-center shrink-0 z-10">
                                        <div className="w-2 h-2 rounded-full bg-primary" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs font-bold text-foreground leading-tight">
                                            {act.nguoi_thuc_hien} <span className="font-medium text-muted-foreground">đã</span> {act.hanh_dong}
                                        </p>
                                        <p className="text-xs text-muted-foreground">{act.chi_tiet}</p>
                                        <p className="text-[10px] text-muted-foreground/60">{new Date(act.ngay_thuc_hien).toLocaleString('vi-VN')}</p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-10 text-xs text-muted-foreground font-medium border border-dashed border-border/60 rounded-xl">
                                Chưa có ghi nhận hoạt động nào.
                            </div>
                        )}
                    </div>
                 </div>
            </div>

            {/* Top Courses */}
            <div className="bg-card border border-border/60 rounded-[2rem] p-8 shadow-sm">
                <div className="flex items-center space-x-2 border-b border-border/40 pb-4 mb-6">
                    <BookOpen className="h-5 w-5 text-primary" />
                    <h3 className="font-black text-lg text-foreground">Khóa học bán chạy nhất</h3>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-secondary/50 text-[10px] uppercase font-black text-muted-foreground tracking-widest">
                            <tr>
                                <th className="px-4 py-3 rounded-tl-xl">Xếp hạng</th>
                                <th className="px-4 py-3">Tên khóa học</th>
                                <th className="px-4 py-3">Số học viên (Đã mua)</th>
                                <th className="px-4 py-3 text-right rounded-tr-xl">Doanh thu mang lại</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/40">
                            {stats?.top_courses?.length > 0 ? (
                                stats.top_courses.map((course: any, idx: number) => (
                                    <tr key={idx} className="hover:bg-secondary/30 transition-colors">
                                        <td className="px-4 py-4 font-black text-primary">#{idx + 1}</td>
                                        <td className="px-4 py-4 font-bold text-foreground">{course.tieu_de}</td>
                                        <td className="px-4 py-4 text-muted-foreground">{course.so_hoc_vien}</td>
                                        <td className="px-4 py-4 text-right font-black text-emerald-600">
                                            {formatCurrency(course.doanh_thu)}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} className="px-4 py-8 text-center text-xs text-muted-foreground">
                                        Chưa có dữ liệu thống kê bán hàng.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
