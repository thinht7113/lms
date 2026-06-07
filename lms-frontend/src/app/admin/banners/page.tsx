"use client";

import React from "react";
import DynamicTable from "@/components/admin/DynamicTable";

export default function AdminBannersPage() {
    const columns = [
        { key: "hinh_anh_url", label: "Hình ảnh", type: "image" },
        { key: "tieu_de", label: "Tiêu đề", type: "text" },
        { key: "duong_dan", label: "Link trỏ tới", type: "text" },
        { key: "thu_tu", label: "Thứ tự", type: "number" },
        { key: "trang_thai", label: "Hiển thị", type: "boolean" },
    ];

    const formFields = [
        { key: "tieu_de", label: "Tiêu đề (Tùy chọn)", type: "text" },
        { key: "hinh_anh_url", label: "Hình ảnh Banner (Nên chọn tỉ lệ 16:9 hoặc siêu rộng)", type: "image", required: true },
        { key: "duong_dan", label: "Đường dẫn khi click (VD: /courses/1)", type: "text" },
        { key: "thu_tu", label: "Thứ tự hiển thị (Nhỏ nhất lên trước)", type: "number" },
        { key: "trang_thai", label: "Cho phép hiển thị", type: "boolean" },
    ];

    return (
        <div className="h-full">
            <DynamicTable 
                title="Banner (Trang chủ)"
                endpoint="/dynamic-admin/banners"
                columns={columns as any}
                formFields={formFields as any}
            />
        </div>
    );
}
