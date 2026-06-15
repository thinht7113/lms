"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User, Mail, Phone, Lock, Save, RefreshCw, CheckCircle2, ShieldCheck, UploadCloud } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { apiService, tokenHelper } from "@/services/api";
import { useToast } from "@/contexts/ToastContext";
import { useDominantImageColor } from "@/hooks/useDominantImageColor";

export default function SettingsPage() {
    const router = useRouter();
    const toast = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isSavingPassword, setIsSavingPassword] = useState(false);
    const [showPasswordForm, setShowPasswordForm] = useState(false);
    
    const [user, setUser] = useState<any>(null);
    const [hoTen, setHoTen] = useState("");
    const [soDienThoai, setSoDienThoai] = useState("");
    const [matKhauCu, setMatKhauCu] = useState("");
    const [matKhauMoi, setMatKhauMoi] = useState("");
    const [xacNhanMatKhau, setXacNhanMatKhau] = useState("");
    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => {
        const fetchProfile = async () => {
            const token = tokenHelper.getToken();
            if (!token) {
                router.push("/login");
                return;
            }
            try {
                const data = await apiService.getProfile();
                setUser(data);
                setHoTen(data.ho_ten || "");
                setSoDienThoai(data.so_dien_thoai || "");
            } catch (err) {
                toast.error("Không thể tải thông tin tài khoản");
                router.push("/login");
            } finally {
                setIsLoading(false);
            }
        };
        fetchProfile();
    }, [router, toast]);

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const data = await apiService.uploadFile(file, "avatar");

            // 1. Upload ảnh lên MinIO
            
            
            // 2. Cập nhật URL ảnh mới thẳng vào Database thông qua API updateProfile
            const updatedUser = await apiService.updateProfile({
                avatar_url: data.url
            });

            setUser(updatedUser);
            toast.success("Đổi ảnh đại diện thành công!");
            window.dispatchEvent(new Event("lumina-user-updated"));
        } catch (err: any) {
            toast.error(err.message || "Lỗi khi đổi ảnh đại diện");
        } finally {
            setIsUploading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);

        try {
            const updatedUser = await apiService.updateProfile({
                ho_ten: hoTen,
                so_dien_thoai: soDienThoai ? soDienThoai : undefined
            });

            setUser(updatedUser);
            toast.success("Cập nhật hồ sơ thành công!");
            window.dispatchEvent(new Event("lumina-user-updated"));

        } catch (error: any) {
            toast.error(typeof error.message === 'string' ? error.message : "Dữ liệu nhập vào không hợp lệ");
        } finally {
            setIsSaving(false);
        }
    };

    const handlePasswordSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!matKhauMoi.trim()) {
            toast.error("Vui lòng nhập mật khẩu mới");
            return;
        }
        if (matKhauMoi !== xacNhanMatKhau) {
            toast.error("Mật khẩu xác nhận không khớp");
            return;
        }

        setIsSavingPassword(true);
        try {
            const updatedUser = await apiService.updateProfile({
                mat_khau_cu: matKhauCu || undefined,
                mat_khau_moi: matKhauMoi,
            });

            setUser(updatedUser);
            setMatKhauCu("");
            setMatKhauMoi("");
            setXacNhanMatKhau("");
            setShowPasswordForm(false);
            toast.success("Đổi mật khẩu thành công!");
        } catch (error: any) {
            toast.error(error.message || "Không thể đổi mật khẩu");
        } finally {
            setIsSavingPassword(false);
        }
    };

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

    const displayRole = roleLabel[user?.vai_tro] || "Thành viên";
    const safeName = encodeURIComponent(user?.ho_ten || "User");
    const fallbackAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${safeName}`;
    const avatarSrc = user?.avatar_url || fallbackAvatar;
    const dominantColor = useDominantImageColor(avatarSrc, roleFallbackColor[user?.vai_tro] || roleFallbackColor.student);
    const headerBgStyle = {
        background: `
            radial-gradient(circle at 22% 28%, rgba(${dominantColor}, 0.92), transparent 36%),
            linear-gradient(135deg, rgba(${dominantColor}, 0.88), rgba(15, 23, 42, 0.96))
        `,
    };
    

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex flex-col">
                <Navbar />
                <div className="flex-1 flex items-center justify-center">
                    <RefreshCw className="w-10 h-10 animate-spin text-primary" />
                </div>
                <Footer />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <Navbar />

            <main className="flex-grow pt-32 pb-20 max-w-4xl mx-auto w-full px-4 sm:px-6">
                <div className="bg-card border border-border/60 rounded-[2rem] shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                    
                    {/* Header */}
                    <div
                        className="px-8 py-10 relative overflow-hidden text-center sm:text-left flex flex-col sm:flex-row items-center gap-8 transition-colors duration-500"
                        style={headerBgStyle}
                    >
                        <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px]"></div>
                        
                        <div className="relative z-10">
                            <div className="w-28 h-28 rounded-full bg-secondary/20 border-4 border-white overflow-hidden relative group shadow-2xl">
                                <img 
                                    src={avatarSrc} 
                                    alt="Avatar" 
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        if (target.src !== fallbackAvatar) {
                                            target.src = fallbackAvatar;
                                        }
                                    }}
                                />
                                <label className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                    {isUploading ? <RefreshCw className="w-6 h-6 text-white animate-spin" /> : <UploadCloud className="w-6 h-6 text-white" />}
                                    <input type="file" accept="image/png,image/jpeg,image/gif,image/webp" className="hidden" onChange={handleAvatarUpload} disabled={isUploading} />
                                </label>
                            </div>
                        </div>

                        <div className="relative z-10 text-white space-y-2 flex-1">
                            <h1 className="text-3xl font-black">{user?.ho_ten}</h1>
                            <p className="text-white/70 font-medium">{displayRole} Lumina LMS • Tham gia ngày {new Date(user?.ngay_tao).toLocaleDateString('vi-VN')}</p>
                            <div className="pt-2">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] uppercase tracking-widest font-black border border-emerald-500/30">
                                    <CheckCircle2 className="w-3 h-3" /> {displayRole}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Form Edit */}
                    <div className="p-8 sm:p-12">
                        <form onSubmit={handleSave} className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Readonly Email */}
                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                        <Mail className="w-4 h-4" /> Email đăng nhập
                                    </label>
                                    <input 
                                        type="text" 
                                        value={user?.email} 
                                        disabled
                                        className="w-full bg-secondary/50 border border-border/60 rounded-xl px-4 py-3 text-sm text-muted-foreground cursor-not-allowed"
                                    />
                                    <p className="text-[10px] text-muted-foreground">Email không thể thay đổi sau khi tạo tài khoản.</p>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                        <User className="w-4 h-4" /> Họ và tên
                                    </label>
                                    <input 
                                        type="text" 
                                        value={hoTen} 
                                        onChange={e => setHoTen(e.target.value)}
                                        className="w-full bg-secondary border border-border/60 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                        <Phone className="w-4 h-4" /> Số điện thoại
                                    </label>
                                    <input 
                                        type="tel" 
                                        value={soDienThoai} 
                                        onChange={e => setSoDienThoai(e.target.value)}
                                        className="w-full bg-secondary border border-border/60 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                                    />
                                </div>

                            </div>

                            <div className="pt-6 border-t border-border/40 flex justify-end">
                                <button 
                                    type="submit"
                                    disabled={isSaving}
                                    className="bg-primary hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold uppercase tracking-widest text-sm flex items-center gap-2 shadow-lg shadow-primary/20 transition-all disabled:opacity-50"
                                >
                                    {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    <span>{isSaving ? "Đang lưu..." : "Lưu thay đổi"}</span>
                                </button>
                            </div>
                        </form>

                        <div className="mt-10 border-t border-border/40 pt-8">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                <button
                                    type="button"
                                    onClick={() => setShowPasswordForm((open) => !open)}
                                    className="rounded-xl border border-border bg-secondary px-5 py-3 text-xs font-black uppercase tracking-widest text-foreground transition-colors hover:bg-primary hover:text-white"
                                >
                                    {showPasswordForm ? "Đóng đổi mật khẩu" : "Đổi mật khẩu"}
                                </button>
                            </div>

                            {showPasswordForm && (
                                <form onSubmit={handlePasswordSave} className="mt-6 grid grid-cols-1 gap-6 rounded-2xl border border-border/60 bg-secondary/40 p-6 md:grid-cols-2">
                                    <div className="space-y-2 md:col-span-2">
                                        <label className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                            <Lock className="w-4 h-4" /> Mật khẩu cũ
                                        </label>
                                        <input
                                            type="password"
                                            value={matKhauCu}
                                            onChange={e => setMatKhauCu(e.target.value)}
                                            placeholder="Nhập mật khẩu cũ"
                                            className="w-full bg-background border border-border/60 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                            <Lock className="w-4 h-4" /> Mật khẩu mới
                                        </label>
                                        <input
                                            type="password"
                                            value={matKhauMoi}
                                            onChange={e => setMatKhauMoi(e.target.value)}
                                            placeholder="Tối thiểu 6 ký tự"
                                            className="w-full bg-background border border-border/60 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                            <Lock className="w-4 h-4" /> Xác nhận mật khẩu
                                        </label>
                                        <input
                                            type="password"
                                            value={xacNhanMatKhau}
                                            onChange={e => setXacNhanMatKhau(e.target.value)}
                                            placeholder="Nhập lại mật khẩu mới"
                                            className="w-full bg-background border border-border/60 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                                        />
                                    </div>

                                    <div className="md:col-span-2 flex justify-end">
                                        <button
                                            type="submit"
                                            disabled={isSavingPassword}
                                            className="bg-slate-950 hover:bg-primary text-white px-8 py-3 rounded-xl font-bold uppercase tracking-widest text-sm flex items-center gap-2 shadow-lg transition-all disabled:opacity-50"
                                        >
                                            {isSavingPassword ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                                            <span>{isSavingPassword ? "Đang đổi..." : "Lưu mật khẩu mới"}</span>
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>

                </div>
            </main>

            <Footer />
        </div>
    );
}
