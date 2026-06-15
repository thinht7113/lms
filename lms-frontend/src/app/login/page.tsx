"use client";

import { useEffect, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import { tokenHelper } from "@/services/api";

function LoginRedirectHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;

    const handleUserUpdate = () => {
      if (tokenHelper.getToken()) {
        const nextPath = searchParams.get("next") || "/";
        router.replace(nextPath);
      }
    };

    window.addEventListener("lumina-user-updated", handleUserUpdate);
    handleUserUpdate();

    const timer = setTimeout(() => {
      if (!tokenHelper.getToken() && !searchParams.get("auth")) {
        const nextPath = searchParams.get("next") || "/";
        router.replace(`/login?auth=login&next=${encodeURIComponent(nextPath)}`);
      }
    }, 100);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("lumina-user-updated", handleUserUpdate);
    };
  }, [router, searchParams, isClient]);

  // Prevent hydration mismatch by returning a clean shell on the server
  if (!isClient) {
    return <div className="min-h-screen bg-slate-50 flex flex-col" />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      <div className="flex-grow flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-xl max-w-md w-full text-center space-y-6">
          <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
          </div>
          <h1 className="text-2xl font-black text-slate-900">Yêu cầu đăng nhập</h1>
          <p className="text-slate-500 font-medium text-sm">
            Bạn cần phải đăng nhập hệ thống để tiếp tục truy cập vào khu vực này.
          </p>
          <div className="pt-4 animate-pulse">
            <p className="text-purple-600 font-bold text-xs uppercase tracking-widest">Đang chờ đăng nhập...</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex flex-col" />}>
      <LoginRedirectHandler />
    </Suspense>
  );
}
