"use client";

import React from "react";
import DynamicTable from "@/components/admin/DynamicTable";

export default function AdminCategoriesPage() {
    const columns = [
        { key: "ten_danh_muc", label: "Tên Danh mục", type: "text" },
        { key: "mo_ta", label: "Mô tả", type: "text" },
    ];

    const formFields = [
        { key: "ten_danh_muc", label: "Tên Danh mục", type: "text", required: true },
        { key: "mo_ta", label: "Mô tả chi tiết", type: "textarea" },
    ];

    return (
        <div className="h-full">
            <DynamicTable
                title="Danh mục"
                endpoint="/dynamic-admin/categories"
                columns={columns as any}
                formFields={formFields as any}
            />
        </div>
    );
}
