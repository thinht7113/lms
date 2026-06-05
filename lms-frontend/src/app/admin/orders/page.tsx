"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import Link from "next/link";

type OrderItem = {
  id: number;
  ma_khoa_hoc: number;
  gia_luc_mua: number;
};

type Order = {
  id: number;
  ma_nguoi_dung: number | null;
  ma_giam_gia_id: number | null;
  tong_tien: number;
  trang_thai: string;
  ngay_tao: string;
  chi_tiet_don_hang: OrderItem[];
};

export default function OrdersAdminPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // Custom Notifications & Modals state
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    orderId: number | null;
    action: "approve" | "reject" | null;
  }>({ show: false, orderId: null, action: null });

  const showNotification = (message: string, type: "success" | "error" = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4500);
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await api.get("/admin/orders");
      setOrders(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleActionClick = (orderId: number, action: "approve" | "reject") => {
    setConfirmModal({ show: true, orderId, action });
  };

  const handleConfirmAction = async () => {
    const { orderId, action } = confirmModal;
    if (!orderId || !action) return;
    setConfirmModal({ show: false, orderId: null, action: null });
    try {
      const endpoint = action === "approve" ? "approve-refund" : "reject-refund";
      const res = await api.post(`/admin/orders/${orderId}/${endpoint}`, {});
      if (res && res.data) {
        showNotification(
          action === "approve" ? "Đã phê duyệt hoàn tiền thành công!" : "Đã từ chối yêu cầu hoàn tiền!",
          "success"
        );
        fetchOrders();
      }
    } catch (error: any) {
      showNotification(error.response?.data?.detail || "Lỗi khi thực hiện thao tác.", "error");
    }
  };

  return (
    <div className="animate-slide-up space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-on-surface-variant mb-6">
        <Link href="/admin" className="hover:text-primary transition-colors flex items-center gap-1">
          <i className="ph-fill ph-shield-star"></i> Quản trị
        </Link>
        <i className="ph ph-caret-right text-xs"></i>
        <span className="text-on-surface font-medium">Đơn hàng</span>
      </nav>

      <div className="bg-surface rounded-2xl border border-outline-variant shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-on-surface-variant">Đang tải dữ liệu...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-surface-container-lowest border-b border-outline-variant text-on-surface-variant">
                <tr>
                  <th className="px-6 py-4 font-bold">Mã Hóa đơn</th>
                  <th className="px-6 py-4 font-bold">Mã Học viên</th>
                  <th className="px-6 py-4 font-bold">Số lượng KH</th>
                  <th className="px-6 py-4 font-bold">Mã giảm giá (ID)</th>
                  <th className="px-6 py-4 font-bold">Tổng tiền</th>
                  <th className="px-6 py-4 font-bold">Trạng thái</th>
                  <th className="px-6 py-4 font-bold">Ngày tạo</th>
                  <th className="px-6 py-4 font-bold">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-surface-container-lowest/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-on-surface">#{order.id}</td>
                    <td className="px-6 py-4 font-medium text-on-surface-variant">
                      {order.ma_nguoi_dung ? `User #${order.ma_nguoi_dung}` : "Khách"}
                    </td>
                    <td className="px-6 py-4 font-medium text-on-surface-variant">
                      {order.chi_tiet_don_hang.length} khóa
                    </td>
                    <td className="px-6 py-4 font-medium text-on-surface-variant">
                      {order.ma_giam_gia_id ? `#${order.ma_giam_gia_id}` : "-"}
                    </td>
                    <td className="px-6 py-4 text-primary font-bold">
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(order.tong_tien)}
                    </td>
                    <td className="px-6 py-4">
                      {order.trang_thai === "success" ? (
                        <span className="bg-success-container/30 text-success px-3 py-1 rounded-full text-xs font-bold border border-success/20">
                          Thành công
                        </span>
                      ) : order.trang_thai === "refunded" ? (
                        <span className="bg-surface-container-high/60 text-on-surface-variant/80 px-3 py-1 rounded-full text-xs font-bold border border-outline-variant/30">
                          Đã hoàn tiền
                        </span>
                      ) : order.trang_thai === "refund_requested" ? (
                        <span className="bg-amber-500/10 text-amber-600 px-3 py-1 rounded-full text-xs font-bold border border-amber-500/30">
                          Chờ hoàn tiền
                        </span>
                      ) : order.trang_thai === "pending" ? (
                        <span className="bg-warning-container/30 text-warning px-3 py-1 rounded-full text-xs font-bold border border-warning/20">
                          Chờ thanh toán
                        </span>
                      ) : (
                        <span className="bg-error-container/30 text-error px-3 py-1 rounded-full text-xs font-bold border border-error/20">
                          Thất bại
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-on-surface-variant text-xs">
                      {new Date(order.ngay_tao).toLocaleString("vi-VN")}
                    </td>
                    <td className="px-6 py-4">
                      {order.trang_thai === "refund_requested" ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleActionClick(order.id, "approve")}
                            className="bg-success/10 text-success border border-success/30 hover:bg-success hover:text-on-success text-xs font-bold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 shadow-sm"
                          >
                            <i className="ph ph-check-circle"></i> Duyệt
                          </button>
                          <button
                            onClick={() => handleActionClick(order.id, "reject")}
                            className="bg-error/10 text-error border border-error/30 hover:bg-error hover:text-on-error text-xs font-bold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 shadow-sm"
                          >
                            <i className="ph ph-x-circle"></i> Từ chối
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-on-surface-variant/50 font-medium">-</span>
                      )}
                    </td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-on-surface-variant">
                      Chưa có đơn hàng nào.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirm Modal */}
      {confirmModal.show && confirmModal.orderId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 animate-fade-in">
          <div className="bg-surface p-8 rounded-3xl border border-outline-variant/60 shadow-2xl w-full max-w-md animate-scale-up text-on-surface">
            <div className="text-center mb-6">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl ${
                confirmModal.action === "approve" 
                  ? "bg-success/10 text-success border border-success/20" 
                  : "bg-error/10 text-error border border-error/20"
              }`}>
                <i className={`ph-fill ${confirmModal.action === "approve" ? "ph-check-circle" : "ph-warning-circle"}`}></i>
              </div>
              <h3 className="text-xl font-bold">
                {confirmModal.action === "approve" ? "Phê duyệt hoàn tiền" : "Từ chối hoàn tiền"}
              </h3>
              <p className="text-sm text-on-surface-variant mt-2 leading-relaxed">
                {confirmModal.action === "approve" 
                  ? `Bạn có chắc chắn muốn DUYỆT yêu cầu hoàn tiền cho đơn hàng #${confirmModal.orderId}? Thao tác này sẽ hủy quyền học tập của học viên.`
                  : `Bạn có chắc chắn muốn TỪ CHỐI yêu cầu hoàn tiền cho đơn hàng #${confirmModal.orderId}? Trạng thái sẽ khôi phục về thành công.`
                }
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setConfirmModal({ show: false, orderId: null, action: null })}
                className="px-5 py-2.5 rounded-xl font-bold text-on-surface-variant hover:bg-surface-container transition-colors"
              >
                Hủy
              </button>
              <button 
                onClick={handleConfirmAction}
                className={`px-6 py-2.5 rounded-xl font-bold text-white transition-colors shadow-sm ${
                  confirmModal.action === "approve" ? "bg-success hover:bg-success/90" : "bg-error hover:bg-error/90"
                }`}
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification Banner */}
      {notification && (
        <div className={`fixed bottom-8 right-8 z-[200] px-6 py-4 rounded-2xl shadow-2xl border flex items-center gap-3 animate-slide-up ${
          notification.type === "success" 
            ? "bg-success/10 border-success/30 text-success" 
            : "bg-error/10 border-error/30 text-error"
        }`}>
          <i className={`ph-fill ${notification.type === "success" ? "ph-check-circle" : "ph-warning-circle"} text-xl`}></i>
          <span className="font-bold text-sm">{notification.message}</span>
          <button onClick={() => setNotification(null)} className="ml-2 hover:opacity-80">
            <i className="ph-bold ph-x text-xs"></i>
          </button>
        </div>
      )}
    </div>
  );
}
