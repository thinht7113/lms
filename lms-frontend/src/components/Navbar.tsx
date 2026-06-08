"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  Award,
  Bell,
  ChevronDown,
  Heart,
  LogOut,
  Menu,
  Search,
  ShieldCheck,
  ShoppingCart,
  User,
  X,
} from "lucide-react";
import { apiService, tokenHelper } from "@/services/api";
import SystemLogo from "@/components/SystemLogo";

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [queryString, setQueryString] = useState("");
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const isInstructor = currentUser?.vai_tro === "instructor";
  const isAdmin = currentUser?.vai_tro === "admin";

  useEffect(() => {
    const token = tokenHelper.getToken();
    if (token) {
      const cachedUser = tokenHelper.getCurrentUser();
      if (cachedUser) setCurrentUser(cachedUser);

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
    } else {
      tokenHelper.removeCurrentUser();
      setCurrentUser(null);
      setCartCount(0);
    }
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setQueryString(window.location.search);
    setIsAccountMenuOpen(false);
    setIsMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const refreshCartCount = () => {
      if (!tokenHelper.getToken()) {
        setCartCount(0);
        return;
      }

      apiService.getCart()
        .then(cartData => {
          setCartCount(cartData.chi_tiet_gio_hang?.length || 0);
        })
        .catch(err => console.warn("Navbar cart count error:", err));
    };

    const refreshCurrentUser = () => {
      setCurrentUser(tokenHelper.getCurrentUser());
    };

    window.addEventListener("lumina-cart-updated", refreshCartCount);
    window.addEventListener("lumina-user-updated", refreshCurrentUser);

    return () => {
      window.removeEventListener("lumina-cart-updated", refreshCartCount);
      window.removeEventListener("lumina-user-updated", refreshCurrentUser);
    };
  }, []);

  // Hàm helper để check active state
  const isActive = (href: string) => {
    const currentParams = new URLSearchParams(queryString);
    if (href === "/") return pathname === "/";
    if (href === "/courses") return pathname === "/courses" && !currentParams.get("order") && !currentParams.get("gia_max");
    if (href === "/instructors") return pathname === "/instructors";
    if (href === "/my-courses") return pathname === "/my-courses";
    if (href === "/about") return pathname === "/about";
    return false;
  };

  const handleLogout = async () => {
    await apiService.logout();
    setCurrentUser(null);
    setCartCount(0);
    setIsAccountMenuOpen(false);
    setIsMobileMenuOpen(false);
    router.push("/login");
  };

  const accountMenuItems = [
    { href: "/wishlist", label: "Danh sách yêu thích", icon: Heart },
    { href: "/orders", label: "Đơn hàng", icon: ShoppingCart },
    { href: "/certificates", label: "Chứng chỉ", icon: ShieldCheck },
    { href: "/notifications", label: "Thông báo", icon: Bell },
    { href: "/profile", label: "Hồ sơ", icon: User },
    ...(isAdmin
      ? [{ href: "/admin", label: "Quản trị", icon: Award }]
      : isInstructor
        ? [{ href: "/instructor/dashboard", label: "Quản lý", icon: Award }]
        : []),
  ];

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
          {/* Logo Lumina Style */}
          <div className="flex items-center flex-shrink-0 mr-8 lg:mr-12">
            <Link href="/">
              <SystemLogo />
            </Link>
          </div>

          {/* Main Nav */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link
              href="/"
              className={`text-[13px] font-bold uppercase tracking-widest transition-colors relative group ${isActive("/") ? "text-primary" : "text-muted-foreground hover:text-primary"}`}
            >
              Trang chủ
              {isActive("/") && <span className="absolute -bottom-2 left-0 w-full h-0.5 bg-primary rounded-full"></span>}
            </Link>
            <Link
              href="/courses"
              className={`text-[13px] font-bold uppercase tracking-widest transition-colors relative group ${isActive("/courses") ? "text-primary" : "text-muted-foreground hover:text-primary"}`}
            >
              Khóa học
              {isActive("/courses") && <span className="absolute -bottom-2 left-0 w-full h-0.5 bg-primary rounded-full"></span>}
            </Link>
            <Link
              href="/instructors"
              className={`text-[13px] font-bold uppercase tracking-widest transition-colors relative group ${isActive("/instructors") ? "text-primary" : "text-muted-foreground hover:text-primary"}`}
            >
              Giảng viên
              {isActive("/instructors") && <span className="absolute -bottom-2 left-0 w-full h-0.5 bg-primary rounded-full"></span>}
            </Link>
            {currentUser && (
              <Link
                href="/my-courses"
                className={`text-[13px] font-bold uppercase tracking-widest transition-colors relative group ${isActive("/my-courses") ? "text-primary" : "text-muted-foreground hover:text-primary"}`}
              >
                Khóa học của tôi
                {isActive("/my-courses") && <span className="absolute -bottom-2 left-0 w-full h-0.5 bg-primary rounded-full"></span>}
              </Link>
            )}
            <Link
              href="/about"
              className={`text-[13px] font-bold uppercase tracking-widest transition-colors relative group ${isActive("/about") ? "text-primary" : "text-muted-foreground hover:text-primary"}`}
            >
              Giới thiệu
              {isActive("/about") && <span className="absolute -bottom-2 left-0 w-full h-0.5 bg-primary rounded-full"></span>}
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
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsAccountMenuOpen((open) => !open)}
                  className="flex items-center space-x-2.5 bg-card border border-border px-3 py-1.5 rounded-xl hover:shadow-md transition-all"
                  aria-expanded={isAccountMenuOpen}
                  aria-haspopup="menu"
                >
                  <img 
                    src={currentUser.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.ho_ten}`} 
                    alt={currentUser.ho_ten || "Avatar"}
                    className="h-6 w-6 rounded-lg bg-primary/10 object-cover"
                  />
                  <span className="text-xs font-bold text-foreground">
                    {currentUser.ho_ten.split(' ').pop()}
                  </span>
                  <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isAccountMenuOpen ? "rotate-180" : ""}`} />
                </button>
                {isAccountMenuOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 top-full mt-3 w-72 overflow-hidden rounded-2xl border border-border bg-card shadow-2xl shadow-slate-900/10"
                  >
                    <div className="border-b border-border/70 p-4">
                      <p className="text-sm font-black text-foreground line-clamp-1">{currentUser.ho_ten}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1">{currentUser.email}</p>
                    </div>
                    <div className="p-2">
                      {accountMenuItems.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setIsAccountMenuOpen(false)}
                          className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold text-muted-foreground transition-colors hover:bg-secondary hover:text-primary"
                          role="menuitem"
                        >
                          <item.icon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </Link>
                      ))}
                    </div>
                    <div className="border-t border-border/70 p-2">
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold text-destructive transition-colors hover:bg-destructive/10"
                        role="menuitem"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>Thoát</span>
                      </button>
                    </div>
                  </div>
                )}
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
                <Link href="/" className="text-lg font-black py-4 border-b border-border/50">Trang chủ</Link>
                <Link href="/courses" className="text-lg font-black py-4 border-b border-border/50">Khóa học</Link>
                <Link href="/instructors" className="text-lg font-black py-4 border-b border-border/50">Giảng viên</Link>
                {currentUser && (
                  <Link href="/my-courses" className="text-lg font-black py-4 border-b border-border/50">Khóa học của tôi</Link>
                )}
                <Link href="/about" className="text-lg font-black py-4 border-b border-border/50">Giới thiệu</Link>
                {currentUser && accountMenuItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-3 text-lg font-black py-4 border-b border-border/50"
                  >
                    <item.icon className="h-5 w-5 text-primary" />
                    <span>{item.label}</span>
                  </Link>
                ))}
              </nav>
              <div className="pt-6">
                {currentUser ? (
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full bg-destructive/10 text-destructive py-4 rounded-2xl font-bold flex items-center justify-center space-x-2"
                  >
                    <LogOut className="h-5 w-5" />
                    <span>Thoát</span>
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
