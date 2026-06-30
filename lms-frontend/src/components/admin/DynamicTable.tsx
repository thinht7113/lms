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
    disableBulkDelete?: boolean; // Tùy chọn ẩn tính năng xóa nhiều
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export default function DynamicTable({ title, endpoint, columns, formFields, customActions, disableCreate = false, disableEdit = false, disableDelete = false, filterCol, filterVal, hideIdColumn = false, disableBulkDelete = false }: DynamicTableProps) {
    const toast = useToast();
    const [data, setData] = useState<DynamicTableRow[]>([]);
    const [total, setTotal] = useState(0);
    const [skip, setSkip] = useState(0);
    const [limit] = useState(10);
    const [search, setSearch] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);

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
            setSelectedIds([]);
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
        if (!confirm("Bạn có chắc chắn muốn xóa bản ghi này?")) return;
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

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedIds(data.map(item => Number(item.id)));
        } else {
            setSelectedIds([]);
        }
    };

    const handleSelectItem = (id: number) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) return;
        if (!confirm(`Bạn có chắc chắn muốn xóa ${selectedIds.length} bản ghi đã chọn?`)) return;
        
        setIsLoading(true);
        try {
            await Promise.all(selectedIds.map(id => 
                fetchWithAuth(`${API_BASE_URL}${endpoint}/${id}`, { method: "DELETE" })
            ));
            toast.success(`Đã xóa ${selectedIds.length} bản ghi`);
            setSelectedIds([]);
            fetchData();
        } catch (err) {
            toast.error("Lỗi khi xóa một số bản ghi");
            console.error(err);
            fetchData();
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
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest ${val ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : 'bg-slate-500/10 text-slate-500 border border-slate-500/20'}`}>
                    {val ? "Active" : "Inactive"}
                </span>
            );
        }
        if (col.type === "date") {
            return new Date(String(val)).toLocaleDateString("vi-VN");
        }
        if (col.type === "image") {
            return (
                <a href={String(val)} target="_blank" rel="noreferrer" className="block w-20">
                    <img src={String(val)} className="h-auto max-h-14 w-20 rounded-lg object-contain bg-secondary border border-border/50 shadow-sm" alt="" />
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
            <div className="bg-card border border-border/60 rounded-xl shadow-sm overflow-hidden flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Header Toolbar */}
                <div className="p-4 border-b border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
                    <h2 className="text-base font-black tracking-tight flex items-center gap-2">
                        {title}
                        <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">{total}</span>
                    </h2>

                    <div className="flex flex-col sm:flex-row items-center gap-4">
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Tìm kiếm..."
                                value={search}
                                onChange={(e) => { setSearch(e.target.value); setSkip(0); }}
                                className="w-full bg-white border border-border/60 rounded-md py-1.5 pl-9 pr-4 text-[11px] focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
                            />
                        </div>
                        
                        {selectedIds.length > 0 && !disableDelete && !disableBulkDelete && (
                            <button
                                onClick={handleBulkDelete}
                                className="w-full sm:w-auto bg-rose-600 text-white text-[10px] font-bold uppercase tracking-widest px-4 py-2 rounded-md shadow-md shadow-rose-600/20 flex items-center justify-center gap-1.5 hover:bg-rose-700 transition-all"
                            >
                                <Trash2 className="h-4 w-4" />
                                <span>Xóa ({selectedIds.length})</span>
                            </button>
                        )}

                        {formFields && formFields.length > 0 && !disableCreate && (
                            <button
                                onClick={handleCreate}
                                className="w-full sm:w-auto bg-primary text-white text-[10px] font-bold uppercase tracking-widest px-4 py-2 rounded-md shadow-md shadow-primary/20 flex items-center justify-center gap-1.5 hover:bg-blue-700 transition-all"
                            >
                                <Plus className="h-3.5 w-3.5" />
                                <span>Thêm mới</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto flex-grow">
                    <table className="w-full text-left text-[11px] whitespace-nowrap">
                        <thead className="bg-slate-50 border-b border-border/40 text-[10px] uppercase font-black text-muted-foreground tracking-widest">
                            <tr>
                                {!disableDelete && !disableBulkDelete && (
                                    <th className="px-4 py-2.5 rounded-tl-xl w-8">
                                        <input
                                            type="checkbox"
                                            className="w-3.5 h-3.5 rounded-sm border-slate-300 text-primary focus:ring-primary/20"
                                            checked={data.length > 0 && selectedIds.length === data.length}
                                            onChange={handleSelectAll}
                                        />
                                    </th>
                                )}
                                {!hideIdColumn && <th className={`px-4 py-2.5 ${(!disableDelete && !disableBulkDelete) ? '' : 'rounded-tl-xl'}`}>ID</th>}
                                {columns.map((col, idx) => (
                                    <th key={col.key} className={`px-4 py-2.5 ${hideIdColumn && idx === 0 && (disableDelete || disableBulkDelete) ? 'rounded-tl-xl' : ''}`}>{col.label}</th>
                                ))}
                                <th className="px-4 py-2.5 text-right rounded-tr-xl">Hành động</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/30">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={columns.length + (hideIdColumn ? 1 : 2) + (!disableDelete && !disableBulkDelete ? 1 : 0)} className="px-4 py-8 text-center">
                                        <RefreshCw className="h-6 w-6 text-primary animate-spin mx-auto mb-2" />
                                        <span className="text-xs font-bold text-muted-foreground">Đang tải dữ liệu...</span>
                                    </td>
                                </tr>
                            ) : data.length === 0 ? (
                                <tr>
                                    <td colSpan={columns.length + (hideIdColumn ? 1 : 2) + (!disableDelete && !disableBulkDelete ? 1 : 0)} className="px-4 py-8 text-center">
                                        <span className="text-xs font-bold text-muted-foreground">Không có dữ liệu</span>
                                    </td>
                                </tr>
                            ) : (
                                data.map((item, idx) => (
                                    <tr key={String(item.id ?? idx)} className={`hover:bg-slate-50/50 transition-colors ${selectedIds.includes(Number(item.id)) ? 'bg-primary/5' : ''}`}>
                                        {!disableDelete && !disableBulkDelete && (
                                            <td className="px-4 py-2.5">
                                                <input
                                                    type="checkbox"
                                                    className="w-3.5 h-3.5 rounded-sm border-slate-300 text-primary focus:ring-primary/20"
                                                    checked={selectedIds.includes(Number(item.id))}
                                                    onChange={() => handleSelectItem(Number(item.id))}
                                                />
                                            </td>
                                        )}
                                        {!hideIdColumn && <td className="px-4 py-2.5 font-bold text-muted-foreground">#{String(item.id ?? "")}</td>}
                                        {columns.map(col => (
                                            <td key={col.key} className="px-4 py-2.5 font-medium text-foreground/80">
                                                {renderCell(item, col)}
                                            </td>
                                        ))}
                                        <td className="px-4 py-2.5 text-right">
                                            <div className="flex items-center justify-end space-x-1.5">
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
                                                        className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                                                        title="Sửa"
                                                    >
                                                        <Edit className="h-3.5 w-3.5" />
                                                    </button>
                                                )}

                                                {!disableDelete && (
                                                    <button
                                                        onClick={() => handleDelete(Number(item.id))}
                                                        className="p-1.5 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-md transition-colors"
                                                        title="Xóa"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
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
                            className="p-2 border border-border/60 rounded-md bg-white disabled:opacity-50 hover:bg-secondary transition-colors"
                        >
                            <ChevronLeft className="h-4 w-4 text-foreground" />
                        </button>

                        {renderPageNumbers()}

                        <button
                            onClick={() => setSkip(skip + limit)}
                            disabled={skip + limit >= total}
                            className="p-2 border border-border/60 rounded-md bg-white disabled:opacity-50 hover:bg-secondary transition-colors"
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
