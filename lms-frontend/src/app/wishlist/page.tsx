"use client";

import { useEffect, useState } from "react";
import api, { formatPrice, levelLabel } from "@/lib/api";
import Link from "next/link";
import WishlistButton from "@/components/WishlistButton";
import { useUser } from "@/context/user-context";
import { useRouter } from "next/navigation";

interface Category {
  id: number;
  ten_danh_muc: string;
}

interface Course {
  id: number;
  tieu_de: string;
  mo_ta: string | null;
  gia_tien: string;
  trinh_do: string;
  danh_gia_trung_binh: string;
  ma_danh_muc: number | null;
}

interface WishlistItem {
  id: number;
  khoa_hoc: Course;
  ngay_them: string;
}

export default function WishlistPage() {
  const { isAuthenticated, isLoading: authLoading } = useUser();
  const router = useRouter();

  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const loadData = async () => {
      setLoading(true);
      try {
        const [wRes, cRes] = await Promise.all([
          api.get("/courses/wishlist/me"),
          api.get("/categories")
        ]);
        setWishlistItems(wRes.data);
        setCategories(cRes.data);
      } catch (e) {
        console.error("Lỗi khi tải wishlist", e);
      }
      setLoading(false);
    };

    loadData();
  }, [isAuthenticated]);

  if (authLoading || !isAuthenticated) {
    return <div className="p-20 text-center font-bold text-on-surface-variant">Đang tải...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-12 animate-slide-up">
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="glass-panel rounded-3xl h-[360px] animate-pulse bg-surface-container"></div>
          ))}
        </div>
      ) : wishlistItems.length === 0 ? (
        <div className="text-center py-24 glass-panel rounded-[32px] border border-outline-variant/50 shadow-sm bg-surface">
          <div className="w-24 h-24 bg-error-container/50 rounded-full flex items-center justify-center mx-auto mb-6">
            <i className="ph-fill ph-heart-break text-5xl text-error drop-shadow-sm"></i>
          </div>
          <h3 className="text-2xl font-black text-on-surface mb-3">Chưa có khóa học nào</h3>
          <p className="text-on-surface-variant font-medium mb-8 max-w-sm mx-auto">
            Bạn chưa lưu khóa học nào vào danh sách yêu thích. Hãy khám phá ngay các khóa học tuyệt vời của chúng tôi!
          </p>
          <Link
            href="/courses"
            className="px-8 py-3.5 bg-primary text-white font-bold rounded-xl hover:bg-primary-600 transition-colors shadow-md shadow-primary/20 inline-flex items-center gap-2"
          >
            Khám phá khóa học <i className="ph-bold ph-arrow-right"></i>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {wishlistItems.map((item, idx) => {
            const course = item.khoa_hoc;
            return (
              <Link
                href={`/courses/${course.id}`}
                key={item.id}
                className="glass-panel group rounded-3xl border border-outline-variant overflow-hidden hover:border-primary/50 transition-all flex flex-col h-[380px] hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/10 relative bg-surface"
                style={{ animationDelay: `${idx * 0.1}s`, animationFillMode: "both" }}
              >
                <div className="h-44 relative bg-surface-container-highest overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 group-hover:scale-110 transition-transform duration-700"></div>
                  <div className="absolute inset-0 flex items-center justify-center opacity-40 group-hover:opacity-80 transition-opacity">
                    <i className="ph-fill ph-play-circle text-6xl text-primary drop-shadow-md"></i>
                  </div>
                  <div className="absolute top-4 left-4 flex gap-2 z-10">
                    <span className="px-3 py-1 bg-surface/90 backdrop-blur-md text-on-surface text-[10px] font-black rounded-lg shadow-sm border border-outline-variant/30 uppercase tracking-wider">
                      {categories.find((cat) => cat.id === course.ma_danh_muc)?.ten_danh_muc || "Khác"}
                    </span>
                  </div>
                  <WishlistButton courseId={course.id} />
                  <div className="absolute bottom-4 right-4 bg-surface/90 backdrop-blur-md px-2 py-1 rounded-lg flex items-center gap-1 shadow-sm border border-white/50 z-10">
                    <i className="ph-fill ph-star text-warning text-xs drop-shadow-sm"></i>
                    <span className="text-xs font-black text-on-surface">{parseFloat(course.danh_gia_trung_binh).toFixed(1)}</span>
                  </div>
                </div>
                <div className="p-6 flex flex-col flex-1">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-1 bg-primary/10 text-primary rounded-md border border-primary/20">
                      {levelLabel(course.trinh_do)}
                    </span>
                  </div>
                  <h3 className="font-bold text-on-surface text-lg mb-2 line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                    {course.tieu_de}
                  </h3>
                  <div className="mt-auto pt-4 border-t border-outline-variant/50 flex justify-between items-center">
                    <span className="font-black text-primary text-xl tracking-tight">
                      {parseFloat(course.gia_tien) > 0 ? formatPrice(parseFloat(course.gia_tien)) : "Miễn phí"}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
