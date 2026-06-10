"use client";

import React from "react";
import DynamicTable from "@/components/admin/DynamicTable";

export default function AdminLogsPage() {
    const columns = [
        { key: "email_admin", label: "Email Admin", type: "text" },
        { key: "hanh_dong", label: "Hành động", type: "text" },
        { key: "chi_tiet", label: "Chi tiết", type: "text" },
        { key: "ngay_thuc_hien", label: "Thời gian", type: "date" },
    ];

    return (
        <div className="h-full">
            <DynamicTable
                title="Nhật ký Hệ thống (Audit Logs)"
                endpoint="/admin/logs"
                columns={columns as any}
                disableCreate={true}
                disableEdit={true}
                disableDelete={true}
            />
        </div>
    );
}
