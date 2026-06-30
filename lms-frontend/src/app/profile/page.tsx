"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Award, Camera, Mail, Phone, RefreshCw, Settings, ShieldCheck, UserRound } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { apiService, tokenHelper, User } from "@/services/api";
import { useToast } from "@/contexts/ToastContext";
import { useDominantImageColor } from "@/hooks/useDominantImageColor";

export default function ProfilePage() {
  const router = useRouter();
  const toast = useToast();
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    if (!tokenHelper.getToken()) {
      router.push("/login");
      return;
    }

    async function loadProfile() {
      setLoading(true);
      try {
        const data = await apiService.getProfile();
        setProfile(data);
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [router]);

  const roleLabel: Record<string, string> = {
    student: "Học viên",
    instructor: "Giảng viên",
    admin: "Quản trị viên",
  };

  const roleFallbackColor: Record<string, string> = {
    student: "37, 99, 235",
    instructor: "124, 58, 237",
    admin: "15, 23, 42",
  };

  const avatarSrc = profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.ho_ten}`;
  const dominantColor = useDominantImageColor(avatarSrc, roleFallbackColor[profile?.vai_tro || "student"] || roleFallbackColor.student);
  const coverBgStyle = {
    background: `
      radial-gradient(circle at 18% 35%, rgba(${dominantColor}, 0.92), transparent 42%),
      linear-gradient(135deg, rgba(${dominantColor}, 0.82), rgba(15, 23, 42, 0.94))
    `,
  };

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !profile) return;

    setUploadingAvatar(true);
    try {
      const uploaded = await apiService.uploadFile(file, "avatar");
      const updatedProfile = await apiService.updateProfile({
        ho_ten: profile.ho_ten,
        so_dien_thoai: profile.so_dien_thoai,
        avatar_url: uploaded.url,
      });

      setProfile(updatedProfile);
      window.dispatchEvent(new Event("lumina-user-updated"));
      toast.success("Đã cập nhật ảnh đại diện");
    } catch (error: any) {
      toast.error(error.message || "Không thể cập nhật ảnh đại diện");
    } finally {
      setUploadingAvatar(false);
      event.target.value = "";
    }
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[#F8F9FA] pt-32 pb-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-primary">Tài khoản Lumina</p>
          </div>

          {loading || !profile ? (
            <div className="flex h-80 flex-col items-center justify-center gap-4 rounded-[2rem] border border-border bg-card">
              <RefreshCw className="h-8 w-8 animate-spin text-primary" />
              <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Đang tải hồ sơ...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
              <section className="lg:col-span-5">
                <div className="overflow-hidden rounded-[2rem] border border-border/60 bg-card shadow-sm">
                  <div className="h-32 transition-colors duration-500" style={coverBgStyle} />
                  <div className="-mt-16 px-8 pb-8">
                    <div className="relative inline-block">
                      <img
                        src={avatarSrc}
                        alt={profile.ho_ten}
                        className="h-32 w-32 rounded-[2rem] border-4 border-card bg-primary/10 object-cover shadow-xl"
                      />
                      <label
                        className={`absolute -bottom-3 -right-3 rounded-2xl bg-primary p-3 text-white shadow-lg shadow-primary/30 transition-colors ${
                          uploadingAvatar ? "cursor-wait opacity-80" : "cursor-pointer hover:bg-blue-700"
                        }`}
                        title="Đổi ảnh đại diện"
                        aria-label="Đổi ảnh đại diện"
                      >
                        {uploadingAvatar ? <RefreshCw className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/gif,image/webp"
                          className="hidden"
                          onChange={handleAvatarChange}
                          disabled={uploadingAvatar}
                        />
                      </label>
                    </div>
                    <h2 className="mt-6 text-2xl font-black text-slate-950">{profile.ho_ten}</h2>
                    <p className="mt-2 inline-flex rounded-full bg-primary/10 px-4 py-2 text-xs font-black uppercase tracking-widest text-primary">
                      {roleLabel[profile.vai_tro] || profile.vai_tro}
                    </p>

                    <div className="mt-8 space-y-3">
                      <div className="flex items-center gap-3 rounded-2xl bg-secondary p-4">
                        <Mail className="h-5 w-5 text-primary" />
                        <span className="text-sm font-bold text-slate-700">{profile.email}</span>
                      </div>
                      <div className="flex items-center gap-3 rounded-2xl bg-secondary p-4">
                        <Phone className="h-5 w-5 text-primary" />
                        <span className="text-sm font-bold text-slate-700">{profile.so_dien_thoai || "Chưa cập nhật số điện thoại"}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <section className="lg:col-span-7">
                <div className="rounded-[2rem] border border-border/60 bg-card p-8 shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="rounded-2xl bg-primary/10 p-4">
                      <UserRound className="h-7 w-7 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-slate-950">Khu vực tài khoản</h2>
                      <p className="text-sm text-muted-foreground">Các lối tắt chính cho hồ sơ của bạn.</p>
                    </div>
                  </div>

                  <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Link href="/settings" className="rounded-2xl border border-border bg-background p-5 transition-all hover:-translate-y-1 hover:shadow-lg">
                      <Settings className="h-6 w-6 text-primary" />
                      <h3 className="mt-4 font-black text-slate-950">Chỉnh sửa hồ sơ</h3>
                      <p className="mt-1 text-sm text-muted-foreground">Cập nhật thông tin cá nhân và ảnh đại diện.</p>
                    </Link>
                    <Link href="/certificates" className="rounded-2xl border border-border bg-background p-5 transition-all hover:-translate-y-1 hover:shadow-lg">
                      <ShieldCheck className="h-6 w-6 text-primary" />
                      <h3 className="mt-4 font-black text-slate-950">Chứng chỉ</h3>
                      <p className="mt-1 text-sm text-muted-foreground">Xem chứng chỉ đã đạt được.</p>
                    </Link>
                    {profile.vai_tro === "instructor" && (
                      <Link href="/instructor/dashboard" className="rounded-2xl border border-border bg-background p-5 transition-all hover:-translate-y-1 hover:shadow-lg">
                        <Award className="h-6 w-6 text-primary" />
                        <h3 className="mt-4 font-black text-slate-950">Quản lý giảng viên</h3>
                        <p className="mt-1 text-sm text-muted-foreground">Vào khu quản lý khóa học của bạn.</p>
                      </Link>
                    )}
                    {profile.vai_tro === "admin" && (
                      <Link href="/admin" prefetch={false} className="rounded-2xl border border-border bg-background p-5 transition-all hover:-translate-y-1 hover:shadow-lg">
                        <Award className="h-6 w-6 text-primary" />
                        <h3 className="mt-4 font-black text-slate-950">Quản trị hệ thống</h3>
                        <p className="mt-1 text-sm text-muted-foreground">Vào bảng quản trị Lumina LMS.</p>
                      </Link>
                    )}
                  </div>
                </div>
              </section>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
