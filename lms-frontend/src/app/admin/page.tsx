"use client";

import React, { useEffect, useState } from "react";
import { Activity, BookOpen, DollarSign, RefreshCw, ShoppingCart, TrendingUp, Users } from "lucide-react";
import { apiService } from "@/services/api";

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

interface AdminStats {
    total_users: number;
    total_courses: number;
    total_orders: number;
    total_revenue: number;
    chart_data: ChartDataPoint[];
    recent_activities: RecentActivityItem[];
    top_courses: TopCourseItem[];
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

    const chartWidth = 760;
    const chartHeight = 360;
    const chartPadding = { top: 58, right: 28, bottom: 54, left: 72 };
    const chartInnerWidth = chartWidth - chartPadding.left - chartPadding.right;
    const chartInnerHeight = chartHeight - chartPadding.top - chartPadding.bottom;
    const chartBaseY = chartPadding.top + chartInnerHeight;
    const chartPoints = chartData.map((item, index) => {
        const x = chartData.length === 1
            ? chartPadding.left + chartInnerWidth / 2
            : chartPadding.left + (index / (chartData.length - 1)) * chartInnerWidth;
        const y = chartPadding.top + (1 - item.revenue / maxRevenue) * chartInnerHeight;
        return { ...item, x, y };
    });
    const linePath = chartPoints.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
    const areaPath = chartPoints.length
        ? `M ${chartPoints[0].x} ${chartBaseY} ${chartPoints.map((point) => `L ${point.x} ${point.y}`).join(" ")} L ${chartPoints[chartPoints.length - 1].x} ${chartBaseY} Z`
        : "";
    const yAxisTicks = [1, 0.5, 0];

    const metricCards = [
        { label: "Tổng người dùng", value: stats?.total_users || 0, icon: Users, color: "text-blue-500", bg: "bg-blue-500/10" },
        { label: "Tổng khóa học", value: stats?.total_courses || 0, icon: BookOpen, color: "text-emerald-500", bg: "bg-emerald-500/10" },
        { label: "Đơn hàng", value: stats?.total_orders || 0, icon: ShoppingCart, color: "text-amber-500", bg: "bg-amber-500/10" },
        { label: "Tổng doanh thu", value: formatCurrency(stats?.total_revenue || 0), icon: DollarSign, color: "text-violet-500", bg: "bg-violet-500/10" },
    ];

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h2 className="text-2xl font-black tracking-tight text-foreground">Bảng điều khiển quản trị viên</h2>
                <p className="mt-1 text-muted-foreground">Số liệu thực tế được cập nhật trực tiếp từ cơ sở dữ liệu.</p>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
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

                            <div className="overflow-x-auto pt-4">
                                <svg
                                    viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                                    role="img"
                                    aria-label="Biểu đồ đường doanh thu 6 tháng gần nhất"
                                    className="min-w-[680px] w-full"
                                >
                                    <defs>
                                        <linearGradient id="revenueLineFill" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="rgb(37 99 235)" stopOpacity="0.22" />
                                            <stop offset="100%" stopColor="rgb(37 99 235)" stopOpacity="0.02" />
                                        </linearGradient>
                                    </defs>

                                    {yAxisTicks.map((tick) => {
                                        const y = chartPadding.top + (1 - tick) * chartInnerHeight;
                                        return (
                                            <g key={tick}>
                                                <line
                                                    x1={chartPadding.left}
                                                    y1={y}
                                                    x2={chartWidth - chartPadding.right}
                                                    y2={y}
                                                    stroke="rgb(226 232 240)"
                                                    strokeDasharray={tick === 0 ? "0" : "5 5"}
                                                />
                                                <text x={chartPadding.left - 12} y={y + 4} textAnchor="end" className="fill-slate-400 text-[11px] font-bold">
                                                    {formatCurrency(maxRevenue * tick)}
                                                </text>
                                            </g>
                                        );
                                    })}

                                    {areaPath && <path d={areaPath} fill="url(#revenueLineFill)" />}
                                    {linePath && (
                                        <path
                                            d={linePath}
                                            fill="none"
                                            stroke="rgb(37 99 235)"
                                            strokeWidth="4"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    )}

                                    {chartPoints.map((point) => (
                                        <g key={point.name}>
                                            <line x1={point.x} y1={chartPadding.top} x2={point.x} y2={chartBaseY} stroke="rgb(241 245 249)" />
                                            <circle cx={point.x} cy={point.y} r="6" fill="white" stroke="rgb(37 99 235)" strokeWidth="4">
                                                <title>{`${point.name}: ${formatCurrency(point.revenue)} - ${point.students} học viên mới`}</title>
                                            </circle>
                                            <text x={point.x} y={chartBaseY + 28} textAnchor="middle" className="fill-slate-500 text-[12px] font-black">
                                                {point.name}
                                            </text>
                                        </g>
                                    ))}
                                </svg>
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
                                <th className="px-4 py-3">Số học viên đã mua</th>
                                <th className="rounded-tr-xl px-4 py-3 text-right">Doanh thu mang lại</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/40">
                            {topCourses.length > 0 ? (
                                topCourses.map((course, idx) => (
                                    <tr key={course.id || idx} className="transition-colors hover:bg-secondary/30">
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
