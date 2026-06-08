"use client";

import React, { useState, useEffect } from "react";
import DynamicTable from "@/components/admin/DynamicTable";
import { UploadCloud, RefreshCw, Save, CheckCircle2 } from "lucide-react";
import { fetchWithAuth } from "@/services/api";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export default function AdminSettingsPage() {
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    const columns = [
        { key: "group", label: "Nhóm cấu hình", type: "text" },
        { key: "key", label: "Từ khóa", type: "text" },
        { key: "value", label: "Giá trị", type: "text" },
        { key: "description", label: "Mô tả", type: "text" },
    ];

    const formFields = [
        { key: "group", label: "Nhóm (Ví dụ: PAYMENT, UI, SYSTEM)", type: "text", required: true },
        { key: "key", label: "Từ khóa (Ví dụ: SYSTEM_LOGO)", type: "text", required: true },
        { key: "value", label: "Giá trị", type: "textarea", required: true },
        { key: "description", label: "Mô tả ý nghĩa cấu hình này", type: "text" },
    ];

    useEffect(() => {
        // Fetch current logo from public settings
        async function fetchLogo() {
            try {
                const res = await fetch(`${API_BASE_URL}/settings/public`);
                if (res.ok) {
                    const data = await res.json();
                    const logoSetting = data.find((s: any) => s.key === "SYSTEM_LOGO");
                    if (logoSetting) {
                        setLogoUrl(logoSetting.value);
                    }
                }
            } catch (err) {
                console.error(err);
            }
        }
        fetchLogo();
    }, []);

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingLogo(true);
        setMessage(null);
        try {
            const formDataUpload = new FormData();
            formDataUpload.append("file", file);
            formDataUpload.append("asset_type", "image");

            // 1. Upload file
            const resUpload = await fetchWithAuth(`${API_BASE_URL}/upload`, {
                method: "POST",
                body: formDataUpload
            });

            if (!resUpload.ok) throw new Error("Upload ảnh thất bại");
            const dataUpload = await resUpload.json();
            const newUrl = dataUpload.url;

            // 2. Cập nhật cấu hình SYSTEM_LOGO qua Dynamic Admin API
            // Lấy ID của cấu hình SYSTEM_LOGO nếu có, nếu không tạo mới
            const resFind = await fetchWithAuth(`${API_BASE_URL}/dynamic-admin/settings?search=SYSTEM_LOGO`);
            const dataFind = await resFind.json();

            let resSave;
            if (dataFind.data && dataFind.data.length > 0) {
                const existingId = dataFind.data[0].id;
                resSave = await fetchWithAuth(`${API_BASE_URL}/dynamic-admin/settings/${existingId}`, {
                    method: "PUT",
                    body: JSON.stringify({ value: newUrl })
                });
            } else {
                resSave = await fetchWithAuth(`${API_BASE_URL}/dynamic-admin/settings`, {
                    method: "POST",
                    body: JSON.stringify({
                        key: "SYSTEM_LOGO",
                        value: newUrl,
                        group: "UI",
                        description: "Logo toàn hệ thống"
                    })
                });
            }

            if (!resSave.ok) throw new Error("Lỗi khi lưu cấu hình Logo");

            setLogoUrl(newUrl);
            setMessage("Đã cập nhật Logo hệ thống thành công!");
            // Trigger refresh event for other components if needed, or reload
            setTimeout(() => {
                window.location.reload();
            }, 1500);

        } catch (err: any) {
            alert(err.message || "Lỗi hệ thống");
        } finally {
            setUploadingLogo(false);
        }
    };

    return (
        <div className="h-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Logo Settings Section */}
            <div className="bg-card border border-border/60 rounded-[2rem] p-8 shadow-sm">
                <div className="border-b border-border/40 pb-4 mb-6">
                    <h2 className="text-xl font-black tracking-tight text-foreground">Đổi Logo Hệ Thống</h2>
                    <p className="text-sm font-medium text-muted-foreground mt-1">Upload hình ảnh logo mới (ưu tiên đuôi .png hoặc .svg trong suốt).</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-8 items-start">
                    <div className="w-full sm:w-1/3 aspect-video bg-secondary rounded-2xl flex items-center justify-center border-2 border-dashed border-border/60 overflow-hidden relative">
                        {logoUrl ? (
                            <img src={logoUrl} alt="System Logo" className="max-w-[80%] max-h-[80%] object-contain" />
                        ) : (
                            <span className="text-muted-foreground font-bold">Chưa có Logo</span>
                        )}
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                            <label className="cursor-pointer bg-primary text-white font-bold py-2 px-4 rounded-xl flex items-center space-x-2 shadow-lg">
                                {uploadingLogo ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                                <span>Tải ảnh mới lên</span>
                                <input type="file" accept="image/png,image/jpeg,image/gif,image/webp" className="hidden" onChange={handleLogoUpload} disabled={uploadingLogo} />
                            </label>
                        </div>
                    </div>

                    <div className="flex-1 space-y-4">
                        <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl space-y-2">
                            <p className="text-xs font-bold text-primary uppercase tracking-widest">Quy chuẩn Logo</p>
                            <ul className="text-sm font-medium text-foreground/80 list-disc list-inside pl-4 space-y-1">
                                <li>Định dạng khuyên dùng: PNG (Transparent) hoặc SVG.</li>
                                <li>Kích thước tối đa: 2MB.</li>
                                <li>Tỷ lệ tốt nhất: 1:1 (Vuông) để tương thích với icon Lumina hiện tại.</li>
                            </ul>
                        </div>
                        {message && (
                            <div className="flex items-center gap-2 text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 rounded-xl font-bold text-sm">
                                <CheckCircle2 className="w-5 h-5" />
                                <span>{message}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Advanced Settings */}
            <div className="h-[600px]">
                <DynamicTable
                    title="Cấu hình Hệ thống (System Settings)"
                    endpoint="/dynamic-admin/settings"
                    columns={columns as any}
                    formFields={formFields as any}
                />
            </div>
        </div>
    );
}
