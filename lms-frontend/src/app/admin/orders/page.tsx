"use client";

import React from "react";
import DynamicTable from "@/components/admin/DynamicTable";

export default function AdminOrdersPage() {
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

    return (
        <div className="h-full">
            <DynamicTable
                title="Đơn hàng"
                endpoint="/dynamic-admin/orders"
                columns={columns as any}
                formFields={formFields as any}
            />
        </div>
    );
}
