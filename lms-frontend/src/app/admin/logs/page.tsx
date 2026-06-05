"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import Link from "next/link";

type AdminLog = {
  id: number;
  ma_admin: number;
  hanh_dong: string;
  chi_tiet: string | null;
  ngay_thuc_hien: string;
  admin: { id: number; ho_ten: string } | null;
};

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    try {
      const res = await api.get("/admin/logs");
      setLogs(res.data);
    } catch (err) {
      console.error("Lỗi tải nhật ký:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

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
        <span className="text-on-surface font-medium">Nhật ký hệ thống</span>
      </nav>

      <div className="bg-surface rounded-2xl border border-outline-variant shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-surface-container-lowest text-on-surface-variant font-semibold uppercase text-[11px] tracking-wider border-b border-outline-variant">
              <tr>
                <th className="px-6 py-4">ID</th>
                <th className="px-6 py-4">Thời gian</th>
                <th className="px-6 py-4">Quản trị viên</th>
                <th className="px-6 py-4">Hành động</th>
                <th className="px-6 py-4">Chi tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-surface-container-lowest/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-on-surface-variant">#{log.id}</td>
                  <td className="px-6 py-4 text-on-surface-variant">
                    {format(new Date(log.ngay_thuc_hien), "dd MMM yyyy, HH:mm", { locale: vi })}
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-on-surface">
                      {log.admin?.ho_ten || `ID: ${log.ma_admin}`}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-mono text-xs font-bold text-error bg-error-container px-2 py-1 rounded">
                      {log.hanh_dong}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-on-surface-variant truncate max-w-[300px]" title={log.chi_tiet || ""}>
                      {log.chi_tiet || "-"}
                    </div>
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-on-surface-variant">
                    Chưa có nhật ký hoạt động nào.
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
