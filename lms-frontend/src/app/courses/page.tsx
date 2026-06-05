"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { apiFetch, formatPrice, levelLabel, getCourseImage } from "@/lib/api";
import Link from "next/link";
import WishlistButton from "@/components/WishlistButton";

interface Course {
    id: number;
    tieu_de: string;
    mo_ta: string | null;
    gia_tien: string;
    trinh_do: string;
    da_xuat_ban: boolean;
    danh_gia_trung_binh: string;
    ma_danh_muc: number | null;
}

interface Category {
    id: number;
    ten_danh_muc: string;
}

function CoursesContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();

    // URL Params State
    const query = searchParams.get("q") || "";
    const categoryId = searchParams.get("category") || "";
    const level = searchParams.get("level") || "";
    const minPrice = searchParams.get("min_price") || "";
    const maxPrice = searchParams.get("max_price") || "";
    const sortBy = searchParams.get("sort_by") || "ngay_tao";
    const order = searchParams.get("order") || "desc";

    const [courses, setCourses] = useState<Course[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [showFilter, setShowFilter] = useState(true);

    // Update query params function
    const updateQueryParams = (updates: Record<string, string | null>) => {
        const params = new URLSearchParams(searchParams.toString());
        Object.keys(updates).forEach(key => {
            if (updates[key]) {
                params.set(key, updates[key] as string);
            } else {
                params.delete(key);
            }
        });
        router.push(pathname + "?" + params.toString(), { scroll: false });
    };

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                if (categories.length === 0) {
                    const catRes = await apiFetch("/categories");
                    if (catRes.ok) setCategories(await catRes.json());
                }

                const params = new URLSearchParams();
                if (query) params.append("q", query);
                if (categoryId) params.append("ma_danh_muc", categoryId);
                if (level) params.append("trinh_do", level);
                if (minPrice) params.append("gia_min", minPrice);
                if (maxPrice) params.append("gia_max", maxPrice);
                if (sortBy) params.append("sort_by", sortBy);
                if (order) params.append("order", order);

                const cRes = await apiFetch(`/courses?${params.toString()}`);
                if (cRes.ok) {
                    setCourses(await cRes.json());
                }
            } catch (e) {
                console.error(e);
            }
            setLoading(false);
        };
        load();
    }, [query, categoryId, level, minPrice, maxPrice, sortBy, order]);

    // View Helpers
    const handlePriceChange = (type: string) => {
        if (type === "free") updateQueryParams({ min_price: "0", max_price: "0" });
        else if (type === "paid") updateQueryParams({ min_price: "1", max_price: null });
        else updateQueryParams({ min_price: null, max_price: null });
    };
    const currentPrice = () => {
        if (minPrice === "0" && maxPrice === "0") return "free";
        if (minPrice === "1") return "paid";
        return "all";
    };

    return (
        <div className="animate-slide-up pb-12">
            {/* Top Toolbar (Sort) */}
            <div className="flex flex-col sm:flex-row items-center justify-between bg-surface p-4 rounded-2xl border border-outline-variant/40 shadow-sm mb-6 gap-4">
                <div className="flex items-center gap-4 w-full sm:w-auto">
                    <button
                        onClick={() => setShowFilter(!showFilter)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border transition-all ${showFilter
                            ? "bg-primary/10 border-primary/20 text-primary"
                            : "bg-surface border-outline-variant text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
                            }`}
                    >
                        <i className={`ph-bold ${showFilter ? "ph-faders-horizontal" : "ph-faders"} text-base`}></i>
                        {showFilter ? "Ẩn bộ lọc" : "Bộ lọc"}
                    </button>
                    <div className="text-sm font-bold text-on-surface-variant flex items-center gap-2">
                        <i className="ph-fill ph-funnel text-primary text-lg"></i>
                        Đang hiển thị <span className="text-primary">{courses.length}</span> kết quả
                    </div>
                </div>
                <div className="flex items-center gap-2 text-sm font-bold text-on-surface w-full sm:w-auto justify-end">
                    Sắp xếp theo:
                    <select
                        className="bg-surface-container border border-outline-variant/60 rounded-xl px-4 py-2 font-bold text-on-surface focus:ring-2 focus:ring-primary focus:outline-none transition-all"
                        value={`${sortBy}-${order}`}
                        onChange={(e) => {
                            const [s, o] = e.target.value.split('-');
                            updateQueryParams({ sort_by: s, order: o });
                        }}
                    >
                        <option value="ngay_tao-desc">Mới nhất</option>
                        <option value="danh_gia_trung_binh-desc">Đánh giá cao</option>
                        <option value="gia_tien-asc">Giá thấp đến cao</option>
                        <option value="gia_tien-desc">Giá cao xuống thấp</option>
                    </select>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-8">
                {showFilter && (
                    <aside className="w-full lg:w-[280px] shrink-0 space-y-6 animate-scale-up">
                        <div className="glass-panel p-6 rounded-[24px] bg-surface border border-outline-variant/50 shadow-sm sticky top-24">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-lg font-black text-on-surface flex items-center gap-2">
                                    <i className="ph-fill ph-faders text-primary"></i> Bộ lọc
                                </h2>
                                <button
                                    onClick={() => router.push('/courses')}
                                    className="text-xs font-bold text-error hover:bg-error-container px-2 py-1 rounded-lg transition-colors"
                                >
                                    Xóa lọc
                                </button>
                            </div>

                            {/* Danh mục */}
                            <div className="mb-6">
                                <h3 className="text-sm font-bold text-on-surface-variant mb-3 uppercase tracking-wider">Danh mục</h3>
                                <div className="space-y-2">
                                    <button
                                        onClick={() => updateQueryParams({ category: null })}
                                        className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${!categoryId ? "bg-primary/10 text-primary" : "text-on-surface hover:bg-surface-container"}`}
                                    >
                                        {categoryId ? <i className="ph ph-circle"></i> : <i className="ph-fill ph-check-circle"></i>}
                                        Tất cả
                                    </button>
                                    {categories.map(cat => (
                                        <button
                                            key={cat.id}
                                            onClick={() => updateQueryParams({ category: cat.id.toString() })}
                                            className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${categoryId === cat.id.toString() ? "bg-primary/10 text-primary" : "text-on-surface hover:bg-surface-container"}`}
                                        >
                                            {categoryId === cat.id.toString() ? <i className="ph-fill ph-check-circle"></i> : <i className="ph ph-circle"></i>}
                                            {cat.ten_danh_muc}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Trình độ */}
                            <div className="mb-6">
                                <h3 className="text-sm font-bold text-on-surface-variant mb-3 uppercase tracking-wider">Trình độ</h3>
                                <div className="space-y-2">
                                    {[
                                        { value: "", label: "Mọi trình độ" },
                                        { value: "beginner", label: "Cơ bản" },
                                        { value: "intermediate", label: "Trung bình" },
                                        { value: "advanced", label: "Nâng cao" }
                                    ].map(lvl => (
                                        <button
                                            key={lvl.value}
                                            onClick={() => updateQueryParams({ level: lvl.value || null })}
                                            className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${level === lvl.value ? "bg-secondary/10 text-secondary" : "text-on-surface hover:bg-surface-container"}`}
                                        >
                                            {level === lvl.value ? <i className="ph-fill ph-check-circle"></i> : <i className="ph ph-circle"></i>}
                                            {lvl.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Giá tiền */}
                            <div>
                                <h3 className="text-sm font-bold text-on-surface-variant mb-3 uppercase tracking-wider">Giá tiền</h3>
                                <div className="grid grid-cols-1 gap-2">
                                    {[
                                        { value: "all", label: "Tất cả" },
                                        { value: "free", label: "Miễn phí" },
                                        { value: "paid", label: "Trả phí" }
                                    ].map(p => (
                                        <button
                                            key={p.value}
                                            onClick={() => handlePriceChange(p.value)}
                                            className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${currentPrice() === p.value ? "bg-tertiary/10 text-tertiary" : "text-on-surface hover:bg-surface-container"}`}
                                        >
                                            {currentPrice() === p.value ? <i className="ph-fill ph-check-circle"></i> : <i className="ph ph-circle"></i>}
                                            {p.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </aside>
                )}

                {/* CỘT PHẢI: KẾT QUẢ TÌM KIẾM */}
                <div className="flex-1">

                    {/* Course Grid */}
                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pt-2">
                            {[1, 2, 3, 4, 5, 6].map(i => (
                                <div key={i} className="glass-panel rounded-3xl h-[400px] animate-pulse bg-surface-container"></div>
                            ))}
                        </div>
                    ) : courses.length === 0 ? (
                        <div className="text-center py-20 bg-surface/50 rounded-3xl border border-outline-variant/40 shadow-sm">
                            <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                                <i className="ph-fill ph-magnifying-glass text-5xl text-primary drop-shadow-sm"></i>
                            </div>
                            <h3 className="text-2xl font-black text-on-surface mb-3">Không tìm thấy khóa học nào</h3>
                            <p className="text-on-surface-variant font-medium max-w-sm mx-auto">Thử thay đổi từ khóa, xóa bộ lọc giá hoặc chọn trình độ khác xem sao.</p>
                            <button
                                onClick={() => router.push('/courses')}
                                className="mt-6 px-6 py-2 bg-primary text-white rounded-xl font-bold shadow-md hover:opacity-90"
                            >
                                Xóa tất cả bộ lọc
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pt-2">
                            {courses.map((course, idx) => (
                                <Link
                                    key={course.id}
                                    href={`/courses/${course.id}`}
                                    className="glass-panel group rounded-3xl border border-outline-variant/50 overflow-hidden hover:border-primary/50 transition-all flex flex-col h-full hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/10 bg-surface"
                                    style={{ animationDelay: `${idx * 0.05}s`, animationFillMode: "both" }}
                                >
                                    <div className="h-48 relative bg-surface-container-high overflow-hidden">
                                        <img
                                            src={getCourseImage(course.tieu_de)}
                                            alt={course.tieu_de}
                                            className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-secondary/10 opacity-70 group-hover:scale-110 transition-transform duration-700"></div>
                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/25">
                                            <i className="ph-fill ph-play-circle text-6xl text-white drop-shadow-lg"></i>
                                        </div>
                                        <div className="absolute top-3 left-3 flex gap-2 z-10">
                                            <span className="px-3 py-1 bg-surface/90 backdrop-blur-md text-on-surface text-[10px] font-black rounded-lg shadow-sm border border-outline-variant/30 uppercase tracking-wider">
                                                {categories.find((cat) => cat.id === course.ma_danh_muc)?.ten_danh_muc || "Khác"}
                                            </span>
                                        </div>
                                        <WishlistButton courseId={course.id} />
                                        <div className="absolute top-3 right-14 bg-surface/90 backdrop-blur-md px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-sm border border-outline-variant/30 z-10">
                                            <i className="ph-fill ph-star text-warning text-xs drop-shadow-sm"></i>
                                            <span className="text-xs font-black text-on-surface">{parseFloat(course.danh_gia_trung_binh).toFixed(1)}</span>
                                        </div>
                                    </div>

                                    <div className="p-6 flex flex-col flex-1 relative">
                                        <h3 className="text-lg font-black text-on-surface mb-2 line-clamp-2 group-hover:text-primary transition-colors leading-tight">{course.tieu_de}</h3>
                                        <p className="text-sm text-on-surface-variant mb-5 line-clamp-2 flex-1 font-medium leading-relaxed">{course.mo_ta}</p>

                                        <div className="flex items-center justify-between pt-4 border-t border-outline-variant/40 mt-auto">
                                            <div className="flex items-center gap-1.5 text-[11px] font-black text-on-surface-variant bg-surface-container px-2.5 py-1.5 rounded-md uppercase tracking-wider">
                                                {levelLabel(course.trinh_do)}
                                            </div>
                                            <div className="text-xl font-black text-primary tracking-tight">
                                                {parseFloat(course.gia_tien) > 0 ? formatPrice(parseFloat(course.gia_tien)) : "Miễn phí"}
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function CoursesPage() {
    return (
        <Suspense fallback={<div className="flex justify-center p-20"><i className="ph ph-spinner-gap animate-spin text-4xl text-primary"></i></div>}>
            <CoursesContent />
        </Suspense>
    );
}
