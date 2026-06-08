"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, User, Phone, CheckCircle, Shield, ArrowLeft } from "lucide-react";
import { apiService, tokenHelper } from "@/services/api";
import SystemLogo from "@/components/SystemLogo";

export default function LoginPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("student");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // If already logged in, return to the homepage.
  useEffect(() => {
    if (tokenHelper.getToken()) {
      router.push("/");
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (activeTab === "login") {
        await apiService.login(email, password);
        setSuccess("Đăng nhập thành công! Đang chuyển hướng...");
        setTimeout(() => {
          router.push("/");
        }, 1000);
      } else {
        await apiService.register(email, password, fullName, phone, role);
        setSuccess("Đăng ký tài khoản thành công! Hãy đăng nhập.");
        setActiveTab("login");
        setPassword("");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Đã xảy ra lỗi. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center bg-background py-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Dynamic Animated Background Gradients (Lumina Style) */}
      <div className="absolute inset-0 z-0 overflow-hidden bg-slate-50">
        <div className="absolute top-0 right-0 w-full h-full bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] opacity-40 -z-10" />
        <div className="absolute -top-[40%] -left-[20%] w-[80%] h-[80%] rounded-full bg-blue-500/10 blur-[120px] animate-pulse duration-10000" />
        <div className="absolute -bottom-[40%] -right-[20%] w-[80%] h-[80%] rounded-full bg-indigo-500/10 blur-[120px] animate-pulse duration-7000" />
      </div>

      {/* Login Box with Glassmorphism */}
      <div className="relative z-10 w-full max-w-md bg-card/80 rounded-[2rem] border border-border/80 shadow-2xl p-8 sm:p-10 backdrop-blur-xl">
        <div className="flex flex-col items-center justify-center mb-8">
          <Link href="/" className="mb-6">
            <SystemLogo />
          </Link>
          <h2 className="text-2xl font-black text-foreground tracking-tighter text-center">
            {activeTab === "login" ? "Chào mừng trở lại!" : "Mở khóa tiềm năng của bạn"}
          </h2>
          <p className="text-sm font-medium text-muted-foreground text-center mt-2 leading-relaxed">
            {activeTab === "login"
              ? "Đăng nhập ngay để tiếp tục hành trình học tập."
              : "Khởi tạo tài khoản miễn phí để tiếp cận kho tàng tri thức."}
          </p>
        </div>

        {/* Form Tabs */}
        <div className="flex bg-secondary rounded-xl p-1 mb-8 border border-border/60">
          <button
            onClick={() => {
              setActiveTab("login");
              setError(null);
            }}
            className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-widest rounded-lg transition-all ${activeTab === "login"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
              }`}
          >
            Đăng nhập
          </button>
          <button
            onClick={() => {
              setActiveTab("register");
              setError(null);
            }}
            className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-widest rounded-lg transition-all ${activeTab === "register"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
              }`}
          >
            Đăng ký
          </button>
        </div>

        {/* Message Alert Boxes */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-bold flex items-center gap-3">
            <Shield className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs font-bold flex items-center gap-3">
            <CheckCircle className="h-4 w-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {activeTab === "register" && (
            <>
              {/* Full name field */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Họ và Tên</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Nguyễn Văn A"
                    className="w-full bg-background text-foreground text-sm font-medium rounded-xl py-2.5 pl-10 pr-4 border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-sm"
                  />
                </div>
              </div>

              {/* Phone number field */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Số điện thoại</label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0912345678"
                    className="w-full bg-background text-foreground text-sm font-medium rounded-xl py-2.5 pl-10 pr-4 border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-sm"
                  />
                </div>
              </div>
            </>
          )}

          {/* Email field */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Địa chỉ Email</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@luminalms.vn"
                className="w-full bg-background text-foreground text-sm font-medium rounded-xl py-2.5 pl-10 pr-4 border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-sm"
              />
            </div>
          </div>

          {/* Password field */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Mật khẩu</label>
              {activeTab === "login" && (
                <a href="#" className="text-[10px] font-bold text-primary hover:underline">Quên mật khẩu?</a>
              )}
            </div>

            <div className="relative">
              <Lock className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-background text-foreground text-sm font-medium rounded-xl py-2.5 pl-10 pr-4 border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-sm"
              />
            </div>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full btn btn-primary py-3.5 mt-4 text-sm shadow-xl shadow-primary/20"
          >
            {loading ? "Đang xử lý..." : activeTab === "login" ? "Đăng nhập" : "Tạo tài khoản"}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-border/60 text-center">
          <Link href="/" className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors flex items-center justify-center space-x-1">
            <ArrowLeft className="w-3 h-3" />
            <span>Trở về Trang chủ LUMINA</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
