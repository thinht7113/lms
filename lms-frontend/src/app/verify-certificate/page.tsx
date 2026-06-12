"use client";

import React, { useState } from "react";
import { certificateApi } from "@/services/api";
import { Search, CheckCircle, XCircle, FileText, Download, ShieldCheck } from "lucide-react";

export default function VerifyCertificatePage() {
  const [uuid, setUuid] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uuid.trim()) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await certificateApi.verifyCertificate(uuid.trim());
      setResult(data);
    } catch (err: any) {
      setError(err.message || "Đã xảy ra lỗi");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 flex flex-col items-center">
      <div className="w-full max-w-3xl space-y-8">

        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center p-4 bg-primary/10 rounded-full mb-4">
            <ShieldCheck className="h-12 w-12 text-primary" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            Xác thực Chứng chỉ
          </h1>
          <p className="mt-4 text-lg text-slate-500">
            Nhập mã định danh (UUID) in trên chứng chỉ để kiểm tra tính hợp lệ và thông tin chi tiết.
          </p>
        </div>

        {/* Search Box */}
        <div className="bg-white p-6 sm:p-8 shadow-sm ring-1 ring-slate-900/5 sm:rounded-2xl">
          <form onSubmit={handleVerify} className="flex gap-4">
            <div className="relative flex-grow">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-11 pr-4 py-4 border-slate-300 rounded-xl focus:ring-primary focus:border-primary sm:text-lg bg-slate-50"
                placeholder="Nhập mã định danh UUID"
                value={uuid}
                onChange={(e) => setUuid(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || !uuid.trim()}
              className="flex-shrink-0 inline-flex items-center justify-center px-8 py-4 border border-transparent text-lg font-medium rounded-xl text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <div className="h-6 w-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                "Tra cứu"
              )}
            </button>
          </form>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 flex flex-col items-center text-center animate-in fade-in slide-in-from-bottom-4">
            <XCircle className="h-12 w-12 text-red-500 mb-3" />
            <h3 className="text-lg font-medium text-red-800">Không tìm thấy chứng chỉ</h3>
            <p className="mt-2 text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Success State */}
        {result && result.is_valid && result.certificate && (
          <div className="bg-white border border-green-200 shadow-sm rounded-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4">
            <div className="bg-green-50 px-6 py-4 border-b border-green-100 flex items-center gap-3">
              <CheckCircle className="h-6 w-6 text-green-600" />
              <h3 className="text-lg font-semibold text-green-800">Chứng chỉ Hợp lệ</h3>
            </div>

            <div className="p-6 sm:p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                {/* Details */}
                <div className="space-y-6">
                  <div>
                    <p className="text-sm font-medium text-slate-500">Cấp cho học viên</p>
                    <p className="mt-1 text-xl font-bold text-slate-900">{result.certificate.nguoi_dung?.ho_ten}</p>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-slate-500">Tên khóa học</p>
                    <p className="mt-1 text-lg font-semibold text-primary">{result.certificate.khoa_hoc?.tieu_de}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-slate-500">Ngày cấp</p>
                      <p className="mt-1 text-base font-medium text-slate-900">
                        {new Date(result.certificate.ngay_cap).toLocaleDateString('vi-VN')}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-500">Mã định danh</p>
                      <p className="mt-1 text-sm font-mono text-slate-600 truncate" title={result.certificate.uuid}>
                        {result.certificate.uuid}
                      </p>
                    </div>
                  </div>
                </div>

                {/* PDF Link */}
                <div className="flex flex-col items-center justify-center p-6 bg-slate-50 rounded-xl border border-slate-200">
                  <FileText className="h-16 w-16 text-slate-400 mb-4" />
                  <a
                    href={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"}/certificates/public/${result.certificate.uuid}/pdf`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
                  >
                    <Download className="h-4 w-4" />
                    Xem bản gốc PDF
                  </a>
                </div>

              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
