"use client";

import React from "react";
import Link from "next/link";
import { ExternalLink, ImageIcon, Info, Layers, MonitorPlay, ToggleLeft } from "lucide-react";
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
            placeholder: "Ví dụ: Khóa học mới trong tháng"
        },
        {
            key: "hinh_anh_url",
            label: "Ảnh banner",
            type: "image",
            required: true
        },
        {
            key: "duong_dan",
            label: "Đường dẫn khi click",
            type: "text",
            placeholder: "Ví dụ: /courses hoặc /courses/13"
        },
        {
            key: "thu_tu",
            label: "Thứ tự hiển thị",
            type: "number",
            defaultValue: 0
        },
        {
            key: "trang_thai",
            label: "Cho phép hiển thị trên trang chủ",
            type: "boolean",
            defaultValue: true
        },
    ];

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <section className="relative overflow-hidden rounded-[2rem] border border-blue-100 bg-white p-6 sm:p-8 shadow-sm">
                <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
                <div className="relative flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
                    <div className="max-w-3xl">
                        <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-primary">
                            <MonitorPlay className="h-3.5 w-3.5" />
                            Quản lý banner trang chủ
                        </div>
                        <h2 className="mt-4 text-2xl sm:text-3xl font-black tracking-tight text-foreground">
                            Điều phối các banner đang xuất hiện ở trang chủ Lumina
                        </h2>
                        <p className="mt-3 text-sm leading-7 font-medium text-muted-foreground">
                            Tạo banner mới, upload ảnh, gắn đường dẫn chuyển hướng, sắp xếp thứ tự và bật/tắt hiển thị mà không cần chỉnh code.
                        </p>
                    </div>

                    <Link
                        href="/"
                        target="_blank"
                        className="inline-flex w-fit items-center gap-2 rounded-xl border border-border bg-white px-5 py-3 text-xs font-black uppercase tracking-widest text-foreground shadow-sm transition-all hover:border-primary/40 hover:text-primary"
                    >
                        Xem trang chủ
                        <ExternalLink className="h-4 w-4" />
                    </Link>
                </div>
            </section>

            <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-primary">
                            <ImageIcon className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-sm font-black text-foreground">Ảnh khuyến nghị</p>
                            <p className="text-xs font-medium text-muted-foreground">Tỉ lệ 16:9 hoặc siêu rộng</p>
                        </div>
                    </div>
                </div>
                <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                            <Layers className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-sm font-black text-foreground">Thứ tự hiển thị</p>
                            <p className="text-xs font-medium text-muted-foreground">Số nhỏ sẽ ưu tiên lên trước</p>
                        </div>
                    </div>
                </div>
                <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                            <ToggleLeft className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-sm font-black text-foreground">Trạng thái</p>
                            <p className="text-xs font-medium text-muted-foreground">Tắt để ẩn banner khỏi trang chủ</p>
                        </div>
                    </div>
                </div>
            </section>

            <div className="rounded-2xl border border-blue-100 bg-blue-50/60 px-5 py-4 text-sm font-medium text-blue-900 flex gap-3">
                <Info className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <p>
                    Banner đang bật sẽ được API public trả về cho trang chủ và tự động sắp xếp theo trường <strong>Thứ tự</strong>. Đường dẫn có thể để trống nếu banner chỉ dùng để hiển thị hình ảnh.
                </p>
            </div>

            <DynamicTable
                title="Danh sách banner"
                endpoint="/dynamic-admin/banners"
                columns={columns}
                formFields={formFields}
            />
        </div>
    );
}
