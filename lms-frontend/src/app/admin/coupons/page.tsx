"use client";

import React from "react";
import DynamicTable from "@/components/admin/DynamicTable";

export default function AdminCouponsPage() {
    const columns = [
        { key: "ma_code", label: "Mã giảm giá", type: "text" },
        { key: "loai_giam_gia", label: "Loại", type: "text" },
        { key: "gia_tri_giam", label: "Giá trị", type: "number" },
        { key: "gia_tri_don_toi_thieu", label: "Đơn tối thiểu", type: "number" },
        { key: "so_luot_da_dung", label: "Đã dùng", type: "number" },
        { key: "ngay_het_han", label: "Hết hạn", type: "date" },
    ];

    const formFields = [
        { key: "ma_code", label: "Mã giảm giá (Ví dụ: SUMMER20)", type: "text", required: true },
        { key: "loai_giam_gia", label: "Loại giảm giá", type: "select", options: [
            { value: "PERCENTAGE", label: "Theo phần trăm (%)" },
            { value: "FIXED_AMOUNT", label: "Trừ tiền trực tiếp (VND)" }
        ]},
        { key: "gia_tri_giam", label: "Giá trị giảm", type: "number", required: true },
        { key: "gia_tri_don_toi_thieu", label: "Giá trị đơn tối thiểu để áp dụng", type: "number" },
        { key: "so_luot_dung_toi_da", label: "Số lượt dùng tối đa (Bỏ trống = Không giới hạn)", type: "number" },
        { key: "ngay_het_han", label: "Ngày hết hạn (YYYY-MM-DD)", type: "text" },
    ];

    return (
        <div className="h-full">
            <DynamicTable 
                title="Mã giảm giá"
                endpoint="/dynamic-admin/coupons"
                columns={columns as any}
                formFields={formFields as any}
            />
        </div>
    );
}
