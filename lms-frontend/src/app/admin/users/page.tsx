"use client";

import React from "react";
import DynamicTable, { Column, CustomAction, DynamicTableRow } from "@/components/admin/DynamicTable";
import { FormField } from "@/components/admin/DynamicForm";
import { KeyRound, Lock } from "lucide-react";
import { fetchWithAuth } from "@/services/api";
import { useToast } from "@/contexts/ToastContext";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

const getErrorMessage = (err: unknown, fallback: string) =>
    err instanceof Error ? err.message : fallback;

export default function AdminUsersPage() {
    const { success, error, info } = useToast();
    const columns: Column[] = [
        { key: "ho_ten", label: "Họ tên", type: "text" },
        { key: "email", label: "Email", type: "text" },
        { key: "vai_tro", label: "Vai trò", type: "text" },
        { key: "so_dien_thoai", label: "Số điện thoại", type: "text" },
        { key: "trang_thai_hoat_dong", label: "Hoạt động", type: "boolean" },
        { key: "ngay_tao", label: "Ngày tạo", type: "date" },
    ];

    const formFields: FormField[] = [
        { key: "email", label: "Email đăng nhập", type: "email", required: true },
        { key: "mat_khau", label: "Mật khẩu (ít nhất 6 ký tự)", type: "password", required: true },
        { key: "ho_ten", label: "Họ và tên", type: "text", required: true },
        { key: "so_dien_thoai", label: "Số điện thoại", type: "text" },
        {
            key: "vai_tro",
            label: "Vai trò",
            type: "select",
            options: [
                { value: "student", label: "Học viên (Student)" },
                { value: "instructor", label: "Giảng viên (Instructor)" },
                { value: "admin", label: "Quản trị viên (Admin)" },
            ],
        },
    ];

    const handleToggleStatus = async (item: DynamicTableRow) => {
        const userId = Number(item.id);
        const isActive = Boolean(item.trang_thai_hoat_dong);
        const actionName = isActive ? "khóa" : "mở khóa";

        try {
            const res = await fetchWithAuth(`${API_BASE_URL}/admin/users/${userId}/status`, {
                method: "PUT",
                body: JSON.stringify({ trang_thai_hoat_dong: !isActive }),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.detail || `Lỗi khi ${actionName} tài khoản`);
            }

            success(`Đã ${actionName} tài khoản thành công!`);
            setTimeout(() => { window.location.reload(); }, 1500);
        } catch (err: unknown) {
            error(getErrorMessage(err, `Lỗi khi ${actionName} tài khoản`));
        }
    };

    const handleResetPassword = async (item: DynamicTableRow) => {
        const userId = Number(item.id);

        try {
            const res = await fetchWithAuth(`${API_BASE_URL}/admin/users/${userId}/reset-password`, {
                method: "POST",
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.detail || "Lỗi khi reset mật khẩu");
            }

            const data = await res.json();
            
            // Tự động copy mật khẩu vào clipboard và thông báo bằng toast
            try {
                await navigator.clipboard.writeText(data.new_password);
                success(`Đã reset! Mật khẩu mới: ${data.new_password} (Đã tự động copy)`);
            } catch (err) {
                success(`Reset mật khẩu thành công! Mật khẩu mới: ${data.new_password}`);
            }
        } catch (err: unknown) {
            error(getErrorMessage(err, "Lỗi khi reset mật khẩu"));
        }
    };

    const customActions: CustomAction[] = [
        {
            label: "Khóa / Mở khóa",
            icon: Lock,
            colorClass: "text-amber-600 bg-amber-50 hover:bg-amber-100",
            onClick: handleToggleStatus,
        },
        {
            label: "Reset mật khẩu",
            icon: KeyRound,
            colorClass: "text-violet-600 bg-violet-50 hover:bg-violet-100",
            onClick: handleResetPassword,
        },
    ];

    return (
        <div className="h-full">
            <DynamicTable
                title="Người dùng"
                endpoint="/dynamic-admin/users"
                columns={columns}
                formFields={formFields}
                customActions={customActions}
            />
        </div>
    );
}
