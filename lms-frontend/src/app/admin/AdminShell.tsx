"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
    Award,
    BookOpen,
    CreditCard,
    FileText,
    Home,
    ImageIcon,
    Layers,
    LayoutDashboard,
    LogOut,
    Menu,
    Settings,
    ShoppingCart,
    Users,
    MessageSquare,
    Medal,
    DownloadCloud,
} from "lucide-react";
import { tokenHelper, apiService } from "@/services/api";
import SystemLogo from "@/components/SystemLogo";
import Breadcrumbs from "@/components/ui/Breadcrumbs";

const sidebarGroups = [
    {
        title: "Tổng quan",
        items: [
            { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
        ],
    },
    {
        title: "Tài khoản",
        items: [
            { name: "Người dùng", href: "/admin/users", icon: Users },
            { name: "Chứng chỉ", href: "/admin/certificates", icon: Medal },
        ],
    },
    {
        title: "Nội dung & Đào tạo",
        items: [
            { name: "Danh mục", href: "/admin/categories", icon: Layers },
            { name: "Banner trang chủ", href: "/admin/banners", icon: ImageIcon },
            { name: "Khóa học", href: "/admin/courses", icon: BookOpen },
            { name: "Nhập khóa học", href: "/admin/course-imports", icon: DownloadCloud },
            { name: "Ghi danh", href: "/admin/enrollments", icon: Award },
            { name: "Kiểm duyệt nội dung", href: "/admin/moderation", icon: FileText },
            { name: "Kiểm duyệt đánh giá", href: "/admin/reviews", icon: MessageSquare },
        ],
    },
    {
        title: "Thương mại",
        items: [
            { name: "Đơn hàng", href: "/admin/orders", icon: ShoppingCart },
            { name: "Mã giảm giá", href: "/admin/coupons", icon: CreditCard },
        ],
    },
    {
        title: "Hệ thống",
        items: [
            { name: "Cấu hình chung", href: "/admin/settings", icon: Settings },
            { name: "Nhật ký hệ thống (Audit)", href: "/admin/logs", icon: FileText },
        ],
    },
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const [isSidebarOpen, setSidebarOpen] = useState(true);
    const [pendingCount, setPendingCount] = useState(0);

    React.useEffect(() => {
        let isMounted = true;
        async function fetchPendingCounts() {
            try {
                const [courses, lessons] = await Promise.all([
                    apiService.getAdminCourses(),
                    apiService.getAdminPendingLessons()
                ]);
                const pendingCoursesCount = courses.filter(c => c.trang_thai_phe_duyet === "pending").length;
                const pendingLessonsCount = lessons.length;
                if (isMounted) {
                    setPendingCount(pendingCoursesCount + pendingLessonsCount);
                }
            } catch {
                // Use console.warn instead of console.error to avoid Next.js dev overlay popups during background polling
                console.warn("Failed to fetch pending counts for sidebar");
            }
        }
        fetchPendingCounts();

        return () => {
            isMounted = false;
        };
    }, []);

    const handleLogout = () => {
        tokenHelper.removeToken();
        tokenHelper.removeCurrentUser();
        router.push("/");
    };

    return (
        <div className="h-screen overflow-hidden bg-[#F8F9FA] flex">
            <aside
                className={`fixed inset-y-0 left-0 z-50 h-screen w-64 bg-white border-r border-border/60 transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:shrink-0 ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"
                    }`}
            >
                <div className="flex h-full min-h-0 flex-col">
                    <div className="h-20 flex items-center justify-center border-b border-border/40 shrink-0">
                        <Link href="/admin" prefetch={false}>
                            <SystemLogo textLabel="ADMIN" />
                        </Link>
                    </div>

                    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-6 px-4 space-y-8 custom-scrollbar">
                        {sidebarGroups.map((group) => (
                            <div key={group.title} className="space-y-2">
                                <h3 className="px-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">
                                    {group.title}
                                </h3>
                                <div className="space-y-1">
                                    {group.items.map((item) => {
                                        const isActive = pathname === item.href || (pathname.startsWith(item.href) && item.href !== "/admin");
                                        const Icon = item.icon;

                                        return (
                                            <Link
                                                key={item.name}
                                                href={item.href}
                                                prefetch={false}
                                                className={`flex items-center space-x-3 px-3 py-2.5 rounded-xl transition-all ${isActive
                                                        ? "bg-primary/10 text-primary font-bold shadow-sm"
                                                        : "hover:bg-secondary/70 text-muted-foreground hover:text-foreground font-medium"
                                                    }`}
                                            >
                                                <Icon className={`h-5 w-5 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                                                <span className="text-sm">{item.name}</span>
                                                {item.href === "/admin/moderation" && pendingCount > 0 && (
                                                    <span className="flex h-2 w-2 relative shrink-0 ml-auto">
                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                                                    </span>
                                                )}
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="p-4 border-t border-border/40 shrink-0">
                        <button
                            onClick={handleLogout}
                            className="flex items-center space-x-3 px-3 py-2.5 w-full rounded-xl text-muted-foreground hover:bg-rose-50 hover:text-rose-600 transition-all font-medium"
                        >
                            <LogOut className="h-5 w-5" />
                            <span className="text-sm">Đăng xuất</span>
                        </button>
                    </div>
                </div>
            </aside>

            <div className="flex h-screen min-w-0 flex-1 flex-col overflow-hidden">
                <header className="h-20 bg-white border-b border-border/60 flex items-center justify-between px-6 shrink-0 lg:px-8 shadow-sm z-40">
                    <div className="flex items-center">
                        <button
                            onClick={() => setSidebarOpen(!isSidebarOpen)}
                            className="lg:hidden p-2 -ml-2 mr-4 text-muted-foreground hover:bg-secondary rounded-lg"
                        >
                            <Menu className="h-6 w-6" />
                        </button>
                        <h1 className="text-xl font-black text-foreground tracking-tight">Admin Portal</h1>
                    </div>

                    <div className="flex items-center space-x-4">
                        <Link
                            href="/"
                            className="flex items-center space-x-2 bg-primary hover:bg-primary/95 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest shadow-md transition-all shrink-0"
                        >
                            <Home className="h-4 w-4" />
                            <span className="hidden md:inline">Về trang chủ</span>
                        </Link>

                        <div className="flex items-center space-x-2.5 bg-secondary/50 border border-border/50 px-3 py-1.5 rounded-xl">
                            <div className="h-7 w-7 rounded-lg bg-primary/20 flex items-center justify-center text-primary font-bold text-xs">
                                AD
                            </div>
                            <span className="text-sm font-bold text-foreground hidden sm:block">
                                Administrator
                            </span>
                        </div>
                    </div>
                </header>

                <main className="min-h-0 flex-1 overflow-auto overscroll-contain p-4 sm:p-6 lg:p-8 bg-[#F8F9FA]">
                    <Breadcrumbs />
                    {children}
                </main>
            </div>

            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}
        </div>
    );
}
