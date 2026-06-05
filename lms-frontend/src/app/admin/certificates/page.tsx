"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import Link from "next/link";

type Certificate = {
  id: number;
  ma_nguoi_dung: number;
  ma_khoa_hoc: number;
  uuid: string | null;
  duong_dan_chung_chi: string;
  ngay_cap: string;
  nguoi_dung: { id: number; ho_ten: string } | null;
  khoa_hoc: { id: number; tieu_de: string } | null;
};

export default function CertificatesAdminPage() {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCertificates = async () => {
    try {
      const res = await api.get("/admin/certificates");
      setCertificates(res.data);
    } catch (err) {
      console.error("Lỗi tải chứng chỉ:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCertificates();
  }, []);

  const handleRevoke = async (id: number) => {
    if (!window.confirm("Bạn có chắc chắn muốn thu hồi (xóa) chứng chỉ này của học viên?")) return;
    try {
      await api.delete(`/admin/certificates/${id}`);
      setCertificates(certificates.filter(c => c.id !== id));
      alert("Đã thu hồi chứng chỉ thành công.");
    } catch (err: any) {
      alert("Lỗi khi thu hồi: " + (err.response?.data?.detail || err.message));
    }
  };

  if (loading) {
    return <div className="p-8 text-center"><i className="ph ph-spinner-gap animate-spin text-3xl"></i></div>;
  }

  return (
    <div className="animate-fade-in space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-on-surface-variant mb-6">
        <Link href="/admin" className="hover:text-primary transition-colors flex items-center gap-1">
          <i className="ph-fill ph-shield-star"></i> Quản trị
        </Link>
        <i className="ph ph-caret-right text-xs"></i>
        <span className="text-on-surface font-medium">Chứng chỉ</span>
      </nav>

      <div className="bg-surface rounded-2xl border border-outline-variant shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-surface-container-lowest text-on-surface-variant font-semibold uppercase text-[11px] tracking-wider border-b border-outline-variant">
              <tr>
                <th className="px-6 py-4">Mã tham chiếu (UUID)</th>
                <th className="px-6 py-4">Học viên</th>
                <th className="px-6 py-4">Khóa học</th>
                <th className="px-6 py-4">Ngày cấp</th>
                <th className="px-6 py-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {certificates.map((cert) => (
                <tr key={cert.id} className="hover:bg-surface-container-lowest/50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-mono text-xs font-bold text-primary bg-primary-container px-2 py-1 rounded">
                      {cert.uuid || `CERT-${cert.id}`}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-bold text-on-surface">
                    {cert.nguoi_dung?.ho_ten || `ID: ${cert.ma_nguoi_dung}`}
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-on-surface-variant truncate max-w-[200px]" title={cert.khoa_hoc?.tieu_de}>
                      {cert.khoa_hoc?.tieu_de || `ID: ${cert.ma_khoa_hoc}`}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-on-surface-variant">
                    {format(new Date(cert.ngay_cap), "dd MMM yyyy", { locale: vi })}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-2">
                      <a
                        href={cert.duong_dan_chung_chi}
                        target="_blank"
                        rel="noreferrer"
                        className="w-8 h-8 rounded-full bg-info-container text-info flex items-center justify-center hover:bg-info hover:text-on-info transition-colors"
                        title="Xem / Tải PDF"
                      >
                        <i className="ph-bold ph-download-simple"></i>
                      </a>
                      <button
                        onClick={() => handleRevoke(cert.id)}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-error bg-error-container hover:bg-error hover:text-on-error transition-colors"
                        title="Thu hồi chứng chỉ"
                      >
                        <i className="ph-bold ph-trash"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {certificates.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-on-surface-variant">
                    Chưa có chứng chỉ nào được cấp trên hệ thống.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
