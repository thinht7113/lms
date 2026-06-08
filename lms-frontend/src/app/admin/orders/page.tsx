"use client";

import React from "react";
import DynamicTable, { CustomAction } from "@/components/admin/DynamicTable";
import { CheckCircle2, XCircle } from "lucide-react";
import { apiService } from "@/services/api";
import { useToast } from "@/contexts/ToastContext";

export default function AdminOrdersPage() {
    const toast = useToast();
    const columns = [
        { key: "ma_giao_dich", label: "Mã giao dịch", type: "text" },
        { key: "ma_nguoi_dung", label: "ID Học viên", type: "number" },
        { key: "tong_tien", label: "Tổng tiền", type: "number" },
        { key: "phuong_thuc_thanh_toan", label: "Phương thức", type: "text" },
        { key: "trang_thai", label: "Trạng thái", type: "text" },
        { key: "ngay_tao", label: "Ngày tạo", type: "date" },
    ];

    // Orders shouldn't usually be created manually via generic form, mostly for viewing/editing status
    const formFields = [
        {
            key: "trang_thai", label: "Trạng thái đơn hàng", type: "select", options: [
                { value: "pending", label: "Đang chờ (Pending)" },
                { value: "success", label: "Thành công (Success)" },
                { value: "failed", label: "Thất bại (Failed)" },
                { value: "refund_requested", label: "Yêu cầu hoàn tiền" },
                { value: "refunded", label: "Đã hoàn tiền" }
            ]
        },
    ];

    const customActions: CustomAction[] = [
        {
            label: "Duyệt hoàn tiền",
            icon: CheckCircle2,
            colorClass: "text-emerald-600 bg-emerald-50 hover:bg-emerald-100",
            onClick: async (order) => {
                if (order.trang_thai !== "refund_requested") {
                    toast.error("Chỉ xử lý đơn đang yêu cầu hoàn tiền");
                    return;
                }
                try {
                    await apiService.approveRefund(order.id);
                    toast.success("Đã duyệt hoàn tiền");
                    window.location.reload();
                } catch (err: any) {
                    toast.error(err.message || "Không thể duyệt hoàn tiền");
                }
            }
        },
        {
            label: "Từ chối hoàn tiền",
            icon: XCircle,
            colorClass: "text-rose-600 bg-rose-50 hover:bg-rose-100",
            onClick: async (order) => {
                if (order.trang_thai !== "refund_requested") {
                    toast.error("Chỉ xử lý đơn đang yêu cầu hoàn tiền");
                    return;
                }
                try {
                    await apiService.rejectRefund(order.id);
                    toast.success("Đã từ chối hoàn tiền");
                    window.location.reload();
                } catch (err: any) {
                    toast.error(err.message || "Không thể từ chối hoàn tiền");
                }
            }
        }
    ];

    return (
        <div className="h-full">
            <DynamicTable
                title="Đơn hàng"
                endpoint="/dynamic-admin/orders"
                columns={columns as any}
                formFields={formFields as any}
                customActions={customActions}
            />
        </div>
    );
}
