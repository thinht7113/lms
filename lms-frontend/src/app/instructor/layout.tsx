"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
    LayoutDashboard, Users, BookOpen, 
    Settings, LogOut, Menu, X, LayoutGrid, ChevronRight, 
    Award, Layers, FileText, PieChart, Video
} from "lucide-react";
import { tokenHelper } from "@/services/api";
import SystemLogo from "@/components/SystemLogo";

const sidebarGroups = [
    {
        title: "Tổng quan",
        items: [
            { name: "Dashboard", href: "/instructor/dashboard", icon: LayoutDashboard },
            { name: "Phân tích doanh thu", href: "/instructor/analytics", icon: PieChart },
        ]
    },
    {
        title: "Nội dung & Khóa học",
        items: [
            { name: "Khóa học của tôi", href: "/instructor/courses", icon: BookOpen },
            { name: "Quản lý bài giảng", href: "/instructor/lessons", icon: Video },
        ]
    },
    {
        title: "Học viên",
        items: [
            { name: "Danh sách lớp", href: "/instructor/students", icon: Users },
            { name: "Hỏi đáp (Q&A)", href: "/instructor/qa", icon: FileText },
        ]
    }
];

export default function InstructorLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const [isSidebarOpen, setSidebarOpen] = useState(true);

    const handleLogout = () => {
        tokenHelper.removeToken();
        tokenHelper.removeCurrentUser();
        router.push("/login");
    };

    return (
        <div className="min-h-screen bg-slate-50 flex">
            {/* Sidebar (Desktop) */}
            <aside 
                className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-300 transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:shrink-0 ${
                    isSidebarOpen ? "translate-x-0" : "-translate-x-full"
                }`}
            >
                <div className="h-full flex flex-col">
                    {/* Logo Area */}
                    <div className="h-20 flex items-center justify-center border-b border-white/10 shrink-0">
                        <Link href="/instructor/dashboard">
                            <SystemLogo 
                                textLabel="STUDIO" 
                                textColorClass="text-white" 
                                iconColorClass="text-purple-400" 
                                iconBgClass="bg-purple-600" 
                            />
                        </Link>
                    </div>

                    {/* Navigation */}
                    <div className="flex-1 overflow-y-auto py-6 px-4 space-y-8 custom-scrollbar">
                        {sidebarGroups.map((group, idx) => (
                            <div key={idx} className="space-y-2">
                                <h3 className="px-3 text-[10px] font-black uppercase tracking-widest text-slate-500">
                                    {group.title}
                                </h3>
                                <div className="space-y-1">
                                    {group.items.map((item) => {
                                        const isActive = pathname === item.href;
                                        const Icon = item.icon;
                                        return (
                                            <Link
                                                key={item.name}
                                                href={item.href}
                                                className={`flex items-center space-x-3 px-3 py-2.5 rounded-xl transition-all ${
                                                    isActive 
                                                    ? "bg-purple-600/20 text-white font-bold" 
                                                    : "hover:bg-white/5 hover:text-white font-medium"
                                                }`}
                                            >
                                                <Icon className={`h-5 w-5 ${isActive ? "text-purple-500" : "text-slate-400"}`} />
                                                <span className="text-sm">{item.name}</span>
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Bottom Action */}
                    <div className="p-4 border-t border-white/10 shrink-0">
                        <button 
                            onClick={handleLogout}
                            className="flex items-center space-x-3 px-3 py-2.5 w-full rounded-xl text-slate-400 hover:bg-white/5 hover:text-white transition-all font-medium"
                        >
                            <LogOut className="h-5 w-5" />
                            <span className="text-sm">Đăng xuất</span>
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
                            onClick={() => setSidebarOpen(!isSidebarOpen)}
                            className="lg:hidden p-2 -ml-2 mr-4 text-muted-foreground hover:bg-secondary rounded-lg"
                        >
                            <Menu className="h-6 w-6" />
                        </button>
                        <h1 className="text-xl font-black text-foreground tracking-tight">Kênh Giảng Viên</h1>
                    </div>
                    
                    <div className="flex items-center space-x-4">
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
            {isSidebarOpen && (
                <div 
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}
        </div>
    );
}
