"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShoppingCart, Trash2, Tag, ArrowRight, ShieldCheck, ArrowLeft, RefreshCw, Bookmark } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { apiService, Cart } from "@/services/api";

export default function CartPage() {
  const router = useRouter();
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [couponCode, setCouponCode] = useState("");
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponSuccess, setCouponSuccess] = useState<string | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<any | null>(null);

  // Load Cart from DB
  const loadCart = async () => {
    setLoading(true);
    try {
      const data = await apiService.getCart();
      setCart(data);
    } catch (err) {
      console.error("Error loading cart:", err);
      // Redirect to login if unauthorized
      const token = localStorage.getItem("lumina_token");
      if (!token) {
        router.push("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCart();
  }, []);

  const handleRemove = async (courseId: number) => {
    try {
      await apiService.removeFromCart(courseId);
      await loadCart();
      // Reload page to update navbar badge
      window.location.reload();
    } catch (err) {
      console.error("Failed to remove item:", err);
    }
  };

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim() || !cart) return;

    setCouponError(null);
    setCouponSuccess(null);

    try {
      const result = await apiService.applyCoupon(couponCode, cart.tong_tien_tam_tinh);
      setAppliedCoupon(result);
      setCouponSuccess(`Áp dụng thành công mã "${result.code}". Giảm ${result.discount_amount.toLocaleString()} đ!`);
    } catch (err: any) {
      setCouponError(err.message || "Mã giảm giá không hợp lệ.");
      setAppliedCoupon(null);
    }
  };

  const getGradient = (index: number) => {
    const gradients = [
      "from-blue-600 to-indigo-700",
      "from-slate-700 to-slate-900",
      "from-indigo-500 to-blue-500",
      "from-blue-400 to-indigo-600"
    ];
    return gradients[index % gradients.length];
  };

  const originalAmount = cart ? Number(cart.tong_tien_tam_tinh) : 0;
  const discountAmount = appliedCoupon ? Number(appliedCoupon.discount_amount) : 0;
  const finalAmount = Math.max(0, originalAmount - discountAmount);

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="flex justify-center items-center h-screen bg-background">
          <RefreshCw className="h-10 w-10 text-primary animate-spin" />
        </main>
        <Footer />
      </>
    );
  }

  const hasItems = cart && cart.chi_tiet_gio_hang.length > 0;

  return (
    <>
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-20 min-h-[80vh]">
        <div className="flex items-center space-x-4 mb-10">
          <div className="bg-primary/10 p-3 rounded-2xl text-primary shrink-0">
            <ShoppingCart className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl font-black text-foreground tracking-tighter">
              Giỏ Hàng <span className="text-primary italic">Của Bạn</span>
            </h1>
            <p className="text-sm font-medium text-muted-foreground mt-1">Chuẩn bị hành trang kỹ năng cho bước tiến tiếp theo trong sự nghiệp.</p>
          </div>
        </div>

        {!hasItems ? (
          <div className="bg-card border border-dashed border-border/80 rounded-[2rem] p-16 text-center space-y-6 shadow-sm flex flex-col items-center justify-center max-w-2xl mx-auto mt-12">
            <div className="bg-secondary p-6 rounded-full text-muted-foreground/60 mb-2">
              <ShoppingCart className="h-16 w-16" />
            </div>
            <div>
              <h3 className="font-sans font-black text-xl text-foreground">Giỏ hàng đang trống</h3>
              <p className="text-sm font-medium text-muted-foreground max-w-sm mt-2 leading-relaxed">
                Đừng bỏ lỡ cơ hội. Hãy khám phá hàng chục khóa học chất lượng cao trên nền tảng Nemo LMS ngay hôm nay.
              </p>
            </div>
            <Link
              href="/courses"
              className="mt-4 bg-primary text-white rounded-xl text-xs font-bold uppercase tracking-widest px-8 py-3.5 shadow-lg shadow-primary/20 hover:bg-blue-700 transition-all"
            >
              Khám phá khóa học
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            {/* Left Column: Cart items list */}
            <div className="lg:col-span-8 space-y-4">
              {cart?.chi_tiet_gio_hang.map((item, index) => (
                <div
                  key={item.id}
                  className="group flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-card text-card-foreground border border-border/60 rounded-2xl shadow-sm gap-4 hover:shadow-md transition-all duration-300"
                >
                  <div className="flex items-center space-x-4 w-full sm:w-auto">
                    {/* Course preview block */}
                    <div className={`relative h-20 w-32 rounded-xl shrink-0 bg-gradient-to-br ${getGradient(index)} overflow-hidden flex items-center justify-center p-3 text-white text-center`}>
                      {item.khoa_hoc.anh_dai_dien ? (
                          <img src={item.khoa_hoc.anh_dai_dien} alt={item.khoa_hoc.tieu_de} className="absolute inset-0 w-full h-full object-cover" />
                      ) : (
                          <div className="absolute inset-0 bg-black/20" />
                      )}
                      {!item.khoa_hoc.anh_dai_dien && <span className="relative z-10 font-bold text-[10px] leading-snug line-clamp-2 drop-shadow-sm">{item.khoa_hoc.tieu_de}</span>}
                    </div>
                    
                    <div className="flex-grow space-y-1">
                      <div className="flex items-center space-x-2">
                          <span className="text-[9px] font-black uppercase tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                              {item.khoa_hoc.trinh_do === "beginner" ? "Cơ bản" : item.khoa_hoc.trinh_do === "intermediate" ? "Trung cấp" : "Nâng cao"}
                          </span>
                      </div>
                      <h3 className="font-bold text-sm text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                        {item.khoa_hoc.tieu_de}
                      </h3>
                      <p className="text-[11px] font-medium text-muted-foreground">Giảng viên Nemo</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-6 border-t sm:border-none border-border/40 pt-4 sm:pt-0 mt-2 sm:mt-0 shrink-0">
                    <span className="font-sans font-black text-lg text-primary tracking-tighter">
                      {Number(item.khoa_hoc.gia_tien) === 0 ? "Miễn phí" : `${Number(item.khoa_hoc.gia_tien).toLocaleString()} đ`}
                    </span>

                    <div className="flex items-center space-x-1 border-l border-border/50 pl-4 ml-2">
                      <button 
                        onClick={() => handleRemove(item.khoa_hoc.id)}
                        className="p-2.5 text-muted-foreground hover:bg-rose-100 hover:text-rose-600 rounded-xl transition-colors"
                        title="Xóa khỏi giỏ hàng"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              <div className="pt-6">
                  <Link
                    href="/courses"
                    className="inline-flex items-center space-x-2 text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors group"
                  >
                    <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                    <span>Tiếp tục tìm kiếm khóa học</span>
                  </Link>
              </div>
            </div>

            {/* Right Column: Pricing details and coupon */}
            <div className="lg:col-span-4">
               <div className="sticky top-28 space-y-6">
                  {/* Coupon Box */}
                  <div className="bg-card text-card-foreground border border-border/60 rounded-[1.5rem] p-6 shadow-sm space-y-4">
                    <div className="flex items-center space-x-2 text-foreground mb-2">
                      <Tag className="h-5 w-5 text-primary" />
                      <h3 className="font-black text-sm uppercase tracking-widest">Mã giảm giá</h3>
                    </div>

                    <form onSubmit={handleApplyCoupon} className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Nhập mã CODE..."
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                        className="flex-grow bg-secondary text-foreground font-medium text-xs rounded-xl py-3 px-4 border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 uppercase"
                      />
                      <button
                        type="submit"
                        className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-5 py-3 rounded-xl transition-all cursor-pointer"
                      >
                        Áp dụng
                      </button>
                    </form>

                    {couponError && (
                      <p className="text-[11px] font-bold text-destructive bg-destructive/10 border border-destructive/20 p-2 rounded-lg">
                        {couponError}
                      </p>
                    )}
                    {couponSuccess && (
                      <p className="text-[11px] font-bold text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 p-2 rounded-lg">
                        {couponSuccess}
                      </p>
                    )}
                  </div>

                  {/* Pricing Box */}
                  <div className="bg-card text-card-foreground border border-border/60 rounded-[2rem] p-8 shadow-2xl space-y-6">
                    <h3 className="font-black text-base text-foreground border-b border-border/40 pb-4">Hóa đơn tóm tắt</h3>

                    <div className="space-y-4 text-sm font-medium">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Tổng tiền gốc</span>
                        <span className="font-bold text-foreground">{originalAmount.toLocaleString()} đ</span>
                      </div>
                      
                      {discountAmount > 0 && (
                        <div className="flex justify-between items-center text-emerald-600 bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20">
                          <span className="text-xs font-bold uppercase tracking-widest">Đã giảm trừ</span>
                          <span className="font-black">-{discountAmount.toLocaleString()} đ</span>
                        </div>
                      )}
                      
                      <div className="border-t border-border/60 pt-6 mt-4 flex flex-col space-y-2">
                          <span className="text-[11px] font-black text-muted-foreground uppercase tracking-widest">Tổng thanh toán</span>
                          <span className="text-4xl font-black text-primary tracking-tighter">{finalAmount.toLocaleString()} đ</span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        const couponQuery = appliedCoupon
                          ? `&coupon_id=${appliedCoupon.coupon_id}&discount_amount=${appliedCoupon.discount_amount}&code=${appliedCoupon.code}`
                          : "";
                        router.push(`/checkout?original_amount=${originalAmount}${couponQuery}`);
                      }}
                      className="w-full bg-primary hover:bg-blue-700 text-white font-black py-4 rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all flex items-center justify-center space-x-2 cursor-pointer text-xs uppercase tracking-widest mt-4"
                    >
                      <span>Tiến hành thanh toán</span>
                      <ArrowRight className="h-4 w-4" />
                    </button>

                    <div className="flex items-center justify-center space-x-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground pt-4">
                      <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                      <span>Giao dịch an toàn 100%</span>
                    </div>
                  </div>
               </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </>
  );
}
