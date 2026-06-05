"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/context/user-context";
import { apiFetch, formatPrice } from "@/lib/api";
import Link from "next/link";

interface CartCourse {
  id: number;
  tieu_de: string;
  gia_tien: string;
  trinh_do: string;
}

interface CartItem {
  id: number;
  ma_khoa_hoc: number;
  khoa_hoc: CartCourse;
}

interface Cart {
  chi_tiet_gio_hang: CartItem[];
  tong_tien_tam_tinh: string;
}

export default function CartPage() {
  const { role, token, isAuthenticated, refreshCartCount } = useUser();
  const router = useRouter();
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);

  // Coupon state
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{ coupon_id: number, code: string, discount_amount: string, final_amount: string } | null>(null);
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [couponError, setCouponError] = useState("");

  const loadCart = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await apiFetch("/cart", token);
      if (res.ok) setCart(await res.json());
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { loadCart(); }, [token]);

  const removeItem = async (courseId: number) => {
    if (!token) return;
    try {
      await apiFetch(`/cart/items/${courseId}`, token, { method: "DELETE" });
      await loadCart();
      await refreshCartCount();
    } catch { /* ignore */ }
  };

  const applyCoupon = async () => {
    if (!token || !couponCode.trim() || !cart) return;
    setApplyingCoupon(true);
    setCouponError("");
    try {
      const res = await apiFetch("/coupons/apply", token, {
        method: "POST",
        body: JSON.stringify({
          code: couponCode.trim(),
          original_amount: cart.tong_tien_tam_tinh,
        }),
      });
      if (res.ok) {
        setAppliedCoupon(await res.json());
      } else {
        const err = await res.json();
        setCouponError(err.detail || "Mã không hợp lệ");
        setAppliedCoupon(null);
      }
    } catch {
      setCouponError("Lỗi kết nối");
    }
    setApplyingCoupon(false);
  };

  const handleCheckout = async () => {
    if (!token || !cart || cart.chi_tiet_gio_hang.length === 0) return;
    setCheckingOut(true);
    try {
      // Step 1: Checkout
      const checkoutRes = await apiFetch("/checkout", token, {
        method: "POST",
        body: JSON.stringify({ 
          payment_method: "visa",
          coupon_id: appliedCoupon ? appliedCoupon.coupon_id : null
        }),
      });
      if (!checkoutRes.ok) {
        const err = await checkoutRes.json();
        alert(err.detail || "Lỗi tạo đơn hàng");
        setCheckingOut(false);
        return;
      }
      const order = await checkoutRes.json();

      // Step 2: Mock Payment
      const payRes = await apiFetch("/payments/mock", token, {
        method: "POST",
        body: JSON.stringify({
          ma_don_hang: order.id,
          phuong_thuc_thanh_toan: "visa",
          ma_giao_dich: `TX${Date.now()}`,
        }),
      });
      if (payRes.ok) {
        setCheckoutSuccess(true);
        await refreshCartCount();
        setTimeout(() => router.push("/my-courses"), 2500);
      } else {
        const err = await payRes.json();
        alert(err.detail || "Lỗi thanh toán");
      }
    } catch (e) {
      alert("Lỗi kết nối");
    }
    setCheckingOut(false);
  };

  if (!isAuthenticated || role !== "student") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center">
        <div className="w-24 h-24 bg-surface-container-high rounded-full flex items-center justify-center mb-6">
          <i className="ph-fill ph-shopping-cart text-5xl text-on-surface-variant"></i>
        </div>
        <h2 className="text-2xl font-bold text-on-surface mb-2">Giỏ hàng</h2>
        <p className="text-on-surface-variant mb-8 max-w-md">Bạn cần đăng nhập với tài khoản <strong className="text-primary">Học viên</strong> để sử dụng tính năng giỏ hàng.</p>
        <Link href="/login" className="px-6 py-3 bg-primary text-on-primary font-bold rounded-xl shadow-md hover:bg-primary/90 transition-colors flex items-center gap-2">
          <i className="ph-bold ph-sign-in text-lg"></i> Đăng nhập ngay
        </Link>
      </div>
    );
  }

  if (checkoutSuccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center animate-slide-up">
        <div className="w-24 h-24 bg-success/10 text-success rounded-full flex items-center justify-center mb-6 border border-success/20">
          <i className="ph-bold ph-check text-5xl"></i>
        </div>
        <h2 className="text-3xl font-bold text-on-surface mb-2">Thanh toán thành công!</h2>
        <p className="text-on-surface-variant mb-8">Đang chuyển hướng đến khóa học của bạn...</p>
        <div className="w-48 h-1.5 bg-surface-container-high rounded-full overflow-hidden">
          <div className="h-full bg-success w-full animate-pulse"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-slide-up">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-on-surface-variant mb-6">
        <Link href="/" className="hover:text-primary transition-colors flex items-center gap-1">
          <i className="ph ph-house"></i> Trang chủ
        </Link>
        <i className="ph ph-caret-right text-xs"></i>
        <span className="text-on-surface font-medium">
          Giỏ hàng
        </span>
      </nav>

      <div className="w-full">
        {loading ? (
          <div className="flex justify-center items-center h-64 text-on-surface-variant">
            <i className="ph ph-spinner-gap animate-spin text-3xl text-primary mr-2"></i> Đang tải giỏ hàng...
          </div>
        ) : !cart || cart.chi_tiet_gio_hang.length === 0 ? (
          <div className="glass-panel border border-outline-variant rounded-2xl p-16 text-center bg-surface-container">
            <div className="w-20 h-20 bg-surface-container-high rounded-full flex items-center justify-center mx-auto mb-6">
              <i className="ph ph-shopping-cart text-4xl text-on-surface-variant"></i>
            </div>
            <h3 className="text-xl font-bold text-on-surface mb-2">Giỏ hàng trống</h3>
            <p className="text-on-surface-variant mb-8">Bạn chưa thêm khóa học nào vào giỏ hàng.</p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-surface-container-highest text-on-surface font-bold rounded-xl shadow-sm hover:bg-outline-variant transition-colors"
            >
              <i className="ph-bold ph-magnifying-glass"></i> Khám phá khóa học
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8">
            {/* Cart Items */}
            <div className="flex flex-col gap-4">
              {cart.chi_tiet_gio_hang.map((item, idx) => (
                <div
                  key={item.id}
                  className="glass-panel bg-surface border border-outline-variant rounded-2xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 group"
                  style={{ animationDelay: `${idx * 0.08}s`, animationFillMode: "both" }}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-xl bg-primary-container/20 flex items-center justify-center border border-primary-container/30 text-primary">
                      <i className="ph-fill ph-book-open text-3xl"></i>
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-on-surface group-hover:text-primary transition-colors line-clamp-1">{item.khoa_hoc.tieu_de}</h3>
                      <span className="text-xs font-medium text-on-surface-variant bg-surface-container px-2 py-0.5 rounded uppercase tracking-wider mt-1 inline-block">
                        {item.khoa_hoc.trinh_do}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between w-full sm:w-auto sm:justify-end gap-6 sm:gap-4 mt-2 sm:mt-0">
                    <span className="text-lg font-bold text-primary">{formatPrice(item.khoa_hoc.gia_tien)}</span>
                    <button
                      onClick={() => removeItem(item.ma_khoa_hoc)}
                      className="w-10 h-10 rounded-xl bg-error-container/50 text-error flex items-center justify-center hover:bg-error hover:text-on-error transition-all"
                      title="Xóa khỏi giỏ hàng"
                    >
                      <i className="ph-bold ph-trash text-lg"></i>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Order Summary */}
            <div>
              <div className="glass-panel border border-outline-variant bg-surface rounded-2xl p-6 sticky top-24 shadow-lg">
                <h3 className="text-lg font-bold text-on-surface mb-6 border-b border-outline-variant pb-4">Tóm tắt đơn hàng</h3>
                
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-sm text-on-surface-variant">
                    <span>Số lượng khóa học</span>
                    <span className="font-semibold text-on-surface">{cart.chi_tiet_gio_hang.length}</span>
                  </div>
                  <div className="flex justify-between text-sm text-on-surface-variant">
                    <span>Tạm tính</span>
                    <span className="font-semibold text-on-surface">{formatPrice(cart.tong_tien_tam_tinh)}</span>
                  </div>
                  {appliedCoupon && (
                    <div className="flex justify-between text-sm text-success font-bold">
                      <span>Giảm giá ({appliedCoupon.code})</span>
                      <span>-{formatPrice(appliedCoupon.discount_amount)}</span>
                    </div>
                  )}
                </div>

                {/* Coupon Input */}
                <div className="mb-6">
                  <label className="block text-xs font-bold text-on-surface-variant mb-2 uppercase tracking-wider">Mã giảm giá</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      placeholder="Nhập mã..." 
                      className="flex-1 px-4 py-2.5 rounded-xl border border-outline-variant bg-surface-container-lowest focus:border-primary focus:ring-1 outline-none text-sm font-bold uppercase"
                    />
                    <button 
                      onClick={applyCoupon}
                      disabled={applyingCoupon || !couponCode.trim()}
                      className="px-4 py-2.5 bg-secondary text-on-secondary rounded-xl font-bold text-sm hover:bg-secondary/90 transition-colors disabled:opacity-50"
                    >
                      {applyingCoupon ? "..." : "Áp dụng"}
                    </button>
                  </div>
                  {couponError && <p className="text-xs text-error mt-1.5 font-medium">{couponError}</p>}
                </div>

                <div className="flex justify-between items-center py-4 border-t border-outline-variant mb-6">
                  <span className="text-base font-bold text-on-surface">Tổng cộng</span>
                  <span className="text-2xl font-black text-primary">
                    {formatPrice(appliedCoupon ? appliedCoupon.final_amount : cart.tong_tien_tam_tinh)}
                  </span>
                </div>

                <button
                  onClick={handleCheckout}
                  disabled={checkingOut}
                  className="w-full py-3.5 bg-primary hover:bg-primary/90 text-on-primary rounded-xl font-bold text-sm transition-all shadow-md flex items-center justify-center gap-2"
                >
                  {checkingOut ? (
                    <><i className="ph ph-spinner-gap animate-spin text-lg"></i> Đang xử lý...</>
                  ) : (
                    <><i className="ph-bold ph-credit-card text-lg"></i> Thanh toán ngay</>
                  )}
                </button>
                <p className="text-xs text-center text-on-surface-variant mt-4 flex items-center justify-center gap-1.5">
                  <i className="ph-fill ph-shield-check text-success"></i> Thanh toán an toàn và bảo mật
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
