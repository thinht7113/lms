"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, CreditCard, RefreshCw, RotateCcw, ShoppingBag, X } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { apiService, Order, tokenHelper } from "@/services/api";
import { useToast } from "@/contexts/ToastContext";

const statusLabel: Record<string, string> = {
  pending: "Chờ thanh toán",
  success: "Đã thanh toán",
  failed: "Thanh toán lỗi",
  refund_requested: "Chờ duyệt hoàn tiền",
  refunded: "Đã hoàn tiền",
};

function formatMoney(value: number) {
  return `${Number(value || 0).toLocaleString("vi-VN")} đ`;
}

export default function OrdersPage() {
  const router = useRouter();
  const toast = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [confirmRefundId, setConfirmRefundId] = useState<number | null>(null);
  const [confirmCancelRefundId, setConfirmCancelRefundId] = useState<number | null>(null);

  async function loadOrders() {
    setLoading(true);
    try {
      setOrders(await apiService.getMyOrders());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!tokenHelper.getToken()) {
      router.push("/login");
      return;
    }
    loadOrders();
  }, [router]);

  useEffect(() => {
    if (confirmRefundId !== null || confirmCancelRefundId !== null) {
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    };
  }, [confirmRefundId, confirmCancelRefundId]);

  const paidOrders = useMemo(() => orders.filter((order) => order.trang_thai === "success").length, [orders]);

  const confirmRefund = async () => {
    if (confirmRefundId === null) return;
    const orderId = confirmRefundId;
    setConfirmRefundId(null);
    setProcessingId(orderId);
    try {
      const updated = await apiService.requestRefund(orderId);
      setOrders((prev) => prev.map((order) => order.id === orderId ? updated : order));
      toast.success("Đã gửi yêu cầu hoàn tiền");
    } catch (err: any) {
      toast.error(err.message || "Không thể gửi yêu cầu hoàn tiền");
    } finally {
      setProcessingId(null);
    }
  };

  const confirmCancelRefund = async () => {
    if (confirmCancelRefundId === null) return;
    const orderId = confirmCancelRefundId;
    setConfirmCancelRefundId(null);
    setProcessingId(orderId);
    try {
      const updated = await apiService.cancelRefund(orderId);
      setOrders((prev) => prev.map((order) => order.id === orderId ? updated : order));
      toast.success("Đã hủy yêu cầu hoàn tiền");
    } catch (err: any) {
      toast.error(err.message || "Không thể hủy yêu cầu hoàn tiền");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[#f7f8ff] pt-32 pb-20 text-slate-950">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <section className="mb-8 rounded-[2rem] bg-slate-950 p-8 text-white shadow-2xl">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-300">Giao dịch học tập</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight">Đơn hàng của tôi</h1>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl bg-white/10 p-5">
                <ShoppingBag className="h-5 w-5 text-blue-300" />
                <p className="mt-3 text-2xl font-black">{orders.length}</p>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-300">Tổng đơn</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-5">
                <CreditCard className="h-5 w-5 text-emerald-300" />
                <p className="mt-3 text-2xl font-black">{paidOrders}</p>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-300">Đã thanh toán</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-5">
                <RotateCcw className="h-5 w-5 text-amber-300" />
                <p className="mt-3 text-2xl font-black">{orders.filter((order) => order.trang_thai.includes("refund")).length}</p>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-300">Hoàn tiền</p>
              </div>
            </div>
          </section>

          {loading ? (
            <div className="flex h-80 items-center justify-center rounded-[2rem] border border-slate-200 bg-white">
              <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : orders.length === 0 ? (
            <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white py-20 text-center">
              <ShoppingBag className="mx-auto h-12 w-12 text-slate-300" />
              <h2 className="mt-5 text-2xl font-black">Bạn chưa có đơn hàng nào</h2>
              <Link href="/courses" className="mt-6 inline-flex rounded-2xl bg-blue-600 px-6 py-3 text-sm font-black text-white">
                Khám phá khóa học
              </Link>
            </div>
          ) : (
            <div className="space-y-5">
              {orders.map((order) => (
                <article key={order.id} className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-blue-700">
                          Đơn #{order.id}
                        </span>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-600">
                          {statusLabel[order.trang_thai] || order.trang_thai}
                        </span>
                      </div>
                      <p className="mt-3 text-sm font-medium text-slate-500">
                        Ngày tạo: {new Date(order.ngay_tao).toLocaleDateString("vi-VN")}
                      </p>
                      <div className="mt-4 space-y-2">
                        {order.chi_tiet_don_hang.map((item) => (
                          <div key={item.id} className="text-sm font-bold text-slate-800">
                            {item.khoa_hoc?.tieu_de || `Khóa học #${item.ma_khoa_hoc}`} - {formatMoney(item.gia_luc_mua)}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="min-w-48 text-left md:text-right">
                      <p className="text-xs font-black uppercase tracking-widest text-slate-400">Tổng tiền</p>
                      <p className="mt-1 text-2xl font-black text-slate-950">{formatMoney(order.tong_tien)}</p>
                      {order.trang_thai === "success" && (
                        <button
                          onClick={() => setConfirmRefundId(order.id)}
                          disabled={processingId === order.id}
                          className="mt-4 inline-flex rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-black uppercase tracking-widest text-amber-700 hover:bg-amber-100 disabled:opacity-50"
                        >
                          {processingId === order.id ? "Đang gửi..." : "Yêu cầu hoàn tiền"}
                        </button>
                      )}
                      {order.trang_thai === "refund_requested" && (
                        <button
                          onClick={() => setConfirmCancelRefundId(order.id)}
                          disabled={processingId === order.id}
                          className="mt-4 inline-flex rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-black uppercase tracking-widest text-rose-700 hover:bg-rose-100 disabled:opacity-50 transition-colors"
                        >
                          {processingId === order.id ? "Đang hủy..." : "Hủy yêu cầu hoàn tiền"}
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />

      {confirmRefundId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white rounded-[2rem] border border-slate-200 shadow-2xl p-8 text-center animate-in zoom-in-95 duration-200">
            {/* Close Button */}
            <button
              onClick={() => setConfirmRefundId(null)}
              className="absolute top-6 right-6 rounded-xl border border-slate-200 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <span className="sr-only">Đóng</span>
              <X className="w-5 h-5" />
            </button>

            {/* Warning Icon */}
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 text-amber-500 mb-6 mt-2">
              <AlertTriangle className="h-8 w-8" />
            </div>

            <h3 className="text-xl font-black text-slate-950 tracking-tight">
              Yêu cầu hoàn tiền
            </h3>
            
            <p className="mt-3 text-sm font-semibold text-slate-500 leading-relaxed px-2">
              Bạn có chắc chắn muốn gửi yêu cầu hoàn tiền cho đơn hàng này không?
            </p>

            <div className="mt-8 flex gap-3">
              <button
                onClick={() => setConfirmRefundId(null)}
                className="flex-1 rounded-2xl border border-slate-200 px-5 py-3.5 text-sm font-black text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={confirmRefund}
                className="flex-1 rounded-2xl bg-amber-600 px-5 py-3.5 text-sm font-black text-white hover:bg-amber-700 shadow-lg shadow-amber-600/20 hover:shadow-amber-600/30 transition-all"
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmCancelRefundId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white rounded-[2rem] border border-slate-200 shadow-2xl p-8 text-center animate-in zoom-in-95 duration-200">
            {/* Close Button */}
            <button
              onClick={() => setConfirmCancelRefundId(null)}
              className="absolute top-6 right-6 rounded-xl border border-slate-200 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <span className="sr-only">Đóng</span>
              <X className="w-5 h-5" />
            </button>

            {/* Warning Icon */}
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-50 text-rose-500 mb-6 mt-2">
              <AlertTriangle className="h-8 w-8" />
            </div>

            <h3 className="text-xl font-black text-slate-950 tracking-tight">
              Hủy yêu cầu hoàn tiền
            </h3>
            
            <p className="mt-3 text-sm font-semibold text-slate-500 leading-relaxed px-2">
              Bạn có chắc chắn muốn hủy yêu cầu hoàn tiền cho đơn hàng này? Sau khi hủy, đơn hàng sẽ tiếp tục trạng thái hoạt động bình thường.
            </p>

            <div className="mt-8 flex gap-3">
              <button
                onClick={() => setConfirmCancelRefundId(null)}
                className="flex-1 rounded-2xl border border-slate-200 px-5 py-3.5 text-sm font-black text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                onClick={confirmCancelRefund}
                className="flex-1 rounded-2xl bg-rose-600 px-5 py-3.5 text-sm font-black text-white hover:bg-rose-700 shadow-lg shadow-rose-600/20 hover:shadow-rose-600/30 transition-all"
              >
                Đồng ý hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
