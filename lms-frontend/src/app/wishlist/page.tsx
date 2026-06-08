"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Heart, RefreshCw, Trash2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { apiService, Course, tokenHelper } from "@/services/api";

interface WishlistItem {
  id: number;
  ma_khoa_hoc?: number;
  khoa_hoc?: Course;
}

export default function WishlistPage() {
  const router = useRouter();
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<number | null>(null);

  useEffect(() => {
    if (!tokenHelper.getToken()) {
      router.push("/login");
      return;
    }

    async function loadWishlist() {
      setLoading(true);
      try {
        const data = await apiService.getWishlist();
        setWishlist(data);
      } finally {
        setLoading(false);
      }
    }

    loadWishlist();
  }, [router]);

  const formatPrice = (price: number) => {
    if (price === 0) return "Miễn phí";
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(price);
  };

  const removeWishlistItem = async (courseId: number) => {
    setRemovingId(courseId);
    try {
      await apiService.toggleWishlist(courseId);
      setWishlist((items) => items.filter((item) => item.khoa_hoc?.id !== courseId && item.ma_khoa_hoc !== courseId));
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[#F8F9FA] pt-32 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-primary">Bộ sưu tập cá nhân</p>
          </div>

          {loading ? (
            <div className="flex h-80 flex-col items-center justify-center gap-4 rounded-[2rem] border border-border bg-card">
              <RefreshCw className="h-8 w-8 animate-spin text-primary" />
              <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Đang tải danh sách...</p>
            </div>
          ) : wishlist.length === 0 ? (
            <div className="rounded-[2rem] border border-dashed border-border bg-card py-20 text-center">
              <Heart className="mx-auto h-12 w-12 text-primary/30" />
              <h2 className="mt-5 text-xl font-black text-slate-950">Danh sách yêu thích đang trống</h2>
              <Link href="/courses" className="mt-7 inline-flex rounded-xl bg-primary px-7 py-3 text-xs font-black uppercase tracking-widest text-white">
                Tìm khóa học
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {wishlist.map((item) => {
                const course = item.khoa_hoc;
                if (!course) return null;

                return (
                  <article key={item.id} className="flex flex-col overflow-hidden rounded-[2rem] border border-border/60 bg-card shadow-sm transition-all hover:shadow-xl sm:flex-row">
                    <div className="h-48 bg-gradient-to-br from-blue-600 to-indigo-700 sm:h-auto sm:w-56">
                      {course.anh_dai_dien ? (
                        <img src={course.anh_dai_dien} alt={course.tieu_de} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Heart className="h-12 w-12 text-white/40" />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col justify-between p-6">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-primary">{course.trinh_do}</p>
                        <h2 className="mt-2 line-clamp-2 text-lg font-black text-slate-950">{course.tieu_de}</h2>
                        <p className="mt-3 text-sm font-bold text-primary">{formatPrice(course.gia_tien)}</p>
                      </div>
                      <div className="mt-6 flex flex-wrap gap-3">
                        <Link
                          href={`/courses/${course.id}`}
                          className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-xs font-black uppercase tracking-widest text-white transition-colors hover:bg-primary"
                        >
                          Xem chi tiết
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => removeWishlistItem(course.id)}
                          disabled={removingId === course.id}
                          className="inline-flex items-center gap-2 rounded-xl bg-destructive/10 px-5 py-3 text-xs font-black uppercase tracking-widest text-destructive transition-colors hover:bg-destructive/15 disabled:opacity-60"
                        >
                          <Trash2 className="h-4 w-4" />
                          Bỏ lưu
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
