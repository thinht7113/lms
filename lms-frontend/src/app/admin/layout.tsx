"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
    LayoutDashboard, Users, BookOpen, ShoppingCart,
    Settings, LogOut, Menu, X, LayoutGrid, ChevronRight,
    Award, Layers, FileText, CreditCard
} from "lucide-react";
import { tokenHelper } from "@/services/api";
import SystemLogo from "@/components/SystemLogo";

const sidebarGroups = [
    {
        title: "Tổng quan",
        items: [
            { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
        ]
    },
    {
        title: "Tài khoản",
        items: [
            { name: "Người dùng", href: "/admin/users", icon: Users },
        ]
    },
    {
        title: "Nội dung & Đào tạo",
        items: [
            { name: "Danh mục", href: "/admin/categories", icon: Layers },
            { name: "Khóa học", href: "/admin/courses", icon: BookOpen },
            { name: "Kiểm duyệt nội dung", href: "/admin/moderation", icon: FileText },
        ]
    },
    {
        title: "Thương mại",
        items: [
            { name: "Đơn hàng", href: "/admin/orders", icon: ShoppingCart },
            { name: "Mã giảm giá", href: "/admin/coupons", icon: CreditCard },
        ]
    },
    {
        title: "Hệ thống",
        items: [
            { name: "Cấu hình chung", href: "/admin/settings", icon: Settings },
            { name: "Lịch sử thao tác", href: "/admin/logs", icon: FileText },
        ]
    }
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const [isSidebarOpen, setSidebarOpen] = useState(true);

    const handleLogout = () => {
        tokenHelper.removeToken();
        tokenHelper.removeCurrentUser();
        router.push("/login");
    };

    return (
        <div className="min-h-screen bg-[#F8F9FA] flex">
            {/* Sidebar (Desktop) */}
            <aside
                className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-border/60 transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:shrink-0 ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"
                    }`}
            >
                <div className="h-full flex flex-col">
                    {/* Logo Area */}
                    <div className="h-20 flex items-center justify-center border-b border-border/40 shrink-0">
                        <Link href="/admin">
                            <SystemLogo textLabel="ADMIN" />
                        </Link>
                    </div>

                    {/* Navigation */}
                    <div className="flex-1 overflow-y-auto py-6 px-4 space-y-8 custom-scrollbar">
                        {sidebarGroups.map((group, idx) => (
                            <div key={idx} className="space-y-2">
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
                                                className={`flex items-center space-x-3 px-3 py-2.5 rounded-xl transition-all ${isActive
                                                        ? "bg-primary/10 text-primary font-bold shadow-sm"
                                                        : "hover:bg-secondary/70 text-muted-foreground hover:text-foreground font-medium"
                                                    }`}
                                            >
                                                <Icon className={`h-5 w-5 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                                                <span className="text-sm">{item.name}</span>
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Bottom Action */}
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

            {/* Main Content Wrapper */}
            <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
                {/* Top Header (Mobile & Actions) */}
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

                {/* Main scrollable content */}
                <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 bg-[#F8F9FA]">
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
