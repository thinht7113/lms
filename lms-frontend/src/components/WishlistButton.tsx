"use client";

import { useUser } from "@/context/user-context";
import api from "@/lib/api";

export default function WishlistButton({ courseId }: { courseId: number }) {
  const { wishlist, refreshWishlist, isAuthenticated } = useUser();
  const isWishlisted = wishlist.includes(courseId);

  const toggleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      alert("Vui lòng đăng nhập để lưu khóa học");
      return;
    }

    try {
      await api.post(`/courses/${courseId}/wishlist`, {});
      refreshWishlist();
    } catch (error) {
      console.error("Lỗi cập nhật danh sách yêu thích", error);
    }
  };

  return (
    <button 
      onClick={toggleWishlist}
      className={`absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center transition-all shadow-md z-20 ${
        isWishlisted 
          ? "bg-error text-white hover:bg-error/90 scale-110" 
          : "bg-surface/90 backdrop-blur-md text-on-surface hover:text-error hover:scale-110 border border-outline-variant/50"
      }`}
      aria-label="Toggle Wishlist"
    >
      <i className={`${isWishlisted ? "ph-fill" : "ph-bold"} ph-heart text-lg drop-shadow-sm`}></i>
    </button>
  );
}
