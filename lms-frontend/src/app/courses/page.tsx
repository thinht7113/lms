"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Search, Filter, Star, RefreshCw, LayoutGrid, List } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CourseCard from "@/components/CourseCard";
import { apiService, Course, Category } from "@/services/api";

function CoursesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initialize state from URL params
  const [searchTerm, setSearchTerm] = useState(searchParams.get("q") || "");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchParams.get("q") || "");
  const [selectedCategory, setSelectedCategory] = useState<number | null>(
      searchParams.get("ma_danh_muc") ? Number(searchParams.get("ma_danh_muc")) : null
  );
  const [selectedLevel, setSelectedLevel] = useState<string | null>(searchParams.get("trinh_do") || null);

  // Custom price filter based on URL
  const initialPrice = searchParams.get("gia_max") === "0" ? "free" : null;
  const [selectedPrice, setSelectedPrice] = useState<"free" | "paid" | null>(initialPrice);

  const [minRating, setMinRating] = useState<number | null>(null);

  // Determine initial sort based on URL order param
  let initialSort = "popular";
  if (searchParams.get("order") === "price-asc") initialSort = "price-asc";
  const [sortBy, setSortBy] = useState<string>(initialSort);

  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Fetch results state
  const [dbCategories, setDbCategories] = useState<Category[]>([]);
  const [dbCourses, setDbCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Sync URL changes to state (if user clicks menu while already on /courses)
  useEffect(() => {
    setSearchTerm(searchParams.get("q") || "");
    setSelectedCategory(searchParams.get("ma_danh_muc") ? Number(searchParams.get("ma_danh_muc")) : null);
    setSelectedPrice(searchParams.get("gia_max") === "0" ? "free" : null);
    if (searchParams.get("order") === "price-asc") {
        setSortBy("price-asc");
    } else {
        setSortBy("popular");
    }
  }, [searchParams]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearchTerm(searchTerm.trim());
    }, 350);

    return () => window.clearTimeout(timer);
  }, [searchTerm]);

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
          q: debouncedSearchTerm || undefined,
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
  }, [debouncedSearchTerm, selectedCategory, selectedLevel, selectedPrice, sortBy]);

  // Client-side rating filter
  const finalCourses = useMemo(() => {
    let result = dbCourses;
    if (minRating) {
      result = result.filter((c) => Number(c.danh_gia_trung_binh || 0) >= minRating);
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
    router.push("/courses");
  };

  const getGradient = (index: number) => {
    const gradients = [
      "from-teal-500 to-cyan-600",
      "from-purple-500 to-indigo-600",
      "from-pink-500 to-rose-500",
      "from-amber-500 to-orange-600",
      "from-blue-500 to-indigo-500"
    ];
    return gradients[index % gradients.length];
  };

  const mapDbCourse = (c: Course, index: number) => ({
    id: c.id,
    title: c.tieu_de,
    thumbnail: c.anh_dai_dien,
    instructor: "Giảng viên chuyên gia",
    category: dbCategories.find(cat => cat.id === c.ma_danh_muc)?.ten_danh_muc || "Lập trình",
    level: c.trinh_do,
    rating: Number(c.danh_gia_trung_binh) || 0.0,
    price: Number(c.gia_tien),
    studentsCount: c.so_luong_hoc_vien || 0,
    gradient: getGradient(index)
  });

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-16">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 pb-6 border-b border-border/60">
        <div>
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
              <label className="text-xs font-bold text-foreground">Từ khóa</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Tìm kiếm khóa học..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-secondary text-foreground text-xs rounded-xl py-2.5 pl-4 pr-10 border border-border focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
              </div>
            </div>

            {/* Category Filter */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-foreground">Danh mục chuyên ngành</label>
              <div className="space-y-2.5">
                {dbCategories.map((cat) => (
                  <label key={cat.id} className="flex items-center space-x-3 cursor-pointer group">
                    <input
                      type="radio"
                      name="category"
                      checked={selectedCategory === cat.id}
                      onChange={() => setSelectedCategory(cat.id)}
                      className="w-4 h-4 text-primary bg-secondary border-border focus:ring-primary/50"
                    />
                    <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">{cat.ten_danh_muc}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="border-t border-border/40 my-2" />

            {/* Level Filter */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-foreground">Trình độ kỹ năng</label>
              <div className="space-y-2.5">
                {[
                  { id: "beginner", label: "Cơ bản (Beginner)" },
                  { id: "intermediate", label: "Trung cấp (Intermediate)" },
                  { id: "advanced", label: "Chuyên sâu (Advanced)" }
                ].map((lvl) => (
                  <label key={lvl.id} className="flex items-center space-x-3 cursor-pointer group">
                    <input
                      type="radio"
                      name="level"
                      checked={selectedLevel === lvl.id}
                      onChange={() => setSelectedLevel(lvl.id)}
                      className="w-4 h-4 text-primary bg-secondary border-border focus:ring-primary/50"
                    />
                    <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">{lvl.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="border-t border-border/40 my-2" />

            {/* Price Filter */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-foreground">Giá bán</label>
              <div className="space-y-2.5">
                <label className="flex items-center space-x-3 cursor-pointer group">
                  <input
                    type="radio"
                    name="price"
                    checked={selectedPrice === "free"}
                    onChange={() => setSelectedPrice("free")}
                    className="w-4 h-4 text-primary bg-secondary border-border focus:ring-primary/50"
                  />
                  <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">Miễn phí</span>
                </label>
                <label className="flex items-center space-x-3 cursor-pointer group">
                  <input
                    type="radio"
                    name="price"
                    checked={selectedPrice === "paid"}
                    onChange={() => setSelectedPrice("paid")}
                    className="w-4 h-4 text-primary bg-secondary border-border focus:ring-primary/50"
                  />
                  <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">Có phí (Premium)</span>
                </label>
              </div>
            </div>

            <div className="border-t border-border/40 my-2" />

            {/* Rating Filter */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-foreground">Đánh giá tối thiểu</label>
              <div className="space-y-2.5">
                {[4.5, 4.0, 3.5].map((rating) => (
                  <label key={rating} className="flex items-center space-x-3 cursor-pointer group">
                    <input
                      type="radio"
                      name="rating"
                      checked={minRating === rating}
                      onChange={() => setMinRating(rating)}
                      className="w-4 h-4 text-primary bg-secondary border-border focus:ring-primary/50"
                    />
                    <div className="flex items-center text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                      <span className="mr-1">{rating}</span>
                      <div className="flex">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className={`h-3.5 w-3.5 ${i < Math.floor(rating) ? "text-amber-400 fill-current" : "text-border"}`} />
                        ))}
                      </div>
                      <span className="ml-1">& up</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* 2. Results Area */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-card border border-border/60 p-3 rounded-2xl shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-xs font-medium text-muted-foreground px-2">
              Tìm thấy <strong className="text-foreground">{finalCourses.length}</strong> khóa học phù hợp
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center space-x-2 bg-secondary rounded-lg p-1 border border-border">
                <button
                  onClick={() => setSortBy("popular")}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${sortBy === "popular" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  Phổ biến nhất
                </button>
                <button
                  onClick={() => setSortBy("rating")}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${sortBy === "rating" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  Đánh giá cao
                </button>
                <button
                  onClick={() => setSortBy("price-asc")}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${sortBy === "price-asc" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  Giá thấp đến cao
                </button>
              </div>

              {/* View Toggle */}
              <div className="flex bg-secondary border border-border rounded-lg p-1 hidden sm:flex">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-1.5 rounded-md transition-all ${viewMode === "grid" ? "bg-white shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"}`}
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-1.5 rounded-md transition-all ${viewMode === "list" ? "bg-white shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"}`}
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-4">
              <RefreshCw className="h-10 w-10 text-primary animate-spin" />
              <p className="text-sm font-bold text-muted-foreground animate-pulse">Đang tải dữ liệu từ CSDL...</p>
            </div>
          ) : finalCourses.length > 0 ? (
            <div className={`grid gap-6 ${viewMode === "grid" ? "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3" : "grid-cols-1"}`}>
              {finalCourses.map((c, i) => (
                <div key={c.id} className={viewMode === "list" ? "w-full max-w-none" : ""}>
                    <CourseCard {...mapDbCourse(c, i)} />
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-card border border-border/60 rounded-3xl p-16 text-center shadow-sm">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-secondary mb-4">
                <Search className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">Không tìm thấy khóa học nào</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Rất tiếc, chúng tôi không tìm thấy kết quả nào phù hợp với bộ lọc hiện tại. Hãy thử thay đổi từ khóa hoặc điều chỉnh các tiêu chí tìm kiếm.
              </p>
              <button
                onClick={resetFilters}
                className="mt-6 bg-primary text-white font-bold text-xs uppercase tracking-widest px-6 py-2.5 rounded-xl shadow-lg shadow-primary/20 hover:bg-blue-700 transition-all"
              >
                Xóa tất cả bộ lọc
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

export default function CoursesPage() {
  return (
    <>
      <Navbar />
      <Suspense fallback={<div className="min-h-screen pt-32 text-center"><RefreshCw className="w-8 h-8 animate-spin mx-auto text-primary" /></div>}>
        <CoursesContent />
      </Suspense>
      <Footer />
    </>
  );
}
