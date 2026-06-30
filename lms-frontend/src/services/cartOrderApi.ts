// ============================================================
// LuminaLMS Frontend — Cart, Orders & Payments API
// ============================================================

import type { Cart, CartItem, CouponApplyResponse, Order, LuminaPaymentResponse } from "./types";
import { API_BASE_URL, fetchWithAuth } from "./client";

export const cartOrderApi = {
  // Cart
  async getCart(): Promise<Cart> {
    const res = await fetchWithAuth(`${API_BASE_URL}/cart`);
    if (!res.ok) throw new Error("Failed to fetch cart");
    return await res.json();
  },

  async addToCart(courseId: number): Promise<CartItem> {
    const res = await fetchWithAuth(`${API_BASE_URL}/cart/items`, {
      method: "POST",
      body: JSON.stringify({ ma_khoa_hoc: courseId }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || "Không thể thêm vào giỏ hàng");
    }
    return await res.json();
  },

  async removeFromCart(courseId: number): Promise<void> {
    const res = await fetchWithAuth(`${API_BASE_URL}/cart/items/${courseId}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to remove item from cart");
  },

  // Coupons
  async applyCoupon(code: string, originalAmount: number): Promise<CouponApplyResponse> {
    const res = await fetchWithAuth(`${API_BASE_URL}/coupons/apply`, {
      method: "POST",
      body: JSON.stringify({ code, original_amount: originalAmount }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || "Mã giảm giá không hợp lệ");
    }
    return await res.json();
  },

  // Checkout
  async checkout(couponId?: number, paymentMethod = "visa"): Promise<Order> {
    const res = await fetchWithAuth(`${API_BASE_URL}/checkout`, {
      method: "POST",
      body: JSON.stringify({ coupon_id: couponId, payment_method: paymentMethod }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || "Đặt hàng thất bại");
    }
    return await res.json();
  },

  // Orders
  async getMyOrders(): Promise<Order[]> {
    const res = await fetchWithAuth(`${API_BASE_URL}/my-orders`);
    if (!res.ok) throw new Error("Failed to fetch orders");
    return await res.json();
  },

  async requestRefund(orderId: number): Promise<Order> {
    const res = await fetchWithAuth(`${API_BASE_URL}/orders/${orderId}/refund`, {
      method: "POST",
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || "Không thể gửi yêu cầu hoàn tiền");
    }
    return await res.json();
  },

  async cancelRefund(orderId: number): Promise<Order> {
    const res = await fetchWithAuth(`${API_BASE_URL}/orders/${orderId}/cancel-refund`, {
      method: "POST",
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || "Không thể hủy yêu cầu hoàn tiền");
    }
    return await res.json();
  },

  // Mock Payment
  async payMock(orderId: number, paymentMethod = "visa", transactionCode = "TX" + Date.now()): Promise<LuminaPaymentResponse> {
    const res = await fetchWithAuth(`${API_BASE_URL}/payments/mock`, {
      method: "POST",
      body: JSON.stringify({
        ma_don_hang: orderId,
        phuong_thuc_thanh_toan: paymentMethod,
        ma_giao_dich: transactionCode
      }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || "Thanh toán giả lập thất bại");
    }
    return await res.json();
  },
};
