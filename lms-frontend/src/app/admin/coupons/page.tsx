"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";

import Link from "next/link";

type Coupon = {
  id: number;
  ma_code: string;
  loai_giam_gia: string;
  gia_tri_giam: number;
  gia_tri_don_toi_thieu: number;
  so_luot_dung_toi_da: number | null;
  so_luot_da_dung: number;
  ngay_het_han: string | null;
};

export default function CouponsAdminPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);

  // Form State
  const [maCode, setMaCode] = useState("");
  const [loaiGiamGia, setLoaiGiamGia] = useState("PERCENTAGE");
  const [giaTriGiam, setGiaTriGiam] = useState<number | "">("");
  const [donToiThieu, setDonToiThieu] = useState<number | "">(0);
  const [luotToiDa, setLuotToiDa] = useState<number | "">("");
  const [ngayHetHan, setNgayHetHan] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const fetchCoupons = async () => {
    try {
      setLoading(true);
      const res = await api.get("/admin/coupons");
      setCoupons(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const handleOpenModal = (coupon?: Coupon) => {
    setErrorMsg("");
    if (coupon) {
      setEditingCoupon(coupon);
      setMaCode(coupon.ma_code);
      setLoaiGiamGia(coupon.loai_giam_gia);
      setGiaTriGiam(coupon.gia_tri_giam);
      setDonToiThieu(coupon.gia_tri_don_toi_thieu);
      setLuotToiDa(coupon.so_luot_dung_toi_da ?? "");
      setNgayHetHan(coupon.ngay_het_han ? coupon.ngay_het_han.split("T")[0] : "");
    } else {
      setEditingCoupon(null);
      setMaCode("");
      setLoaiGiamGia("PERCENTAGE");
      setGiaTriGiam("");
      setDonToiThieu(0);
      setLuotToiDa("");
      setNgayHetHan("");
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!maCode.trim() || giaTriGiam === "") {
      setErrorMsg("Vui lòng nhập đầy đủ Mã code và Giá trị giảm.");
      return;
    }

    const payload = {
      ma_code: maCode.toUpperCase().trim(),
      loai_giam_gia: loaiGiamGia,
      gia_tri_giam: Number(giaTriGiam),
      gia_tri_don_toi_thieu: Number(donToiThieu),
      so_luot_dung_toi_da: luotToiDa !== "" ? Number(luotToiDa) : null,
      ngay_het_han: ngayHetHan ? new Date(ngayHetHan).toISOString() : null
    };

    try {
      if (editingCoupon) {
        await api.put(`/admin/coupons/${editingCoupon.id}`, payload);
      } else {
        await api.post("/admin/coupons", payload);
      }
      setIsModalOpen(false);
      fetchCoupons();
    } catch (error: any) {
      setErrorMsg(error.response?.data?.detail || "Đã xảy ra lỗi.");
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Bạn có chắc chắn muốn vô hiệu hóa/xóa mã giảm giá này?")) return;
    try {
      await api.delete(`/admin/coupons/${id}`);
      fetchCoupons();
    } catch (error: any) {
      alert(error.response?.data?.detail || "Lỗi khi xóa.");
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
        <span className="text-on-surface font-medium">Mã giảm giá</span>
      </nav>
      <div className="flex items-center justify-between">
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-xl font-bold shadow-md hover:bg-primary/90 transition-colors"
        >
          <i className="ph-bold ph-plus"></i> Tạo mã mới
        </button>
      </div>

      <div className="bg-surface rounded-2xl border border-outline-variant shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-on-surface-variant">Đang tải dữ liệu...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-surface-container-lowest border-b border-outline-variant text-on-surface-variant">
                <tr>
                  <th className="px-6 py-4 font-bold">Mã Code</th>
                  <th className="px-6 py-4 font-bold">Giảm giá</th>
                  <th className="px-6 py-4 font-bold">Đơn tối thiểu</th>
                  <th className="px-6 py-4 font-bold">Đã dùng / Tối đa</th>
                  <th className="px-6 py-4 font-bold">Hạn sử dụng</th>
                  <th className="px-6 py-4 font-bold text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {coupons.map((coupon) => {
                  const isExpired = coupon.ngay_het_han && new Date(coupon.ngay_het_han) < new Date();
                  const isExhausted = coupon.so_luot_dung_toi_da && coupon.so_luot_da_dung >= coupon.so_luot_dung_toi_da;
                  const isValid = !isExpired && !isExhausted;

                  return (
                    <tr key={coupon.id} className={`hover:bg-surface-container-lowest/50 transition-colors ${!isValid ? 'opacity-60' : ''}`}>
                      <td className="px-6 py-4">
                        <span className="font-mono font-bold text-primary bg-primary-container/50 px-2 py-1 rounded border border-primary/20">
                          {coupon.ma_code}
                        </span>
                        {!isValid && <span className="ml-2 text-[10px] text-error font-bold border border-error px-1 rounded">HẾT HẠN</span>}
                      </td>
                      <td className="px-6 py-4 font-bold text-on-surface">
                        {coupon.loai_giam_gia === "PERCENTAGE"
                          ? `${coupon.gia_tri_giam}%`
                          : new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(coupon.gia_tri_giam)}
                      </td>
                      <td className="px-6 py-4 text-on-surface-variant font-medium">
                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(coupon.gia_tri_don_toi_thieu)}
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-bold">{coupon.so_luot_da_dung}</span> / {coupon.so_luot_dung_toi_da || "∞"}
                      </td>
                      <td className="px-6 py-4 text-on-surface-variant">
                        {coupon.ngay_het_han ? new Date(coupon.ngay_het_han).toLocaleDateString("vi-VN") : "Vô thời hạn"}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => handleOpenModal(coupon)} className="w-8 h-8 rounded-full bg-primary-container text-primary flex items-center justify-center hover:bg-primary hover:text-on-primary transition-colors" title="Sửa">
                            <i className="ph-bold ph-pencil-simple"></i>
                          </button>
                          <button onClick={() => handleDelete(coupon.id)} className="w-8 h-8 rounded-full bg-error-container text-error flex items-center justify-center hover:bg-error hover:text-on-error transition-colors" title="Xóa">
                            <i className="ph-bold ph-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {coupons.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-on-surface-variant">
                      Chưa có mã giảm giá nào.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-surface w-full max-w-lg rounded-3xl shadow-2xl p-8 transform transition-all max-h-[90vh] overflow-y-auto custom-scrollbar">
            <h2 className="text-xl font-bold text-on-surface mb-6">
              {editingCoupon ? "Cập nhật Mã giảm giá" : "Tạo Mã giảm giá mới"}
            </h2>

            {errorMsg && (
              <div className="mb-4 p-3 bg-error-container text-error rounded-xl text-sm font-medium">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-on-surface mb-2">Mã code <span className="text-error">*</span></label>
                <input
                  type="text"
                  value={maCode}
                  disabled={!!editingCoupon}
                  onChange={e => setMaCode(e.target.value.toUpperCase())}
                  className="w-full px-4 py-3 rounded-xl bg-surface-container-lowest border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-on-surface outline-none font-mono font-bold uppercase disabled:opacity-50"
                  placeholder="Ví dụ: SUMMER2026"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-on-surface mb-2">Loại giảm giá</label>
                  <select
                    value={loaiGiamGia}
                    onChange={e => setLoaiGiamGia(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-surface-container-lowest border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-on-surface outline-none"
                  >
                    <option value="PERCENTAGE">Theo Phần trăm (%)</option>
                    <option value="FIXED_AMOUNT">Trừ thẳng (VNĐ)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-on-surface mb-2">Giá trị giảm <span className="text-error">*</span></label>
                  <input
                    type="number"
                    value={giaTriGiam}
                    onChange={e => setGiaTriGiam(e.target.value ? Number(e.target.value) : "")}
                    className="w-full px-4 py-3 rounded-xl bg-surface-container-lowest border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-on-surface outline-none"
                    placeholder={loaiGiamGia === "PERCENTAGE" ? "Ví dụ: 10" : "Ví dụ: 50000"}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-on-surface mb-2">Điều kiện đơn hàng tối thiểu (VNĐ)</label>
                <input
                  type="number"
                  value={donToiThieu}
                  onChange={e => setDonToiThieu(e.target.value ? Number(e.target.value) : "")}
                  className="w-full px-4 py-3 rounded-xl bg-surface-container-lowest border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-on-surface outline-none"
                  placeholder="Để 0 nếu không có điều kiện"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-on-surface mb-2">Số lượt dùng tối đa</label>
                  <input
                    type="number"
                    value={luotToiDa}
                    onChange={e => setLuotToiDa(e.target.value ? Number(e.target.value) : "")}
                    className="w-full px-4 py-3 rounded-xl bg-surface-container-lowest border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-on-surface outline-none"
                    placeholder="Bỏ trống = Không giới hạn"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-on-surface mb-2">Ngày hết hạn</label>
                  <input
                    type="date"
                    value={ngayHetHan}
                    onChange={e => setNgayHetHan(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-surface-container-lowest border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-on-surface outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-3 rounded-xl bg-surface-container text-on-surface-variant font-bold hover:bg-outline-variant transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 rounded-xl bg-primary text-on-primary font-bold hover:bg-primary/90 transition-colors shadow-md"
                >
                  Lưu Coupon
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
