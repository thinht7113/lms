"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Search, ChevronLeft, ChevronRight, Edit, Trash2, Plus, RefreshCw } from "lucide-react";
import { fetchWithAuth } from "@/services/api";
import DynamicForm, { FormField } from "./DynamicForm";
import { useToast } from "@/contexts/ToastContext";

export interface Column {
    key: string;
    label: string;
    type?: "text" | "number" | "boolean" | "date" | "image";
    render?: (val: any, item: any) => React.ReactNode;
}

export type DynamicTableRow = Record<string, unknown>;

export interface CustomAction {
    icon: React.ElementType;
    label: string;
    onClick: (item: DynamicTableRow, refresh: () => void) => void;
    colorClass?: string; // e.g. "text-amber-500 bg-amber-50 hover:bg-amber-100"
    shouldShow?: (item: DynamicTableRow) => boolean;
}

interface DynamicTableProps {
    title: string;
    endpoint: string; // e.g. "/dynamic-admin/users"
    columns: Column[];
    formFields?: FormField[]; // Fields for the form
    customActions?: CustomAction[]; // Nút chức năng tùy biến ngoài Edit/Delete
    disableCreate?: boolean; // Tùy chọn ẩn nút Thêm mới
    disableEdit?: boolean; // Tùy chọn ẩn nút Sửa
    disableDelete?: boolean; // Tùy chọn ẩn nút Xóa
    filterCol?: string; // Optional: filter data by a column
    filterVal?: string; // Optional: value for the filter column
    hideIdColumn?: boolean; // Tùy chọn ẩn cột ID
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export default function DynamicTable({ title, endpoint, columns, formFields, customActions, disableCreate = false, disableEdit = false, disableDelete = false, filterCol, filterVal, hideIdColumn = false }: DynamicTableProps) {
    const toast = useToast();
    const [data, setData] = useState<DynamicTableRow[]>([]);
    const [total, setTotal] = useState(0);
    const [skip, setSkip] = useState(0);
    const [limit] = useState(10);
    const [search, setSearch] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<DynamicTableRow | null>(null);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const url = new URL(`${API_BASE_URL}${endpoint}`);
            url.searchParams.append("skip", skip.toString());
            url.searchParams.append("limit", limit.toString());
            if (search) url.searchParams.append("search", search);
            if (filterCol && filterVal) {
                url.searchParams.append("filter_col", filterCol);
                url.searchParams.append("filter_val", filterVal);
            }

            const res = await fetchWithAuth(url.toString());

            if (!res.ok) {
                const errText = await res.text();
                throw new Error(`Failed to fetch data: ${res.status} - ${errText}`);
            }
            const result = await res.json() as DynamicTableRow[] | { data?: unknown; total?: number };

            // Handle if result is wrapped in {"data": [], "total": ...} or just an array
            if (!Array.isArray(result) && result && Array.isArray(result.data)) {
                setData(result.data as DynamicTableRow[]);
                setTotal(result.total || 0);
            } else if (Array.isArray(result)) {
                setData(result);
                setTotal(result.length);
            } else {
                setData([]);
                setTotal(0);
            }
        } catch (err) {
            console.error("Error fetching table data:", err);
        } finally {
            setIsLoading(false);
        }
    }, [endpoint, filterCol, filterVal, limit, search, skip]);

    useEffect(() => {
        queueMicrotask(() => {
            void fetchData();
        });
    }, [fetchData]);

    const handleDelete = async (id: number) => {
        try {
            const res = await fetchWithAuth(`${API_BASE_URL}${endpoint}/${id}`, {
                method: "DELETE"
            });
            if (!res.ok) throw new Error("Failed to delete");
            toast.success("Xóa bản ghi thành công");
            fetchData();
        } catch (err) {
            toast.error("Lỗi khi xóa bản ghi");
            console.error(err);
        }
    };

    const handleCreate = () => {
        setEditingItem(null);
        setIsFormOpen(true);
    };

    const handleEdit = (item: DynamicTableRow) => {
        setEditingItem(item);
        setIsFormOpen(true);
    };

    const handleFormSuccess = () => {
        setIsFormOpen(false);
        fetchData();
    };

    const renderCell = (item: DynamicTableRow, col: Column) => {
        const getNestedValue = (obj: any, path: string) => {
            return path.split('.').reduce((acc, part) => acc && acc[part], obj);
        };
        const val = getNestedValue(item, col.key);
        
        if (col.render) {
            return col.render(val, item);
        }

        if (val === null || val === undefined) return "-";

        if (col.type === "boolean") {
            return (
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${val ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : 'bg-slate-500/10 text-slate-500 border border-slate-500/20'}`}>
                    {val ? "Active" : "Inactive"}
                </span>
            );
        }
        if (col.type === "date") {
            return new Date(String(val)).toLocaleDateString("vi-VN");
        }
        if (col.type === "image") {
            return (
                <a href={String(val)} target="_blank" rel="noreferrer" className="block w-28">
                    <img src={String(val)} className="h-auto max-h-20 w-28 rounded-xl object-contain bg-secondary border border-border/50 shadow-sm" alt="" />
                </a>
            );
        }

        // Truncate long text
        if (typeof val === "string" && val.length > 50) {
            return <span title={val}>{val.substring(0, 50)}...</span>;
        }

        return String(val);
    };

    // Pagination calculations
    const currentPage = Math.floor(skip / limit) + 1;
    const totalPages = Math.ceil(total / limit) || 1;

    const renderPageNumbers = () => {
        const pages = [];
        // Hiển thị tối đa 5 nút trang
        let startPage = Math.max(1, currentPage - 2);
        const endPage = Math.min(totalPages, startPage + 4);

        if (endPage - startPage < 4) {
            startPage = Math.max(1, endPage - 4);
        }

        for (let i = startPage; i <= endPage; i++) {
            pages.push(
                <button
                    key={i}
                    onClick={() => setSkip((i - 1) * limit)}
                    className={`min-w-[32px] h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-colors ${currentPage === i
                        ? "bg-primary text-white shadow-md shadow-primary/20"
                        : "bg-white border border-border/60 text-muted-foreground hover:bg-secondary hover:text-foreground"
                        }`}
                >
                    {i}
                </button>
            );
        }
        return pages;
    };

    return (
        <>
            <div className="bg-card border border-border/60 rounded-[2rem] shadow-sm overflow-hidden flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Header Toolbar */}
                <div className="p-6 border-b border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
                    <h2 className="text-lg font-black tracking-tight flex items-center gap-2">
                        {title}
                        <span className="text-xs font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">{total}</span>
                    </h2>

                    <div className="flex flex-col sm:flex-row items-center gap-4">
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Tìm kiếm..."
                                value={search}
                                onChange={(e) => { setSearch(e.target.value); setSkip(0); }}
                                className="w-full bg-white border border-border/60 rounded-xl py-2 pl-9 pr-4 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
                            />
                        </div>
                        {formFields && formFields.length > 0 && !disableCreate && (
                            <button
                                onClick={handleCreate}
                                className="w-full sm:w-auto bg-primary text-white text-xs font-bold uppercase tracking-widest px-6 py-2.5 rounded-xl shadow-lg shadow-primary/20 flex items-center justify-center gap-2 hover:bg-blue-700 transition-all"
                            >
                                <Plus className="h-4 w-4" />
                                <span>Thêm mới</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto flex-grow">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-slate-50 border-b border-border/40 text-xs uppercase font-black text-muted-foreground tracking-widest">
                            <tr>
                                {!hideIdColumn && <th className="px-6 py-4 rounded-tl-[2rem]">ID</th>}
                                {columns.map((col, idx) => (
                                    <th key={col.key} className={`px-6 py-4 ${hideIdColumn && idx === 0 ? 'rounded-tl-[2rem]' : ''}`}>{col.label}</th>
                                ))}
                                <th className="px-6 py-4 text-right rounded-tr-[2rem]">Hành động</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/30">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={columns.length + (hideIdColumn ? 1 : 2)} className="px-6 py-12 text-center">
                                        <RefreshCw className="h-6 w-6 text-primary animate-spin mx-auto mb-2" />
                                        <span className="text-xs font-bold text-muted-foreground">Đang tải dữ liệu...</span>
                                    </td>
                                </tr>
                            ) : data.length === 0 ? (
                                <tr>
                                    <td colSpan={columns.length + (hideIdColumn ? 1 : 2)} className="px-6 py-12 text-center">
                                        <span className="text-xs font-bold text-muted-foreground">Không có dữ liệu</span>
                                    </td>
                                </tr>
                            ) : (
                                data.map((item, idx) => (
                                    <tr key={String(item.id ?? idx)} className="hover:bg-slate-50/50 transition-colors">
                                        {!hideIdColumn && <td className="px-6 py-4 font-bold text-muted-foreground">#{String(item.id ?? "")}</td>}
                                        {columns.map(col => (
                                            <td key={col.key} className="px-6 py-4 font-medium text-foreground/80">
                                                {renderCell(item, col)}
                                            </td>
                                        ))}
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end space-x-2">
                                                {customActions && customActions
                                                    .filter((action) => !action.shouldShow || action.shouldShow(item))
                                                    .map((action, aIdx) => (
                                                        <button
                                                            key={aIdx}
                                                            onClick={() => action.onClick(item, fetchData)}
                                                            className={`p-1.5 rounded-lg transition-all ${action.colorClass || 'text-slate-600 hover:bg-slate-100'}`}
                                                            title={action.label}
                                                        >
                                                            <action.icon className="h-4 w-4" />
                                                        </button>
                                                    ))}

                                                {formFields && formFields.length > 0 && !disableEdit && (
                                                    <button
                                                        onClick={() => handleEdit(item)}
                                                        className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                                                        title="Sửa"
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </button>
                                                )}

                                                {!disableDelete && (
                                                    <button
                                                        onClick={() => handleDelete(Number(item.id))}
                                                        className="p-2 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors"
                                                        title="Xóa"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="p-4 border-t border-border/40 flex items-center justify-between bg-slate-50/50">
                    <span className="text-xs font-bold text-muted-foreground">
                        Đang xem {skip + 1}-{Math.min(skip + limit, total)} trên tổng số {total}
                    </span>
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={() => setSkip(Math.max(0, skip - limit))}
                            disabled={skip === 0}
                            className="p-2 border border-border/60 rounded-lg bg-white disabled:opacity-50 hover:bg-secondary transition-colors"
                        >
                            <ChevronLeft className="h-4 w-4 text-foreground" />
                        </button>

                        {renderPageNumbers()}

                        <button
                            onClick={() => setSkip(skip + limit)}
                            disabled={skip + limit >= total}
                            className="p-2 border border-border/60 rounded-lg bg-white disabled:opacity-50 hover:bg-secondary transition-colors"
                        >
                            <ChevronRight className="h-4 w-4 text-foreground" />
                        </button>
                    </div>
                </div>
            </div>

            {isFormOpen && formFields && formFields.length > 0 && (
                <DynamicForm
                    title={editingItem ? `Chỉnh sửa ${title}` : `Thêm mới ${title}`}
                    endpoint={endpoint}
                    fields={formFields}
                    initialData={editingItem}
                    baseData={filterCol && filterVal ? { [filterCol]: filterVal } : undefined}
                    onSuccess={handleFormSuccess}
                    onClose={() => setIsFormOpen(false)}
                />
            )}
        </>
    );
}
