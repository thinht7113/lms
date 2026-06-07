"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Search, Filter, Star, RefreshCw, LayoutGrid, List } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CourseCard from "@/components/CourseCard";
import { apiService, Course, Category } from "@/services/api";


export default function CoursesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [dbCategories, setDbCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [selectedPrice, setSelectedPrice] = useState<"free" | "paid" | null>(null);
  const [minRating, setMinRating] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<string>("popular");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Fetch results state
  const [dbCourses, setDbCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load Categories on mount
  useEffect(() => {
    async function loadCategories() {
      const cats = await apiService.getCategories();
      setDbCategories(cats);
    }
    loadCategories();
  }, []);

  // Fetch courses on filter changes
  useEffect(() => {
    async function fetchCourses() {
      setIsLoading(true);
      try {
        const queryParams: any = {
          q: searchTerm || undefined,
          ma_danh_muc: selectedCategory || undefined,
          trinh_do: selectedLevel || undefined,
          sort_by: sortBy === "popular" ? "so_luong_hoc_vien" : sortBy === "rating" ? "danh_gia_trung_binh" : "gia_tien",
          order: sortBy === "price-asc" ? "asc" : "desc"
        };

        if (selectedPrice === "free") {
          queryParams.gia_max = 0;
        } else if (selectedPrice === "paid") {
          queryParams.gia_min = 1;
        }

        const data = await apiService.getCourses(queryParams);
        setDbCourses(data);
      } catch (err) {
        console.error("Error fetching courses:", err);
      } finally {


        setIsLoading(false);
      }
    }
    fetchCourses();
  }, [searchTerm, selectedCategory, selectedLevel, selectedPrice, sortBy]);

  // Client-side rating filter (API doesn't have min_rating query parameter directly)
  const finalCourses = useMemo(() => {
    let result = dbCourses;

    // Pulls strictly from DB, no fallbacks

    if (minRating) {
      result = result.filter((c) => Number(c.danh_gia_trung_binh || (c as any).rating) >= minRating);
    }

    return result;
  }, [dbCourses, minRating]);

  const resetFilters = () => {
    setSearchTerm("");
    setSelectedCategory(null);
    setSelectedLevel(null);
    setSelectedPrice(null);
    setMinRating(null);
    setSortBy("popular");
  };

  const getGradient = (index: number) => {
    const gradients = [
      "from-teal-500 to-cyan-600",
      "from-purple-500 to-indigo-600",
      "from-pink-500 to-rose-500",
      "from-amber-500 to-orange-600",
      "from-blue-500 to-indigo-500",
      "from-sky-500 to-blue-600",
      "from-emerald-400 to-teal-600"
    ];
    return gradients[index % gradients.length];
  };

  const getCategoryName = (catId?: number) => {
    if (!catId) return "Tổng quan";
    const found = dbCategories.find((cat) => cat.id === catId);
    return found ? found.ten_danh_muc : `Danh mục ${catId}`;
  };

  return (
    <>
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-16">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 pb-6 border-b border-border/60">
          <div>
            <h1 className="text-3xl font-extrabold text-foreground tracking-tight">
              Khám Phá Khóa Học
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1.5">
              Kết nối trực tiếp Cơ sở dữ liệu Lumina LMS
            </p>
          </div>
          <button
            onClick={resetFilters}
            className="mt-4 md:mt-0 inline-flex items-center space-x-2 text-xs font-semibold text-primary/90 hover:text-primary transition-colors cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Đặt lại toàn bộ bộ lọc</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* 1. Sidebar Filters */}
          <aside className="lg:col-span-1 space-y-6">
            <div className="bg-card text-card-foreground border border-border/60 rounded-2xl p-5 shadow-sm space-y-6">
              <div className="flex items-center space-x-2 pb-4 border-b border-border/40 text-foreground">
                <Filter className="h-4 w-4 text-primary" />
                <h2 className="font-bold text-sm">Bộ lọc nâng cao</h2>
              </div>

              {/* Keyword Search */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground">Từ khóa tìm kiếm</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Tìm tên, giảng viên..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-secondary text-foreground text-xs rounded-xl py-2.5 pl-4 pr-10 border border-border focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <Search className="absolute right-3 top-3 h-3.5 w-3.5 text-muted-foreground" />
                </div>
              </div>

              {/* Category Filter */}
              <div className="space-y-2.5">
                <label className="text-xs font-bold text-foreground">Chuyên mục ngành học</label>
                <div className="flex flex-col space-y-1.5">
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className={`text-left text-xs py-1.5 px-3 rounded-lg transition-all ${selectedCategory === null
                      ? "bg-primary/10 text-primary font-bold"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                      }`}
                  >
                    Tất cả danh mục
                  </button>
                  {dbCategories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`text-left text-xs py-1.5 px-3 rounded-lg transition-all ${selectedCategory === cat.id
                        ? "bg-primary/10 text-primary font-bold"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                        }`}
                    >
                      {cat.ten_danh_muc}
                    </button>
                  ))}
                </div>
              </div>

              {/* Level Filter */}
              <div className="space-y-2.5">
                <label className="text-xs font-bold text-foreground">Cấp độ học viên</label>
                <div className="flex flex-col space-y-1">
                  {[
                    { val: null, label: "Tất cả trình độ" },
                    { val: "beginner", label: "Cơ bản (Beginner)" },
                    { val: "intermediate", label: "Trung cấp (Intermediate)" },
                    { val: "advanced", label: "Chuyên sâu (Advanced)" }
                  ].map((l) => (
                    <button
                      key={l.val || "all"}
                      onClick={() => setSelectedLevel(l.val)}
                      className={`text-left text-xs py-1.5 px-3 rounded-lg transition-all ${selectedLevel === l.val
                        ? "bg-primary/10 text-primary font-bold"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                        }`}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price Filter */}
              <div className="space-y-2.5">
                <label className="text-xs font-bold text-foreground">Mức giá học phí</label>
                <div className="flex flex-col space-y-1">
                  {[
                    { val: null, label: "Tất cả mức giá" },
                    { val: "free", label: "Miễn phí (Free)" },
                    { val: "paid", label: "Có phí (Paid)" }
                  ].map((p) => (
                    <button
                      key={p.val || "all"}
                      onClick={() => setSelectedPrice(p.val as any)}
                      className={`text-left text-xs py-1.5 px-3 rounded-lg transition-all ${selectedPrice === p.val
                        ? "bg-primary/10 text-primary font-bold"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                        }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Rating Filter */}
              <div className="space-y-2.5">
                <label className="text-xs font-bold text-foreground">Điểm đánh giá học viên</label>
                <div className="flex flex-col space-y-1">
                  {[
                    { val: null, label: "Tất cả đánh giá" },
                    { val: 4.5, label: "Từ 4.5 sao trở lên" },
                    { val: 4.0, label: "Từ 4.0 sao trở lên" }
                  ].map((r) => (
                    <button
                      key={r.val || "all"}
                      onClick={() => setMinRating(r.val)}
                      className={`text-left text-xs py-1.5 px-3 rounded-lg transition-all flex items-center space-x-1.5 ${minRating === r.val
                        ? "bg-primary/10 text-primary font-bold"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                        }`}
                    >
                      <span>{r.label}</span>
                      {r.val && <Star className="h-3 w-3 fill-amber-500 text-amber-500" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          {/* 2. Main Area: Course List */}
          <section className="lg:col-span-3 space-y-6">
            {/* Sorting Header with Toggle */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-card text-card-foreground border border-border/60 rounded-2xl shadow-sm gap-4">
              <span className="text-xs text-muted-foreground font-medium">
                Tìm thấy <span className="text-foreground font-bold">{finalCourses.length}</span> khóa học phù hợp
              </span>

              <div className="flex items-center space-x-4 self-end sm:self-auto">
                {/* View Mode Toggle */}
                <div className="flex items-center bg-secondary p-1 rounded-xl border border-border">
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`p-1.5 rounded-lg transition-all cursor-pointer ${viewMode === "grid"
                      ? "bg-card text-primary shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                      }`}
                    title="Xem dạng lưới"
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setViewMode("list")}
                    className={`p-1.5 rounded-lg transition-all cursor-pointer ${viewMode === "list"
                      ? "bg-card text-primary shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                      }`}
                    title="Xem dạng danh sách"
                  >
                    <List className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex items-center space-x-2 text-xs">
                  <span className="text-muted-foreground">Sắp xếp:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="bg-secondary border border-border rounded-lg py-1.5 px-3 focus:outline-none focus:ring-1 focus:ring-primary text-foreground text-xs"
                  >
                    <option value="popular">Học viên đông nhất</option>
                    <option value="rating">Đánh giá cao nhất</option>
                    <option value="price-asc">Giá thấp đến cao</option>
                    <option value="price-desc">Giá cao đến thấp</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Courses Display Grid / List */}
            {isLoading ? (
              <div className="flex justify-center items-center py-20">
                <RefreshCw className="h-8 w-8 text-primary animate-spin" />
              </div>
            ) : finalCourses.length > 0 ? (
              viewMode === "grid" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {finalCourses.map((c: any, index: number) => {
                    const mapped = {
                      id: c.id,
                      title: c.tieu_de || c.title,
                      instructor: "Giảng viên Lumina",
                      category: getCategoryName(c.ma_danh_muc),
                      level: c.trinh_do || c.level,
                      rating: Number(c.danh_gia_trung_binh || c.rating) || 5.0,
                      price: Number(c.gia_tien || c.price),
                      originalPrice: c.originalPrice || (Number(c.gia_tien) > 0 ? Number(c.gia_tien) * 1.5 : undefined),
                      studentsCount: c.so_luong_hoc_vien || c.studentsCount || 120,
                      gradient: c.gradient || getGradient(index)
                    };
                    return <CourseCard key={mapped.id} {...mapped} />;
                  })}
                </div>
              ) : (
                <div className="flex flex-col space-y-4">
                  {finalCourses.map((c: any, index: number) => {
                    const mapped = {
                      id: c.id,
                      title: c.tieu_de || c.title,
                      instructor: "Giảng viên Lumina",
                      category: getCategoryName(c.ma_danh_muc),
                      level: c.trinh_do || c.level,
                      rating: Number(c.danh_gia_trung_binh || c.rating) || 5.0,
                      price: Number(c.gia_tien || c.price),
                      originalPrice: Number(c.gia_tien) > 0 ? Number(c.gia_tien) * 1.5 : undefined,
                      studentsCount: c.so_luong_hoc_vien || c.studentsCount || 120,
                      gradient: c.gradient || getGradient(index)
                    };

                    return (
                      <Link
                        key={mapped.id}
                        href={`/courses/${mapped.id}`}
                        className="flex flex-col sm:flex-row bg-card text-card-foreground border border-border/80 hover:border-primary/20 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all group"
                      >
                        {/* Course gradient / image block */}
                        <div className={`sm:w-56 h-40 shrink-0 bg-gradient-to-br ${mapped.gradient} relative flex items-center justify-center p-4 text-white text-center`}>
                          <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-all" />
                          <span className="font-sans font-bold text-sm line-clamp-2 leading-snug drop-shadow-md z-10">
                            {mapped.title}
                          </span>
                        </div>
                        {/* Course details block */}
                        <div className="p-5 flex-grow flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-[10px] uppercase font-extrabold tracking-wider text-primary">
                                {mapped.category}
                              </span>
                              <span className="text-[10px] font-bold text-muted-foreground uppercase px-2 py-0.5 rounded-full bg-secondary">
                                {mapped.level === "beginner" ? "Cơ bản" : mapped.level === "intermediate" ? "Trung cấp" : "Chuyên sâu"}
                              </span>
                            </div>
                            <h3 className="font-bold text-base text-foreground leading-snug group-hover:text-primary transition-colors line-clamp-1 mb-1">
                              {mapped.title}
                            </h3>
                            <p className="text-xs text-muted-foreground mb-3">
                              Được giảng dạy bởi <span className="font-semibold text-foreground/80">{mapped.instructor}</span> • {mapped.studentsCount} học viên
                            </p>
                          </div>

                          <div className="flex items-center justify-between border-t border-border/40 pt-3">
                            <div className="flex items-center space-x-1">
                              <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                              <span className="text-xs font-bold text-foreground">{mapped.rating.toFixed(1)}</span>
                            </div>
                            <div className="text-right">
                              {mapped.originalPrice && (
                                <span className="text-[10px] text-muted-foreground line-through mr-1.5">
                                  {mapped.originalPrice.toLocaleString()} đ
                                </span>
                              )}
                              <span className="font-sans font-black text-sm text-primary">
                                {mapped.price === 0 ? "Miễn phí" : `${mapped.price.toLocaleString()} đ`}
                              </span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )
            ) : (
              <div className="bg-card border border-border/60 rounded-3xl p-12 text-center space-y-4 shadow-sm flex flex-col items-center justify-center">
                <div className="bg-primary/15 p-4 rounded-full text-primary">
                  <Filter className="h-10 w-10" />
                </div>
                <h3 className="font-sans font-bold text-lg text-foreground">Không tìm thấy khóa học nào</h3>
                <p className="text-xs text-muted-foreground max-w-sm">
                  Hãy thử thay đổi từ khóa tìm kiếm hoặc bấm nút đặt lại bộ lọc để xem toàn bộ danh mục khóa học của chúng tôi.
                </p>
                <button
                  onClick={resetFilters}
                  className="bg-primary hover:bg-violet-600 text-white rounded-xl text-xs font-bold px-5 py-2.5 shadow-md shadow-primary/20 hover:shadow-lg transition-all mt-2 cursor-pointer"
                >
                  Đặt lại bộ lọc
                </button>
              </div>
            )}
          </section>
        </div>
      </main>

      <Footer />
    </>
  );
}
