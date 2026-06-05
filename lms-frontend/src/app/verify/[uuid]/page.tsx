"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import Link from "next/link";

interface CertificateInfo {
  id: number;
  ma_nguoi_dung: number;
  ma_khoa_hoc: number;
  uuid: string;
  duong_dan_chung_chi: string;
  ngay_cap: string;
  khoa_hoc?: {
    id: number;
    tieu_de: string;
    mo_ta: string | null;
  };
  nguoi_dung?: {
    id: number;
    ho_ten: string;
    email: string;
  };
}

interface VerifyResponse {
  valid: boolean;
  message: string;
  certificate: CertificateInfo | null;
}

export default function VerifyCertificateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const uuid = params.uuid as string;

  const [result, setResult] = useState<VerifyResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uuid) return;
    const fetchVerification = async () => {
      setLoading(true);
      try {
        const res = await apiFetch(`/certificates/verify/${uuid}`);
        if (res.ok) {
          setResult(await res.json());
        } else {
          setResult({
            valid: false,
            message: "Lỗi kết nối đến hệ thống xác thực.",
            certificate: null
          });
        }
      } catch {
        setResult({
          valid: false,
          message: "Lỗi kết nối mạng.",
          certificate: null
        });
      }
      setLoading(false);
    };

    fetchVerification();
  }, [uuid]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] px-4">
        <div className="bg-white/80 backdrop-blur-xl p-10 rounded-3xl text-center border border-slate-200/60 max-w-md w-full shadow-2xl flex flex-col items-center gap-4">
          <i className="ph ph-spinner-gap animate-spin text-5xl text-indigo-600"></i>
          <p className="text-slate-500 font-bold tracking-wide">Đang xác thực chứng chỉ số...</p>
        </div>
      </div>
    );
  }

  const isValid = result?.valid && result?.certificate;
  const cert = result?.certificate;

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-xl bg-white border border-slate-100 rounded-3xl p-6 md:p-10 shadow-2xl transition-all relative overflow-hidden">
        
        {/* Decorative elements */}
        <div className={`absolute top-0 left-0 w-full h-3 ${isValid ? "bg-gradient-to-r from-emerald-500 to-teal-500" : "bg-gradient-to-r from-rose-500 to-amber-500"}`}></div>

        {isValid ? (
          <div className="space-y-8">
            {/* Header Success */}
            <div className="text-center">
              <div className="w-20 h-20 bg-emerald-50 text-emerald-600 border border-emerald-250/20 rounded-full flex items-center justify-center mx-auto mb-4 text-4xl shadow-md">
                <i className="ph-fill ph-seal-check"></i>
              </div>
              <h1 className="text-2xl font-black text-slate-800 tracking-tight">Chứng chỉ hợp lệ</h1>
              <p className="text-emerald-600 text-xs font-bold uppercase tracking-wider mt-1.5 bg-emerald-500/10 px-3 py-1 rounded-full inline-block">
                Xác thực thành công
              </p>
            </div>

            {/* Cert details */}
            <div className="border border-slate-100 rounded-2xl bg-slate-50/50 p-6 space-y-4 text-sm font-medium">
              <div className="flex flex-col sm:flex-row justify-between border-b border-slate-100 pb-3 gap-1">
                <span className="text-slate-400">Học viên sở hữu:</span>
                <strong className="text-slate-800 text-base">{cert?.nguoi_dung?.ho_ten}</strong>
              </div>
              <div className="flex flex-col sm:flex-row justify-between border-b border-slate-100 pb-3 gap-1">
                <span className="text-slate-400">Email học viên:</span>
                <span className="text-slate-700 font-bold">{cert?.nguoi_dung?.email}</span>
              </div>
              <div className="flex flex-col sm:flex-row justify-between border-b border-slate-100 pb-3 gap-1">
                <span className="text-slate-400">Khóa học hoàn thành:</span>
                <strong className="text-slate-800 text-right">{cert?.khoa_hoc?.tieu_de}</strong>
              </div>
              <div className="flex flex-col sm:flex-row justify-between border-b border-slate-100 pb-3 gap-1">
                <span className="text-slate-400">Ngày cấp chứng chỉ:</span>
                <span className="text-slate-700 font-bold">
                  {cert?.ngay_cap ? new Date(cert.ngay_cap).toLocaleDateString("vi-VN", { year: "numeric", month: "long", day: "numeric" }) : ""}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row justify-between gap-1">
                <span className="text-slate-400">Mã chứng chỉ (UUID):</span>
                <span className="text-slate-500 font-mono text-xs select-all bg-white border border-slate-100 px-2.5 py-1 rounded-lg break-all">
                  {cert?.uuid}
                </span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => {
                  if (cert?.duong_dan_chung_chi) {
                    window.open(cert.duong_dan_chung_chi, "_blank");
                  }
                }}
                className="flex-1 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold shadow-lg shadow-indigo-600/10 hover:shadow-indigo-600/25 transition-all text-center flex items-center justify-center gap-2"
              >
                <i className="ph-bold ph-file-pdf text-lg"></i> Xem tệp gốc PDF
              </button>
              <Link
                href="/verify"
                className="px-6 py-3.5 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-2xl font-bold transition-all text-center flex items-center justify-center gap-2"
              >
                Tra cứu mã khác
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Header Error */}
            <div className="text-center">
              <div className="w-20 h-20 bg-rose-50 text-rose-600 border border-rose-250/20 rounded-full flex items-center justify-center mx-auto mb-4 text-4xl shadow-md">
                <i className="ph-bold ph-x-circle"></i>
              </div>
              <h1 className="text-2xl font-black text-slate-800 tracking-tight">Xác thực thất bại</h1>
              <p className="text-rose-500 text-xs font-bold uppercase tracking-wider mt-1.5 bg-rose-500/10 px-3 py-1 rounded-full inline-block">
                Không hợp lệ
              </p>
            </div>

            {/* Error message */}
            <div className="p-4 bg-rose-500/5 border border-rose-200 rounded-2xl text-rose-600 font-bold text-center text-sm leading-relaxed">
              {result?.message || "Hệ thống không tìm thấy chứng chỉ số tương ứng với mã UUID này."}
            </div>

            {/* Search box helper */}
            <div className="space-y-3">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest text-center">Tìm kiếm mã chứng chỉ mới</p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const target = e.currentTarget.elements.namedItem("searchUuid") as HTMLInputElement;
                  if (target && target.value.trim()) {
                    router.push(`/verify/${target.value.trim()}`);
                  }
                }}
                className="flex gap-2"
              >
                <input
                  name="searchUuid"
                  type="text"
                  placeholder="Nhập mã UUID cần tra cứu..."
                  className="flex-1 px-4 py-3 border border-slate-200 focus:border-indigo-500 outline-none rounded-xl text-sm font-medium text-slate-700 bg-white"
                />
                <button
                  type="submit"
                  className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs shadow-md transition-all whitespace-nowrap"
                >
                  Xác thực
                </button>
              </form>
            </div>

            <div className="text-center border-t border-slate-100 pt-6">
              <Link href="/" className="text-xs font-bold text-indigo-600 hover:underline">
                Quay về trang chủ
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
