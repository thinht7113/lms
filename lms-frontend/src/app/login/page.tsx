"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/context/user-context";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const { login, loginWithSocial, isAuthenticated } = useUser();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated) {
      router.push("/");
    }
  }, [isAuthenticated, router]);

  if (isAuthenticated) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError("Vui lòng nhập đầy đủ thông tin."); return; }
    setError("");
    setLoading(true);
    const result = await login(email, password);
    if (result.success) {
      router.push("/");
    } else {
      setError(result.error || "Đăng nhập thất bại.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-5 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 right-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute -top-20 -right-20 w-96 h-96 bg-primary/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 left-10 w-64 h-64 bg-secondary/10 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-md relative z-10 animate-slide-up">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 group text-decoration-none">
            <div className="w-12 h-12 rounded-xl bg-surface-container-high border border-outline-variant flex items-center justify-center group-hover:border-primary transition-colors text-primary font-bold text-xl">
              L
            </div>
            <span className="text-[28px] font-bold tracking-tight text-on-surface">Lumina <span className="text-primary font-normal">LMS</span></span>
          </Link>
          <p className="text-sm text-on-surface-variant mt-2">Đăng nhập vào tài khoản của bạn</p>
        </div>

        {/* Form */}
        <div className="glass-panel bg-surface rounded-2xl p-8 border border-outline-variant shadow-lg">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-on-surface block mb-1.5">Email</label>
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="Nhập email"
                className="w-full px-4 py-3 rounded-xl border border-outline-variant bg-surface-container-lowest text-on-surface placeholder:text-outline focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                autoFocus
              />
            </div>

            <div className="mb-6">
              <label className="text-sm font-semibold text-on-surface block mb-1.5">Mật khẩu</label>
              <input
                type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu"
                className="w-full px-4 py-3 rounded-xl border border-outline-variant bg-surface-container-lowest text-on-surface placeholder:text-outline focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              />
            </div>

            {error && (
              <div className="px-4 py-3 rounded-xl bg-error-container text-on-error-container text-sm font-medium flex items-center gap-2 mb-4">
                <i className="ph-fill ph-warning-circle text-lg"></i> {error}
              </div>
            )}

            <button
              type="submit" disabled={loading}
              className="w-full py-3.5 bg-primary hover:bg-primary/90 text-on-primary rounded-xl font-bold text-base transition-all shadow-md flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <><i className="ph ph-spinner-gap animate-spin text-xl"></i> Đang đăng nhập...</>
              ) : (
                <> Đăng nhập</>
              )}
            </button>

            <div className="flex items-center gap-4 my-6">
              <div className="flex-1 h-px bg-outline-variant"></div>
              <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Hoặc đăng nhập bằng</span>
              <div className="flex-1 h-px bg-outline-variant"></div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={async () => {
                  setLoading(true);
                  const res = await loginWithSocial("google", "google-mock-123", "student@test.com", "Nguyễn Học Viên");
                  if (res.success) {
                    router.push("/");
                  } else {
                    setError(res.error || "Đăng nhập Google thất bại.");
                  }
                  setLoading(false);
                }}
                disabled={loading}
                className="w-full py-3 bg-surface-container hover:bg-surface-container-high border border-outline-variant rounded-xl font-semibold text-on-surface flex items-center justify-center gap-2 transition-colors"
              >
                <i className="ph-fill ph-google-logo text-[#DB4437] text-xl"></i> Google
              </button>

              <button
                type="button"
                onClick={async () => {
                  setLoading(true);
                  const res = await loginWithSocial("facebook", "fb-mock-456", "instructor@test.com", "Trần Giảng Viên");
                  if (res.success) {
                    router.push("/");
                  } else {
                    setError(res.error || "Đăng nhập Facebook thất bại.");
                  }
                  setLoading(false);
                }}
                disabled={loading}
                className="w-full py-3 bg-surface-container hover:bg-surface-container-high border border-outline-variant rounded-xl font-semibold text-on-surface flex items-center justify-center gap-2 transition-colors"
              >
                <i className="ph-fill ph-facebook-logo text-[#4267B2] text-xl"></i> Facebook
              </button>
            </div>
          </form>

          <div className="text-center mt-6 text-sm text-on-surface-variant">
            Chưa có tài khoản?{" "}
            <Link href="/register" className="text-primary font-semibold hover:underline">
              Đăng ký ngay
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
