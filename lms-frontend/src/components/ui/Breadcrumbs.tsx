"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";
import { useEffect, useState } from "react";
import { breadcrumbStore } from "@/utils/breadcrumbStore";

const breadcrumbLabels: Record<string, string> = {
    admin: "Quản trị",
    instructor: "Giảng viên",
    courses: "Khóa học",
    sections: "Chương học",
    lessons: "Bài học",
    users: "Người dùng",
    students: "Học viên",
    revenue: "Doanh thu",
    reviews: "Đánh giá",
    dashboard: "Tổng quan",
    categories: "Danh mục",
    banners: "Banner",
    enrollments: "Ghi danh",
    moderation: "Kiểm duyệt",
    orders: "Đơn hàng",
    coupons: "Mã giảm giá",
    settings: "Cấu hình",
    logs: "Nhật ký",
    profile: "Hồ sơ",
    "my-courses": "Khóa học của tôi",
    cart: "Giỏ hàng",
    checkout: "Thanh toán",
    learn: "Học tập",
    edit: "Sửa",
    notifications: "Thông báo",
    certificates: "Chứng chỉ"
};

export default function Breadcrumbs({ variant = "dashboard", isScrolled = false }: { variant?: "public" | "dashboard", isScrolled?: boolean }) {
    const pathname = usePathname();
    const [updater, setUpdater] = useState(0);

    useEffect(() => {
        const handleUpdate = () => setUpdater(prev => prev + 1);
        window.addEventListener('breadcrumb-updated', handleUpdate);
        return () => window.removeEventListener('breadcrumb-updated', handleUpdate);
    }, []);
    
    // Bỏ qua trang chủ
    if (pathname === "/") return null;

    const segments = pathname.split("/").filter(Boolean);
    
    const breadcrumbs = segments.map((segment, index) => {
        const href = "/" + segments.slice(0, index + 1).join("/");
        const isLast = index === segments.length - 1;
        
        let label = breadcrumbLabels[segment];
        
        // Nếu không có trong từ điển tĩnh
        if (!label) {
            // Ưu tiên label động từ breadcrumbStore
            const dynamicLabel = breadcrumbStore.get(segment);
            if (dynamicLabel) {
                label = dynamicLabel;
            } else if (!isNaN(Number(segment))) {
                label = `#${segment}`;
            } else {
                // Capitalize chuỗi bình thường nếu không phải số
                label = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " ");
            }
        }

        return { href, label, isLast };
    });

    const content = (
        <nav aria-label="Breadcrumb" className={variant === "dashboard" ? "mb-4" : ""}>
            <ol className={`flex flex-wrap items-center gap-1.5 ${variant === "public" ? "text-xs" : "text-sm"}`}>
                <li>
                    <Link 
                        href="/" 
                        className="flex items-center gap-1.5 text-slate-500 hover:text-purple-600 transition-colors"
                    >
                        <Home className="h-4 w-4" />
                        <span className="sr-only">Trang chủ</span>
                    </Link>
                </li>
                {breadcrumbs.map((crumb, index) => (
                    <li key={crumb.href} className="flex items-center gap-1.5">
                        <ChevronRight className="h-4 w-4 text-slate-300" />
                        {crumb.isLast ? (
                            <span className="font-bold text-slate-900 line-clamp-1" aria-current="page">
                                {crumb.label}
                            </span>
                        ) : (
                            <Link 
                                href={crumb.href}
                                className="font-medium text-slate-500 hover:text-purple-600 transition-colors line-clamp-1"
                            >
                                {crumb.label}
                            </Link>
                        )}
                    </li>
                ))}
            </ol>
        </nav>
    );

    if (variant === "public") {
        return (
            <div 
                className={`fixed left-0 right-0 z-40 hidden md:block transition-all duration-500 ${
                    isScrolled 
                        ? "bg-background/80 backdrop-blur-md border-b border-border shadow-sm" 
                        : "bg-transparent"
                }`}
                style={{ top: isScrolled ? '64px' : '88px' }}
            >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5">
                    {content}
                </div>
            </div>
        );
    }

    return content;
}
