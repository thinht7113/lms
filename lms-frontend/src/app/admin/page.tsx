"use client";

import React, { useEffect, useState } from "react";
import { Activity, BookOpen, DollarSign, RefreshCw, ShoppingCart, TrendingUp, Users } from "lucide-react";
import { apiService } from "@/services/api";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface ChartDataPoint {
    name: string;
    revenue: number;
    students: number;
}

interface RecentActivityItem {
    id: number;
    hanh_dong: string;
    chi_tiet?: string;
    ngay_thuc_hien: string;
    nguoi_thuc_hien: string;
}

interface TopCourseItem {
    id: number;
    tieu_de: string;
    so_hoc_vien: number;
    doanh_thu: number;
}

interface PendingCourse {
    id: number;
    tieu_de: string;
    giang_vien: string;
    ngay_tao: string;
    loai: string;
}

interface PendingRefund {
    id: number;
    nguoi_yeu_cau: string;
    so_tien: number;
    ngay_yeu_cau: string;
}

interface AdminStats {
    total_users: number;
    total_courses: number;
    total_orders: number;
    total_revenue: number;
    instructor_revenue: number;
    platform_revenue: number;
    chart_data: ChartDataPoint[];
    recent_activities: RecentActivityItem[];
    top_courses: TopCourseItem[];
    pending_courses?: PendingCourse[];
    pending_refunds?: PendingRefund[];
}

const formatCurrency = (value: number) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value);

export default function AdminDashboardPage() {
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
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
    }, []);

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center">
                <RefreshCw className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    const chartData = stats?.chart_data || [];
    const recentActivities = stats?.recent_activities || [];
    const topCourses = stats?.top_courses || [];
    const totalChartRevenue = chartData.reduce((sum, item) => sum + item.revenue, 0);
    const maxRevenue = Math.max(1, ...(chartData.length ? chartData.map((item) => item.revenue) : [0]));

    const metricCards = [
        { label: "Tổng người dùng", value: stats?.total_users || 0, icon: Users, color: "text-blue-500", bg: "bg-blue-500/10" },
        { label: "Tổng khóa học", value: stats?.total_courses || 0, icon: BookOpen, color: "text-emerald-500", bg: "bg-emerald-500/10" },
        { label: "Đơn hàng", value: stats?.total_orders || 0, icon: ShoppingCart, color: "text-amber-500", bg: "bg-amber-500/10" },
        { label: "Tổng doanh thu", value: formatCurrency(stats?.total_revenue || 0), icon: DollarSign, color: "text-violet-500", bg: "bg-violet-500/10" },
        { label: "Doanh thu Giảng viên (70%)", value: formatCurrency(stats?.instructor_revenue || 0), icon: DollarSign, color: "text-rose-500", bg: "bg-rose-500/10" },
        { label: "Lợi nhuận Hệ thống (30%)", value: formatCurrency(stats?.platform_revenue || 0), icon: TrendingUp, color: "text-indigo-500", bg: "bg-indigo-500/10" },
    ];

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h2 className="text-2xl font-black tracking-tight text-foreground">Bảng điều khiển quản trị viên</h2>
                <p className="mt-1 text-muted-foreground">Số liệu thực tế được cập nhật trực tiếp từ cơ sở dữ liệu.</p>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                {metricCards.map((stat) => (
                    <div key={stat.label} className="rounded-[1.5rem] border border-border/60 bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
                        <div className="flex items-start justify-between">
                            <div className="space-y-2">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{stat.label}</p>
                                <p className="text-2xl font-black text-foreground">{stat.value}</p>
                            </div>
                            <div className={`rounded-2xl p-3 ${stat.bg} ${stat.color}`}>
                                <stat.icon className="h-6 w-6" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                <div className="flex min-h-[560px] flex-col rounded-[2rem] border border-border/60 bg-card p-8 shadow-sm lg:col-span-2">
                    <div className="mb-6 flex items-center justify-between border-b border-border/40 pb-4">
                        <h3 className="flex items-center gap-2 text-lg font-black text-foreground">
                            <TrendingUp className="h-5 w-5 text-primary" />
                            <span>Doanh thu 6 tháng gần nhất</span>
                        </h3>
                    </div>

                    {chartData.length > 0 ? (
                        <div className="space-y-10">
                            <div className="grid grid-cols-3 gap-4 rounded-2xl bg-secondary/40 p-4">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Tổng kỳ</p>
                                    <p className="mt-1 text-lg font-black text-foreground">{formatCurrency(totalChartRevenue)}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Đỉnh doanh thu</p>
                                    <p className="mt-1 text-lg font-black text-primary">{formatCurrency(maxRevenue)}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Số tháng</p>
                                    <p className="mt-1 text-lg font-black text-foreground">{chartData.length}</p>
                                </div>
                            </div>

                            <div className="h-[360px] w-full pt-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart
                                        data={chartData}
                                        margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                                    >
                                        <defs>
                                            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                        <XAxis 
                                            dataKey="name" 
                                            axisLine={false} 
                                            tickLine={false} 
                                            tick={{ fill: '#64748b', fontSize: 12, fontWeight: 700 }}
                                            dy={10}
                                        />
                                        <YAxis 
                                            axisLine={false} 
                                            tickLine={false} 
                                            tickFormatter={(value) => value === 0 ? "0 đ" : (value >= 1000000 ? (value / 1000000).toFixed(1) + "M" : (value / 1000).toFixed(0) + "K")}
                                            tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }}
                                            width={60}
                                        />
                                        <Tooltip 
                                            formatter={(value: any) => [formatCurrency(value as number), "Doanh thu"]}
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)', fontWeight: 700, padding: '12px' }}
                                            itemStyle={{ fontWeight: 800, color: '#3b82f6' }}
                                        />
                                        <Area 
                                            type="monotone" 
                                            dataKey="revenue" 
                                            stroke="#3b82f6" 
                                            strokeWidth={4}
                                            fillOpacity={1} 
                                            fill="url(#colorRevenue)" 
                                            activeDot={{ r: 6, strokeWidth: 0, fill: '#3b82f6' }}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    ) : (
                        <div className="flex h-64 w-full items-center justify-center rounded-2xl border border-dashed border-border/60 text-xs font-bold text-muted-foreground">
                            Chưa có dữ liệu doanh thu để hiển thị biểu đồ.
                        </div>
                    )}
                </div>

                <div className="flex min-h-[430px] flex-col rounded-[2rem] border border-border/60 bg-card p-8 shadow-sm">
                    <div className="mb-6 flex items-center space-x-2 border-b border-border/40 pb-4">
                        <Activity className="h-5 w-5 text-primary" />
                        <h3 className="text-lg font-black text-foreground">Hoạt động gần đây</h3>
                    </div>

                    <div className="custom-scrollbar flex-grow space-y-6 overflow-y-auto pr-2">
                        {recentActivities.length > 0 ? (
                            recentActivities.map((act, idx) => (
                                <div key={act.id || idx} className="relative flex gap-4">
                                    {idx !== recentActivities.length - 1 && (
                                        <div className="absolute bottom-[-1.5rem] left-4 top-10 w-px bg-border/60" />
                                    )}
                                    <div className="z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-card bg-secondary">
                                        <div className="h-2 w-2 rounded-full bg-primary" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs font-bold leading-tight text-foreground">
                                            {act.nguoi_thuc_hien} <span className="font-medium text-muted-foreground">đã</span> {act.hanh_dong}
                                        </p>
                                        <p className="text-xs text-muted-foreground">{act.chi_tiet}</p>
                                        <p className="text-[10px] text-muted-foreground/60">{new Date(act.ngay_thuc_hien).toLocaleString("vi-VN")}</p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="rounded-xl border border-dashed border-border/60 py-10 text-center text-xs font-medium text-muted-foreground">
                                Chưa có ghi nhận hoạt động nào.
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                <div className="rounded-[2rem] border border-border/60 bg-card p-8 shadow-sm">
                    <div className="mb-6 flex items-center space-x-2 border-b border-border/40 pb-4">
                        <BookOpen className="h-5 w-5 text-primary" />
                        <h3 className="text-lg font-black text-foreground">Khóa học bán chạy nhất</h3>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full whitespace-nowrap text-left text-sm">
                            <thead className="bg-secondary/50 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                <tr>
                                    <th className="rounded-tl-xl px-4 py-3">Xếp hạng</th>
                                    <th className="px-4 py-3">Tên khóa học</th>
                                    <th className="px-4 py-3">Học viên</th>
                                    <th className="rounded-tr-xl px-4 py-3 text-right">Doanh thu</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/40">
                                {topCourses.length > 0 ? (
                                    topCourses.map((course, idx) => (
                                        <tr key={course.id || idx} className="transition-colors hover:bg-secondary/30">
                                            <td className="px-4 py-4 font-black text-primary">#{idx + 1}</td>
                                            <td className="px-4 py-4 font-bold text-foreground truncate max-w-[200px]" title={course.tieu_de}>{course.tieu_de}</td>
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

                <div className="rounded-[2rem] border border-border/60 bg-card p-8 shadow-sm">
                    <div className="mb-6 flex items-center space-x-2 border-b border-border/40 pb-4">
                        <div className="flex items-center justify-center w-5 h-5 rounded-full bg-amber-100">
                            <Activity className="h-3 w-3 text-amber-600" />
                        </div>
                        <h3 className="text-lg font-black text-foreground">Hàng chờ phê duyệt</h3>
                        {stats?.pending_courses && stats.pending_courses.length > 0 && (
                            <span className="ml-2 inline-flex items-center justify-center rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-600">
                                {stats.pending_courses.length}
                            </span>
                        )}
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full whitespace-nowrap text-left text-sm">
                            <thead className="bg-secondary/50 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                <tr>
                                    <th className="rounded-tl-xl px-4 py-3">Loại</th>
                                    <th className="px-4 py-3">Tiêu đề</th>
                                    <th className="px-4 py-3">Người tạo</th>
                                    <th className="rounded-tr-xl px-4 py-3 text-right">Hành động</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/40">
                                {stats?.pending_courses && stats.pending_courses.length > 0 ? (
                                    stats.pending_courses.map((item, idx) => (
                                        <tr key={`${item.loai}-${item.id}`} className="transition-colors hover:bg-secondary/30">
                                            <td className="px-4 py-4">
                                                <span className={`inline-flex items-center rounded-lg px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${item.loai === "course" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"}`}>
                                                    {item.loai === "course" ? "Khóa học" : "Bài học"}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 font-bold text-foreground truncate max-w-[150px]" title={item.tieu_de}>{item.tieu_de}</td>
                                            <td className="px-4 py-4 text-xs text-muted-foreground">{item.giang_vien}</td>
                                            <td className="px-4 py-4 text-right">
                                                <a href="/admin/moderation" className="text-xs font-black text-primary hover:underline">
                                                    Kiểm duyệt
                                                </a>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={4} className="px-4 py-8 text-center text-xs text-muted-foreground">
                                            Hiện tại không có mục nào chờ phê duyệt.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Yêu cầu hoàn tiền */}
            <div className="rounded-[2rem] border border-border/60 bg-card p-8 shadow-sm">
                <div className="mb-6 flex items-center space-x-2 border-b border-border/40 pb-4">
                    <div className="flex items-center justify-center w-5 h-5 rounded-full bg-rose-100">
                        <DollarSign className="h-3 w-3 text-rose-600" />
                    </div>
                    <h3 className="text-lg font-black text-foreground">Yêu cầu hoàn tiền chờ xử lý</h3>
                    {stats?.pending_refunds && stats.pending_refunds.length > 0 && (
                        <span className="ml-2 inline-flex items-center justify-center rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-600">
                            {stats.pending_refunds.length}
                        </span>
                    )}
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full whitespace-nowrap text-left text-sm">
                        <thead className="bg-secondary/50 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                            <tr>
                                <th className="rounded-tl-xl px-4 py-3">Mã ĐH</th>
                                <th className="px-4 py-3">Người yêu cầu</th>
                                <th className="px-4 py-3">Số tiền</th>
                                <th className="px-4 py-3">Ngày yêu cầu</th>
                                <th className="rounded-tr-xl px-4 py-3 text-right">Hành động</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/40">
                            {stats?.pending_refunds && stats.pending_refunds.length > 0 ? (
                                stats.pending_refunds.map((item, idx) => (
                                    <tr key={`refund-${item.id}`} className="transition-colors hover:bg-secondary/30">
                                        <td className="px-4 py-4 font-black text-primary">#{item.id}</td>
                                        <td className="px-4 py-4 font-bold text-foreground">{item.nguoi_yeu_cau}</td>
                                        <td className="px-4 py-4 text-rose-600 font-bold">{formatCurrency(item.so_tien)}</td>
                                        <td className="px-4 py-4 text-xs text-muted-foreground">{new Date(item.ngay_yeu_cau).toLocaleDateString("vi-VN")}</td>
                                        <td className="px-4 py-4 text-right">
                                            <a href="/admin/orders" className="text-xs font-black text-primary hover:underline">
                                                Xử lý
                                            </a>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-4 py-8 text-center text-xs text-muted-foreground">
                                        Không có yêu cầu hoàn tiền nào đang chờ.
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
