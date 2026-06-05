"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useUser } from "@/context/user-context";
import { useState } from "react";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, token, role, logout, isAuthenticated, wishlist, cartCount } = useUser();
  const [searchQuery, setSearchQuery] = useState("");
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const isAuthPage = pathname === "/login" || pathname === "/register";
  const isAdminPage = pathname.startsWith("/admin");

  if (isAuthPage || isAdminPage) {
    return <>{children}</>;
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/courses?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <div className="flex h-screen bg-background font-sans overflow-hidden">
      {/* ===== SIDEBAR ===== */}
      <aside className="w-[100px] flex-shrink-0 border-r border-outline-variant bg-surface-container-lowest flex flex-col items-center py-6 gap-8 z-20 overflow-y-auto custom-scrollbar">
        {/* Logo */}
        <Link href="/" className="flex flex-col items-center gap-2 group" style={{ textDecoration: "none" }}>
          <div className="w-12 h-12 rounded-xl bg-surface-container-high border border-outline-variant flex items-center justify-center group-hover:border-primary transition-colors text-primary font-bold text-xl">
            L
          </div>
          <span className="text-[10px] font-bold tracking-wider text-on-surface-variant group-hover:text-primary transition-colors">LUMINA</span>
        </Link>

        {/* Nav Links */}
        <nav className="flex flex-col gap-4 w-full px-3 flex-1 pb-4">
          <div className="flex flex-col gap-4 flex-1">
            <Link href="/" className={`flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all ${pathname === "/" ? "bg-primary-container/20 text-primary border border-primary-container/30 relative" : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"}`}>
              {pathname === "/" && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full"></div>}
              <i className={`${pathname === "/" ? "ph-fill" : "ph"} ph-house text-2xl`}></i>
              <span className="text-[10px] font-medium text-center leading-tight">TRANG CHỦ</span>
            </Link>

            <Link href="/courses" className={`flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all ${pathname.startsWith("/courses") ? "bg-primary-container/20 text-primary border border-primary-container/30 relative" : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"}`}>
              {pathname.startsWith("/courses") && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full"></div>}
              <i className={`${pathname.startsWith("/courses") ? "ph-fill" : "ph"} ph-globe text-2xl`}></i>
              <span className="text-[10px] font-medium text-center leading-tight">KHÓA HỌC</span>
            </Link>

            {role !== "instructor" && (
              <Link href="/instructors" className={`flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all ${pathname.startsWith("/instructors") ? "bg-primary-container/20 text-primary border border-primary-container/30 relative" : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"}`}>
                {pathname.startsWith("/instructors") && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full"></div>}
                <i className={`${pathname.startsWith("/instructors") ? "ph-fill" : "ph"} ph-chalkboard-teacher text-2xl`}></i>
                <span className="text-[10px] font-medium text-center leading-tight">GIẢNG VIÊN</span>
              </Link>
            )}

            <Link href="#" className="flex flex-col items-center gap-1.5 p-3 rounded-xl text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-all relative">
              <div className="absolute top-2 right-2 w-2 h-2 bg-secondary rounded-full animate-pulse"></div>
              <i className="ph ph-bell text-2xl"></i>
              <span className="text-[10px] font-medium text-center leading-tight">TIN TỨC</span>
            </Link>

            {isAuthenticated && role === "student" && (
              <Link href="/cart" className={`flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all ${pathname.startsWith("/cart") ? "bg-primary-container/20 text-primary border border-primary-container/30 relative" : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"} relative`}>
                {pathname.startsWith("/cart") && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full"></div>}
                <div className="relative">
                  <i className={`${pathname.startsWith("/cart") ? "ph-fill" : "ph"} ph-shopping-cart text-2xl`}></i>
                  {cartCount > 0 && (
                    <span className="absolute -top-1 -right-2 w-4 h-4 bg-error text-white text-[10px] font-bold rounded-full flex items-center justify-center border border-surface shadow-sm">{cartCount}</span>
                  )}
                </div>
                <span className="text-[10px] font-medium text-center leading-tight">GIỎ HÀNG</span>
              </Link>
            )}

            {isAuthenticated && role === "instructor" && (
              <Link href="/instructor" className={`flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all ${pathname.startsWith("/instructor") && !pathname.startsWith("/instructors") ? "bg-secondary-container/20 text-secondary border border-secondary-container/30 relative" : "text-on-surface-variant hover:bg-surface-container hover:text-secondary"} relative`}>
                {pathname.startsWith("/instructor") && !pathname.startsWith("/instructors") && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-secondary rounded-r-full"></div>}
                <i className={`${pathname.startsWith("/instructor") && !pathname.startsWith("/instructors") ? "ph-fill" : "ph"} ph-presentation-chart text-2xl`}></i>
                <span className="text-[10px] font-bold text-center leading-tight">GIẢNG DẠY</span>
              </Link>
            )}

            {isAuthenticated && role === "admin" && (
              <Link href="/admin" className={`flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all ${pathname.startsWith("/admin") ? "bg-error-container/20 text-error border border-error-container/30 relative" : "text-on-surface-variant hover:bg-surface-container hover:text-error"}`}>
                {pathname.startsWith("/admin") && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-error rounded-r-full"></div>}
                <i className={`${pathname.startsWith("/admin") ? "ph-fill" : "ph"} ph-shield-star text-2xl`}></i>
                <span className="text-[10px] font-bold text-center leading-tight">QUẢN TRỊ</span>
              </Link>
            )}
          </div>
        </nav>
      </aside>

      {/* ===== MAIN CONTENT ===== */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden bg-background">

        {/* TOP HEADER */}
        <header className="h-20 border-b border-outline-variant bg-surface/80 backdrop-blur-md flex items-center justify-between px-8 z-30 sticky top-0">
          <form onSubmit={handleSearch} className="flex-1 max-w-2xl relative">
            <i className="ph ph-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-xl"></i>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface-container-low border border-outline-variant rounded-full py-3 pl-12 pr-6 text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              placeholder="Tìm kiếm học liệu, khóa học..."
            />
          </form>

          <div className="flex items-center gap-6">
            {isAuthenticated ? (
              <div className="relative">
                <button 
                  onClick={() => setShowUserDropdown(!showUserDropdown)}
                  className="flex items-center gap-2 hover:bg-surface-container/50 px-3 py-2 rounded-full transition-all focus:outline-none"
                >
                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                    {user?.ho_ten?.charAt(0)?.toUpperCase() || "U"}
                  </div>
                  <div className="text-left hidden md:block">
                    <div className="text-xs font-bold text-on-surface leading-none mb-0.5">{user?.ho_ten?.replace(/Demo/gi, '')?.trim()}</div>
                    <div className="text-[9px] text-on-surface-variant font-medium uppercase leading-none">
                      {role === "admin" ? "Quản trị viên" : role === "instructor" ? "Giảng viên" : "Học viên"}
                    </div>
                  </div>
                  <i className={`ph-bold ph-caret-down text-xs text-on-surface-variant transition-transform ${showUserDropdown ? "rotate-180" : ""}`}></i>
                </button>

                {/* Dropdown Menu */}
                {showUserDropdown && (
                  <div 
                    className="absolute right-0 mt-2.5 w-56 bg-surface border border-outline-variant rounded-2xl shadow-xl py-2 z-50 animate-scale-up"
                    onMouseLeave={() => setShowUserDropdown(false)}
                  >
                    <div className="px-4 py-2 border-b border-outline-variant/50">
                      <div className="text-xs font-black text-on-surface">{user?.ho_ten?.replace(/Demo/gi, '')?.trim()}</div>
                      <div className="text-[10px] text-on-surface-variant font-bold truncate">{user?.email}</div>
                    </div>
                    
                    <div className="py-1">
                      <Link 
                        href="/wishlist" 
                        onClick={() => setShowUserDropdown(false)}
                        className="flex items-center gap-3 px-4 py-2 text-xs font-bold text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
                      >
                        <i className="ph-bold ph-heart text-base text-rose-500"></i>
                        Danh sách yêu thích
                      </Link>
                      
                      <Link 
                        href="#" 
                        onClick={() => setShowUserDropdown(false)}
                        className="flex items-center gap-3 px-4 py-2 text-xs font-bold text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
                      >
                        <i className="ph-bold ph-bell text-base text-indigo-500"></i>
                        Thông báo
                      </Link>
                      
                      <Link 
                        href="/profile" 
                        onClick={() => setShowUserDropdown(false)}
                        className="flex items-center gap-3 px-4 py-2 text-xs font-bold text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
                      >
                        <i className="ph-bold ph-user text-base text-sky-500"></i>
                        Hồ sơ cá nhân
                      </Link>
                    </div>

                    <div className="border-t border-outline-variant/50 pt-1 mt-1">
                      <button 
                        onClick={() => {
                          setShowUserDropdown(false);
                          logout();
                        }}
                        className="w-full text-left flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-error hover:bg-error-container/20 transition-colors"
                      >
                        <i className="ph-bold ph-sign-out text-base"></i>
                        Đăng xuất tài khoản
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link href="/login" className="flex items-center justify-center bg-primary hover:bg-primary/90 text-on-primary px-6 py-2.5 rounded-full font-medium text-sm transition-all shadow-md">
                Đăng nhập
              </Link>
            )}
          </div>
        </header>

        {/* SCROLLABLE AREA */}
        <div className="flex-1 overflow-y-auto p-8 relative custom-scrollbar">
          <div className="w-full pb-12">
            {children}
          </div>
        </div>

      </main>
    </div>
  );
}
