"use client";

import React from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import DynamicTable, { CustomAction } from "@/components/admin/DynamicTable";
import { ArrowLeft, Plus, Edit } from "lucide-react";

export default function AdminLessonsPage() {
    const router = useRouter();
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
            label: "Sửa Bài học Multimedia",
            icon: Edit,
            colorClass: "text-blue-600 bg-blue-50 hover:bg-blue-100",
            onClick: (lesson) => router.push(`/admin/courses/${courseId}/sections/${sectionId}/lessons/${lesson.id}/edit`)
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
                    <span>Tạo bài học Đa phương tiện</span>
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
