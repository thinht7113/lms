"use client";

import React, { useEffect, useState, useCallback } from "react";
import { fetchWithAuth } from "@/services/api";
import { 
    Activity, Clock, User, FileText, Search, 
    ChevronLeft, ChevronRight, CheckCircle, XCircle, Shield, AlertTriangle
} from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

interface AuditLog {
    id: number;
    email_admin: string;
    hanh_dong: string;
    chi_tiet: string;
    ngay_thuc_hien: string;
}

export default function AdminLogsPage() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [total, setTotal] = useState(0);
    const [skip, setSkip] = useState(0);
    const [limit] = useState(15);
    const [isLoading, setIsLoading] = useState(false);

    const fetchLogs = useCallback(async () => {
        setIsLoading(true);
        try {
            const url = new URL(`${API_BASE_URL}/admin/logs`);
            url.searchParams.append("skip", skip.toString());
            url.searchParams.append("limit", limit.toString());

            const res = await fetchWithAuth(url.toString());
            if (!res.ok) throw new Error("Lỗi tải nhật ký hệ thống");
            
            const result = await res.json();
            if (Array.isArray(result)) {
                setLogs(result);
                setTotal(skip + result.length + (result.length === limit ? 1 : 0));
            } else if (result && Array.isArray(result.data)) {
                setLogs(result.data);
                setTotal(result.total || 0);
            }
        } catch (err) {
            console.error("Error fetching logs:", err);
        } finally {
            setIsLoading(false);
        }
    }, [skip, limit]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    const getActionBadge = (action: string) => {
        const act = action.toUpperCase();
        if (act.includes("APPROVE") || act.includes("DUYỆT")) {
            return (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                    <CheckCircle className="h-3.5 w-3.5" />
                    {action}
                </span>
            );
        }
        if (act.includes("REJECT") || act.includes("TỪ CHỐI")) {
            return (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 text-xs font-black text-rose-700 ring-1 ring-inset ring-rose-600/20">
                    <XCircle className="h-3.5 w-3.5" />
                    {action}
                </span>
            );
        }
        if (act.includes("DELETE") || act.includes("XÓA")) {
            return (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-black text-red-700 ring-1 ring-inset ring-red-600/20">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {action}
                </span>
            );
        }
        if (act.includes("CREATE") || act.includes("THÊM") || act.includes("ADD")) {
            return (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700 ring-1 ring-inset ring-blue-600/20">
                    <Activity className="h-3.5 w-3.5" />
                    {action}
                </span>
            );
        }
        if (act.includes("UPDATE") || act.includes("SỬA") || act.includes("EDIT")) {
            return (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700 ring-1 ring-inset ring-amber-600/20">
                    <Activity className="h-3.5 w-3.5" />
                    {action}
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700 ring-1 ring-inset ring-slate-500/20">
                <Shield className="h-3.5 w-3.5" />
                {action}
            </span>
        );
    };

    return (
        <div className="flex h-full flex-col gap-6">
            {/* Content Area */}
            <div className="flex flex-1 flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
                
                {/* Table Header */}
                <div className="grid grid-cols-[1fr_2fr_3fr_1fr] items-center gap-4 border-b border-slate-100 bg-slate-50/50 px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500">
                    <div className="flex items-center gap-2"><User className="h-4 w-4" /> Người thực hiện</div>
                    <div className="flex items-center gap-2"><Activity className="h-4 w-4" /> Hành động</div>
                    <div className="flex items-center gap-2"><FileText className="h-4 w-4" /> Chi tiết thao tác</div>
                    <div className="flex items-center gap-2 justify-end"><Clock className="h-4 w-4" /> Thời gian</div>
                </div>

                {/* Table Body */}
                <div className="flex-1 overflow-y-auto">
                    {isLoading ? (
                        <div className="flex h-64 items-center justify-center">
                            <Activity className="h-8 w-8 animate-pulse text-purple-400" />
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="flex h-64 flex-col items-center justify-center text-center">
                            <Shield className="h-12 w-12 text-slate-200" />
                            <p className="mt-4 text-sm font-bold text-slate-500">Không tìm thấy nhật ký nào.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {logs.map((log) => (
                                <div key={log.id} className="grid grid-cols-[1fr_2fr_3fr_1fr] items-start gap-4 p-6 transition-colors hover:bg-slate-50/80">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-slate-950 truncate" title={log.email_admin}>
                                            {log.email_admin}
                                        </span>
                                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-1">
                                            ID: #{log.id}
                                        </span>
                                    </div>
                                    <div>
                                        {getActionBadge(log.hanh_dong)}
                                    </div>
                                    <div className="text-sm font-medium text-slate-600 pr-4 leading-relaxed">
                                        {log.chi_tiet || "-"}
                                    </div>
                                    <div className="flex flex-col items-end text-right">
                                        <span className="text-sm font-bold text-slate-900">
                                            {new Date(log.ngay_thuc_hien).toLocaleDateString("vi-VN")}
                                        </span>
                                        <span className="text-xs font-bold text-slate-500 mt-1">
                                            {new Date(log.ngay_thuc_hien).toLocaleTimeString("vi-VN")}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between border-t border-slate-100 bg-white px-6 py-4">
                    <p className="text-sm font-bold text-slate-500">
                        Hiển thị <span className="text-slate-900">{skip + 1}</span> - <span className="text-slate-900">{Math.min(skip + limit, total)}</span> trong <span className="text-slate-900">{total}</span> nhật ký
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setSkip(Math.max(0, skip - limit))}
                            disabled={skip === 0}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200 disabled:opacity-50"
                        >
                            <ChevronLeft className="h-5 w-5" />
                        </button>
                        <button
                            onClick={() => setSkip(skip + limit)}
                            disabled={skip + limit >= total}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200 disabled:opacity-50"
                        >
                            <ChevronRight className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
