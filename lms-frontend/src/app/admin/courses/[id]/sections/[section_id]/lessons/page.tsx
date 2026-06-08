"use client";

import React from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import DynamicTable, { CustomAction } from "@/components/admin/DynamicTable";
import { ArrowLeft, Plus, Edit, RefreshCw } from "lucide-react";
import { fetchWithAuth } from "@/services/api";
import { useToast } from "@/contexts/ToastContext";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export default function AdminLessonsPage() {
    const router = useRouter();
    const toast = useToast();
    const params = useParams();
    const courseId = params.id as string;
    const sectionId = params.section_id as string;

    const columns = [
        { key: "tieu_de", label: "Tiêu đề Bài học", type: "text" },
        { key: "thu_tu", label: "Thứ tự", type: "number" },
        { key: "thoi_luong", label: "Thời lượng", type: "number" },
        { key: "xem_truoc", label: "Học thử", type: "boolean" },
        { key: "da_xuat_ban", label: "Xuất bản", type: "boolean" },
        { key: "trang_thai_phe_duyet", label: "Kiểm duyệt", type: "text" },
    ];

    const customActions: CustomAction[] = [
        {
            label: "Sửa Bài học",
            icon: Edit,
            colorClass: "text-blue-600 bg-blue-50 hover:bg-blue-100",
            onClick: (lesson) => router.push(`/admin/courses/${courseId}/sections/${sectionId}/lessons/${lesson.id}/edit`)
        },
        {
            label: "Đổi trạng thái Xuất bản/Nháp",
            icon: RefreshCw,
            colorClass: "text-amber-600 bg-amber-50 hover:bg-amber-100",
            onClick: async (lesson) => {
                try {
                    const newStatus = !lesson.da_xuat_ban;
                    const res = await fetchWithAuth(`${API_BASE_URL}/dynamic-admin/lessons/${lesson.id}`, {
                        method: "PUT",
                        body: JSON.stringify({ 
                            da_xuat_ban: newStatus,
                            trang_thai_phe_duyet: "approved" // Admin sửa thì mặc định duyệt luôn
                        })
                    });
                    
                    if (!res.ok) {
                        const err = await res.json();
                        throw new Error(err.detail || "Lỗi khi cập nhật trạng thái");
                    }
                    
                    toast.success(newStatus ? "Đã công khai bài học" : "Đã chuyển về bản nháp");
                    window.location.reload();
                } catch (err: any) {
                    toast.error(err.message || "Không thể cập nhật bài học");
                }
            }
        }
    ];

    return (
        <div className="h-full flex flex-col space-y-4">
            <div className="flex items-center justify-between">
                <button 
                    onClick={() => router.push(`/admin/courses/${courseId}/sections`)}
                    className="p-2 hover:bg-secondary rounded-lg transition-colors flex items-center space-x-2 text-muted-foreground font-bold text-sm"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Quay lại Chương</span>
                </button>

                <Link 
                    href={`/admin/courses/${courseId}/sections/${sectionId}/lessons/create`}
                    className="bg-primary text-white text-xs font-bold uppercase tracking-widest px-6 py-2.5 rounded-xl shadow-lg shadow-primary/20 flex items-center justify-center gap-2 hover:bg-blue-700 transition-all"
                >
                    <Plus className="h-4 w-4" />
                    <span>Tạo bài học</span>
                </Link>
            </div>
            
            <div className="flex-1">
                <DynamicTable 
                    title={`Bài học (Chương ID: ${sectionId})`}
                    endpoint="/dynamic-admin/lessons"
                    filterCol="ma_chuong_hoc"
                    filterVal={sectionId}
                    columns={columns as any}
                    customActions={customActions}
                    disableCreate={true}
                    disableEdit={true}
                    hideIdColumn={true}
                />
            </div>
        </div>
    );
}
