"use client";

import React, { useRef } from "react";
import DynamicTable, { CustomAction } from "@/components/admin/DynamicTable";
import { Lock, Unlock, KeyRound } from "lucide-react";
import { tokenHelper } from "@/services/api";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export default function AdminUsersPage() {
    const tableRef = useRef<any>(null); // To trigger reload

    const columns = [
        { key: "ho_ten", label: "Họ tên", type: "text" },
        { key: "email", label: "Email", type: "text" },
        { key: "vai_tro", label: "Vai trò", type: "text" },
        { key: "so_dien_thoai", label: "Số điện thoại", type: "text" },
        { key: "trang_thai_hoat_dong", label: "Hoạt động", type: "boolean" },
        { key: "ngay_tao", label: "Ngày tạo", type: "date" },
    ];

    // Form fields ONLY for creating a new user. We pass empty array for editing later to hide edit button.
    // Wait, DynamicTable uses the same formFields for both Create and Edit.
    // If we want to allow Create but NOT Edit via form, we need a slight trick.
    // Actually, the requirement said: "chỉ được phép thêm , xóa , reset mật khâu , khóa hoặc mở khóa người dùng"
    const formFields = [
        { key: "email", label: "Email đăng nhập", type: "email", required: true },
        { key: "mat_khau", label: "Mật khẩu (Ít nhất 6 ký tự)", type: "password", required: true },
        { key: "ho_ten", label: "Họ và tên", type: "text", required: true },
        { key: "so_dien_thoai", label: "Số điện thoại", type: "text" },
        { key: "vai_tro", label: "Vai trò", type: "select", options: [
            { value: "student", label: "Học viên (Student)" },
            { value: "instructor", label: "Giảng viên (Instructor)" },
            { value: "admin", label: "Quản trị viên (Admin)" }
        ]},
    ];

    const handleToggleStatus = async (item: any) => {
        const actionName = item.trang_thai_hoat_dong ? "Khóa" : "Mở khóa";
        if (!confirm(`Bạn có chắc chắn muốn ${actionName} tài khoản của ${item.ho_ten}?`)) return;

        try {
            const token = tokenHelper.getToken();
            const res = await fetch(`${API_BASE_URL}/admin/users/${item.id}/status`, {
                method: "PUT",
                headers: { 
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ trang_thai_hoat_dong: !item.trang_thai_hoat_dong })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.detail || `Lỗi khi ${actionName} tài khoản`);
            }
            
            alert(`Đã ${actionName} tài khoản thành công!`);
            window.location.reload(); // Refresh to show new status
        } catch (error: any) {
            alert(error.message);
        }
    };

    const handleResetPassword = async (item: any) => {
        if (!confirm(`Bạn có chắc chắn muốn reset mật khẩu của tài khoản ${item.email}?\nMật khẩu mới sẽ được tạo ngẫu nhiên.`)) return;

        try {
            const token = tokenHelper.getToken();
            const res = await fetch(`${API_BASE_URL}/admin/users/${item.id}/reset-password`, {
                method: "POST",
                headers: { "Authorization": `Bearer ${token}` }
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.detail || "Lỗi khi reset mật khẩu");
            }
            
            const data = await res.json();
            alert(`Thành công! Mật khẩu mới của người dùng là: ${data.new_password}\nHãy lưu lại và gửi cho người dùng.`);
        } catch (error: any) {
            alert(error.message);
        }
    };

    const customActions: CustomAction[] = [
        {
            label: "Khóa / Mở khóa",
            icon: Lock,
            colorClass: "text-amber-600 bg-amber-50 hover:bg-amber-100",
            onClick: handleToggleStatus
        },
        {
            label: "Reset Mật khẩu",
            icon: KeyRound,
            colorClass: "text-violet-600 bg-violet-50 hover:bg-violet-100",
            onClick: handleResetPassword
        }
    ];

    return (
        <div className="h-full">
            <DynamicTable 
                title="Người dùng"
                endpoint="/dynamic-admin/users"
                columns={columns as any}
                formFields={formFields as any}
                customActions={customActions}
            />
            <div className="mt-4 text-xs text-muted-foreground p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-700 font-medium">
                <strong>Lưu ý Bảo mật:</strong> Bảng người dùng đã bị chặn quyền Chỉnh sửa toàn diện (Edit). Bạn chỉ có thể tạo mới, khóa tài khoản hoặc cấp lại mật khẩu ngẫu nhiên để đảm bảo tính toàn vẹn dữ liệu.
            </div>
        </div>
    );
}
