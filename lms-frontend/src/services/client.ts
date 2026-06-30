// ============================================================
// LuminaLMS Frontend — HTTP client infrastructure
// ============================================================

import type { User } from "./types";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
const PUBLIC_FETCH_TIMEOUT_MS = 8000;
const publicCache = new Map<string, { expiresAt: number; data: unknown }>();

export async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = PUBLIC_FETCH_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: options.signal || controller.signal,
    });
  } finally {
    globalThis.clearTimeout(timeout);
  }
}

export async function getCachedJson<T>(url: string, ttlMs = 30_000): Promise<T> {
  const now = Date.now();
  const cached = publicCache.get(url);
  if (cached && cached.expiresAt > now) {
    return cached.data as T;
  }

  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}`);
  const data = await res.json();
  publicCache.set(url, { data, expiresAt: now + ttlMs });
  return data as T;
}

// Helpers for localStorage Token management
export const tokenHelper = {
  setRoleCookie(role?: string | null) {
    if (typeof document === "undefined") return;
    if (!role) {
      document.cookie = "lumina_role=; Path=/; Max-Age=0; SameSite=Lax";
      return;
    }
    document.cookie = `lumina_role=${encodeURIComponent(role)}; Path=/; Max-Age=86400; SameSite=Lax`;
  },
  getToken(): string | null {
    if (typeof window === "undefined") return null;
    const legacyToken = localStorage.getItem("lumina_token");
    if (legacyToken) return legacyToken;
    return localStorage.getItem("lumina_user") ? "cookie-session" : null;
  },
  setToken(_token: string) {
    if (typeof window !== "undefined") {
      localStorage.removeItem("lumina_token");
    }
  },
  removeToken() {
    if (typeof window !== "undefined") {
      localStorage.removeItem("lumina_token");
    }
  },
  getCurrentUser(): User | null {
    if (typeof window !== "undefined") {
      const user = localStorage.getItem("lumina_user");
      return user ? JSON.parse(user) : null;
    }
    return null;
  },
  setCurrentUser(user: User) {
    if (typeof window !== "undefined") {
      localStorage.setItem("lumina_user", JSON.stringify(user));
      this.setRoleCookie(user?.vai_tro);
    }
  },
  removeCurrentUser() {
    if (typeof window !== "undefined") {
      localStorage.removeItem("lumina_user");
      this.setRoleCookie(null);
    }
  }
};

// Helper for Fetching with Auth Token
export async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = new Headers(options.headers || {});

  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: "include",
  });

  if (response.status === 401) {
    tokenHelper.removeCurrentUser();
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  }

  return response;
}
