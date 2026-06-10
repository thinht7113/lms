"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import DynamicTable, { CustomAction } from "@/components/admin/DynamicTable";
import { apiService, Category } from "@/services/api";
import { ListTree, ClipboardList } from "lucide-react";

export default function AdminCoursesPage() {
    const [categories, setCategories] = useState<Category[]>([]);
    const router = useRouter();

    useEffect(() => {
        apiService.getCategories().then(setCategories).catch(console.error);
    }, []);

    const columns = [
        { key: "anh_dai_dien", label: "Ảnh", type: "image" },
        { key: "tieu_de", label: "Tiêu đề", type: "text" },
        { key: "trinh_do", label: "Trình độ", type: "text" },
        { key: "gia_tien", label: "Giá tiền", type: "number" },
        { key: "da_xuat_ban", label: "Xuất bản", type: "boolean" },
        { key: "trang_thai_phe_duyet", label: "Kiểm duyệt", type: "text" },
        { key: "so_luong_hoc_vien", label: "Học viên", type: "number" },
    ];

    const formFields = [
        { key: "tieu_de", label: "Tiêu đề khóa học", type: "text", required: true },
        { key: "mo_ta", label: "Mô tả khóa học", type: "textarea" },
        { key: "anh_dai_dien", label: "Ảnh đại diện (Thumbnail)", type: "image" },
        { key: "gia_tien", label: "Giá tiền (VND)", type: "number", required: true },
        {
            key: "trinh_do", label: "Trình độ", type: "select", options: [
                { value: "beginner", label: "Cơ bản (Beginner)" },
                { value: "intermediate", label: "Trung cấp (Intermediate)" },
                { value: "advanced", label: "Chuyên sâu (Advanced)" }
            ]
        },
        { key: "ma_danh_muc", label: "Danh mục", type: "select", options: categories.map(c => ({ value: c.id, label: c.ten_danh_muc })) },
        { key: "da_xuat_ban", label: "Cho phép xuất bản", type: "boolean" },
        {
            key: "trang_thai_phe_duyet", label: "Trạng thái kiểm duyệt", type: "select", options: [
                { value: "draft", label: "Bản nháp (Draft)" },
                { value: "pending", label: "Chờ duyệt (Pending)" },
                { value: "approved", label: "Đã duyệt (Approved)" },
                { value: "rejected", label: "Từ chối (Rejected)" }
            ]
        }
    ];

    const customActions: CustomAction[] = [
        {
            label: "Chương học",
            icon: ListTree,
            colorClass: "text-emerald-600 bg-emerald-50 hover:bg-emerald-100",
            onClick: (course) => router.push(`/admin/courses/${course.id}/sections`)
        },
        {
            label: "Bài kiểm tra",
            icon: ClipboardList,
            colorClass: "text-blue-600 bg-blue-50 hover:bg-blue-100",
            onClick: (course) => router.push(`/admin/courses/${course.id}/quizzes`)
        }
    ];

    return (
        <div className="h-full">
            <DynamicTable
                title="Khóa học"
                endpoint="/dynamic-admin/courses"
                columns={columns as any}
                formFields={formFields as any}
                customActions={customActions}
            />
        </div>
    );
}
