"use client";

import React from "react";
import DynamicTable, { Column } from "@/components/admin/DynamicTable";
import { FormField } from "@/components/admin/DynamicForm";

export default function AdminBannersPage() {
  const columns: Column[] = [
    { key: "hinh_anh_url", label: "Ảnh banner", type: "image" },
    { key: "tieu_de", label: "Tiêu đề", type: "text" },
    { key: "duong_dan", label: "Đường dẫn khi click", type: "text" },
    { key: "thu_tu", label: "Thứ tự", type: "number" },
    { key: "trang_thai", label: "Đang hiển thị", type: "boolean" },
  ];

  const formFields: FormField[] = [
    {
      key: "tieu_de",
      label: "Tiêu đề banner",
      type: "text",
      placeholder: "Ví dụ: Khóa học mới trong tháng",
    },
    {
      key: "hinh_anh_url",
      label: "Ảnh banner",
      type: "image",
      required: true,
    },
    {
      key: "duong_dan",
      label: "Đường dẫn khi click",
      type: "text",
      placeholder: "Ví dụ: /courses hoặc /courses/13",
    },
    {
      key: "thu_tu",
      label: "Thứ tự",
      type: "number",
      defaultValue: 0,
    },
    {
      key: "trang_thai",
      label: "Cho phép hiển thị trên trang chủ",
      type: "boolean",
      defaultValue: true,
    },
  ];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <DynamicTable
        title="Danh sách banner"
        endpoint="/dynamic-admin/banners"
        columns={columns}
        formFields={formFields}
      />
    </div>
  );
}
