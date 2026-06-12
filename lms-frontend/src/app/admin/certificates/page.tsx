"use client";

import React from "react";
import DynamicTable from "@/components/admin/DynamicTable";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export default function AdminCertificatesPage() {
    const columns = [
        { key: "id", label: "ID", type: "number" as const },
        { 
            key: "uuid", 
            label: "Mã tra cứu", 
            type: "text" as const,
            render: (value: any) => (
                <span className="font-mono text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded">
                    {value || "N/A"}
                </span>
            )
        },
        { 
            key: "nguoi_dung", 
            label: "Học viên", 
            type: "text" as const,
            render: (value: any) => value ? value.ho_ten : "N/A"
        },
        { 
            key: "khoa_hoc", 
            label: "Khóa học", 
            type: "text" as const,
            render: (value: any) => value ? value.tieu_de : "N/A"
        },
        { 
            key: "duong_dan_chung_chi", 
            label: "Chứng chỉ PDF", 
            type: "text" as const,
            render: (value: any) => value ? (
                <a href={value} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                    Xem PDF
                </a>
            ) : "N/A"
        },
        { key: "ngay_cap", label: "Ngày cấp", type: "date" as const },
    ];

    return (
        <div className="h-full">
            <DynamicTable
                title="Quản lý Chứng chỉ"
                endpoint="/admin/certificates"
                columns={columns as any}
                disableCreate={true}
                disableEdit={true}
                disableDelete={false} // Allow revoking certificates
            />
        </div>
    );
}
