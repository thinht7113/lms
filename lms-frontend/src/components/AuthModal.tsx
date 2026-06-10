"use client";

import React, { useState, useEffect } from "react";
import { Mail, Lock, User, Phone, CheckCircle, Shield, X } from "lucide-react";
import { apiService } from "@/services/api";
import SystemLogo from "@/components/SystemLogo";

type AuthModalProps = {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: "login" | "register";
};

export default function AuthModal({ isOpen, onClose, initialTab = "login" }: AuthModalProps) {
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
    } else {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    };
  }, [isOpen]);

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
          onClose();
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
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

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-black py-3 rounded-xl shadow-lg shadow-purple-200 mt-4 transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-widest"
          >
            {loading ? "Đang xử lý..." : activeTab === "login" ? "Đăng nhập" : "Đăng ký"}
          </button>
        </form>
      </div>
    </div>
  );
}
