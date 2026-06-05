"use client";
Suspense

import { useEffect, useState, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useUser } from "@/context/user-context";
import { apiFetch } from "@/lib/api";
import Link from "next/link";
import dynamic from "next/dynamic";

const CustomEditor = dynamic(() => import("@/components/CustomEditor"), { 
    ssr: false, 
    loading: () => (
        <div className="min-h-[300px] flex flex-col items-center justify-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-slate-400">
            <i className="ph ph-spinner-gap animate-spin text-3xl text-indigo-600 mb-2"></i> 
            <span className="text-xs font-bold">Đang tải trình soạn thảo văn bản...</span>
        </div>
    ) 
});

interface ContentBlock {
    id: string;
    type: "video" | "pdf" | "text" | "code" | "image";
    noiDungText: string;
    duongDanFile: string;
    codeLanguage?: string;
    isUploading?: boolean;
    fileName?: string;
}

function getYoutubeEmbedUrl(url: string): string | null {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    if (match && match[2].length === 11) {
        return `https://www.youtube.com/embed/${match[2]}`;
    }
    return null;
}

function getVimeoEmbedUrl(url: string): string | null {
    if (!url) return null;
    const regExp = /vimeo\.com\/(?:video\/)?([0-9]+)/;
    const match = url.match(regExp);
    if (match && match[1]) {
        return `https://player.vimeo.com/video/${match[1]}`;
    }
    return null;
}

function CreateLessonForm() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const courseId = params.id as string;
    const sectionId = searchParams.get("sectionId");
    
    const { role, token, isAuthenticated, isLoading } = useUser();
    
    // Lesson settings
    const [tieuDe, setTieuDe] = useState("");
    const [durationMin, setDurationMin] = useState(5);
    const [durationSec, setDurationSec] = useState(0);
    const [xemTruoc, setXemTruoc] = useState(false);
    const [daXuatBan, setDaXuatBan] = useState(false);
    
    // Dynamic blocks builder
    const [blocks, setBlocks] = useState<ContentBlock[]>([
        { id: "init-block", type: "text", noiDungText: "", duongDanFile: "" }
    ]);
    const [activeBlockId, setActiveBlockId] = useState<string>("init-block");
    const [isSaving, setIsSaving] = useState(false);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [dragEnabled, setDragEnabled] = useState(false);

    const handleDragStart = (e: React.DragEvent, index: number) => {
        setDraggedIndex(index);
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
    };

    const handleDragEnter = (e: React.DragEvent, targetIndex: number) => {
        if (draggedIndex === null || draggedIndex === targetIndex) return;
        
        const updatedBlocks = [...blocks];
        const draggedItem = updatedBlocks[draggedIndex];
        
        updatedBlocks.splice(draggedIndex, 1);
        updatedBlocks.splice(targetIndex, 0, draggedItem);
        
        setDraggedIndex(targetIndex);
        setBlocks(updatedBlocks);
    };

    const handleDragEnd = () => {
        setDraggedIndex(null);
        setDragEnabled(false);
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
                <div className="flex flex-col items-center gap-3">
                    <i className="ph-bold ph-spinner-gap animate-spin text-4xl text-indigo-600"></i>
                    <span className="text-sm font-bold text-slate-400">Đang tải thông tin tài khoản...</span>
                </div>
            </div>
        );
    }

    if (!isAuthenticated || role !== "instructor") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] px-4">
                <div className="bg-white p-10 rounded-3xl text-center border border-slate-200/60 max-w-md w-full shadow-2xl">
                    <div className="text-6xl mb-6">🚫</div>
                    <h2 className="text-2xl font-black text-slate-800 mb-2">Quyền truy cập bị từ chối</h2>
                    <p className="text-slate-500 mb-8 font-medium text-sm">Bạn cần đăng nhập với tài khoản <strong>Giảng viên</strong>.</p>
                    <Link href="/login" className="inline-block w-full px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-md transition-all">
                        Đăng nhập ngay
                    </Link>
                </div>
            </div>
        );
    }

    const addBlock = (type: "video" | "pdf" | "text" | "code" | "image") => {
        const newId = Math.random().toString(36).substring(7);
        setBlocks(prev => [
            ...prev,
            {
                id: newId,
                type,
                noiDungText: "",
                duongDanFile: "",
                codeLanguage: type === "code" ? "javascript" : undefined
            }
        ]);
        setActiveBlockId(newId);
    };

    const deleteBlock = (id: string) => {
        if (blocks.length === 1) {
            alert("Bài học phải có ít nhất 1 khối nội dung!");
            return;
        }
        setBlocks(prev => prev.filter(b => b.id !== id));
        if (activeBlockId === id) {
            const remaining = blocks.filter(b => b.id !== id);
            setActiveBlockId(remaining[remaining.length - 1]?.id || "");
        }
    };

    const moveBlock = (index: number, direction: "up" | "down") => {
        const newBlocks = [...blocks];
        const targetIndex = direction === "up" ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= blocks.length) return;
        
        const temp = newBlocks[index];
        newBlocks[index] = newBlocks[targetIndex];
        newBlocks[targetIndex] = temp;
        setBlocks(newBlocks);
    };

    const updateBlock = (id: string, updates: Partial<ContentBlock>) => {
        setBlocks(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
    };

    const uploadFileForBlock = async (blockId: string, file: File, allowedType: string) => {
        if (allowedType === "pdf" && file.type !== "application/pdf") {
            alert("Vui lòng chọn tệp định dạng PDF!");
            return;
        }
        if (allowedType === "image" && !file.type.startsWith("image/")) {
            alert("Vui lòng chọn tệp định dạng Hình ảnh!");
            return;
        }
        if (allowedType === "video" && !file.type.startsWith("video/")) {
            alert("Vui lòng chọn tệp định dạng Video!");
            return;
        }

        if (file.size > 50 * 1024 * 1024) {
            alert("Kích thước tệp tối đa cho phép là 50MB!");
            return;
        }

        updateBlock(blockId, { isUploading: true });

        const formData = new FormData();
        formData.append("file", file);

        try {
            const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1";
            const uploadRes = await fetch(`${API}/upload`, {
                method: "POST",
                headers: { "Authorization": `Bearer ${token}` },
                body: formData
            });
            
            if (uploadRes.ok) {
                const data = await uploadRes.json();
                updateBlock(blockId, { 
                    duongDanFile: data.url, 
                    fileName: file.name,
                    isUploading: false 
                });
            } else {
                const err = await uploadRes.json().catch(() => ({}));
                alert(err.detail || "Tải tệp lên thất bại.");
                updateBlock(blockId, { isUploading: false });
            }
        } catch (error) {
            console.error("Upload error", error);
            alert("Lỗi kết nối máy chủ khi tải tệp.");
            updateBlock(blockId, { isUploading: false });
        }
    };
    
    const handleSave = async () => {
        if (!tieuDe.trim()) {
            alert("Vui lòng nhập tiêu đề bài học!");
            return;
        }
        if (!sectionId) {
            alert("Lỗi: Không tìm thấy ID chương học.");
            return;
        }

        setIsSaving(true);
        try {
            // Fetch section content to calculate sort order
            const courseRes = await apiFetch(`/courses/${courseId}`, token);
            let thu_tu = 1;
            if (courseRes.ok) {
                const courseData = await courseRes.json();
                const section = courseData.chuong_hoc.find((s: any) => s.id === parseInt(sectionId));
                if (section) thu_tu = section.bai_hoc.length + 1;
            }

            const totalSeconds = (durationMin * 60) + durationSec;

            const body: any = {
                tieu_de: tieuDe.trim(),
                thoi_luong: totalSeconds,
                thu_tu: thu_tu,
                da_xuat_ban: daXuatBan,
                xem_truoc: xemTruoc,
                noi_dung: blocks.map((block, idx) => {
                    const isTextType = block.type === "text" || block.type === "code";
                    return {
                        loai_noi_dung: block.type,
                        noi_dung_text: isTextType ? block.noiDungText : null,
                        duong_dan_file: !isTextType ? block.duongDanFile.trim() : null,
                        thu_tu: idx + 1
                    };
                })
            };

            const res = await apiFetch(`/sections/${sectionId}/lessons`, token, {
                method: "POST",
                body: JSON.stringify(body)
            });

            if (res.ok) {
                router.push(`/instructor/courses/${courseId}`);
            } else {
                const err = await res.json();
                alert(err.detail || "Lỗi lưu bài học");
            }
        } catch (e) {
            alert("Lỗi kết nối mạng");
        }
        setIsSaving(false);
    };

    return (
        <div className="min-h-screen bg-[#f8fafc] flex flex-col">
            {/* Header Toolbar */}
            <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/60 px-6 py-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                    <Link href={`/instructor/courses/${courseId}`} className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-indigo-600 transition-all bg-slate-50 hover:bg-indigo-50 border border-slate-200/40 px-3 py-1.5 rounded-xl">
                        <i className="ph-bold ph-arrow-left"></i> Quay lại khóa học
                    </Link>
                    <span className="text-slate-300 font-light">/</span>
                    <span className="text-sm font-extrabold text-slate-700 bg-indigo-50 text-indigo-700 px-3 py-1 rounded-lg">
                        Không gian thiết kế bài học
                    </span>
                </div>
                <div className="flex items-center gap-3">
                    <Link href={`/instructor/courses/${courseId}`} className="px-4 py-2 border border-slate-200 rounded-xl font-bold hover:bg-slate-50 transition-all text-xs text-slate-500">
                        Hủy bỏ
                    </Link>
                    <button 
                        onClick={handleSave} 
                        disabled={isSaving}
                        className="px-5 py-2 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-600/10 hover:bg-indigo-500 hover:shadow-indigo-600/25 transition-all flex items-center gap-1.5 text-xs disabled:opacity-75"
                    >
                        {isSaving ? <i className="ph ph-spinner-gap animate-spin"></i> : <i className="ph-bold ph-floppy-disk"></i>} Lưu & Xuất bản bài học
                    </button>
                </div>
            </header>

            {/* Split Panel Layout */}
            <main className="flex-1 w-full max-w-[98%] mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* Left Panel: Settings & Presets (col-span-4) */}
                <div className="lg:col-span-4 space-y-6">
                    
                    {/* Basic info block */}
                    <div className="bg-white p-6 rounded-3xl border border-slate-150 shadow-sm space-y-5">
                        <div className="border-b border-slate-100 pb-3 flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                                <i className="ph-bold ph-gear-six text-lg"></i>
                            </div>
                            <h2 className="font-black text-slate-800 text-sm tracking-tight">Cấu hình bài học cơ bản</h2>
                        </div>

                        {/* Title Input */}
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Tiêu đề bài giảng *</label>
                            <input 
                                className="w-full px-4 py-3 rounded-2xl border border-slate-250 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/10 outline-none font-bold text-sm text-slate-800 transition-all placeholder:text-slate-300" 
                                value={tieuDe} 
                                onChange={(e) => setTieuDe(e.target.value)} 
                                placeholder="Ví dụ: Cài đặt NodeJS và npm..." 
                                autoFocus
                            />
                        </div>

                        {/* Duration settings */}
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Thời lượng ước tính</label>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="relative">
                                    <input 
                                        className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-slate-200 outline-none text-sm font-bold text-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/10" 
                                        type="number"
                                        min="0"
                                        value={durationMin} 
                                        onChange={(e) => setDurationMin(Math.max(0, parseInt(e.target.value) || 0))} 
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">phút</span>
                                </div>
                                <div className="relative">
                                    <input 
                                        className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-slate-200 outline-none text-sm font-bold text-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/10" 
                                        type="number"
                                        min="0"
                                        max="59"
                                        value={durationSec} 
                                        onChange={(e) => setDurationSec(Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))} 
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">giây</span>
                                </div>
                            </div>

                            {/* Duration Presets */}
                            <div className="flex flex-wrap gap-1.5 mt-2.5">
                                {[5, 10, 15, 20, 30].map(mins => (
                                    <button 
                                        key={mins}
                                        type="button"
                                        onClick={() => { setDurationMin(mins); setDurationSec(0); }}
                                        className="px-2.5 py-1 text-[10px] font-bold bg-slate-50 text-slate-600 border border-slate-200 hover:border-indigo-500 hover:text-indigo-600 rounded-lg transition-colors cursor-pointer"
                                    >
                                        +{mins}m
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Settings switch buttons */}
                        <div className="space-y-4 pt-2 border-t border-slate-100">
                            {/* Free Preview Switch */}
                            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-150">
                                <div className="flex gap-2.5 items-start">
                                    <i className="ph-fill ph-eye text-emerald-500 text-lg mt-0.5"></i>
                                    <div>
                                        <span className="text-xs font-extrabold text-slate-700 block">Xem trước miễn phí</span>
                                        <span className="text-[10px] font-medium text-slate-400">Cho phép học viên chưa mua học thử</span>
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        className="sr-only peer" 
                                        checked={xemTruoc} 
                                        onChange={(e) => setXemTruoc(e.target.checked)} 
                                    />
                                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                                </label>
                            </div>

                            {/* Publish Switch */}
                            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-150">
                                <div className="flex gap-2.5 items-start">
                                    <i className="ph-fill ph-rocket-launch text-indigo-600 text-lg mt-0.5"></i>
                                    <div>
                                        <span className="text-xs font-extrabold text-slate-700 block">Xuất bản ngay lập tức</span>
                                        <span className="text-[10px] font-medium text-slate-400">Hiện ngay lên giáo trình khóa học</span>
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        className="sr-only peer" 
                                        checked={daXuatBan} 
                                        onChange={(e) => setDaXuatBan(e.target.checked)} 
                                    />
                                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Block Add / Sidebar Toolbox */}
                    <div className="bg-white p-6 rounded-3xl border border-slate-150 shadow-sm space-y-4">
                        <div className="border-b border-slate-100 pb-3 flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                                <i className="ph-bold ph-plus-circle text-lg"></i>
                            </div>
                            <h2 className="font-black text-slate-800 text-sm tracking-tight">Thêm khối đa phương tiện</h2>
                        </div>
                        <p className="text-[11px] text-slate-400 font-medium">Bố cục bài học được cấu tạo bởi các khối độc lập dưới đây. Click để chèn thêm:</p>
                        
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => addBlock("text")}
                                className="flex flex-col items-center gap-2 p-3 border border-slate-200 rounded-2xl bg-slate-50 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-600 transition-all font-extrabold text-[11px] text-slate-600"
                            >
                                <i className="ph-fill ph-file-text text-xl"></i>
                                Văn bản (Editor)
                            </button>

                            <button
                                type="button"
                                onClick={() => addBlock("video")}
                                className="flex flex-col items-center gap-2 p-3 border border-slate-200 rounded-2xl bg-slate-50 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-600 transition-all font-extrabold text-[11px] text-slate-600"
                            >
                                <i className="ph-fill ph-play-circle text-xl text-rose-500"></i>
                                Video Bài giảng
                            </button>

                            <button
                                type="button"
                                onClick={() => addBlock("pdf")}
                                className="flex flex-col items-center gap-2 p-3 border border-slate-200 rounded-2xl bg-slate-50 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-600 transition-all font-extrabold text-[11px] text-slate-600"
                            >
                                <i className="ph-fill ph-file-pdf text-xl text-amber-500"></i>
                                Tài liệu PDF
                            </button>

                            <button
                                type="button"
                                onClick={() => addBlock("code")}
                                className="flex flex-col items-center gap-2 p-3 border border-slate-200 rounded-2xl bg-slate-50 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-600 transition-all font-extrabold text-[11px] text-slate-600"
                            >
                                <i className="ph-fill ph-code-block text-xl text-sky-500"></i>
                                Khối Code / Mã
                            </button>

                            <button
                                type="button"
                                onClick={() => addBlock("image")}
                                className="flex flex-col items-center gap-2 p-3 border border-slate-200 rounded-2xl bg-slate-50 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-600 transition-all font-extrabold text-[11px] text-slate-600 col-span-2"
                            >
                                <i className="ph-fill ph-image text-xl text-emerald-500"></i>
                                Hình ảnh minh họa
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right Panel: Content Block Canvas (col-span-8) */}
                <div className="lg:col-span-8 space-y-6">
                    
                    <div className="flex items-center justify-between bg-white border border-slate-200/60 px-6 py-4.5 rounded-3xl shadow-sm">
                        <div className="flex items-center gap-2">
                            <i className="ph-fill ph-stack text-indigo-600 text-lg"></i>
                            <span className="text-sm font-black text-slate-700">Tiến trình khối nội dung ({blocks.length} khối)</span>
                        </div>
                        <span className="text-[10px] text-indigo-600 bg-indigo-50 border border-indigo-150 px-3 py-1 rounded-full font-bold">Kéo thả biểu tượng ⠿ ở đầu mỗi khối để thay đổi thứ tự</span>
                    </div>

                    {/* Visual Blocks Wrapper */}
                    <div className="space-y-6">
                        {blocks.map((block, idx) => {
                            const isActive = activeBlockId === block.id;
                            return (
                                <div 
                                    key={block.id} 
                                    onClick={() => setActiveBlockId(block.id)}
                                    draggable={dragEnabled}
                                    onDragStart={(e) => handleDragStart(e, idx)}
                                    onDragOver={(e) => handleDragOver(e, idx)}
                                    onDragEnter={(e) => handleDragEnter(e, idx)}
                                    onDragEnd={handleDragEnd}
                                    className={`bg-white rounded-3xl border shadow-sm transition-all duration-300 overflow-hidden ${
                                        isActive 
                                            ? "border-indigo-500 ring-2 ring-indigo-500/10 shadow-md" 
                                            : "border-slate-150 hover:border-slate-300"
                                    } ${draggedIndex === idx ? "opacity-30 scale-[0.98] border-dashed border-indigo-400" : ""}`}
                                >
                                    {/* Block Title Bar */}
                                    <div className={`px-5 py-4 border-b border-slate-100 flex items-center justify-between ${
                                        isActive ? "bg-indigo-50/20" : "bg-slate-50/40"
                                    }`}>
                                        <div className="flex items-center gap-3">
                                            {/* Drag Handle */}
                                            <div 
                                                onMouseDown={() => setDragEnabled(true)}
                                                onMouseUp={() => setDragEnabled(false)}
                                                className="cursor-grab active:cursor-grabbing p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors flex items-center justify-center"
                                                title="Kéo thả để sắp xếp"
                                            >
                                                <i className="ph-bold ph-dots-six-vertical text-lg"></i>
                                            </div>

                                            <span className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] font-black text-slate-500">
                                                {idx + 1}
                                            </span>
                                            
                                            {/* Icon Indicator mapping */}
                                            {block.type === "text" && (
                                                <span className="flex items-center gap-1.5 text-xs font-black text-slate-700">
                                                    <i className="ph-fill ph-file-text text-indigo-600 text-lg"></i> Khối soạn thảo văn bản
                                                </span>
                                            )}
                                            {block.type === "video" && (
                                                <span className="flex items-center gap-1.5 text-xs font-black text-slate-700">
                                                    <i className="ph-fill ph-play-circle text-rose-500 text-lg"></i> Khối Video bài giảng
                                                </span>
                                            )}
                                            {block.type === "pdf" && (
                                                <span className="flex items-center gap-1.5 text-xs font-black text-slate-700">
                                                    <i className="ph-fill ph-file-pdf text-amber-500 text-lg"></i> Khối tài liệu PDF
                                                </span>
                                            )}
                                            {block.type === "code" && (
                                                <span className="flex items-center gap-1.5 text-xs font-black text-slate-700">
                                                    <i className="ph-fill ph-code-block text-sky-500 text-lg"></i> Khối Code/Mã nguồn
                                                </span>
                                            )}
                                            {block.type === "image" && (
                                                <span className="flex items-center gap-1.5 text-xs font-black text-slate-700">
                                                    <i className="ph-fill ph-image text-emerald-500 text-lg"></i> Khối hình ảnh
                                                </span>
                                            )}
                                        </div>

                                        {/* Action buttons (Move, Delete) */}
                                        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                            <button 
                                                disabled={idx === 0}
                                                onClick={() => moveBlock(idx, "up")}
                                                className="w-8 h-8 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200/60 flex items-center justify-center text-slate-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                                title="Di chuyển lên"
                                            >
                                                <i className="ph-bold ph-arrow-up text-xs"></i>
                                            </button>
                                            <button 
                                                disabled={idx === blocks.length - 1}
                                                onClick={() => moveBlock(idx, "down")}
                                                className="w-8 h-8 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200/60 flex items-center justify-center text-slate-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                                title="Di chuyển xuống"
                                            >
                                                <i className="ph-bold ph-arrow-down text-xs"></i>
                                            </button>
                                            <span className="w-[1px] h-4 bg-slate-200 mx-1"></span>
                                            <button 
                                                onClick={() => deleteBlock(block.id)}
                                                className="w-8 h-8 rounded-lg bg-slate-50 hover:bg-rose-50 hover:text-rose-600 border border-slate-200/60 flex items-center justify-center text-slate-400 transition-colors"
                                                title="Xóa khối"
                                            >
                                                <i className="ph-bold ph-trash text-xs"></i>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Block Content Editor Form */}
                                    <div className="p-5 md:p-6 space-y-4">
                                        
                                        {/* 1. Text Type block content */}
                                        {block.type === "text" && (
                                            <div className="space-y-2">
                                                <CustomEditor 
                                                    value={block.noiDungText} 
                                                    onChange={(val) => updateBlock(block.id, { noiDungText: val })} 
                                                />
                                            </div>
                                        )}

                                        {/* 2. Video block content */}
                                        {block.type === "video" && (
                                            <div className="space-y-4">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {/* Upload Area */}
                                                    <div className="border-2 border-dashed border-slate-200 rounded-2xl p-5 flex flex-col items-center justify-center bg-slate-50/50 hover:bg-slate-50 transition-colors">
                                                        <i className="ph-fill ph-video text-3xl text-rose-500 mb-2"></i>
                                                        <span className="text-xs font-black text-slate-700">Tải tệp Video bài giảng lên</span>
                                                        <span className="text-[10px] text-slate-400 mt-0.5 mb-3 font-medium">Hỗ trợ tệp MP4 tối đa 50MB</span>
                                                        
                                                        <label className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-[10px] font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm shadow-rose-500/10">
                                                            <i className="ph-bold ph-upload-simple"></i> Chọn tệp Video
                                                            <input 
                                                                type="file" 
                                                                accept="video/mp4,video/*"
                                                                className="hidden" 
                                                                onChange={(e) => {
                                                                    const file = e.target.files?.[0];
                                                                    if (file) uploadFileForBlock(block.id, file, "video");
                                                                }}
                                                            />
                                                        </label>
                                                    </div>

                                                    {/* URL Link Input */}
                                                    <div className="flex flex-col justify-center p-5 border border-slate-200/60 bg-white rounded-2xl">
                                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Hoặc nhập liên kết Video (YouTube, Vimeo, MP4)</label>
                                                        <input 
                                                            className="w-full px-4 py-3 rounded-xl border border-slate-250 focus:border-indigo-500 outline-none text-xs font-bold text-slate-700 bg-slate-50/50" 
                                                            value={block.duongDanFile} 
                                                            onChange={(e) => updateBlock(block.id, { duongDanFile: e.target.value })} 
                                                            placeholder="Ví dụ: https://www.youtube.com/watch?v=..."
                                                        />
                                                    </div>
                                                </div>

                                                {/* Uploading Status */}
                                                {block.isUploading && (
                                                    <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-rose-500/5 border border-rose-200 text-rose-600 animate-pulse text-xs font-bold justify-center">
                                                        <i className="ph ph-spinner-gap animate-spin text-lg"></i>
                                                        Đang tải tệp Video lên máy chủ lưu trữ (Vui lòng không đóng trình duyệt)...
                                                    </div>
                                                )}

                                                {/* Live Video Preview Panel */}
                                                {!block.isUploading && block.duongDanFile && (
                                                    <div className="border border-slate-200/80 rounded-2xl overflow-hidden bg-black aspect-video relative max-w-lg mx-auto shadow-sm">
                                                        {(() => {
                                                            const ytUrl = getYoutubeEmbedUrl(block.duongDanFile);
                                                            const vmUrl = getVimeoEmbedUrl(block.duongDanFile);
                                                            if (ytUrl) {
                                                                return <iframe className="w-full h-full" src={ytUrl} allowFullScreen title="YouTube Preview" />;
                                                            } else if (vmUrl) {
                                                                return <iframe className="w-full h-full" src={vmUrl} allowFullScreen title="Vimeo Preview" />;
                                                            } else if (block.duongDanFile.toLowerCase().endsWith(".mp4") || block.duongDanFile.toLowerCase().includes("mp4") || block.duongDanFile.toLowerCase().includes("minio")) {
                                                                return <video className="w-full h-full" controls src={block.duongDanFile} />;
                                                            } else {
                                                                return (
                                                                    <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 bg-slate-900 p-4 text-center">
                                                                        <i className="ph ph-warning-octagon text-3xl mb-2 text-amber-500"></i>
                                                                        <span className="text-xs font-bold text-white">Định dạng URL chưa được xem trước tự động</span>
                                                                        <span className="text-[10px] text-slate-500 mt-1">Liên kết đã lưu: {block.duongDanFile}</span>
                                                                    </div>
                                                                );
                                                            }
                                                        })()}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* 3. PDF Block content */}
                                        {block.type === "pdf" && (
                                            <div className="space-y-4">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {/* Upload Area */}
                                                    <div className="border-2 border-dashed border-slate-200 rounded-2xl p-5 flex flex-col items-center justify-center bg-slate-50/50 hover:bg-slate-50 transition-colors">
                                                        <i className="ph-fill ph-file-pdf text-3xl text-amber-500 mb-2"></i>
                                                        <span className="text-xs font-black text-slate-700">Tải tệp PDF của bạn lên</span>
                                                        <span className="text-[10px] text-slate-400 mt-0.5 mb-3 font-medium">Hỗ trợ tệp tối đa 50MB</span>
                                                        
                                                        <label className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-[10px] font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm shadow-amber-500/10">
                                                            <i className="ph-bold ph-upload-simple"></i> Chọn tệp PDF
                                                            <input 
                                                                type="file" 
                                                                accept=".pdf,application/pdf"
                                                                className="hidden" 
                                                                onChange={(e) => {
                                                                    const file = e.target.files?.[0];
                                                                    if (file) uploadFileForBlock(block.id, file, "pdf");
                                                                }}
                                                            />
                                                        </label>
                                                    </div>

                                                    {/* URL Link Input */}
                                                    <div className="flex flex-col justify-center p-5 border border-slate-200/60 bg-white rounded-2xl">
                                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Hoặc nhập liên kết URL tài liệu</label>
                                                        <input 
                                                            className="w-full px-4 py-3 rounded-xl border border-slate-250 focus:border-indigo-500 outline-none text-xs font-bold text-slate-700 bg-slate-50/50" 
                                                            value={block.duongDanFile} 
                                                            onChange={(e) => updateBlock(block.id, { duongDanFile: e.target.value })} 
                                                            placeholder="Ví dụ: https://example.com/slide.pdf"
                                                        />
                                                    </div>
                                                </div>

                                                {/* Uploading Status */}
                                                {block.isUploading && (
                                                    <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-amber-500/5 border border-amber-200 text-amber-600 animate-pulse text-xs font-bold justify-center">
                                                        <i className="ph ph-spinner-gap animate-spin text-lg"></i>
                                                        Đang tải tệp PDF lên máy chủ lưu trữ...
                                                    </div>
                                                )}

                                                {/* PDF Indicator preview */}
                                                {!block.isUploading && block.duongDanFile && (
                                                    <div className="p-4 bg-emerald-500/5 border border-dashed border-emerald-300 rounded-2xl flex items-center justify-between gap-3 animate-scale-up">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                                                                <i className="ph-bold ph-check-circle text-xl"></i>
                                                            </div>
                                                            <div>
                                                                <span className="text-xs font-black text-slate-700 block">Đã nạp tài liệu PDF thành công</span>
                                                                <span className="text-[10px] font-bold text-slate-400 truncate max-w-sm block">
                                                                    {block.fileName || block.duongDanFile}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <a 
                                                            href={block.duongDanFile} 
                                                            target="_blank" 
                                                            rel="noreferrer"
                                                            className="px-3.5 py-1.5 bg-emerald-500 text-white rounded-lg text-[10px] font-bold hover:bg-emerald-600 transition-colors flex items-center gap-1"
                                                        >
                                                            <i className="ph-bold ph-eye"></i> Xem tài liệu
                                                        </a>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* 4. Code Block content */}
                                        {block.type === "code" && (
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between gap-4">
                                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">Lập trình & Mã nguồn *</label>
                                                    <select
                                                        value={block.codeLanguage || "javascript"}
                                                        onChange={(e) => updateBlock(block.id, { codeLanguage: e.target.value })}
                                                        className="px-3 py-1.5 border border-slate-200 bg-white rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-indigo-500"
                                                    >
                                                        <option value="javascript">JavaScript / TypeScript</option>
                                                        <option value="python">Python</option>
                                                        <option value="html">HTML5</option>
                                                        <option value="css">CSS3</option>
                                                        <option value="json">JSON</option>
                                                        <option value="sql">SQL Database</option>
                                                    </select>
                                                </div>

                                                <textarea
                                                    className="w-full h-44 p-4 font-mono text-xs text-slate-100 bg-slate-900 border border-slate-800 rounded-2xl outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/10 placeholder:text-slate-700 leading-relaxed"
                                                    value={block.noiDungText}
                                                    onChange={(e) => updateBlock(block.id, { noiDungText: e.target.value })}
                                                    placeholder="// Nhập hoặc dán mã code của bạn vào đây..."
                                                />
                                            </div>
                                        )}

                                        {/* 5. Image Block content */}
                                        {block.type === "image" && (
                                            <div className="space-y-4">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {/* Upload Area */}
                                                    <div className="border-2 border-dashed border-slate-200 rounded-2xl p-5 flex flex-col items-center justify-center bg-slate-50/50 hover:bg-slate-50 transition-colors">
                                                        <i className="ph-fill ph-image text-3xl text-emerald-500 mb-2"></i>
                                                        <span className="text-xs font-black text-slate-700">Tải ảnh minh họa từ thiết bị</span>
                                                        <span className="text-[10px] text-slate-400 mt-0.5 mb-3 font-medium">Hỗ trợ JPG, PNG, GIF tối đa 50MB</span>
                                                        
                                                        <label className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-[10px] font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm shadow-emerald-500/10">
                                                            <i className="ph-bold ph-upload-simple"></i> Chọn hình ảnh
                                                            <input 
                                                                type="file" 
                                                                accept="image/*"
                                                                className="hidden" 
                                                                onChange={(e) => {
                                                                    const file = e.target.files?.[0];
                                                                    if (file) uploadFileForBlock(block.id, file, "image");
                                                                }}
                                                            />
                                                        </label>
                                                    </div>

                                                    {/* URL Link Input */}
                                                    <div className="flex flex-col justify-center p-5 border border-slate-200/60 bg-white rounded-2xl">
                                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Hoặc nhập liên kết hình ảnh trực tiếp</label>
                                                        <input 
                                                            className="w-full px-4 py-3 rounded-xl border border-slate-250 focus:border-indigo-500 outline-none text-xs font-bold text-slate-700 bg-slate-50/50" 
                                                            value={block.duongDanFile} 
                                                            onChange={(e) => updateBlock(block.id, { duongDanFile: e.target.value })} 
                                                            placeholder="Ví dụ: https://example.com/hinh-anh.jpg"
                                                        />
                                                    </div>
                                                </div>

                                                {/* Uploading Status */}
                                                {block.isUploading && (
                                                    <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-emerald-500/5 border border-emerald-200 text-emerald-600 animate-pulse text-xs font-bold justify-center">
                                                        <i className="ph ph-spinner-gap animate-spin text-lg"></i>
                                                        Đang tải hình ảnh lên...
                                                    </div>
                                                )}

                                                {/* Image Live Preview */}
                                                {!block.isUploading && block.duongDanFile && (
                                                    <div className="border border-slate-200/80 rounded-2xl overflow-hidden bg-slate-50 max-w-sm mx-auto shadow-sm p-2 flex items-center justify-center animate-scale-up">
                                                        <img 
                                                            src={block.duongDanFile} 
                                                            alt="Preview Content"
                                                            className="max-h-60 rounded-xl object-contain"
                                                            onError={(e) => {
                                                                (e.target as HTMLElement).style.display = 'none';
                                                            }}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </main>
        </div>
    );
}

export default function CreateLessonPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
                <div className="flex flex-col items-center gap-3">
                    <i className="ph-bold ph-spinner-gap animate-spin text-4xl text-indigo-600"></i>
                    <span className="text-sm font-bold text-slate-400">Đang khởi tạo không gian bài học...</span>
                </div>
            </div>
        }>
            <CreateLessonForm />
        </Suspense>
    );
}
