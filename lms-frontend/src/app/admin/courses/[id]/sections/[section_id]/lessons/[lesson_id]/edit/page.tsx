"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Plus, Save, Trash2, Video, FileText, FileCode2, ImageIcon, File, UploadCloud, RefreshCw, CheckCircle2, GripVertical } from "lucide-react";
import { fetchWithAuth } from "@/services/api";
import dynamic from "next/dynamic";
import { useToast } from "@/contexts/ToastContext";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

// Tải CKEditor ở dạng Client-side only để tránh lỗi SSR của Next.js
const CKEditorWrapper = dynamic(() => import("@/components/CKEditorWrapper"), { ssr: false });

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

interface ContentBlock {
    id: string; // Tạm thời để quản lý state trên UI hoặc ID thật từ DB
    loai_noi_dung: "video" | "pdf" | "text" | "code" | "image";
    noi_dung_text: string;
    duong_dan_file: string;
    isUploading?: boolean;
    isExisting?: boolean; // Cờ đánh dấu block đã có trong DB
}

export default function EditMultimediaLessonPage() {
    const router = useRouter();
    const params = useParams();
    const toast = useToast();
    const courseId = params.id as string;
    const sectionId = params.section_id as string;
    const lessonId = params.lesson_id as string;

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Header bài học
    const [tieuDe, setTieuDe] = useState("");
    const [thoiLuong, setThoiLuong] = useState<number | "">(0);
    const [thuTu, setThuTu] = useState<number | "">(1);
    const [xemTruoc, setXemTruoc] = useState(false);
    const [daXuatBan, setDaXuatBan] = useState(false);

    // Mảng các block nội dung
    const [blocks, setBlocks] = useState<ContentBlock[]>([]);
    const [deletedBlockIds, setDeletedBlockIds] = useState<string[]>([]); // Lưu lại các ID block cũ bị xóa

    // Fetch dữ liệu bài học cũ
    useEffect(() => {
        const fetchLessonData = async () => {
            try {
                // 1. Fetch Lesson Header
                const lessonRes = await fetchWithAuth(`${API_BASE_URL}/dynamic-admin/lessons/${lessonId}`);
                if (!lessonRes.ok) throw new Error("Không tìm thấy bài học");
                const lessonData = await lessonRes.json();

                setTieuDe(lessonData.tieu_de || "");
                setThoiLuong(lessonData.thoi_luong ? Math.floor(lessonData.thoi_luong / 60) : 0); // Đổi ngược giây ra phút
                setThuTu(lessonData.thu_tu || 1);
                setXemTruoc(lessonData.xem_truoc || false);
                setDaXuatBan(lessonData.da_xuat_ban || false);

                // 2. Fetch Lesson Contents
                const contentsRes = await fetchWithAuth(`${API_BASE_URL}/dynamic-admin/lesson-contents?filter_col=ma_bai_hoc&filter_val=${lessonId}&limit=100`);
                if (contentsRes.ok) {
                    const contentsData = await contentsRes.json();
                    if (contentsData.data && Array.isArray(contentsData.data)) {
                        // Sort by thu_tu
                        const sortedContents = contentsData.data.sort((a: any, b: any) => a.thu_tu - b.thu_tu);
                        const mappedBlocks: ContentBlock[] = sortedContents.map((c: any) => ({
                            id: c.id.toString(), // ID thật từ DB
                            loai_noi_dung: c.loai_noi_dung,
                            noi_dung_text: c.noi_dung_text || "",
                            duong_dan_file: c.duong_dan_file || "",
                            isUploading: false,
                            isExisting: true
                        }));
                        setBlocks(mappedBlocks);
                    }
                }

            } catch (err) {
                console.error(err);
                toast.error("Lỗi tải dữ liệu bài học");
            } finally {
                setIsLoading(false);
            }
        };

        if (lessonId) {
            fetchLessonData();
        }
    }, [lessonId, toast]);


    const addBlock = (type: "video" | "pdf" | "text" | "code" | "image") => {
        setBlocks(prev => [...prev, {
            id: "new_" + Math.random().toString(36).substr(2, 9),
            loai_noi_dung: type,
            noi_dung_text: "",
            duong_dan_file: "",
            isUploading: false,
            isExisting: false
        }]);
    };

    const removeBlock = (id: string) => {
        const blockToRemove = blocks.find(b => b.id === id);
        if (blockToRemove && blockToRemove.isExisting) {
            setDeletedBlockIds(prev => [...prev, id]); // Đưa vào danh sách chờ xóa trên server
        }
        setBlocks(prev => prev.filter(b => b.id !== id));
    };

    const updateBlock = (id: string, key: "noi_dung_text" | "duong_dan_file" | "isUploading", value: string | boolean) => {
        setBlocks(prev => prev.map(b => b.id === id ? { ...b, [key]: value } : b));
    };

    const handleDragEnd = (result: any) => {
        if (!result.destination) return;

        const items = Array.from(blocks);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);

        setBlocks(items);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, blockId: string) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const block = blocks.find(b => b.id === blockId);
        const assetType = block?.loai_noi_dung === "pdf" ? "pdf" : block?.loai_noi_dung === "video" ? "video" : "lesson-image";

        updateBlock(blockId, "isUploading", true);
        try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("asset_type", assetType);

            const res = await fetchWithAuth(`${API_BASE_URL}/upload`, {
                method: "POST",
                body: formData
            });

            if (!res.ok) throw new Error("Upload file thất bại");
            const data = await res.json();

            updateBlock(blockId, "duong_dan_file", data.url);
            toast.success("Tải lên thành công!");
        } catch (err: any) {
            toast.error(err.message || "Lỗi khi upload file");
        } finally {
            updateBlock(blockId, "isUploading", false);
        }
    };

    const handleSave = async () => {
        if (!tieuDe.trim()) return toast.error("Vui lòng nhập tiêu đề bài học!");

        setIsSaving(true);
        try {
            // 1. Cập nhật Bài học (Header) - dùng PUT
            const lessonRes = await fetchWithAuth(`${API_BASE_URL}/dynamic-admin/lessons/${lessonId}`, {
                method: "PUT",
                body: JSON.stringify({
                    ma_khoa_hoc: parseInt(courseId),
                    ma_chuong_hoc: parseInt(sectionId),
                    tieu_de: tieuDe,
                    thoi_luong: (Number(thoiLuong) || 0) * 60, // Đổi phút ra giây
                    thu_tu: Number(thuTu) || 0,
                    xem_truoc: xemTruoc,
                    da_xuat_ban: daXuatBan
                })
            });

            if (!lessonRes.ok) throw new Error("Lỗi khi cập nhật Bài học");

            // 2. Xóa các Block nội dung cũ đã bị xóa trên UI
            for (const delId of deletedBlockIds) {
                await fetchWithAuth(`${API_BASE_URL}/dynamic-admin/lesson-contents/${delId}`, {
                    method: "DELETE"
                });
            }

            // 3. Cập nhật hoặc Tạo mới các Block nội dung
            for (let i = 0; i < blocks.length; i++) {
                const block = blocks[i];
                if (block.isExisting) {
                    // Update - PUT
                    await fetchWithAuth(`${API_BASE_URL}/dynamic-admin/lesson-contents/${block.id}`, {
                        method: "PUT",
                        body: JSON.stringify({
                            loai_noi_dung: block.loai_noi_dung,
                            noi_dung_text: block.noi_dung_text,
                            duong_dan_file: block.duong_dan_file,
                            thu_tu: i + 1
                        })
                    });
                } else {
                    // Create - POST
                    await fetchWithAuth(`${API_BASE_URL}/dynamic-admin/lesson-contents`, {
                        method: "POST",
                        body: JSON.stringify({
                            ma_bai_hoc: parseInt(lessonId),
                            loai_noi_dung: block.loai_noi_dung,
                            noi_dung_text: block.noi_dung_text,
                            duong_dan_file: block.duong_dan_file,
                            thu_tu: i + 1
                        })
                    });
                }
            }

            toast.success("Cập nhật bài học thành công!");
            router.push(`/admin/courses/${courseId}/sections/${sectionId}/lessons`);

        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="p-20 flex flex-col items-center justify-center space-y-4">
                <RefreshCw className="w-10 h-10 animate-spin text-primary" />
                <p className="text-sm font-bold text-muted-foreground animate-pulse">Đang tải dữ liệu bài học...</p>
            </div>
        );
    }

    return (
        <div className="h-full w-full space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Top Bar */}
            <div className="flex items-center justify-between bg-card p-4 rounded-[2rem] border border-border/60 shadow-sm">
                <button
                    onClick={() => router.back()}
                    className="p-2 hover:bg-secondary rounded-xl transition-colors flex items-center space-x-2 text-muted-foreground font-bold text-sm"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span className="hidden sm:inline">Quay lại</span>
                </button>
                <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Khóa ID: {courseId}</p>
                        <p className="text-xs font-medium text-foreground">Sửa Bài học ID: {lessonId}</p>
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="bg-primary hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold uppercase tracking-widest text-xs flex items-center gap-2 shadow-lg shadow-primary/20 transition-all disabled:opacity-50"
                    >
                        <Save className="w-4 h-4" />
                        <span>{isSaving ? "Đang lưu..." : "Cập nhật Bài học"}</span>
                    </button>
                </div>
            </div>

            {/* Thông tin Cơ bản */}
            <div className="bg-card border border-border/60 rounded-[2rem] p-6 sm:p-8 shadow-sm space-y-6">
                <h2 className="text-lg font-black tracking-tight border-b border-border/40 pb-4">Thông tin cơ bản</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="col-span-1 md:col-span-2 space-y-2">
                        <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Tiêu đề bài học <span className="text-rose-500">*</span></label>
                        <input
                            type="text"
                            value={tieuDe} onChange={e => setTieuDe(e.target.value)}
                            placeholder="Nhập tiêu đề (VD: Bài 1: Giới thiệu hệ thống)"
                            className="w-full bg-secondary border border-border/60 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Thứ tự hiển thị</label>
                        <input
                            type="number"
                            value={thuTu} onChange={e => setThuTu(e.target.value === "" ? "" : parseInt(e.target.value))}
                            className="w-full bg-secondary border border-border/60 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Thời lượng (Phút)</label>
                        <input
                            type="number"
                            value={thoiLuong} onChange={e => setThoiLuong(e.target.value === "" ? "" : parseInt(e.target.value))}
                            className="w-full bg-secondary border border-border/60 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                    </div>
                    <div className="flex gap-8">
                        <label className="flex items-center space-x-3 cursor-pointer">
                            <input
                                type="checkbox" checked={xemTruoc} onChange={e => setXemTruoc(e.target.checked)}
                                className="w-5 h-5 rounded border-border text-primary focus:ring-primary"
                            />
                            <span className="text-sm font-bold">Cho phép học thử (Preview)</span>
                        </label>
                        <label className="flex items-center space-x-3 cursor-pointer">
                            <input
                                type="checkbox" checked={daXuatBan} onChange={e => setDaXuatBan(e.target.checked)}
                                className="w-5 h-5 rounded border-border text-primary focus:ring-primary"
                            />
                            <span className="text-sm font-bold text-emerald-600">Xuất bản bài học</span>
                        </label>
                    </div>
                </div>
            </div>

            {/* Content Builder */}
            <div className="bg-card border border-border/60 rounded-[2rem] p-6 sm:p-8 shadow-sm space-y-6">
                <div className="flex items-center justify-between border-b border-border/40 pb-4">
                    <div>
                        <h2 className="text-lg font-black tracking-tight">Builder</h2>
                        <p className="text-xs font-medium text-muted-foreground mt-1">Xây dựng bài học bằng cách xếp chồng các khối nội dung lên nhau.</p>
                    </div>
                    <div className="flex bg-secondary p-1 rounded-xl border border-border/60">
                        <button onClick={() => addBlock("video")} className="p-2 hover:bg-white rounded-lg flex items-center gap-1 transition-colors text-xs font-bold text-muted-foreground hover:text-foreground" title="Thêm Video"><Video className="w-4 h-4" /> Video</button>
                        <button onClick={() => addBlock("text")} className="p-2 hover:bg-white rounded-lg flex items-center gap-1 transition-colors text-xs font-bold text-muted-foreground hover:text-foreground" title="Thêm Đoạn văn"><FileText className="w-4 h-4" /> Văn bản</button>
                        <button onClick={() => addBlock("pdf")} className="p-2 hover:bg-white rounded-lg flex items-center gap-1 transition-colors text-xs font-bold text-muted-foreground hover:text-foreground" title="Thêm File đính kèm"><File className="w-4 h-4" /> Tài liệu</button>
                    </div>
                </div>

                {blocks.length === 0 ? (
                    <div className="py-16 flex flex-col items-center justify-center border-2 border-dashed border-border/60 rounded-2xl bg-secondary/30">
                        <div className="flex gap-4 mb-4 opacity-50">
                            <Video className="w-8 h-8" />
                            <FileText className="w-8 h-8" />
                            <File className="w-8 h-8" />
                        </div>
                        <p className="text-sm font-bold text-muted-foreground">Bài học này chưa có nội dung nào.</p>
                        <p className="text-xs font-medium text-muted-foreground mt-1">Bấm vào các nút bên trên để thêm khối nội dung.</p>
                    </div>
                ) : (
                    <DragDropContext onDragEnd={handleDragEnd}>
                        <Droppable droppableId="blocks">
                            {(provided) => (
                                <div
                                    {...provided.droppableProps}
                                    ref={provided.innerRef}
                                    className="space-y-6"
                                >
                                    {blocks.map((block, index) => (
                                        <Draggable key={block.id} draggableId={block.id} index={index}>
                                            {(provided) => (
                                                <div
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    className="relative group bg-background border border-border/60 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow"
                                                >
                                                    {/* Drag Handle */}
                                                    <div
                                                        {...provided.dragHandleProps}
                                                        className="absolute left-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground/30 hover:text-primary cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-all"
                                                    >
                                                        <GripVertical className="w-5 h-5" />
                                                    </div>

                                                    {/* Xóa block */}
                                                    <button
                                                        onClick={() => removeBlock(block.id)}
                                                        className="absolute -top-3 -right-3 p-2 bg-rose-100 text-rose-600 rounded-full hover:bg-rose-600 hover:text-white shadow-sm opacity-0 group-hover:opacity-100 transition-all z-10"
                                                        title="Xóa khối"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>

                                                    <div className="flex items-center gap-3 mb-4 pl-4">
                                                        <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center font-black text-xs text-muted-foreground">
                                                            {index + 1}
                                                        </div>
                                                        <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary font-bold text-xs rounded-lg uppercase tracking-widest">
                                                            {block.loai_noi_dung === "video" && <Video className="w-4 h-4" />}
                                                            {block.loai_noi_dung === "text" && <FileText className="w-4 h-4" />}
                                                            {block.loai_noi_dung === "pdf" && <File className="w-4 h-4" />}
                                                            <span>Khối {block.loai_noi_dung}</span>
                                                        </div>
                                                    </div>

                                                    {block.loai_noi_dung === "video" && (
                                                        <div className="space-y-2 pl-4">
                                                            <label className="text-xs font-bold text-muted-foreground">Đường dẫn Video hoặc Tải lên</label>
                                                            <div className="flex gap-2">
                                                                <input
                                                                    type="text"
                                                                    value={block.duong_dan_file}
                                                                    onChange={e => updateBlock(block.id, "duong_dan_file", e.target.value)}
                                                                    placeholder="https://www.youtube.com/watch?v=..."
                                                                    className="flex-1 bg-secondary border border-border/60 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                                                />
                                                                <div className="relative">
                                                                    <input
                                                                        type="file"
                                                                        accept="video/mp4,video/webm,video/quicktime,video/mpeg"
                                                                        onChange={(e) => handleFileUpload(e, block.id)}
                                                                        disabled={block.isUploading}
                                                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                                                                    />
                                                                    <div className={`h-full flex items-center space-x-2 px-4 rounded-xl border border-border/60 transition-colors ${block.isUploading ? 'bg-secondary opacity-70' : 'bg-primary/5 hover:bg-primary/10 text-primary'}`}>
                                                                        {block.isUploading ? <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" /> : <UploadCloud className="w-4 h-4" />}
                                                                        <span className="text-xs font-bold whitespace-nowrap">
                                                                            {block.isUploading ? "Đang tải..." : "Upload MP4"}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            {block.duong_dan_file && (
                                                                <div className="mt-4 w-full aspect-video bg-black rounded-xl overflow-hidden border border-border/60 shadow-inner">
                                                                    {block.duong_dan_file.includes('youtube.com') || block.duong_dan_file.includes('youtu.be') ? (
                                                                        <iframe
                                                                            className="w-full h-full"
                                                                            src={block.duong_dan_file.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')}
                                                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                                            allowFullScreen
                                                                        />
                                                                    ) : (
                                                                        <video controls className="w-full h-full" key={block.duong_dan_file}>
                                                                            <source src={block.duong_dan_file} />
                                                                            Trình duyệt của bạn không hỗ trợ thẻ video.
                                                                        </video>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    {block.loai_noi_dung === "pdf" && (
                                                        <div className="space-y-2 pl-4">
                                                            <label className="text-xs font-bold text-muted-foreground">Đường dẫn PDF hoặc Tải lên</label>
                                                            <div className="flex gap-2">
                                                                <input
                                                                    type="text"
                                                                    value={block.duong_dan_file}
                                                                    onChange={e => updateBlock(block.id, "duong_dan_file", e.target.value)}
                                                                    placeholder="https://s3.amazonaws.com/.../file.pdf"
                                                                    className="flex-1 bg-secondary border border-border/60 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                                                />
                                                                <div className="relative">
                                                                    <input
                                                                        type="file"
                                                                        accept="application/pdf"
                                                                        onChange={(e) => handleFileUpload(e, block.id)}
                                                                        disabled={block.isUploading}
                                                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                                                                    />
                                                                    <div className={`h-full flex items-center space-x-2 px-4 rounded-xl border border-border/60 transition-colors ${block.isUploading ? 'bg-secondary opacity-70' : 'bg-rose-500/5 hover:bg-rose-500/10 text-rose-600'}`}>
                                                                        {block.isUploading ? <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" /> : <UploadCloud className="w-4 h-4" />}
                                                                        <span className="text-xs font-bold whitespace-nowrap">
                                                                            {block.isUploading ? "Đang tải..." : "Upload File"}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            {block.duong_dan_file && (
                                                                <div className="mt-4 w-full h-[500px] bg-secondary rounded-xl overflow-hidden border border-border/60 shadow-inner flex flex-col">
                                                                    <div className="bg-slate-200 px-4 py-2 border-b border-border/60 flex justify-between items-center text-xs font-bold text-muted-foreground">
                                                                        <span>Xem trước tài liệu</span>
                                                                        <a href={block.duong_dan_file} target="_blank" rel="noreferrer" className="text-primary hover:underline">Mở toàn màn hình</a>
                                                                    </div>
                                                                    <iframe
                                                                        src={`${block.duong_dan_file}#toolbar=0`}
                                                                        className="w-full flex-1"
                                                                        title="Document Preview"
                                                                    />
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    {block.loai_noi_dung === "text" && (
                                                        <div className="space-y-2 pl-4">
                                                            <label className="text-xs font-bold text-muted-foreground">Nội dung Văn bản</label>
                                                            <div className="border border-border/60 rounded-xl overflow-hidden">
                                                                <CKEditorWrapper
                                                                    value={block.noi_dung_text}
                                                                    onChange={data => updateBlock(block.id, "noi_dung_text", data)}
                                                                />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </Draggable>
                                    ))}
                                    {provided.placeholder}
                                </div>
                            )}
                        </Droppable>
                    </DragDropContext>
                )}
            </div>
        </div>
    );
}
