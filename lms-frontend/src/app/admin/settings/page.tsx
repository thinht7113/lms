"use client";

import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";

interface Setting {
    id: number;
    key: string;
    value: string;
    data_type: string;
    group: string;
    description: string;
}

export default function SettingsPage() {
    const [settings, setSettings] = useState<Setting[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error", text: string } | null>(null);

    const [activeTab, setActiveTab] = useState("general");

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("lms_token") || "";
            const res = await apiFetch("/admin/settings", token);
            if (res.ok) {
                const data = await res.json();
                // Nếu chưa có cấu hình nào trong DB, ta có thể khởi tạo tạm để hiển thị
                if (data.length === 0) {
                    setSettings([
                        { id: 0, key: "site_name", value: "Lumina LMS", data_type: "string", group: "general", description: "Tên trang web" },
                        { id: 0, key: "allow_registration", value: "true", data_type: "boolean", group: "features", description: "Cho phép đăng ký tài khoản tự do" },
                        { id: 0, key: "ckeditor_license_key", value: "GPL", data_type: "string", group: "editor", description: "Mã License Key cho trình soạn thảo CKEditor" }
                    ]);
                } else {
                    setSettings(data);
                }
            }
        } catch (error) {
            console.error(error);
        }
        setLoading(false);
    };

    const handleSave = async () => {
        setSaving(true);
        setMessage(null);
        try {
            const token = localStorage.getItem("lms_token") || "";
            const updates = settings.map(s => ({ key: s.key, value: s.value }));
            const res = await apiFetch("/admin/settings", token, {
                method: "PUT",
                body: JSON.stringify({ settings: updates })
            });

            if (res.ok) {
                setMessage({ type: "success", text: "Cập nhật cấu hình thành công!" });
                loadSettings(); // Reload
            } else {
                setMessage({ type: "error", text: "Có lỗi xảy ra khi lưu cấu hình." });
            }
        } catch (error) {
            setMessage({ type: "error", text: "Không thể kết nối đến máy chủ." });
        }
        setSaving(false);
    };

    const updateSettingValue = (key: string, newValue: string) => {
        setSettings(prev => prev.map(s => s.key === key ? { ...s, value: newValue } : s));
    };

    const groups = Array.from(new Set(settings.map(s => s.group)));

    // Ánh xạ tên nhóm cho thân thiện
    const groupNames: Record<string, string> = {
        "general": "Cài đặt chung",
        "features": "Tính năng",
        "editor": "Trình soạn thảo",
        "learning": "Học tập"
    };

    if (loading) return <div className="p-8 text-center"><div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div></div>;

    return (
        <div className="max-w-5xl animate-slide-up pb-12">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-black text-on-surface mb-2">Cấu hình hệ thống</h1>
                    <p className="text-on-surface-variant font-medium">Quản lý các thiết lập toàn cục cho nền tảng LMS</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-on-primary px-6 py-3 rounded-xl font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-70"
                >
                    {saving ? <i className="ph ph-spinner animate-spin text-xl"></i> : <i className="ph-fill ph-floppy-disk text-xl"></i>}
                    Lưu thay đổi
                </button>
            </div>

            {message && (
                <div className={`p-4 rounded-xl mb-6 font-bold flex items-center gap-2 ${message.type === 'success' ? 'bg-success/10 text-success' : 'bg-error/10 text-error'}`}>
                    <i className={`ph-fill ${message.type === 'success' ? 'ph-check-circle' : 'ph-warning-circle'} text-xl`}></i>
                    {message.text}
                </div>
            )}

            <div className="flex flex-col md:flex-row gap-8">
                {/* Tabs / Sidebar */}
                <div className="w-full md:w-64 shrink-0 space-y-2">
                    {groups.length === 0 && <div className="text-sm text-on-surface-variant italic">Chưa có nhóm cấu hình nào.</div>}
                    {groups.map(group => (
                        <button
                            key={group}
                            onClick={() => setActiveTab(group)}
                            className={`w-full text-left px-5 py-3.5 rounded-xl font-bold transition-all ${activeTab === group ? "bg-primary text-on-primary shadow-md" : "bg-surface hover:bg-surface-container text-on-surface"}`}
                        >
                            {groupNames[group] || group}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 glass-panel p-8 rounded-3xl bg-surface border border-outline-variant/50 shadow-sm min-h-[400px]">
                    <h2 className="text-xl font-black mb-6 text-primary border-b border-outline-variant/30 pb-4">
                        {groupNames[activeTab] || activeTab}
                    </h2>

                    <div className="space-y-6">
                        {settings.filter(s => s.group === activeTab).map(setting => (
                            <div key={setting.key} className="flex flex-col gap-2">
                                <label className="font-bold text-on-surface">{setting.description || setting.key}</label>

                                {setting.data_type === 'boolean' ? (
                                    <label className="relative inline-flex items-center cursor-pointer mt-1">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={setting.value === "true"}
                                            onChange={(e) => updateSettingValue(setting.key, e.target.checked ? "true" : "false")}
                                        />
                                        <div className="w-14 h-7 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-primary shadow-inner"></div>
                                        <span className="ml-3 text-sm font-bold text-on-surface-variant">
                                            {setting.value === "true" ? "Đang Bật" : "Đang Tắt"}
                                        </span>
                                    </label>
                                ) : (
                                    <input
                                        type="text"
                                        value={setting.value}
                                        onChange={(e) => updateSettingValue(setting.key, e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl border border-outline-variant/60 bg-surface-container focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-on-surface font-medium transition-all"
                                        placeholder={`Nhập giá trị cho ${setting.key}`}
                                    />
                                )}
                                <div className="text-xs font-medium text-on-surface-variant/60">Key: <code>{setting.key}</code></div>
                            </div>
                        ))}

                        {settings.filter(s => s.group === activeTab).length === 0 && (
                            <div className="text-center py-10 text-on-surface-variant">
                                Không có cấu hình nào trong nhóm này.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
