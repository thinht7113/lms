"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useUser } from "@/context/user-context";
import { useEffect } from "react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, role, isAuthenticated, isLoading, logout } = useUser();

  // 1. Kiểm tra đồng bộ từ localStorage ngay khi component mount để chuyển hướng tức thì (không chờ API)
  useEffect(() => {
    const savedUserStr = localStorage.getItem("lms_user");
    const savedToken = localStorage.getItem("lms_token");
    if (!savedToken) {
      router.replace("/login");
      return;
    }
    if (savedUserStr) {
      try {
        const u = JSON.parse(savedUserStr);
        if (u.vai_tro !== "admin") {
          router.replace("/");
        }
      } catch {
        router.replace("/");
      }
    }
  }, [router]);

  // 2. Kiểm tra đồng bộ từ context (sau khi khôi phục session xong)
  useEffect(() => {
    if (!isLoading && (!isAuthenticated || role !== "admin")) {
      router.replace("/");
    }
  }, [isLoading, isAuthenticated, role, router]);

  // Kiểm tra tức thì trên client bằng localStorage để tránh nhấp nháy loader
  let isDefinitelyMismatched = false;
  if (typeof window !== "undefined") {
    const savedToken = localStorage.getItem("lms_token");
    const savedUserStr = localStorage.getItem("lms_user");
    if (!savedToken) {
      isDefinitelyMismatched = true;
    } else if (savedUserStr) {
      try {
        const u = JSON.parse(savedUserStr);
        if (u.vai_tro !== "admin") {
          isDefinitelyMismatched = true;
        }
      } catch {
        isDefinitelyMismatched = true;
      }
    }
  }

  // Chờ khôi phục session trước khi hiển thị layout (chỉ hiển thị nếu không chắc chắn không có quyền)
  if (isLoading && !isDefinitelyMismatched) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-surface-container-lowest">
        <div className="flex flex-col items-center gap-4">
          <i className="ph ph-spinner-gap animate-spin text-5xl text-primary"></i>
          <p className="text-on-surface-variant font-medium tracking-wide">Đang kiểm tra quyền truy cập...</p>
        </div>
      </div>
    );
  }

  // Chặn không render layout nếu không phải admin
  if (!isAuthenticated || role !== "admin") {
    return null;
  }

  return (
    <div className="flex h-screen bg-surface-container-lowest font-sans overflow-hidden text-on-surface">
      {/* ===== ADMIN SIDEBAR (LIGHT LUXURY THEME) ===== */}
      <aside className="w-[260px] flex-shrink-0 bg-surface border-r border-outline-variant text-on-surface flex flex-col py-6 z-20 overflow-y-auto custom-scrollbar shadow-sm">
        {/* Logo */}
        <Link href="/admin" className="flex items-center gap-3 px-6 mb-10 group" style={{ textDecoration: "none" }}>
          <div className="w-10 h-10 rounded-xl bg-primary-container flex items-center justify-center text-primary font-bold text-xl group-hover:bg-primary group-hover:text-on-primary transition-colors shadow-sm border border-primary/20">
            <i className="ph-fill ph-shield-star"></i>
          </div>
          <div>
            <div className="font-black tracking-widest text-lg leading-tight text-on-surface">LUMINA</div>
            <div className="text-[10px] text-primary uppercase tracking-[0.2em] font-bold">Admin Portal</div>
          </div>
        </Link>

        {/* Nav Links */}
        <div className="px-6 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-3">Quản lý hệ thống</div>
        <nav className="flex flex-col gap-1.5 w-full px-4 mb-8">
          <Link href="/admin" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${pathname === "/admin" ? "bg-primary-container text-primary font-bold shadow-sm" : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface font-medium"}`}>
            <i className={`${pathname === "/admin" ? "ph-fill" : "ph"} ph-squares-four text-xl`}></i>
            <span className="text-sm">Tổng quan</span>
          </Link>

          <Link href="/admin/users" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${pathname.startsWith("/admin/users") ? "bg-primary-container text-primary font-bold shadow-sm" : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface font-medium"}`}>
            <i className={`${pathname.startsWith("/admin/users") ? "ph-fill" : "ph"} ph-users text-xl`}></i>
            <span className="text-sm">Người dùng</span>
          </Link>

          <Link href="/admin/categories" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${pathname.startsWith("/admin/categories") ? "bg-primary-container text-primary font-bold shadow-sm" : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface font-medium"}`}>
            <i className={`${pathname.startsWith("/admin/categories") ? "ph-fill" : "ph"} ph-folders text-xl`}></i>
            <span className="text-sm">Danh mục</span>
          </Link>

          <Link href="/admin/courses" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${pathname.startsWith("/admin/courses") ? "bg-primary-container text-primary font-bold shadow-sm" : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface font-medium"}`}>
            <i className={`${pathname.startsWith("/admin/courses") ? "ph-fill" : "ph"} ph-books text-xl`}></i>
            <span className="text-sm">Khóa học</span>
          </Link>

          <Link href="/admin/reviews" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${pathname.startsWith("/admin/reviews") ? "bg-primary-container text-primary font-bold shadow-sm" : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface font-medium"}`}>
            <i className={`${pathname.startsWith("/admin/reviews") ? "ph-fill" : "ph"} ph-star text-xl`}></i>
            <span className="text-sm">Đánh giá</span>
          </Link>

          <Link href="/admin/quizzes" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${pathname.startsWith("/admin/quizzes") ? "bg-primary-container text-primary font-bold shadow-sm" : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface font-medium"}`}>
            <i className={`${pathname.startsWith("/admin/quizzes") ? "ph-fill" : "ph"} ph-exam text-xl`}></i>
            <span className="text-sm">Bài kiểm tra</span>
          </Link>

          <Link href="/admin/enrollments" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${pathname.startsWith("/admin/enrollments") ? "bg-primary-container text-primary font-bold shadow-sm" : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface font-medium"}`}>
            <i className={`${pathname.startsWith("/admin/enrollments") ? "ph-fill" : "ph"} ph-student text-xl`}></i>
            <span className="text-sm">Ghi danh</span>
          </Link>

          <Link href="/admin/certificates" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${pathname.startsWith("/admin/certificates") ? "bg-primary-container text-primary font-bold shadow-sm" : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface font-medium"}`}>
            <i className={`${pathname.startsWith("/admin/certificates") ? "ph-fill" : "ph"} ph-certificate text-xl`}></i>
            <span className="text-sm">Chứng chỉ</span>
          </Link>

          <Link href="/admin/orders" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${pathname.startsWith("/admin/orders") ? "bg-primary-container text-primary font-bold shadow-sm" : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface font-medium"}`}>
            <i className={`${pathname.startsWith("/admin/orders") ? "ph-fill" : "ph"} ph-receipt text-xl`}></i>
            <span className="text-sm">Đơn hàng</span>
          </Link>

          <Link href="/admin/coupons" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${pathname.startsWith("/admin/coupons") ? "bg-primary-container text-primary font-bold shadow-sm" : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface font-medium"}`}>
            <i className={`${pathname.startsWith("/admin/coupons") ? "ph-fill" : "ph"} ph-ticket text-xl`}></i>
            <span className="text-sm">Mã giảm giá</span>
          </Link>

          <Link href="/admin/settings" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${pathname.startsWith("/admin/settings") ? "bg-primary-container text-primary font-bold shadow-sm" : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface font-medium"}`}>
            <i className={`${pathname.startsWith("/admin/settings") ? "ph-fill" : "ph"} ph-gear text-xl`}></i>
            <span className="text-sm">Cấu hình</span>
          </Link>

          <Link href="/admin/logs" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${pathname.startsWith("/admin/logs") ? "bg-primary-container text-primary font-bold shadow-sm" : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface font-medium"}`}>
            <i className={`${pathname.startsWith("/admin/logs") ? "ph-fill" : "ph"} ph-file-text text-xl`}></i>
            <span className="text-sm">Nhật ký hệ thống</span>
          </Link>
        </nav>

        <div className="mt-auto px-4">
          <div className="bg-surface-container-lowest rounded-2xl p-4 border border-outline-variant shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold border border-primary/20">
                {user?.ho_ten?.charAt(0) || "A"}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-bold text-on-surface truncate">{user?.ho_ten}</div>
                <div className="text-[10px] uppercase tracking-wider font-bold text-primary">Admin</div>
              </div>
            </div>
            <button onClick={logout} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-surface-container hover:bg-error-container hover:text-error text-on-surface-variant text-sm font-bold transition-colors border border-transparent hover:border-error/20">
              Đăng xuất
            </button>
          </div>
        </div>
      </aside>

      {/* ===== MAIN CONTENT ===== */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden bg-surface-container-lowest">

        {/* TOP HEADER */}
        <header className="h-16 border-b border-outline-variant bg-surface flex items-center justify-between px-8 z-10 sticky top-0">
          <div className="flex items-center gap-4 text-on-surface-variant">
            <button className="hover:text-primary transition-colors">
              <i className="ph ph-list text-2xl"></i>
            </button>
            <span className="text-sm font-medium bg-surface-container px-3 py-1 rounded-full border border-outline-variant">Lumina Admin System v1.0</span>
          </div>

          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 text-sm font-semibold text-primary hover:underline" target="_blank">
              <i className="ph ph-arrow-square-out text-lg"></i> Xem trang học viên
            </Link>
          </div>
        </header>

        {/* SCROLLABLE AREA */}
        <div className="flex-1 overflow-y-auto p-8 relative custom-scrollbar">
          <div className="max-w-6xl mx-auto pb-12">
            {children}
          </div>
        </div>

      </main>
    </div>
  );
}
