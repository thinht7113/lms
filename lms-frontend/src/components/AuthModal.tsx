"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, Lock, User, Phone, CheckCircle, Shield, X } from "lucide-react";
import { apiService } from "@/services/api";
import SystemLogo from "@/components/SystemLogo";

type AuthModalProps = {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: "login" | "register";
};

export default function AuthModal({ isOpen, onClose, initialTab = "login" }: AuthModalProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<"login" | "register">(initialTab);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("student");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
      setEmail("");
      setPassword("");
      setFullName("");
      setPhone("");
      setError(null);
      setSuccess(null);
      setActiveTab(initialTab);
    } else {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    };
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (activeTab === "login") {
        await apiService.login(email, password);
        setSuccess("Đăng nhập thành công!");

        // Dispatch custom events to update Navbar user and cart info
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("lumina-user-updated"));
          window.dispatchEvent(new Event("lumina-cart-updated"));
        }

        setTimeout(() => {
          onClose(); // Đóng modal trước
          const nextPath = searchParams.get("next");
          if (nextPath) {
            router.push(nextPath);
          }
        }, 800);
      } else {
        await apiService.register(email, password, fullName, phone, role);
        setSuccess("Đăng ký tài khoản thành công! Vui lòng đăng nhập.");
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="flex min-h-full items-center justify-center p-4">
        {/* Modal card */}
        <div className="relative z-10 w-full max-w-md bg-white rounded-[2rem] border border-slate-200 shadow-2xl p-8 sm:p-10 animate-in zoom-in-95 duration-200">

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-6 right-6 rounded-xl border border-slate-200 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <span className="sr-only">Đóng</span>
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col items-center justify-center mb-6">
            <div className="mb-4">
              <SystemLogo />
            </div>
            <h2 className="text-xl font-black text-slate-950 tracking-tighter text-center">
              {activeTab === "login" ? "Chào mừng trở lại!" : "Tạo tài khoản mới"}
            </h2>
            <p className="text-xs font-semibold text-slate-500 text-center mt-2 leading-relaxed">
              {activeTab === "login"
                ? "Đăng nhập ngay để tiếp tục hành trình học tập."
                : "Đăng ký miễn phí để tiếp cận các khóa học."}
            </p>
          </div>

          {/* Form Tabs */}
          <div className="flex bg-slate-100 rounded-xl p-1 mb-6 border border-slate-200">
            <button
              onClick={() => {
                setActiveTab("login");
                setError(null);
              }}
              className={`flex-1 py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-all ${activeTab === "login"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-900"
                }`}
            >
              Đăng nhập
            </button>
            <button
              onClick={() => {
                setActiveTab("register");
                setError(null);
              }}
              className={`flex-1 py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-all ${activeTab === "register"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-900"
                }`}
            >
              Đăng ký
            </button>
          </div>

          {/* Message Alerts */}
          {error && (
            <div className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-3">
              <Shield className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="mb-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold flex items-center gap-3">
              <CheckCircle className="h-4 w-4 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {activeTab === "register" && (
              <>
                {/* Full name field */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Họ và Tên</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full bg-slate-50 text-slate-950 text-sm font-semibold rounded-xl py-2.5 pl-10 pr-4 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:bg-white transition-all"
                    />
                  </div>
                </div>

                {/* Phone number field */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Số điện thoại</label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                    <input
                      type="tel"
                      pattern="^0[0-9]{9}$"
                      title="Số điện thoại phải bắt đầu bằng số 0 và có đúng 10 chữ số"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-slate-50 text-slate-950 text-sm font-semibold rounded-xl py-2.5 pl-10 pr-4 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:bg-white transition-all"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Email field */}
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Địa chỉ Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 text-slate-950 text-sm font-semibold rounded-xl py-2.5 pl-10 pr-4 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* Password field */}
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Mật khẩu</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 text-slate-950 text-sm font-semibold rounded-xl py-2.5 pl-10 pr-4 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:bg-white transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-black py-3 rounded-xl shadow-lg shadow-purple-200 mt-4 transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-widest"
            >
              {loading ? "Đang xử lý..." : activeTab === "login" ? "Đăng nhập" : "Đăng ký"}
            </button>

            {/* Social Login Separator */}
            <div className="relative mt-6 mb-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-slate-400 font-medium">Hoặc tiếp tục với</span>
              </div>
            </div>

            {/* Social Login Buttons */}
            <div className="grid grid-cols-2 gap-3 mt-4">
              <button
                type="button"
                onClick={() => setError("Tính năng đăng nhập bằng Google đang được tích hợp. Vui lòng quay lại sau!")}
                className="flex items-center justify-center gap-2 py-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                <span className="text-sm font-semibold text-slate-600">Google</span>
              </button>
              <button
                type="button"
                onClick={() => setError("Tính năng đăng nhập bằng Facebook đang được tích hợp. Vui lòng quay lại sau!")}
                className="flex items-center justify-center gap-2 py-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
              >
                <svg className="h-5 w-5 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                <span className="text-sm font-semibold text-slate-600">Facebook</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
