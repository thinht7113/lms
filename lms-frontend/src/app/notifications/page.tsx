"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Inbox, RefreshCw, CheckCircle2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { apiService, Notification, tokenHelper } from "@/services/api";
import { useToast } from "@/contexts/ToastContext";

export default function NotificationsPage() {
  const router = useRouter();
  const toast = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadNotifications() {
    setLoading(true);
    try {
      const data = await apiService.getNotifications();
      setNotifications(data);
    } catch (err: any) {
      toast.error("Không thể tải danh sách thông báo");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!tokenHelper.getToken()) {
      router.push("/login");
      return;
    }
    loadNotifications();
  }, [router]);

  const handleMarkAsRead = async (id: number) => {
    try {
      const updated = await apiService.markNotificationAsRead(id);
      setNotifications((prev) => prev.map((item) => (item.id === id ? updated : item)));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllAsRead = async () => {
    const unreadNotifications = notifications.filter((n) => !n.da_doc);
    if (unreadNotifications.length === 0) return;

    try {
      await Promise.all(unreadNotifications.map((n) => apiService.markNotificationAsRead(n.id)));
      setNotifications((prev) => prev.map((item) => ({ ...item, da_doc: true })));
      toast.success("Đã đánh dấu tất cả là đã đọc");
    } catch (err) {
      toast.error("Không thể cập nhật trạng thái thông báo");
    }
  };

  const unreadCount = notifications.filter((n) => !n.da_doc).length;

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[#F8F9FA] pt-32 pb-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-600">Thông báo</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Thông báo của tôi</h1>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
              >
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                Đánh dấu tất cả đã đọc ({unreadCount})
              </button>
            )}
          </div>

          <div className="rounded-[2.5rem] border border-slate-200/60 bg-white p-4 shadow-sm">
            {loading ? (
              <div className="flex h-60 items-center justify-center">
                <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
                <div className="rounded-[2rem] bg-slate-50 p-6 border border-slate-100">
                  <Inbox className="h-12 w-12 text-slate-300" />
                </div>
                <h3 className="mt-6 text-xl font-black text-slate-950">Không có thông báo nào</h3>
                <p className="mt-2 text-sm text-slate-500 max-w-sm">
                  Bạn sẽ nhận được thông báo ở đây khi có các cập nhật mới về tiến trình học tập hoặc trạng thái đơn hàng của bạn.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {notifications.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => !item.da_doc && handleMarkAsRead(item.id)}
                    className={`flex gap-4 p-5 rounded-2xl transition-all duration-200 cursor-pointer ${
                      item.da_doc
                        ? "bg-transparent hover:bg-slate-50/50"
                        : "bg-blue-50/40 border-l-4 border-blue-500 pl-4 hover:bg-blue-50/60"
                    }`}
                  >
                    <div className={`mt-1 rounded-xl p-3 h-fit ${
                      item.da_doc ? "bg-slate-100 text-slate-500" : "bg-blue-100/80 text-blue-600"
                    }`}>
                      <Bell className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-4">
                        <h3 className={`font-black tracking-tight ${item.da_doc ? "text-slate-700 font-bold" : "text-slate-950"}`}>
                          {item.tieu_de}
                        </h3>
                        <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap">
                          {new Date(item.ngay_tao).toLocaleString("vi-VN", {
                            hour: "2-digit",
                            minute: "2-digit",
                            day: "2-digit",
                            month: "2-digit",
                          })}
                        </span>
                      </div>
                      <p className="mt-1 text-sm leading-relaxed text-slate-500 pr-4">{item.noi_dung}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
