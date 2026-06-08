"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Award, ShieldCheck, Share2, Download, ExternalLink, RefreshCw, AlertCircle, LayoutGrid } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { apiService } from "@/services/api";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export default function CertificatePage() {
  const params = useParams();
  const router = useRouter();
  const uuid = params?.uuid as string;

  // DB States
  const [cert, setCert] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState("");

  useEffect(() => {
    if (!uuid) return;
    setShareUrl(`${window.location.origin}/certificates/${uuid}`);

    async function fetchCert() {
      setLoading(true);
      setError(null);
      try {
        const data = await apiService.getPublicCertificate(uuid);
        setCert(data);
      } catch (err: any) {
        setError(err.message || "Chứng chỉ số không tồn tại hoặc không hợp lệ.");
      } finally {
        setLoading(false);
      }
    }
    fetchCert();
  }, [uuid]);

  const effectiveShareUrl = shareUrl || `http://localhost:3000/certificates/${uuid}`;

  // QR Code generator API URL
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(effectiveShareUrl)}`;

  const handleShareLinkedIn = () => {
    const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(effectiveShareUrl)}`;
    window.open(linkedinUrl, "_blank");
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString("vi-VN", { day: "numeric", month: "long", year: "numeric" });
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="flex justify-center items-center h-screen bg-background">
          <RefreshCw className="h-10 w-10 text-primary animate-spin" />
        </main>
      </>
    );
  }

  if (error || !cert) {
    return (
      <>
        <Navbar />
        <main className="max-w-2xl mx-auto px-4 pt-32 pb-20 min-h-[70vh] flex items-center justify-center">
          <div className="bg-card border border-border/60 rounded-[2rem] p-10 text-center space-y-5 shadow-2xl flex flex-col items-center">
            <AlertCircle className="h-16 w-16 text-destructive opacity-80" />
            <h3 className="font-black text-xl text-foreground tracking-tighter">Không tìm thấy chứng chỉ</h3>
            <p className="text-sm font-medium text-muted-foreground leading-relaxed">Mã định danh chứng chỉ không đúng hoặc chứng chỉ đã bị hủy.</p>
            <Link
              href="/"
              className="bg-primary hover:bg-blue-700 text-white rounded-xl text-xs font-bold uppercase tracking-widest px-8 py-3.5 transition-all shadow-lg shadow-primary/20"
            >
              Quay lại Trang chủ
            </Link>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-20 min-h-[85vh] space-y-12">
        <div className="text-center max-w-2xl mx-auto space-y-4">
          <div className="inline-flex items-center space-x-2 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm">
            <ShieldCheck className="h-4 w-4" />
            <span>Xác minh chứng chỉ chính thức</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-foreground tracking-tighter">
            Chứng Chỉ Điện Tử <span className="text-primary italic">Lumina</span>
          </h1>
          <p className="text-sm font-medium text-muted-foreground">
            Chứng nhận hoàn thành khóa học chuyên nghiệp được cấp bởi hệ thống Lumina LMS.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Left Area: Horizontal Certificate Preview (Col span 8) */}
          <div className="lg:col-span-8 space-y-6">
            {/* The Certificate Frame */}
            <div className="w-full bg-[#0B1120] border-[16px] border-slate-800 rounded-[2.5rem] p-8 sm:p-14 aspect-[1.414/1] flex flex-col justify-between text-center relative overflow-hidden shadow-2xl text-white">
              {/* Complex Background Details */}
              <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-10" />
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(37,99,235,0.15),transparent_70%)]" />
              <div className="absolute -top-32 -left-32 w-64 h-64 bg-blue-600/20 rounded-full blur-3xl" />
              <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-indigo-600/20 rounded-full blur-3xl" />
              
              {/* Corner Accents */}
              <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-slate-600/50" />
              <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-slate-600/50" />
              <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-slate-600/50" />
              <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-slate-600/50" />

              {/* Certificate Header */}
              <div className="space-y-2 relative z-10 flex flex-col items-center pt-2">
                <div className="bg-primary/20 p-3 rounded-2xl text-primary mb-2 border border-primary/30 shadow-lg shadow-primary/20">
                  <Award className="h-8 w-8" />
                </div>
                <h2 className="font-sans font-black text-sm sm:text-base tracking-[0.2em] text-slate-300 uppercase">
                  Chứng Nhận Hoàn Thành Khóa Học
                </h2>
                <div className="flex items-center space-x-2 opacity-80">
                    <LayoutGrid className="w-3 h-3 text-primary" />
                    <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase">Lumina Learning Management System</p>
                </div>
              </div>

              {/* Certificate Body */}
              <div className="space-y-6 relative z-10 py-6">
                <p className="text-xs sm:text-sm text-slate-400 italic font-medium">Chứng chỉ này được tự hào trao tặng cho</p>
                <h3 className="font-sans font-black text-3xl sm:text-5xl text-white tracking-tight border-b-2 border-slate-700/60 pb-4 max-w-xl mx-auto leading-none drop-shadow-lg">
                  {cert.nguoi_dung?.ho_ten}
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-400 max-w-lg mx-auto leading-relaxed font-medium">
                  Vì đã hoàn thành xuất sắc chương trình đào tạo và vượt qua các bài thi đánh giá năng lực của khóa học:
                </p>
                <h4 className="font-sans font-black text-lg sm:text-2xl text-primary leading-snug max-w-xl mx-auto drop-shadow-md">
                  {cert.khoa_hoc?.tieu_de}
                </h4>
              </div>

              {/* Certificate Footer */}
              <div className="flex justify-between items-end border-t border-slate-800/80 pt-6 text-[10px] sm:text-[11px] relative z-10">
                <div className="text-left space-y-1.5 w-1/3">
                  <p className="text-slate-500 font-black tracking-widest">MÃ ĐỊNH DANH</p>
                  <p className="font-mono text-slate-300 font-bold bg-slate-800/50 px-2 py-1 rounded inline-block">{uuid.substring(0, 18)}...</p>
                </div>
                <div className="text-center space-y-2 border-b border-slate-700/60 pb-2 px-6 w-1/3">
                  <p className="font-serif italic text-lg sm:text-xl text-slate-200">Lumina Board</p>
                  <p className="text-slate-500 font-black tracking-widest text-[8px] sm:text-[9px]">HỘI ĐỒNG GIẢNG VIÊN</p>
                </div>
                <div className="text-right space-y-1.5 w-1/3">
                  <p className="text-slate-500 font-black tracking-widest">NGÀY CẤP</p>
                  <p className="text-slate-300 font-bold bg-slate-800/50 px-2 py-1 rounded inline-block">{formatDate(cert.ngay_cap)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Area: Verification Box & Actions (Col span 4) */}
          <aside className="lg:col-span-4 space-y-6">
            <div className="bg-card text-card-foreground border border-border/60 rounded-[2rem] p-8 shadow-2xl space-y-8 sticky top-32">
              <div className="flex items-center space-x-2 border-b border-border/40 pb-4">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  <h3 className="font-black text-sm uppercase tracking-widest text-foreground">Xác thực chứng chỉ</h3>
              </div>
              
              {/* QR Code */}
              <div className="flex flex-col items-center space-y-4">
                <div className="bg-white p-4 rounded-[1.5rem] border-2 border-border/60 shadow-inner">
                  <img src={qrCodeUrl} alt="Mã QR Xác thực" className="h-32 w-32 object-contain" />
                </div>
                <p className="text-xs font-medium text-muted-foreground text-center max-w-[220px] leading-relaxed">
                  Nhà tuyển dụng có thể quét mã QR này để truy cập trực tiếp vào hồ sơ xác thực.
                </p>
              </div>

              {/* Details List */}
              <div className="space-y-4 text-xs font-medium border-t border-border/40 pt-6">
                <div className="flex justify-between items-center bg-secondary/50 p-3 rounded-xl border border-border/40">
                  <span className="text-muted-foreground font-bold">Trạng thái:</span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-500/20">Hợp lệ</span>
                </div>
                <div className="flex justify-between items-center px-2">
                  <span className="text-muted-foreground font-bold">Thụ hưởng:</span>
                  <span className="font-black text-foreground">{cert.nguoi_dung?.ho_ten}</span>
                </div>
                <div className="flex flex-col space-y-2 px-2 pt-2">
                  <span className="text-muted-foreground font-bold">Mã UUID hệ thống:</span>
                  <span className="font-mono text-[10px] bg-secondary p-2.5 rounded-xl break-all text-foreground/80 border border-border/40 select-all shadow-sm">
                    {uuid}
                  </span>
                </div>
              </div>

                {/* Action Buttons */}
                <div className="flex flex-col space-y-3 pt-4">
                <a
                  href={`${API_BASE_URL}/certificates/public/${uuid}/pdf`}
                  download
                  target="_blank"
                  className="w-full bg-primary hover:bg-blue-700 text-white font-black py-4 rounded-2xl shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all flex items-center justify-center space-x-2 text-xs uppercase tracking-widest cursor-pointer"
                >
                  <Download className="h-4 w-4" />
                  <span>Tải bản in (PDF)</span>
                </a>
                <button
                  onClick={handleShareLinkedIn}
                  className="w-full bg-secondary border border-border hover:border-primary/50 text-foreground font-black py-4 rounded-2xl transition-all flex items-center justify-center space-x-2 text-xs uppercase tracking-widest cursor-pointer"
                >
                  <Share2 className="h-4 w-4 text-primary" />
                  <span>Khoe lên LinkedIn</span>
                </button>
              </div>
            </div>
          </aside>
        </div>
      </main>

      <Footer />
    </>
  );
}
