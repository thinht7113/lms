"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Award, ExternalLink, RefreshCw, ShieldCheck } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { apiService, Certificate, tokenHelper } from "@/services/api";

export default function CertificatesPage() {
  const router = useRouter();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tokenHelper.getToken()) {
      router.push("/login");
      return;
    }

    async function loadCertificates() {
      setLoading(true);
      try {
        const data = await apiService.getMyCertificates();
        setCertificates(data);
      } finally {
        setLoading(false);
      }
    }

    loadCertificates();
  }, [router]);

  const formatDate = (date: string) => {
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(date));
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[#F8F9FA] pt-32 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-primary">Thành tựu học tập</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Chứng chỉ</h1>
            <p className="mt-2 max-w-2xl text-sm font-medium text-slate-500">
              Lưu trữ và xác thực các chứng chỉ bạn đã đạt được trên Lumina LMS.
            </p>
          </div>

          {loading ? (
            <div className="flex h-80 flex-col items-center justify-center gap-4 rounded-[2rem] border border-border bg-card">
              <RefreshCw className="h-8 w-8 animate-spin text-primary" />
              <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Đang tải chứng chỉ...</p>
            </div>
          ) : certificates.length === 0 ? (
            <div className="rounded-[2rem] border border-dashed border-border bg-card py-20 text-center">
              <ShieldCheck className="mx-auto h-12 w-12 text-primary/30" />
              <h2 className="mt-5 text-xl font-black text-slate-950">Bạn chưa có chứng chỉ nào</h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                Hoàn thành khóa học và vượt qua điều kiện đánh giá để nhận chứng chỉ đầu tiên.
              </p>
              <Link href="/my-courses" className="mt-7 inline-flex rounded-xl bg-primary px-7 py-3 text-xs font-black uppercase tracking-widest text-white">
                Vào khóa học của tôi
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {certificates.map((certificate) => (
                <article key={certificate.id} className="relative overflow-hidden rounded-[2rem] border border-border/60 bg-card p-7 shadow-sm">
                  <div className="absolute right-6 top-6 rounded-2xl bg-primary/10 p-4">
                    <Award className="h-8 w-8 text-primary" />
                  </div>
                  <div className="pr-20">
                    <p className="text-[10px] font-black uppercase tracking-widest text-primary">Lumina Certificate</p>
                    <h2 className="mt-3 line-clamp-2 text-xl font-black text-slate-950">
                      {certificate.khoa_hoc?.tieu_de || `Khóa học #${certificate.ma_khoa_hoc}`}
                    </h2>
                    <p className="mt-3 text-sm font-medium text-muted-foreground">
                      Cấp ngày {formatDate(certificate.ngay_cap)}
                    </p>
                  </div>
                  <div className="mt-8 flex flex-wrap gap-3">
                    {certificate.uuid && (
                      <Link
                        href={`/certificates/${certificate.uuid}`}
                        className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-xs font-black uppercase tracking-widest text-white transition-colors hover:bg-primary"
                      >
                        Xác thực
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    )}
                    {certificate.duong_dan_chung_chi && (
                      <a
                        href={certificate.duong_dan_chung_chi}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-xl bg-secondary px-5 py-3 text-xs font-black uppercase tracking-widest text-slate-900 transition-colors hover:bg-slate-200"
                      >
                        Xem file
                      </a>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
