"use client";

import { useRouter } from "next/navigation";
import { useUser } from "@/context/user-context";
import { useEffect } from "react";

export default function InstructorLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { role, isAuthenticated, isLoading } = useUser();

  // 1. Immediate client-side check using localStorage to avoid flash/loader if definitely unauthorized
  let isDefinitelyMismatched = false;
  if (typeof window !== "undefined") {
    const savedToken = localStorage.getItem("lms_token");
    const savedUserStr = localStorage.getItem("lms_user");
    if (!savedToken) {
      isDefinitelyMismatched = true;
    } else if (savedUserStr) {
      try {
        const u = JSON.parse(savedUserStr);
        if (u.vai_tro !== "instructor") {
          isDefinitelyMismatched = true;
        }
      } catch {
        isDefinitelyMismatched = true;
      }
    }
  }

  // 2. Perform redirect in useEffect when status is resolved
  useEffect(() => {
    if (!isLoading && (!isAuthenticated || role !== "instructor")) {
      router.replace(isAuthenticated ? "/" : "/login");
    }
  }, [isLoading, isAuthenticated, role, router]);

  // If loading and not definitely mismatched, show a minimal loading spinner
  if (isLoading && !isDefinitelyMismatched) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] px-4">
        <div className="bg-white/80 backdrop-blur-xl p-10 rounded-3xl text-center border border-slate-200/60 max-w-md w-full shadow-2xl flex flex-col items-center gap-4">
          <i className="ph ph-spinner-gap animate-spin text-5xl text-indigo-600"></i>
          <p className="text-slate-500 font-bold tracking-wide">Đang kiểm tra quyền truy cập...</p>
        </div>
      </div>
    );
  }

  // If definitely not authenticated or not an instructor, don't render anything (redirecting soon)
  if (!isAuthenticated || role !== "instructor") {
    return null;
  }

  return <>{children}</>;
}
