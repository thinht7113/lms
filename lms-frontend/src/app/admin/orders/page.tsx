"use client";

import React, { useState } from "react";
import DynamicTable, { Column, CustomAction } from "@/components/admin/DynamicTable";
import { FormField } from "@/components/admin/DynamicForm";
import { CheckCircle2, XCircle } from "lucide-react";
import { apiService } from "@/services/api";
import { useToast } from "@/contexts/ToastContext";

const getErrorMessage = (err: unknown, fallback: string) =>
    err instanceof Error ? err.message : fallback;

const renderOrderStatus = (val: unknown) => {
    const statusStr = String(val || "").toLowerCase().trim();
    let label = String(val || "N/A");
    let badgeClass = "bg-slate-100 text-slate-700 border-slate-300";

    if (statusStr === "success" || statusStr === "completed" || statusStr === "paid") {
        label = "Thành công (Success)";
        badgeClass = "bg-emerald-100 text-emerald-800 border-emerald-300";
    } else if (statusStr === "pending" || statusStr === "processing") {
        label = "Đang chờ (Pending)";
        badgeClass = "bg-amber-100 text-amber-800 border-amber-300";
    } else if (statusStr === "failed" || statusStr === "cancelled") {
        label = "Thất bại (Failed)";
        badgeClass = "bg-rose-100 text-rose-800 border-rose-300";
    } else if (statusStr === "refund_requested") {
        label = "Yêu cầu hoàn tiền";
        badgeClass = "bg-violet-100 text-violet-800 border-violet-300";
    } else if (statusStr === "refunded") {
        label = "Đã hoàn tiền";
        badgeClass = "bg-slate-200 text-slate-700 border-slate-300";
    }

    return (
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${badgeClass}`}>
            {label}
        </span>
    );
};

export default function AdminOrdersPage() {
    const toast = useToast();
    const [activeTab, setActiveTab] = useState<"orders" | "refunds">("orders");

    const columns: Column[] = [
        { key: "ma_giao_dich", label: "Mã giao dịch", type: "text" },
        { key: "ma_nguoi_dung", label: "ID học viên", type: "number" },
        {
            key: "tong_tien",
            label: "Tổng tiền",
            type: "number",
            render: (val) => (
                <span className="font-bold text-slate-900">
                    {Number(val || 0).toLocaleString("vi-VN")} đ
                </span>
            ),
        },
        { key: "phuong_thuc_thanh_toan", label: "Phương thức", type: "text" },
        {
            key: "ma_giam_gia_code",
            label: "Mã giảm giá",
            type: "text",
            render: (val) => val ? <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-semibold">{val}</span> : <span className="text-slate-400">-</span>,
        },
        {
            key: "trang_thai",
            label: "Trạng thái",
            type: "text",
            render: (val) => renderOrderStatus(val),
        },
        { key: "ngay_tao", label: "Ngày tạo", type: "date" },
    ];

    const formFields: FormField[] = [
        {
            key: "trang_thai",
            label: "Trạng thái đơn hàng",
            type: "select",
            options: [
                { value: "pending", label: "Đang chờ (Pending)" },
                { value: "success", label: "Thành công (Success)" },
                { value: "failed", label: "Thất bại (Failed)" },
                { value: "refund_requested", label: "Yêu cầu hoàn tiền" },
                { value: "refunded", label: "Đã hoàn tiền" },
            ],
        },
    ];

    const customActions: CustomAction[] = [
        {
            label: "Duyệt hoàn tiền",
            icon: CheckCircle2,
            colorClass: "text-emerald-600 bg-emerald-50 hover:bg-emerald-100",
            shouldShow: (order) => order.trang_thai === "refund_requested",
            onClick: async (order) => {
                if (order.trang_thai !== "refund_requested") {
                    toast.error("Chỉ xử lý đơn đang yêu cầu hoàn tiền");
                    return;
                }
                try {
                    await apiService.approveRefund(Number(order.id));
                    toast.success("Đã duyệt hoàn tiền");
                    window.location.reload();
                } catch (err: unknown) {
                    toast.error(getErrorMessage(err, "Không thể duyệt hoàn tiền"));
                }
            },
        },
        {
            label: "Từ chối hoàn tiền",
            icon: XCircle,
            colorClass: "text-rose-600 bg-rose-50 hover:bg-rose-100",
            shouldShow: (order) => order.trang_thai === "refund_requested",
            onClick: async (order) => {
                if (order.trang_thai !== "refund_requested") {
                    toast.error("Chỉ xử lý đơn đang yêu cầu hoàn tiền");
                    return;
                }

                try {
                    await apiService.rejectRefund(Number(order.id));
                    toast.success("Đã từ chối hoàn tiền");
                    window.location.reload();
                } catch (err: unknown) {
                    toast.error(getErrorMessage(err, "Không thể từ chối hoàn tiền"));
                }
            },
        },
    ];

    return (
        <div className="h-full flex flex-col gap-6">
            <div className="flex max-w-xs bg-slate-100/80 rounded-2xl p-1 border border-slate-200 shadow-sm shrink-0">
                <button
                    onClick={() => setActiveTab("orders")}
                    className={`flex-1 py-2.5 px-4 text-xs font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-1.5 ${activeTab === "orders"
                        ? "bg-white text-slate-950 shadow-md shadow-slate-200/50"
                        : "text-slate-500 hover:text-slate-800"
                        }`}
                >
                    Đơn hàng
                </button>
                <button
                    onClick={() => setActiveTab("refunds")}
                    className={`flex-1 py-2.5 px-4 text-xs font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-1.5 ${activeTab === "refunds"
                        ? "bg-white text-slate-950 shadow-md shadow-slate-200/50"
                        : "text-slate-500 hover:text-slate-800"
                        }`}
                >
                    Hoàn tiền
                </button>
            </div>

            {activeTab === "orders" ? (
                <DynamicTable
                    key="orders-table"
                    title="Đơn hàng"
                    endpoint="/dynamic-admin/orders"
                    columns={columns}
                    formFields={formFields}
                    customActions={customActions}
                    disableCreate={true}
                    disableEdit={true}
                    disableDelete={true}
                />
            ) : (
                <DynamicTable
                    key="refunds-table"
                    title="Yêu cầu hoàn tiền"
                    endpoint="/dynamic-admin/orders"
                    columns={columns}
                    formFields={formFields}
                    customActions={customActions}
                    disableCreate={true}
                    disableEdit={true}
                    disableDelete={true}
                    filterCol="trang_thai"
                    filterVal="refund_requested"
                />
            )}
        </div>
    );
}
