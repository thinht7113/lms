"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { tokenHelper } from "@/services/api";

function safeNextPath(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }
  return value;
}

function LoginRedirectHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const nextPath = safeNextPath(searchParams.get("next"));

    if (tokenHelper.getToken()) {
      router.replace(nextPath);
      return;
    }

    const params = new URLSearchParams({
      auth: "login",
      next: nextPath,
    });

    router.replace(`/?${params.toString()}`);
  }, [router, searchParams]);

  return null;
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginRedirectHandler />
    </Suspense>
  );
}
