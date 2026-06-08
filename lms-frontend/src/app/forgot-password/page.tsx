"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, KeyRound, CheckCircle, Shield, ArrowLeft, Key } from "lucide-react";
import { apiService } from "@/services/api";
import SystemLogo from "@/components/SystemLogo";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<"request" | "reset">("request");
  
  // State for step 1 (Request)
  const [email, setEmail] = useState("");
  
  // State for step 2 (Reset)
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const response = await apiService.forgotPassword(email);
      setSuccess(response.message);
      setTimeout(() => {
        setStep("reset");
        setSuccess(null);
      }, 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Đã xảy ra lỗi. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const response = await apiService.resetPassword(token, newPassword);
      setSuccess(response.message);
      setTimeout(() => {
        router.push("/login");
      }, 3000);
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

      {/* Forgot Password Box with Glassmorphism */}
      <div className="relative z-10 w-full max-w-md bg-card/80 rounded-[2rem] border border-border/80 shadow-2xl p-8 sm:p-10 backdrop-blur-xl">
        <div className="flex flex-col items-center justify-center mb-8">
          <Link href="/" className="mb-6">
            <SystemLogo />
          </Link>
          <h2 className="text-2xl font-black text-foreground tracking-tighter text-center">
            {step === "request" ? "Khôi phục mật khẩu" : "Đặt lại mật khẩu"}
          </h2>
          <p className="text-sm font-medium text-muted-foreground text-center mt-2 leading-relaxed">
            {step === "request"
              ? "Nhập email của bạn và chúng tôi sẽ gửi mã xác nhận để đặt lại mật khẩu."
              : "Nhập mã xác nhận chúng tôi vừa gửi và tạo mật khẩu mới."}
          </p>
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

        {step === "request" ? (
          <form onSubmit={handleRequestCode} className="space-y-5">
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

            <button
              type="submit"
              disabled={loading}
              className="w-full btn btn-primary py-3.5 mt-4 text-sm shadow-xl shadow-primary/20"
            >
              {loading ? "Đang xử lý..." : "Gửi mã xác nhận"}
            </button>
            
            <div className="text-center mt-4">
               <button type="button" onClick={() => setStep("reset")} className="text-xs font-bold text-primary hover:underline">
                 Đã có mã xác nhận?
               </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Mã xác nhận (Token)</label>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  required
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="123456"
                  className="w-full bg-background text-foreground text-sm font-medium rounded-xl py-2.5 pl-10 pr-4 border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-sm tracking-widest font-mono"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Mật khẩu mới</label>
              <div className="relative">
                <Key className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-background text-foreground text-sm font-medium rounded-xl py-2.5 pl-10 pr-4 border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn btn-primary py-3.5 mt-4 text-sm shadow-xl shadow-primary/20"
            >
              {loading ? "Đang xử lý..." : "Cập nhật mật khẩu"}
            </button>
          </form>
        )}

        <div className="mt-8 pt-6 border-t border-border/60 text-center">
          <Link href="/login" className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors flex items-center justify-center space-x-1">
            <ArrowLeft className="w-3 h-3" />
            <span>Trở về Đăng nhập</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
