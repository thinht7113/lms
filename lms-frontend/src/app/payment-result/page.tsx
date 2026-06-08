"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, XCircle, ShieldCheck, RefreshCw, FileText, LayoutGrid } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { apiService } from "@/services/api";

function PaymentResultContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"processing" | "success" | "fail">("processing");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [txCode, setTxCode] = useState("");

  const orderId = searchParams?.get("order_id") ? Number(searchParams.get("order_id")) : null;
  const paymentMethod = searchParams?.get("payment_method") || "visa";

  useEffect(() => {
    async function processPayment() {
      if (!orderId) {
        setStatus("fail");
        setErrorMessage("Thiếu mã đơn hàng.");
        return;
      }

      setStatus("processing");

      try {
        const transCode = `TX${orderId}-${Date.now()}`;
        const res = await apiService.payMock(orderId, paymentMethod, transCode);
        setTxCode(res.ma_giao_dich || transCode);
        window.dispatchEvent(new Event("lumina-cart-updated"));
        setStatus("success");
      } catch (err: any) {
        console.error("Payment error:", err);
        setStatus("fail");
        setErrorMessage(err.message || "Giao dịch bị từ chối bởi ngân hàng phát hành hoặc ví điện tử.");
      }
    }

    processPayment();
  }, [orderId, paymentMethod]);

  return (
    <>
      <Navbar />

      <main className="min-h-[85vh] relative flex items-center justify-center bg-slate-50 py-28 px-4 overflow-hidden">
        {/* Dynamic Background */}
        <div className="absolute inset-0 z-0 overflow-hidden">
            <div className="absolute top-0 right-0 w-full h-full bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] opacity-40 -z-10" />
            <div className="absolute -top-[40%] -left-[20%] w-[80%] h-[80%] rounded-full bg-blue-500/10 blur-[120px] animate-pulse duration-10000" />
        </div>

        {status === "processing" && (
          <div className="relative z-10 w-full max-w-lg bg-card/80 border border-border/80 rounded-[2rem] p-12 text-center space-y-6 shadow-2xl backdrop-blur-xl flex flex-col items-center animate-in fade-in zoom-in duration-500">
            <div className="relative">
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
                <RefreshCw className="relative h-16 w-16 text-primary animate-spin" />
            </div>
            <div className="space-y-3">
              <h2 className="text-2xl font-black text-foreground tracking-tighter">Đang kết nối cổng thanh toán...</h2>
              <p className="text-xs font-medium text-muted-foreground max-w-xs mx-auto leading-relaxed">
                Backend đang xác nhận giao dịch qua <span className="uppercase font-black text-primary bg-primary/10 px-2 py-0.5 rounded-md">{paymentMethod}</span>. Vui lòng không đóng trình duyệt.
              </p>
            </div>
          </div>
        )}

        {status === "success" && (
          <div className="relative z-10 w-full max-w-md bg-card/80 border border-border/80 rounded-[2.5rem] p-10 text-center space-y-8 shadow-2xl backdrop-blur-xl flex flex-col items-center animate-in slide-in-from-bottom-8 duration-700">
            <div className="relative mb-2">
                <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-xl animate-pulse" />
                <div className="relative bg-emerald-500 text-white p-5 rounded-full shadow-lg shadow-emerald-500/30 ring-8 ring-emerald-500/10">
                    <CheckCircle2 className="h-10 w-10" />
                </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-3xl font-black text-foreground tracking-tighter">Thanh toán hoàn tất!</h2>
              <p className="text-xs font-medium text-muted-foreground px-4">
                Tuyệt vời! Khóa học của bạn đã được kích hoạt. Hành trình mới bắt đầu từ đây.
              </p>
            </div>

            {/* E-Receipt / Bill detail Bento Box */}
            <div className="w-full bg-background border border-border/60 rounded-[1.5rem] p-6 text-left text-xs space-y-4 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-bl-full" />
              <div className="flex items-center space-x-2 text-foreground border-b border-border/40 pb-3">
                <FileText className="h-4 w-4 text-primary" />
                <span className="font-black uppercase tracking-widest text-[10px]">Hóa đơn giao dịch</span>
              </div>
              <div className="flex justify-between items-center relative z-10">
                <span className="text-muted-foreground font-medium">Mã đơn hàng:</span>
                <span className="font-black text-foreground">#{orderId}</span>
              </div>
              <div className="flex justify-between items-center relative z-10">
                <span className="text-muted-foreground font-medium">Mã giao dịch:</span>
                <span className="font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">{txCode}</span>
              </div>
              <div className="flex justify-between items-center relative z-10">
                <span className="text-muted-foreground font-medium">Phương thức:</span>
                <span className="uppercase font-black text-foreground">{paymentMethod}</span>
              </div>
              <div className="flex justify-between items-center border-t border-border/40 pt-3 relative z-10">
                <span className="text-muted-foreground font-medium">Trạng thái hệ thống:</span>
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-500/20">Thành công</span>
              </div>
            </div>

            <div className="flex flex-col gap-3 w-full">
              <Link
                href="/my-courses"
                className="bg-primary hover:bg-blue-700 text-white font-black py-4 px-8 rounded-2xl shadow-xl shadow-primary/20 hover:shadow-primary/40 transition-all flex items-center justify-center space-x-2 text-xs uppercase tracking-widest cursor-pointer"
              >
                <LayoutGrid className="h-4 w-4" />
                <span>Vào không gian học tập</span>
              </Link>
              <Link
                href="/courses"
                className="bg-secondary hover:bg-secondary/80 text-foreground font-bold py-4 px-8 rounded-2xl border border-border transition-all text-xs cursor-pointer"
              >
                Khám phá thêm khóa học
              </Link>
            </div>

            <div className="flex items-center justify-center space-x-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              <span>Hóa đơn điện tử đã gửi qua Email</span>
            </div>
          </div>
        )}

        {status === "fail" && (
          <div className="relative z-10 w-full max-w-md bg-card/80 border border-border/80 rounded-[2.5rem] p-10 text-center space-y-8 shadow-2xl backdrop-blur-xl flex flex-col items-center animate-in slide-in-from-bottom-8 duration-700">
            <div className="relative mb-2">
                <div className="absolute inset-0 bg-destructive/20 rounded-full blur-xl animate-pulse" />
                <div className="relative bg-destructive text-white p-5 rounded-full shadow-lg shadow-destructive/30 ring-8 ring-destructive/10">
                    <XCircle className="h-10 w-10" />
                </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-3xl font-black text-foreground tracking-tighter">Giao dịch bị từ chối</h2>
              <p className="text-xs font-medium text-muted-foreground px-4">
                Rất tiếc, đã có lỗi xảy ra trong quá trình hệ thống xử lý thanh toán của bạn.
              </p>
            </div>

            {errorMessage && (
              <div className="w-full p-5 rounded-[1.5rem] bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium text-left leading-relaxed">
                <strong className="block mb-1 text-destructive uppercase tracking-widest text-[10px] font-black">Nội dung lỗi báo cáo: </strong>
                {errorMessage}
              </div>
            )}

            <div className="flex flex-col gap-3 w-full">
              <button
                onClick={() => router.push("/checkout")}
                className="bg-primary hover:bg-blue-700 text-white font-black py-4 px-8 rounded-2xl shadow-xl shadow-primary/20 hover:shadow-primary/40 transition-all text-xs uppercase tracking-widest cursor-pointer"
              >
                Thử lại phương thức khác
              </button>
              <Link
                href="/cart"
                className="bg-secondary hover:bg-secondary/80 text-foreground font-bold py-4 px-8 rounded-2xl border border-border transition-all text-xs cursor-pointer"
              >
                Quay về giỏ hàng
              </Link>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </>
  );
}

export default function PaymentResultPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center h-screen bg-background">
        <RefreshCw className="h-10 w-10 text-primary animate-spin" />
      </div>
    }>
      <PaymentResultContent />
    </Suspense>
  );
}
