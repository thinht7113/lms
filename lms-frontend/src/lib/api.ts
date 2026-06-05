const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1";

export async function apiFetch(path: string, token?: string | null, options?: RequestInit) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options?.headers as Record<string, string> || {}),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(`${API}${path}`, { ...options, headers });
  return res;
}

export function formatPrice(price: number | string): string {
  const num = typeof price === "string" ? parseFloat(price) : price;
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(num);
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds} giây`;
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return sec > 0 ? `${min} phút ${sec}s` : `${min} phút`;
}

export function levelLabel(level: string): string {
  switch (level) {
    case "beginner": return "Cơ bản";
    case "intermediate": return "Trung cấp";
    case "advanced": return "Nâng cao";
    default: return level;
  }
}

// Wrapper giả lập Axios dành cho các API call đơn giản
const api = {
  get: async (path: string) => {
    const token = typeof window !== "undefined" ? localStorage.getItem("lms_token") : null;
    const res = await apiFetch(path, token);
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw { response: { data: errData } };
    }
    return { data: await res.json() };
  },
  post: async (path: string, body: any) => {
    const token = typeof window !== "undefined" ? localStorage.getItem("lms_token") : null;
    const res = await apiFetch(path, token, { method: "POST", body: JSON.stringify(body) });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw { response: { data: errData } };
    }
    return { data: await res.json() };
  },
  put: async (path: string, body: any) => {
    const token = typeof window !== "undefined" ? localStorage.getItem("lms_token") : null;
    const res = await apiFetch(path, token, { method: "PUT", body: JSON.stringify(body) });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw { response: { data: errData } };
    }
    return { data: await res.json() };
  },
  delete: async (path: string) => {
    const token = typeof window !== "undefined" ? localStorage.getItem("lms_token") : null;
    const res = await apiFetch(path, token, { method: "DELETE" });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw { response: { data: errData } };
    }
    return { data: await res.json() };
  }
};

export function getCourseImage(title: string): string {
  const lowercase = title.toLowerCase();
  if (lowercase.includes("react") || lowercase.includes("frontend") || lowercase.includes("next") || lowercase.includes("web") || lowercase.includes("html") || lowercase.includes("css")) {
    return "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=500&auto=format&fit=crop&q=60";
  }
  if (lowercase.includes("python") || lowercase.includes("data") || lowercase.includes("machine") || lowercase.includes("ai") || lowercase.includes("máy học")) {
    return "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=500&auto=format&fit=crop&q=60";
  }
  if (lowercase.includes("node") || lowercase.includes("backend") || lowercase.includes("fastapi") || lowercase.includes("api") || lowercase.includes("cơ sở dữ liệu") || lowercase.includes("sql")) {
    return "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=500&auto=format&fit=crop&q=60";
  }
  if (lowercase.includes("design") || lowercase.includes("ui") || lowercase.includes("ux") || lowercase.includes("thiết kế") || lowercase.includes("figma")) {
    return "https://images.unsplash.com/photo-1561070791-26c113006238?w=500&auto=format&fit=crop&q=60";
  }
  return "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=500&auto=format&fit=crop&q=60";
}

export default api;
