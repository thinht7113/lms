"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen, Search, ShoppingCart, User, Menu, X, Heart, LogOut } from "lucide-react";
import { apiService, tokenHelper } from "@/services/api";
import SystemLogo from "@/components/SystemLogo";

export default function Navbar() {
  const router = useRouter();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const cachedUser = tokenHelper.getCurrentUser();
    if (cachedUser) setCurrentUser(cachedUser);

    const token = tokenHelper.getToken();
    if (token) {
      apiService.getProfile()
        .then(user => setCurrentUser(user))
        .catch(() => {
          tokenHelper.removeToken();
          tokenHelper.removeCurrentUser();
          setCurrentUser(null);
        });

      apiService.getCart()
        .then(cartData => {
          setCartCount(cartData.chi_tiet_gio_hang?.length || 0);
        })
        .catch(err => console.warn("Navbar cart count error:", err));
    }
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isScrolled
          ? "bg-background/80 backdrop-blur-md border-b border-border shadow-sm py-3"
          : "bg-transparent py-6"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Logo Nemo Style */}
          <div className="flex items-center">
            <Link href="/">
              <SystemLogo />
            </Link>
          </div>

          {/* Main Nav */}
          <nav className="hidden md:flex items-center space-x-10">
            <Link
              href="/courses"
              className="text-[13px] font-bold uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors"
            >
              Danh mục
            </Link>
            <Link
              href="/dashboard"
              className="text-[13px] font-bold uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors"
            >
              Học tập
            </Link>
            <Link
              href="/instructor/dashboard"
              className="text-[13px] font-bold uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors"
            >
              Giảng dạy
            </Link>
          </nav>

          {/* Action Area */}
          <div className="hidden md:flex items-center space-x-6">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (searchTerm.trim()) router.push(`/courses?q=${encodeURIComponent(searchTerm)}`);
              }}
              className="relative"
            >
              <input
                type="text"
                placeholder="Tìm khóa học..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-40 lg:w-56 bg-secondary border border-border/50 text-foreground text-xs rounded-xl py-2 pl-4 pr-10 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:w-64 transition-all duration-300"
              />
              <Search className="absolute right-3 top-2 w-4 h-4 text-muted-foreground" />
            </form>

            <div className="flex items-center space-x-1">
              <Link href="/dashboard?tab=wishlist" className="p-2 text-muted-foreground hover:text-primary transition-colors">
                <Heart className="h-5 w-5" />
              </Link>
              <Link href="/cart" className="p-2 text-muted-foreground hover:text-primary transition-colors relative">
                <ShoppingCart className="h-5 w-5" />
                {cartCount > 0 && (
                  <span className="absolute top-0 right-0 bg-primary text-white text-[9px] font-black h-4 w-4 rounded-full flex items-center justify-center border-2 border-background">
                    {cartCount}
                  </span>
                )}
              </Link>
            </div>

            <div className="h-6 w-px bg-border/60 mx-2" />

            {currentUser ? (
              <div className="flex items-center space-x-3">
                <Link
                  href="/dashboard"
                  className="flex items-center space-x-2.5 bg-card border border-border px-3 py-1.5 rounded-xl hover:shadow-md transition-all"
                >
                  <img 
                    src={currentUser.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.ho_ten}`} 
                    className="h-6 w-6 rounded-lg bg-primary/10 object-cover"
                  />
                  <span className="text-xs font-bold text-foreground">
                    {currentUser.ho_ten.split(' ').pop()}
                  </span>
                </Link>
                <button
                  onClick={async () => {
                    await apiService.logout();
                    router.push("/login");
                  }}
                  className="text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="bg-primary hover:bg-blue-700 text-white text-[13px] font-bold px-6 py-2.5 rounded-xl transition-all shadow-lg shadow-primary/20"
              >
                Đăng nhập
              </Link>
            )}
          </div>

          {/* Mobile Menu Trigger */}
          <div className="md:hidden flex items-center space-x-4">
             <Link href="/cart" className="relative text-foreground">
                <ShoppingCart className="h-6 w-6" />
                {cartCount > 0 && <span className="absolute -top-1 -right-1 bg-primary text-white text-[8px] font-bold h-4 w-4 rounded-full flex items-center justify-center border border-background">{cartCount}</span>}
             </Link>
             <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-foreground">
                {isMobileMenuOpen ? <X className="h-7 w-7" /> : <Menu className="h-7 w-7" />}
             </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-[73px] bg-background z-40 p-6 animate-in slide-in-from-right duration-300">
           <div className="flex flex-col space-y-6">
              <div className="relative">
                <Search className="absolute left-4 top-3.5 h-5 w-5 text-muted-foreground" />
                <input 
                  type="text" 
                  placeholder="Tìm kiếm khóa học..." 
                  className="w-full bg-secondary py-3.5 pl-12 pr-4 rounded-2xl border border-border text-sm outline-none"
                />
              </div>
              <nav className="flex flex-col space-y-2">
                <Link href="/courses" className="text-lg font-black py-4 border-b border-border/50">Danh mục khóa học</Link>
                <Link href="/dashboard" className="text-lg font-black py-4 border-b border-border/50">Phòng học của tôi</Link>
                <Link href="/instructor/dashboard" className="text-lg font-black py-4 border-b border-border/50">Kênh giảng viên</Link>
              </nav>
              <div className="pt-6">
                {currentUser ? (
                  <button className="w-full bg-destructive/10 text-destructive py-4 rounded-2xl font-bold flex items-center justify-center space-x-2">
                    <LogOut className="h-5 w-5" />
                    <span>Đăng xuất tài khoản</span>
                  </button>
                ) : (
                  <Link href="/login" className="block w-full bg-primary text-white text-center py-4 rounded-2xl font-bold shadow-xl shadow-primary/20">Bắt đầu học ngay</Link>
                )}
              </div>
           </div>
        </div>
      )}
    </header>
  );
}
