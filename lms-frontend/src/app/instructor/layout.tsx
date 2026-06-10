"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
    BookOpen, LayoutDashboard, LogOut, Menu, Users, BarChart3, Star, ChevronLeft, ChevronRight, Home
} from "lucide-react";
import { tokenHelper } from "@/services/api";
import SystemLogo from "@/components/SystemLogo";

const sidebarGroups = [
    {
        title: "Kênh giảng viên",
        items: [
            { name: "Tổng quan", href: "/instructor/dashboard", icon: LayoutDashboard },
            { name: "Khóa học", href: "/instructor/courses", icon: BookOpen },
            { name: "Học viên", href: "/instructor/students", icon: Users },
            { name: "Doanh thu", href: "/instructor/revenue", icon: BarChart3 },
            { name: "Đánh giá", href: "/instructor/reviews", icon: Star },
        ]
    }
];

export default function InstructorLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(false);
    const [isDesktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(false);
    const [hasMounted, setHasMounted] = useState(false);

    useEffect(() => {
        setHasMounted(true);
    }, []);

    const handleLogout = () => {
        tokenHelper.removeToken();
        tokenHelper.removeCurrentUser();
        router.push("/login");
    };

    return (
        <div className="min-h-screen bg-slate-50 flex">
            {/* Sidebar (Desktop) */}
            <aside
                className={`fixed inset-y-0 left-0 z-50 bg-white border-r border-slate-200 text-slate-600 transition-all duration-300 ease-in-out lg:static lg:shrink-0 flex flex-col ${       
                    isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
                } ${isDesktopSidebarCollapsed ? "lg:w-20" : "w-64"}`}
            >
                <div className="h-full flex flex-col relative">
                    {/* Logo Area */}
                    <div className="h-20 flex items-center justify-center border-b border-slate-100 shrink-0">
                        <Link href="/instructor/dashboard">
                            {isDesktopSidebarCollapsed ? (
                                <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center text-white font-black">ST</div>
                            ) : (
                                <SystemLogo
                                    textLabel="STUDIO"
                                    textColorClass="text-slate-900"
                                    iconColorClass="text-white"
                                    iconBgClass="bg-purple-600"
                                />
                            )}
                        </Link>
                    </div>

                    {/* Toggle Button for Desktop */}
                    <button 
                        onClick={() => setDesktopSidebarCollapsed(!isDesktopSidebarCollapsed)}
                        className="hidden lg:flex absolute -right-3 top-24 z-50 h-6 w-6 bg-white border border-slate-200 rounded-full items-center justify-center text-slate-400 hover:text-purple-600 hover:border-purple-300 shadow-sm transition-colors"
                    >
                        {isDesktopSidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                    </button>

                    {/* Navigation */}
                    <div className="flex-1 overflow-y-auto py-6 px-3 space-y-8 custom-scrollbar overflow-x-hidden">
                        {sidebarGroups.map((group, idx) => (
                            <div key={idx} className="space-y-2">
                                {!isDesktopSidebarCollapsed && (
                                    <h3 className="px-3 text-[10px] font-black uppercase tracking-widest text-slate-500 whitespace-nowrap">
                                        {group.title}
                                    </h3>
                                )}
                                <div className="space-y-1">
                                    {group.items.map((item) => {
                                        const isActive = hasMounted && (pathname === item.href || (item.href !== "/instructor/dashboard" && pathname.startsWith(item.href)));
                                        const Icon = item.icon;
                                        return (
                                            <Link
                                                key={item.name}
                                                href={item.href}
                                                title={isDesktopSidebarCollapsed ? item.name : undefined}
                                                className={`flex items-center space-x-3 px-3 py-2.5 rounded-xl transition-all ${
                                                    isActive 
                                                    ? "bg-purple-50 text-purple-700 font-bold border border-purple-100" 
                                                    : "hover:bg-slate-50 hover:text-slate-900 font-medium border border-transparent"
                                                } ${isDesktopSidebarCollapsed ? "justify-center" : ""}`}
                                            >
                                                <Icon className={`h-5 w-5 shrink-0 ${isActive ? "text-purple-600" : "text-slate-400"}`} />
                                                {!isDesktopSidebarCollapsed && <span className="text-sm whitespace-nowrap">{item.name}</span>}
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Bottom Action */}
                    <div className="p-4 border-t border-slate-100 shrink-0">
                        <button 
                            onClick={handleLogout}
                            title={isDesktopSidebarCollapsed ? "Đăng xuất" : undefined}
                            className={`flex items-center space-x-3 px-3 py-2.5 w-full rounded-xl text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-all font-medium ${isDesktopSidebarCollapsed ? "justify-center" : ""}`}
                        >
                            <LogOut className="h-5 w-5 shrink-0" />
                            {!isDesktopSidebarCollapsed && <span className="text-sm whitespace-nowrap">Đăng xuất</span>}
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content Wrapper */}
            <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
                {/* Top Header */}
                <header className="h-20 bg-white border-b border-border/60 flex items-center justify-between px-6 shrink-0 lg:px-8 shadow-sm z-40">
                    <div className="flex items-center">
                        <button 
                            onClick={() => setMobileSidebarOpen(!isMobileSidebarOpen)}
                            className="lg:hidden p-2 -ml-2 mr-4 text-muted-foreground hover:bg-secondary rounded-lg"
                        >
                            <Menu className="h-6 w-6" />
                        </button>
                        <h1 className="text-xl font-black text-foreground tracking-tight">Kênh Giảng Viên</h1>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                        <Link
                            href="/"
                            className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest shadow-md transition-all shrink-0"
                        >
                            <Home className="h-4 w-4" />
                            <span className="hidden md:inline">Trang người dùng</span>
                        </Link>

                        <div className="flex items-center space-x-2.5 bg-purple-50 border border-purple-100 px-3 py-1.5 rounded-xl">
                            <div className="h-7 w-7 rounded-lg bg-purple-600 flex items-center justify-center text-white font-bold text-xs">
                                IN
                            </div>
                            <span className="text-sm font-bold text-purple-900 hidden sm:block">
                                Instructor Mode
                            </span>
                        </div>
                    </div>
                </header>

                {/* Main scrollable content */}
                <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
                    {children}
                </main>
            </div>
            
            {/* Mobile Sidebar Overlay */}
            {isMobileSidebarOpen && (
                <div 
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setMobileSidebarOpen(false)}
                />
            )}
        </div>
    );
}
