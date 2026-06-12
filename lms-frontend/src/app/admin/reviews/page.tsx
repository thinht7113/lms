"use client";

import React from "react";
import DynamicTable from "@/components/admin/DynamicTable";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export default function AdminReviewsPage() {
    const columns = [
        { key: "id", label: "ID", type: "number" as const },
        { 
            key: "nguoi_dung", 
            label: "Người dùng", 
            type: "text" as const,
            render: (value: any) => value ? value.ho_ten : "Ẩn danh"
        },
        { 
            key: "khoa_hoc", 
            label: "Khóa học", 
            type: "text" as const,
            render: (value: any) => value ? value.tieu_de : "N/A"
        },
        { 
            key: "so_sao", 
            label: "Đánh giá", 
            type: "text" as const,
            render: (value: any) => (
                <div className="flex items-center text-yellow-500">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <svg key={i} className={`w-4 h-4 ${i < (value || 0) ? 'fill-current' : 'text-slate-300'}`} viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                    ))}
                </div>
            )
        },
        { key: "binh_luan", label: "Nội dung", type: "text" as const },
        { key: "ngay_tao", label: "Ngày đánh giá", type: "date" as const },
    ];

    return (
        <div className="h-full">
            <DynamicTable
                title="Kiểm duyệt Đánh giá"
                endpoint="/admin/reviews"
                columns={columns as any}
                disableCreate={true}
                disableEdit={true}
                disableDelete={false} // Allow deleting bad reviews
            />
        </div>
    );
}
