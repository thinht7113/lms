"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export type RoleType = "guest" | "student" | "instructor" | "admin";

interface UserInfo {
  id: number;
  email: string;
  ho_ten: string;
  vai_tro: RoleType;
  ngay_dang_ky?: string;
  so_dien_thoai?: string;
  avatar_url?: string;
}

interface UserContextType {
  user: UserInfo | null;
  token: string | null;
  role: RoleType;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  loginWithSocial: (provider: "google" | "facebook", provider_id: string, email: string, ho_ten: string, avatar_url?: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, name: string, phone: string, role: "student" | "instructor") => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  wishlist: number[];
  refreshWishlist: () => Promise<void>;
  cartCount: number;
  refreshCartCount: () => Promise<void>;
}

const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1";

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [wishlist, setWishlist] = useState<number[]>([]);
  const [cartCount, setCartCount] = useState(0);

  const refreshCartCount = async () => {
    const savedToken = localStorage.getItem("lms_token");
    if (!savedToken) return;
    try {
      const res = await fetch(`${API}/cart`, {
        headers: { "Authorization": `Bearer ${savedToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCartCount(data.chi_tiet_gio_hang?.length || 0);
      }
    } catch (e) {
      console.error("Failed to load cart count", e);
    }
  };

  const refreshWishlist = async () => {
    const savedToken = localStorage.getItem("lms_token");
    if (!savedToken) return;
    try {
      const res = await fetch(`${API}/courses/wishlist/me`, {
        headers: { "Authorization": `Bearer ${savedToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setWishlist(data.map((w: any) => w.khoa_hoc.id));
      }
    } catch (e) {
      console.error("Failed to load wishlist", e);
    }
  };

  // Restore session from localStorage on mount and fetch fresh data
  useEffect(() => {
    const loadSession = async () => {
      const savedToken = localStorage.getItem("lms_token");
      const savedUserStr = localStorage.getItem("lms_user");
      
      if (savedToken) {
        try {
          if (savedUserStr) setUser(JSON.parse(savedUserStr));
          setToken(savedToken);
          
          const res = await fetch(`${API}/auth/profile`, {
            headers: { "Authorization": `Bearer ${savedToken}` }
          });
          
          if (res.ok) {
            const data = await res.json();
            const userInfo: UserInfo = {
              id: data.id,
              email: data.email,
              ho_ten: data.ho_ten,
              vai_tro: data.vai_tro as RoleType,
              ngay_dang_ky: data.ngay_tao,
              so_dien_thoai: data.so_dien_thoai,
              avatar_url: data.avatar_url,
            };
            setUser(userInfo);
            localStorage.setItem("lms_user", JSON.stringify(userInfo));
            await refreshWishlist();
            if (userInfo.vai_tro === "student") {
                await refreshCartCount();
            }
          } else {
            localStorage.removeItem("lms_token");
            localStorage.removeItem("lms_user");
            setToken(null);
            setUser(null);
          }
        } catch (e) {
          console.error("Lỗi đồng bộ hồ sơ:", e);
        }
      }
      setIsLoading(false);
    };
    loadSession();
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, mat_khau: password }),
      });

      if (res.ok) {
        const data = await res.json();
        const userInfo: UserInfo = {
          id: data.user.id,
          email: data.user.email,
          ho_ten: data.user.ho_ten,
          vai_tro: data.user.vai_tro as RoleType,
          ngay_dang_ky: data.user.ngay_tao,
          so_dien_thoai: data.user.so_dien_thoai,
          avatar_url: data.user.avatar_url,
        };
        setToken(data.access_token);
        setUser(userInfo);
        localStorage.setItem("lms_token", data.access_token);
        localStorage.setItem("lms_user", JSON.stringify(userInfo));
        await refreshWishlist();
        if (userInfo.vai_tro === "student") {
            await refreshCartCount();
        }
        return { success: true };
      } else {
        const err = await res.json();
        return { success: false, error: err.detail || "Email hoặc mật khẩu không đúng." };
      }
    } catch {
      return { success: false, error: "Không thể kết nối đến máy chủ. Vui lòng kiểm tra Backend." };
    }
  };

  const register = async (email: string, password: string, name: string, phone: string, role: "student" | "instructor"): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch(`${API}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          mat_khau: password,
          ho_ten: name,
          so_dien_thoai: phone,
          vai_tro: role,
        }),
      });

      if (res.ok) {
        // Auto-login after successful registration
        return await login(email, password);
      } else {
        const err = await res.json();
        return { success: false, error: err.detail || "Đăng ký thất bại." };
      }
    } catch {
      return { success: false, error: "Không thể kết nối đến máy chủ." };
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("lms_token");
    localStorage.removeItem("lms_user");
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  };

  const loginWithSocial = async (provider: "google" | "facebook", provider_id: string, email: string, ho_ten: string, avatar_url?: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch(`${API}/auth/social`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, provider_id, email, ho_ten, avatar_url }),
      });

      if (res.ok) {
        const data = await res.json();
        const userInfo: UserInfo = {
          id: data.user.id,
          email: data.user.email,
          ho_ten: data.user.ho_ten,
          vai_tro: data.user.vai_tro as RoleType,
          ngay_dang_ky: data.user.ngay_tao,
          so_dien_thoai: data.user.so_dien_thoai,
          avatar_url: data.user.avatar_url,
        };
        setToken(data.access_token);
        setUser(userInfo);
        localStorage.setItem("lms_token", data.access_token);
        localStorage.setItem("lms_user", JSON.stringify(userInfo));
        return { success: true };
      } else {
        const err = await res.json();
        return { success: false, error: err.detail || `Đăng nhập ${provider} thất bại.` };
      }
    } catch {
      return { success: false, error: "Không thể kết nối đến máy chủ." };
    }
  };

  const role: RoleType = user?.vai_tro || "guest";
  const isAuthenticated = !!token && !!user;

  return (
    <UserContext.Provider
      value={{
        user,
        token,
        role: user?.vai_tro || "guest",
        isAuthenticated: !!user,
        isLoading,
        login,
        loginWithSocial,
        register,
        logout,
        wishlist,
        refreshWishlist,
        cartCount,
        refreshCartCount,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
