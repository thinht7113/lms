"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function VerifyCertificateSearchPage() {
  const router = useRouter();
  const [uuid, setUuid] = useState("");
  const [error, setError] = useState("");

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const cleanUuid = uuid.trim();
    if (!cleanUuid) {
      setError("Vui lòng nhập mã UUID chứng chỉ.");
      return;
    }

    // UUID regex check (basic 8-4-4-4-12 hex string or similar)
    if (cleanUuid.length < 8) {
      setError("Mã UUID không hợp lệ. Vui lòng kiểm tra lại.");
      return;
    }

    router.push(`/verify/${cleanUuid}`);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-slate-100 rounded-3xl p-6 md:p-10 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-3 bg-gradient-to-r from-indigo-500 to-violet-500"></div>

        <div className="space-y-8">
          <div className="text-center">
            <div className="w-20 h-20 bg-indigo-50 text-indigo-600 border border-indigo-250/20 rounded-full flex items-center justify-center mx-auto mb-4 text-4xl shadow-md">
              <i className="ph-fill ph-shield-check"></i>
            </div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Tra cứu chứng chỉ số</h1>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mt-1.5">
              Hệ thống xác thực Lumina LMS
            </p>
          </div>

          <form onSubmit={handleVerify} className="space-y-5">
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">Mã UUID chứng chỉ *</label>
              <input
                type="text"
                placeholder="Nhập hoặc dán mã UUID..."
                value={uuid}
                onChange={(e) => {
                  setUuid(e.target.value);
                  setError("");
                }}
                className="w-full px-4 py-3 border border-slate-200 focus:border-indigo-500 outline-none rounded-xl text-sm font-medium text-slate-700 bg-white transition-colors"
                autoFocus
              />
              {error && (
                <p className="text-xs font-bold text-rose-500 mt-2 flex items-center gap-1">
                  <i className="ph-fill ph-warning-circle"></i> {error}
                </p>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold shadow-lg shadow-indigo-600/10 hover:shadow-indigo-600/25 transition-all text-center flex items-center justify-center gap-2"
            >
              <i className="ph-bold ph-magnifying-glass text-lg"></i> Bắt đầu xác thực
            </button>
          </form>

          <div className="text-center border-t border-slate-100 pt-6 flex justify-between text-xs font-bold text-slate-400">
            <Link href="/" className="hover:text-indigo-600 transition-colors">
              Về trang chủ
            </Link>
            <Link href="/login" className="hover:text-indigo-600 transition-colors">
              Đăng nhập tài khoản
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
