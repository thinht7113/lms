// ============================================================
// LuminaLMS Frontend — Auth & Profile API
// ============================================================

import type { User, UploadResponse, UploadAssetType } from "./types";
import { API_BASE_URL, fetchWithAuth, tokenHelper } from "./client";

export const authApi = {
  async login(email: string, mat_khau: string): Promise<{ access_token: string; user: User }> {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, mat_khau }),
      credentials: "include",
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || "Đăng nhập thất bại");
    }
    const data = await res.json();
    tokenHelper.setCurrentUser(data.user);
    return data;
  },

  async register(email: string, mat_khau: string, ho_ten: string, so_dien_thoai?: string, vai_tro = "student"): Promise<User> {
    const res = await fetch(`${API_BASE_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, mat_khau, ho_ten, so_dien_thoai, vai_tro }),
      credentials: "include",
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || "Đăng ký thất bại");
    }
    return await res.json();
  },

  async getProfile(): Promise<User> {
    const res = await fetchWithAuth(`${API_BASE_URL}/auth/profile`);
    if (!res.ok) throw new Error("Failed to fetch profile");
    const user = await res.json();
    tokenHelper.setCurrentUser(user);
    return user;
  },

  async updateProfile(payload: {
    ho_ten?: string;
    so_dien_thoai?: string;
    avatar_url?: string;
    mat_khau_cu?: string;
    mat_khau_moi?: string;
  }): Promise<User> {
    const res = await fetchWithAuth(`${API_BASE_URL}/auth/profile`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || "Không thể cập nhật hồ sơ");
    }
    const user = await res.json();
    tokenHelper.setCurrentUser(user);
    return user;
  },

  async uploadFile(file: File, assetType?: UploadAssetType, onProgress?: (progress: number) => void): Promise<UploadResponse> {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append("file", file);
      if (assetType) formData.append("asset_type", assetType);

      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${API_BASE_URL}/upload`);
      xhr.withCredentials = true;

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && onProgress) {
          const progress = Math.round((event.loaded / event.total) * 100);
          onProgress(progress);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            resolve(data);
          } catch (e) {
            reject(new Error("Invalid response format"));
          }
        } else {
          if (xhr.status === 401) {
            tokenHelper.removeCurrentUser();
            if (typeof window !== "undefined") {
              window.location.href = "/login";
            }
          }
          try {
            const errData = JSON.parse(xhr.responseText);
            reject(new Error(errData.detail || "Upload tệp thất bại"));
          } catch (e) {
            reject(new Error("Upload tệp thất bại"));
          }
        }
      };

      xhr.onerror = () => reject(new Error("Network error occurred during upload"));
      xhr.send(formData);
    });
  },

  async forgotPassword(email: string): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || "Không thể gửi yêu cầu quên mật khẩu");
    }
    return await res.json();
  },

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE_URL}/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, mat_khau_moi: newPassword }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || "Đặt lại mật khẩu thất bại");
    }
    return await res.json();
  },

  async logout(): Promise<void> {
    try {
      await fetchWithAuth(`${API_BASE_URL}/auth/logout`, { method: "POST" });
    } catch (err) {
      console.warn("Logout endpoint error:", err);
    } finally {
      tokenHelper.removeCurrentUser();
    }
  },
};
