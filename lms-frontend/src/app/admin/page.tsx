"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/context/user-context";
import { apiFetch, formatPrice } from "@/lib/api";
import Link from "next/link";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar
} from "recharts";

interface ChartDataPoint {
  name: string;
  revenue: number;
  students: number;
}

interface PendingCourse {
  id: number;
  tieu_de: string;
  giang_vien: string;
}

interface TopCourse {
  id: number;
  tieu_de: string;
  so_hoc_vien: number;
  doanh_thu: number;
}

interface RecentActivity {
  id: number;
  hanh_dong: string;
  chi_tiet: string | null;
  ngay_thuc_hien: string;
  nguoi_thuc_hien: string;
}

interface SystemStats {
  total_users: number;
  total_students: number;
  total_instructors: number;
  total_courses: number;
  total_orders: number;
  total_revenue: number;
  revenue_this_month: number;
  completion_rate: number;
  chart_data: ChartDataPoint[];
  pending_courses: PendingCourse[];
  top_courses: TopCourse[];
  recent_activities: RecentActivity[];
}

// Hàm format tooltip biểu đồ
const formatTooltipPrice = (value: number) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0
  }).format(value);
};

export default function AdminDashboardPage() {
  const { role, token, isAuthenticated, user, isLoading } = useUser();
  const router = useRouter();
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;

    if (role !== "admin") {
      router.push("/");
      return;
    }

    const loadStats = async () => {
      setLoading(true);
      try {
        const res = await apiFetch("/admin/stats", token);
        if (res.ok) {
          setStats(await res.json());
        } else {
          setError("Không thể tải thống kê. Vui lòng kiểm tra quyền truy cập.");
        }
      } catch (err) {
        setError("Lỗi kết nối đến máy chủ.");
      }
      setLoading(false);
    };

    loadStats();
  }, [token, role, isAuthenticated, router]);

  if (isLoading || loading) {
    return (
      <div className="flex justify-center items-center min-h-[70vh] text-on-surface-variant">
        <i className="ph ph-spinner-gap animate-spin text-4xl text-primary"></i>
      </div>
    );
  }

  if (!isAuthenticated || role !== "admin") {
    return null; // Đã xử lý redirect ở Layout
  }

  if (error) {
    return (
      <div className="glass-panel border-l-4 border-l-error p-6 rounded-2xl bg-error-container/10">
        <p className="text-error font-medium">{error}</p>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="animate-slide-up space-y-8">
      {/* Row 1: KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* KPI 1 */}
        <div className="glass-panel p-6 rounded-3xl border border-outline-variant relative overflow-hidden group hover:border-primary/50 transition-colors">
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div>
              <p className="text-sm font-semibold text-on-surface-variant uppercase tracking-wider mb-1">Tổng học viên</p>
              <h3 className="text-3xl font-black text-on-surface">{stats.total_students.toLocaleString()}</h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-primary-container text-primary flex items-center justify-center">
              <i className="ph-bold ph-graduation-cap text-2xl"></i>
            </div>
          </div>
          <p className="text-sm text-success font-medium flex items-center gap-1.5 relative z-10">
            <i className="ph-bold ph-trend-up"></i> +12% so với tháng trước
          </p>
          <div className="absolute -right-6 -bottom-6 text-primary/5 text-9xl group-hover:scale-110 transition-transform">
            <i className="ph-fill ph-users-three"></i>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="glass-panel p-6 rounded-3xl border border-outline-variant relative overflow-hidden group hover:border-secondary/50 transition-colors">
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div>
              <p className="text-sm font-semibold text-on-surface-variant uppercase tracking-wider mb-1">Tổng khóa học</p>
              <h3 className="text-3xl font-black text-on-surface">{stats.total_courses.toLocaleString()}</h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-secondary-container text-secondary flex items-center justify-center">
              <i className="ph-bold ph-books text-2xl"></i>
            </div>
          </div>
          <p className="text-sm text-on-surface-variant font-medium flex items-center gap-1.5 relative z-10">
            <i className="ph-bold ph-chalkboard-teacher"></i> {stats.total_instructors} Giảng viên
          </p>
          <div className="absolute -right-6 -bottom-6 text-secondary/5 text-9xl group-hover:scale-110 transition-transform">
            <i className="ph-fill ph-book-open-text"></i>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="glass-panel p-6 rounded-3xl border border-outline-variant relative overflow-hidden group hover:border-success/50 transition-colors">
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div>
              <p className="text-sm font-semibold text-on-surface-variant uppercase tracking-wider mb-1">Doanh thu tháng</p>
              <h3 className="text-3xl font-black text-on-surface">{formatPrice(stats.revenue_this_month)}</h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-success/20 text-success flex items-center justify-center">
              <i className="ph-bold ph-currency-circle-dollar text-2xl"></i>
            </div>
          </div>
          <p className="text-sm text-on-surface-variant font-medium flex items-center gap-1.5 relative z-10">
            <i className="ph-bold ph-chart-bar text-success"></i> Từ {stats.total_orders} đơn hàng
          </p>
          <div className="absolute -right-6 -bottom-6 text-success/10 text-9xl group-hover:scale-110 transition-transform">
            <i className="ph-fill ph-chart-line-up"></i>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="glass-panel p-6 rounded-3xl border border-outline-variant relative overflow-hidden group hover:border-tertiary/50 transition-colors">
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div>
              <p className="text-sm font-semibold text-on-surface-variant uppercase tracking-wider mb-1">Tỷ lệ hoàn thành</p>
              <h3 className="text-3xl font-black text-on-surface">{stats.completion_rate}%</h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-tertiary-container text-tertiary flex items-center justify-center">
              <i className="ph-bold ph-target text-2xl"></i>
            </div>
          </div>
          <div className="w-full bg-surface-container-highest rounded-full h-2.5 mb-1 relative z-10 mt-3">
            <div className="bg-tertiary h-2.5 rounded-full" style={{ width: `${stats.completion_rate}%` }}></div>
          </div>
          <div className="absolute -right-6 -bottom-6 text-tertiary/5 text-9xl group-hover:scale-110 transition-transform">
            <i className="ph-fill ph-medal"></i>
          </div>
        </div>
      </div>

      {/* Row 2: Charts and Pending */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-3xl border border-outline-variant">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-on-surface flex items-center gap-2">
              <i className="ph-fill ph-chart-line-up text-primary"></i> Biểu đồ Tăng trưởng Doanh thu
            </h2>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.chart_data} margin={{ top: 10, right: 10, left: 20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4ade80" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#4ade80" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value / 1000000}tr`} />
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <Tooltip
                  formatter={(value: any) => [formatTooltipPrice(value as number), "Doanh thu"]}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#22c55e" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pending Courses */}
        <div className="glass-panel p-6 rounded-3xl border border-outline-variant flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-on-surface flex items-center gap-2">
              <i className="ph-fill ph-clock-countdown text-secondary"></i> Chờ phê duyệt
            </h2>
            <Link href="/admin/courses" className="text-sm font-semibold text-primary hover:underline">
              Xem tất cả
            </Link>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 space-y-4">
            {stats.pending_courses.length > 0 ? (
              stats.pending_courses.map((course) => (
                <Link key={course.id} href={`/admin/courses/${course.id}`} className="block p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/50 flex flex-col gap-2 hover:border-primary/50 transition-colors cursor-pointer group">
                  <div className="flex justify-between items-start gap-2">
                    <h3 className="font-bold text-on-surface line-clamp-2 text-sm group-hover:text-primary transition-colors">{course.tieu_de}</h3>
                    <span className="shrink-0 px-2 py-0.5 bg-amber-500/10 text-amber-600 border border-amber-500/20 text-[10px] font-bold rounded uppercase">Chờ duyệt</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-on-surface-variant mt-1">
                    <i className="ph-fill ph-user-circle"></i> {course.giang_vien}
                  </div>
                </Link>
              ))
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-on-surface-variant opacity-70">
                <i className="ph-fill ph-check-circle text-4xl text-success mb-2"></i>
                <p>Không có khóa học nào chờ duyệt</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Row 3: Top Courses & Recent Logs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Courses */}
        <div className="glass-panel p-6 rounded-3xl border border-outline-variant">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-on-surface flex items-center gap-2">
              <i className="ph-fill ph-fire text-error"></i> Khóa học Nổi bật
            </h2>
          </div>
          <div className="space-y-4">
            {stats.top_courses.map((course, idx) => (
              <div key={course.id} className="flex items-center gap-4 p-3 rounded-2xl hover:bg-surface-container transition-colors">
                <div className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center font-black ${idx === 0 ? 'bg-[#FFD700] text-surface' : idx === 1 ? 'bg-[#C0C0C0] text-surface' : idx === 2 ? 'bg-[#CD7F32] text-surface' : 'bg-surface-container-highest text-on-surface-variant'}`}>
                  #{idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-on-surface truncate text-sm">{course.tieu_de}</h4>
                  <p className="text-xs text-on-surface-variant mt-0.5">{course.so_hoc_vien} học viên • {formatPrice(course.doanh_thu)}</p>
                </div>
                <Link href={`/courses/${course.id}`} className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors">
                  <i className="ph-bold ph-arrow-right"></i>
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activities */}
        <div className="glass-panel p-6 rounded-3xl border border-outline-variant">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-on-surface flex items-center gap-2">
              <i className="ph-fill ph-activity text-tertiary"></i> Hoạt động Gần đây
            </h2>
            <Link href="/admin/logs" className="text-sm font-semibold text-primary hover:underline">
              Lịch sử Logs
            </Link>
          </div>

          <div className="relative pl-6 border-l-2 border-outline-variant/30 space-y-6">
            {stats.recent_activities.map((act) => (
              <div key={act.id} className="relative">
                <div className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full bg-surface border-2 border-primary"></div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-on-surface text-sm">{act.nguoi_thuc_hien}</span>
                    <span className="text-xs text-on-surface-variant">
                      {format(new Date(act.ngay_thuc_hien), "HH:mm, dd/MM", { locale: vi })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-surface-container-highest text-on-surface-variant">
                      {act.hanh_dong}
                    </span>
                  </div>
                  <p className="text-sm text-on-surface-variant mt-1 line-clamp-2">
                    {act.chi_tiet}
                  </p>
                </div>
              </div>
            ))}

            {stats.recent_activities.length === 0 && (
              <div className="text-on-surface-variant italic text-sm py-4">Chưa có hoạt động nào được ghi nhận.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
