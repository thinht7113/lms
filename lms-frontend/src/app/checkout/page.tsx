"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { CreditCard, Wallet, QrCode, ArrowLeft, ShieldCheck, ShoppingBag, RefreshCw, AlertCircle } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { apiService, Cart } from "@/services/api";

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("visa"); // visa, momo, vnpay, qr
  const [error, setError] = useState<string | null>(null);

  // Retrieve parameters passed from Cart Page
  const couponId = searchParams?.get("coupon_id") ? Number(searchParams.get("coupon_id")) : undefined;
  const discountAmount = searchParams?.get("discount_amount") ? Number(searchParams.get("discount_amount")) : 0;
  const couponCode = searchParams?.get("code") || null;

  useEffect(() => {
    async function loadCart() {
      setLoading(true);
      try {
        const data = await apiService.getCart();
        setCart(data);
      } catch (err) {
        console.error("Error loading cart:", err);
        router.push("/cart");
      } finally {
        setLoading(false);
      }
    }
    loadCart();
  }, [router]);

  const originalAmount = cart ? Number(cart.tong_tien_tam_tinh) : 0;
  const finalAmount = Math.max(0, originalAmount - discountAmount);

  const handleCheckout = async () => {
    setError(null);
    setCheckoutLoading(true);

    try {
      // Create order in backend
      const order = await apiService.checkout(couponId, paymentMethod);
      // Redirect to payment result page where mock payment will run
      router.push(`/payment-result?order_id=${order.id}&payment_method=${paymentMethod}`);
    } catch (err: any) {
      setError(err.message || "Đặt hàng thất bại. Vui lòng kiểm tra lại.");
    } finally {
      setCheckoutLoading(false);
    }
  };

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

  const paymentOptions = [
    { id: "visa", label: "Thẻ Quốc tế (Visa / Mastercard)", icon: CreditCard, desc: "Thanh toán qua cổng thẻ tín dụng/ghi nợ quốc tế" },
    { id: "momo", label: "Ví Điện tử MoMo", icon: Wallet, desc: "Ví điện tử MoMo siêu nhanh, an toàn" },
    { id: "vnpay", label: "Cổng Thanh toán VNPay", icon: Wallet, desc: "Thanh toán quét mã hoặc ATM nội địa Việt Nam" },
    { id: "qr", label: "Quét Mã QR Ngân hàng (Chuyển khoản)", icon: QrCode, desc: "Chuyển khoản liên ngân hàng 24/7 tức thì" },
  ];

  return (
    <>
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-20 min-h-[80vh]">
        <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4 mb-10">
          <Link href="/cart" className="p-3 bg-card border border-border/50 hover:bg-secondary rounded-2xl transition-all shadow-sm shrink-0 w-fit">
            <ArrowLeft className="h-5 w-5 text-muted-foreground" />
          </Link>
          <div>
            <h1 className="text-3xl sm:text-4xl font-black text-foreground tracking-tighter">
              Thanh Toán <span className="text-primary italic">An Toàn</span>
            </h1>
            <p className="text-sm font-medium text-muted-foreground mt-1">Chọn phương thức giao dịch để hoàn tất đăng ký khóa học Nemo.</p>
          </div>
        </div>

        {error && (
          <div className="mb-8 p-6 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-sm font-bold flex items-start gap-4">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Left Column: Payment options selection */}
          <div className="lg:col-span-8 space-y-8">
            <div className="bg-card text-card-foreground border border-border/60 rounded-[2rem] p-8 shadow-sm space-y-6">
              <div className="flex items-center space-x-3 pb-4 border-b border-border/40">
                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-black text-sm">1</div>
                  <h2 className="font-extrabold text-lg text-foreground">Lựa chọn hình thức thanh toán</h2>
              </div>

              <div className="grid grid-cols-1 gap-5">
                {paymentOptions.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = paymentMethod === opt.id;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => setPaymentMethod(opt.id)}
                      className={`flex items-center p-5 rounded-[1.5rem] border-2 text-left transition-all cursor-pointer ${
                        isSelected
                          ? "border-primary bg-primary/5 shadow-md shadow-primary/5"
                          : "border-border/50 bg-secondary/30 hover:border-primary/30 hover:bg-secondary/60"
                      }`}
                    >
                      <div className={`p-3 rounded-2xl mr-5 transition-colors ${isSelected ? "bg-primary text-white shadow-md shadow-primary/30" : "bg-card border border-border/60 text-muted-foreground"}`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <div className="space-y-1 flex-grow">
                        <p className="text-sm font-black text-foreground">{opt.label}</p>
                        <p className="text-xs font-medium text-muted-foreground leading-relaxed">{opt.desc}</p>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ml-4 ${isSelected ? "border-primary" : "border-border"}`}>
                         {isSelected && <div className="w-2.5 h-2.5 bg-primary rounded-full" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Order Summary & Checkout Action */}
          <div className="lg:col-span-4">
            <div className="bg-card text-card-foreground border border-border/60 rounded-[2rem] p-8 shadow-2xl space-y-8 sticky top-32">
              <div className="flex items-center space-x-3 border-b border-border/40 pb-4">
                <ShoppingBag className="h-6 w-6 text-primary" />
                <h3 className="font-extrabold text-lg text-foreground">Tóm tắt đơn hàng</h3>
              </div>

              {/* Items preview list */}
              <div className="space-y-4 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                {cart?.chi_tiet_gio_hang.map((item) => (
                  <div key={item.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center text-sm gap-2">
                    <span className="font-bold text-foreground line-clamp-2 flex-grow">
                      {item.khoa_hoc.tieu_de}
                    </span>
                    <span className="font-black text-primary shrink-0 bg-primary/10 px-2 py-1 rounded-lg text-xs">
                      {Number(item.khoa_hoc.gia_tien) === 0 ? "Miễn phí" : `${Number(item.khoa_hoc.gia_tien).toLocaleString()} đ`}
                    </span>
                  </div>
                ))}
              </div>

              {/* Price Calculations */}
              <div className="space-y-4 text-sm border-t border-border/40 pt-6">
                <div className="flex justify-between text-muted-foreground font-semibold">
                  <span>Tạm tính gốc:</span>
                  <span>{originalAmount.toLocaleString()} đ</span>
                </div>
                {couponCode && (
                  <div className="flex justify-between text-emerald-600 font-bold bg-emerald-500/10 p-2 rounded-xl">
                    <span>Mã giảm ({couponCode}):</span>
                    <span>-{discountAmount.toLocaleString()} đ</span>
                  </div>
                )}
                <div className="flex justify-between text-muted-foreground font-semibold">
                  <span>Phương thức:</span>
                  <span className="uppercase font-black text-foreground tracking-widest">{paymentMethod}</span>
                </div>
                
                <div className="border-t border-border/60 pt-6 mt-4 flex flex-col space-y-2">
                  <span className="text-[11px] font-black text-muted-foreground uppercase tracking-widest">Tổng thanh toán</span>
                  <span className="text-4xl font-black text-primary tracking-tighter">{finalAmount.toLocaleString()} đ</span>
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={handleCheckout}
                disabled={checkoutLoading}
                className="w-full bg-primary hover:bg-blue-700 text-white font-black py-4 rounded-2xl shadow-xl shadow-primary/20 hover:shadow-primary/40 transition-all flex items-center justify-center space-x-2 cursor-pointer text-sm uppercase tracking-widest disabled:opacity-50"
              >
                {checkoutLoading ? (
                  <span>Đang xử lý...</span>
                ) : (
                  <span>Thanh toán ngay</span>
                )}
              </button>

              <div className="flex items-center justify-center space-x-2 text-[10px] font-bold uppercase tracking-widest text-emerald-600 bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20">
                <ShieldCheck className="h-4 w-4 shrink-0" />
                <span>Bảo mật 100% qua Nemo Pay</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center h-screen bg-background">
        <RefreshCw className="h-8 w-8 text-primary animate-spin" />
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  );
}
