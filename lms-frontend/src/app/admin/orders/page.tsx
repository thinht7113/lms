"use client";

import React, { useState } from "react";
import DynamicTable, { Column, CustomAction } from "@/components/admin/DynamicTable";
import { FormField } from "@/components/admin/DynamicForm";
import { CheckCircle2, XCircle } from "lucide-react";
import { apiService } from "@/services/api";
import { useToast } from "@/contexts/ToastContext";

const getErrorMessage = (err: unknown, fallback: string) =>
    err instanceof Error ? err.message : fallback;

export default function AdminOrdersPage() {
    const toast = useToast();
    const [activeTab, setActiveTab] = useState<"orders" | "refunds">("orders");

    const columns: Column[] = [
        { key: "ma_giao_dich", label: "Mã giao dịch", type: "text" },
        { key: "ma_nguoi_dung", label: "ID học viên", type: "number" },
        { key: "tong_tien", label: "Tổng tiền", type: "number" },
        { key: "phuong_thuc_thanh_toan", label: "Phương thức", type: "text" },
        { key: "ma_giam_gia_code", label: "Mã giảm giá", type: "text" },
        { key: "trang_thai", label: "Trạng thái", type: "text" },
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
            {/* Tab Switcher */}
            <div className="flex max-w-xs bg-slate-100/80 rounded-2xl p-1 border border-slate-200 shadow-sm shrink-0">
                <button
                    onClick={() => setActiveTab("orders")}
                    className={`flex-1 py-2.5 px-4 text-xs font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                        activeTab === "orders"
                        ? "bg-white text-slate-950 shadow-md shadow-slate-200/50"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                >
                    Đơn hàng
                </button>
                <button
                    onClick={() => setActiveTab("refunds")}
                    className={`flex-1 py-2.5 px-4 text-xs font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                        activeTab === "refunds"
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
                />
            ) : (
                <DynamicTable
                    key="refunds-table"
                    title="Yêu cầu hoàn tiền"
                    endpoint="/dynamic-admin/orders"
                    columns={columns}
                    formFields={formFields}
                    customActions={customActions}
                    filterCol="trang_thai"
                    filterVal="refund_requested"
                />
            )}
        </div>
    );
}
