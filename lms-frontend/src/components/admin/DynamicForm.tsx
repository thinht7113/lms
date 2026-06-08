"use client";

import React, { useState, useEffect } from "react";
import { X, Save, RefreshCw, UploadCloud } from "lucide-react";
import { tokenHelper } from "@/services/api";
import { useToast } from "@/contexts/ToastContext";

export interface FormField {
    key: string;
    label: string;
    type: "text" | "number" | "email" | "password" | "textarea" | "boolean" | "select" | "image";
    required?: boolean;
    options?: { value: string | number; label: string }[]; // For select type
    placeholder?: string;
    disabled?: boolean;
}

interface DynamicFormProps {
    title: string;
    fields: FormField[];
    initialData?: any; // null for Create, object for Edit
    endpoint: string; // API endpoint to POST or PUT
    onSuccess: () => void;
    onClose: () => void;
    baseData?: any; // Dữ liệu mặc định ẩn (như ID khóa học)
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export default function DynamicForm({ title, fields, initialData, endpoint, onSuccess, onClose, baseData }: DynamicFormProps) {
    const toast = useToast();
    const [formData, setFormData] = useState<any>({});
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [uploadingImage, setUploadingImage] = useState(false);

    const isEditMode = !!initialData;

    // Khởi tạo dữ liệu khi mở form
    useEffect(() => {
        if (initialData) {
            setFormData(initialData);
        } else {
            // Khởi tạo giá trị mặc định cho form tạo mới
            const defaultData: any = { ...(baseData || {}) };
            fields.forEach(field => {
                if (defaultData[field.key] === undefined) {
                    if (field.type === "boolean") defaultData[field.key] = false;
                    else if (field.type === "number") defaultData[field.key] = 0;
                    else defaultData[field.key] = "";
                }
            });
            setFormData(defaultData);
        }
    }, [initialData, fields, baseData]);

    const handleChange = (key: string, value: any) => {
        setFormData((prev: any) => ({ ...prev, [key]: value }));
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldKey: string) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingImage(true);
        setError(null);
        try {
            const token = tokenHelper.getToken();
            const formDataUpload = new FormData();
            formDataUpload.append("file", file);

            const res = await fetch(`${API_BASE_URL}/upload`, {
                method: "POST",
                headers: { "Authorization": `Bearer ${token}` },
                body: formDataUpload
            });

            if (!res.ok) throw new Error("Upload ảnh thất bại");
            const data = await res.json();

            // Cập nhật URL ảnh vào formData
            handleChange(fieldKey, data.url);
        } catch (err: any) {
            toast.error(err.message || "Lỗi khi upload ảnh");
            setError(err.message || "Lỗi khi upload ảnh");
        } finally {
            setUploadingImage(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const token = tokenHelper.getToken();
            const url = isEditMode ? `${API_BASE_URL}${endpoint}/${initialData.id}` : `${API_BASE_URL}${endpoint}`;
            const method = isEditMode ? "PUT" : "POST";

            // Lọc bỏ id hoặc các trường không được phép update nếu cần
            const payload = { ...formData };
            if (payload.id) delete payload.id;

            // Ép kiểu number nếu cần
            fields.forEach(f => {
                if (f.type === "number" && payload[f.key]) {
                    payload[f.key] = Number(payload[f.key]);
                }
            });

            const res = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.detail || "Lỗi lưu dữ liệu");
            }

            toast.success(isEditMode ? "Cập nhật thành công!" : "Tạo mới thành công!");
            onSuccess(); // Báo cho component cha (Table) reload lại dữ liệu
        } catch (err: any) {
            toast.error(err.message || "Lỗi hệ thống");
            setError(err.message || "Lỗi hệ thống");
        } finally {
            setIsLoading(false);
        }
    };

    const renderInput = (field: FormField) => {
        const value = formData[field.key];

        switch (field.type) {
            case "textarea":
                return (
                    <textarea
                        value={value || ""}
                        onChange={(e) => handleChange(field.key, e.target.value)}
                        placeholder={field.placeholder}
                        disabled={field.disabled || isLoading}
                        rows={4}
                        className="w-full bg-secondary border border-border/60 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                );

            case "boolean":
                return (
                    <label className="relative inline-flex items-center cursor-pointer mt-2">
                        <input
                            type="checkbox"
                            checked={!!value}
                            onChange={(e) => handleChange(field.key, e.target.checked)}
                            disabled={field.disabled || isLoading}
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                        <span className="ml-3 text-sm font-medium text-muted-foreground">Kích hoạt</span>
                    </label>
                );

            case "select":
                return (
                    <select
                        value={value !== undefined ? value : ""}
                        onChange={(e) => handleChange(field.key, e.target.value)}
                        disabled={field.disabled || isLoading}
                        className="w-full bg-secondary border border-border/60 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none"
                    >
                        <option value="" disabled>-- Chọn {field.label} --</option>
                        {field.options?.map((opt, idx) => (
                            <option key={idx} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                );

            case "image":
                return (
                    <div className="space-y-3">
                        {value && (
                            <div className="relative w-32 h-32 rounded-xl overflow-hidden border border-border/60 shadow-sm">
                                <img src={value} alt="Preview" className="w-full h-full object-cover" />
                            </div>
                        )}
                        <div className="relative">
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleImageUpload(e, field.key)}
                                disabled={field.disabled || isLoading || uploadingImage}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            <div className="flex items-center space-x-2 bg-secondary border border-border/60 px-4 py-2.5 rounded-xl hover:bg-secondary/70 transition-colors w-fit">
                                {uploadingImage ? <RefreshCw className="w-4 h-4 animate-spin text-primary" /> : <UploadCloud className="w-4 h-4 text-primary" />}
                                <span className="text-xs font-bold text-foreground">
                                    {uploadingImage ? "Đang tải ảnh lên..." : "Chọn ảnh mới"}
                                </span>
                            </div>
                        </div>
                    </div>
                );

            default: // text, number, email, password
                return (
                    <input
                        type={field.type}
                        value={value !== undefined && value !== null ? value : ""}
                        onChange={(e) => handleChange(field.key, e.target.value)}
                        placeholder={field.placeholder}
                        disabled={field.disabled || isLoading}
                        className="w-full bg-secondary border border-border/60 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                );
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-card w-full max-w-2xl max-h-[90vh] rounded-[2rem] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-8 duration-500">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-border/40 bg-slate-50/50">
                    <div>
                        <h2 className="text-xl font-black tracking-tight text-foreground">{title}</h2>
                        <p className="text-xs font-medium text-muted-foreground mt-1">
                            {isEditMode ? "Cập nhật thông tin bản ghi hiện tại" : "Thêm một bản ghi mới vào cơ sở dữ liệu"}
                        </p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 bg-secondary hover:bg-rose-100 hover:text-rose-600 rounded-xl transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Body / Form */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    {error && (
                        <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 text-destructive text-sm font-bold rounded-xl">
                            {error}
                        </div>
                    )}

                    <form id="dynamic-form" onSubmit={handleSubmit} className="space-y-5">
                        {fields.map((field) => (
                            <div key={field.key} className="space-y-1.5">
                                <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">
                                    {field.label} {field.required && <span className="text-rose-500">*</span>}
                                </label>
                                {renderInput(field)}
                            </div>
                        ))}
                    </form>
                </div>

                {/* Footer Actions */}
                <div className="p-6 border-t border-border/40 bg-slate-50/50 flex justify-end space-x-3 shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isLoading}
                        className="px-6 py-2.5 text-sm font-bold text-muted-foreground hover:bg-secondary rounded-xl transition-colors disabled:opacity-50"
                    >
                        Hủy bỏ
                    </button>
                    <button
                        type="submit"
                        form="dynamic-form"
                        disabled={isLoading || uploadingImage}
                        className="px-8 py-2.5 bg-primary hover:bg-blue-700 text-white text-sm font-bold uppercase tracking-widest rounded-xl shadow-lg shadow-primary/20 transition-all flex items-center space-x-2 disabled:opacity-50"
                    >
                        {isLoading ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                            <Save className="h-4 w-4" />
                        )}
                        <span>{isEditMode ? "Cập nhật" : "Tạo mới"}</span>
                    </button>
                </div>

            </div>
        </div>
    );
}

