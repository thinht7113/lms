"use client";

import React from "react";
import { useRouter, useParams } from "next/navigation";
import DynamicTable, { CustomAction } from "@/components/admin/DynamicTable";
import { ArrowLeft, PlaySquare } from "lucide-react";

export default function AdminSectionsPage() {
    const router = useRouter();
    const params = useParams();
    const courseId = params.id as string;

    const columns = [
        { key: "tieu_de", label: "Tiêu đề Chương", type: "text" },
        { key: "mo_ta", label: "Mô tả", type: "text" },
        { key: "thu_tu", label: "Thứ tự", type: "number" },
    ];

    const formFields = [
        { key: "tieu_de", label: "Tiêu đề chương", type: "text", required: true },
        { key: "mo_ta", label: "Mô tả", type: "textarea" },
        { key: "thu_tu", label: "Thứ tự (Ví dụ: 1, 2, 3)", type: "number", required: true },
    ];

    const customActions: CustomAction[] = [
        {
            label: "Bài học",
            icon: PlaySquare,
            colorClass: "text-purple-600 bg-purple-50 hover:bg-purple-100",
            onClick: (section) => router.push(`/admin/courses/${courseId}/sections/${section.id}/lessons`)
        }
    ];

    return (
        <div className="h-full flex flex-col space-y-4">
            <div className="flex items-center space-x-4">
                <button 
                    onClick={() => router.push("/admin/courses")}
                    className="p-2 hover:bg-secondary rounded-lg transition-colors flex items-center space-x-2 text-muted-foreground font-bold text-sm"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Quay lại Khóa học</span>
                </button>
            </div>
            
            <div className="flex-1">
                <DynamicTable 
                    title={`Chương học (Khóa ID: ${courseId})`}
                    endpoint="/dynamic-admin/sections"
                    filterCol="ma_khoa_hoc"
                    filterVal={courseId}
                    columns={columns as any}
                    formFields={formFields as any}
                    customActions={customActions}
                    hideIdColumn={true}
                />
            </div>
            <div className="text-xs text-muted-foreground p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-700 font-medium">
                <strong>Lưu ý:</strong> Khi thêm mới Chương học, hãy đảm bảo nhập đúng ID Khóa học là <strong>{courseId}</strong>.
            </div>
        </div>
    );
}
