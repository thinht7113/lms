"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
interface Banner {
  id: number;
  hinh_anh_url: string;
  tieu_de: string | null;
  duong_dan: string | null;
  trang_thai: boolean;
  thu_tu: number;
}

export default function AdminBannersPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [formData, setFormData] = useState({
    hinh_anh_url: "",
    tieu_de: "",
    duong_dan: "",
    trang_thai: true,
    thu_tu: 0
  });

  const loadBanners = async () => {
    setLoading(true);
    try {
      const res = await api.get("/banners/admin");
      setBanners(res.data);
    } catch (e) {
      alert("Lỗi kết nối");
    }
    setLoading(false);
  };

  useEffect(() => {
    loadBanners();
  }, []);

  const openModal = (banner?: Banner) => {
    if (banner) {
      setEditingBanner(banner);
      setFormData({
        hinh_anh_url: banner.hinh_anh_url,
        tieu_de: banner.tieu_de || "",
        duong_dan: banner.duong_dan || "",
        trang_thai: banner.trang_thai,
        thu_tu: banner.thu_tu
      });
    } else {
      setEditingBanner(null);
      setFormData({
        hinh_anh_url: "",
        tieu_de: "",
        duong_dan: "",
        trang_thai: true,
        thu_tu: banners.length
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.hinh_anh_url) {
      alert("Vui lòng nhập link hình ảnh");
      return;
    }

    try {
      const payload = {
        ...formData,
        tieu_de: formData.tieu_de || null,
        duong_dan: formData.duong_dan || null
      };

      const url = editingBanner ? `/banners/${editingBanner.id}` : "/banners";

      if (editingBanner) {
        await api.put(url, payload);
      } else {
        await api.post(url, payload);
      }

      alert(editingBanner ? "Cập nhật thành công!" : "Đã thêm banner mới!");
      setShowModal(false);
      loadBanners();
    } catch (e) {
      alert("Lỗi hệ thống hoặc cập nhật thất bại");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Bạn có chắc chắn muốn xóa banner này?")) return;
    try {
      await api.delete(`/banners/${id}`);
      alert("Đã xóa banner");
      loadBanners();
    } catch (e) {
      alert("Lỗi hệ thống hoặc xóa thất bại");
    }
  };

  return (
    <div className="p-6 md:p-8 animate-slide-up">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-on-surface mb-2">Quản lý Banner</h1>
          <p className="text-on-surface-variant font-medium">Thay đổi hình ảnh slide trên trang chủ</p>
        </div>
        <button 
          onClick={() => openModal()}
          className="bg-primary hover:bg-primary-600 text-white px-5 py-2.5 rounded-xl font-bold transition-colors flex items-center gap-2"
        >
          <i className="ph-bold ph-plus"></i> Thêm banner mới
        </button>
      </div>

      <div className="glass-panel rounded-3xl border border-outline-variant/60 overflow-hidden bg-surface">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-highest border-b border-outline-variant/60">
                <th className="p-4 font-bold text-on-surface-variant">Thứ tự</th>
                <th className="p-4 font-bold text-on-surface-variant">Hình ảnh</th>
                <th className="p-4 font-bold text-on-surface-variant">Tiêu đề / Link</th>
                <th className="p-4 font-bold text-on-surface-variant text-center">Trạng thái</th>
                <th className="p-4 font-bold text-on-surface-variant text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-on-surface-variant">Đang tải...</td>
                </tr>
              ) : banners.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-on-surface-variant">Chưa có banner nào</td>
                </tr>
              ) : (
                banners.map((banner) => (
                  <tr key={banner.id} className="border-b border-outline-variant/30 hover:bg-surface-container/50 transition-colors">
                    <td className="p-4 font-bold text-on-surface">{banner.thu_tu}</td>
                    <td className="p-4">
                      <div className="w-32 h-16 rounded-lg overflow-hidden border border-outline-variant/50 bg-surface-container">
                        <img src={banner.hinh_anh_url} alt="Banner" className="w-full h-full object-cover" />
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-on-surface">{banner.tieu_de || <span className="text-on-surface-variant/50 italic">Không có</span>}</div>
                      <div className="text-sm text-primary truncate max-w-xs">{banner.duong_dan || ""}</div>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider ${banner.trang_thai ? "bg-success/10 text-success" : "bg-surface-container-highest text-on-surface-variant"}`}>
                        {banner.trang_thai ? "Hiển thị" : "Đã ẩn"}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button onClick={() => openModal(banner)} className="p-2 text-info hover:bg-info/10 rounded-lg transition-colors mr-2">
                        <i className="ph-bold ph-pencil-simple text-lg"></i>
                      </button>
                      <button onClick={() => handleDelete(banner.id)} className="p-2 text-error hover:bg-error/10 rounded-lg transition-colors">
                        <i className="ph-bold ph-trash text-lg"></i>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary/20 backdrop-blur-sm" onClick={(e) => { if(e.target===e.currentTarget) setShowModal(false); }}>
          <div className="bg-surface rounded-3xl p-6 md:p-8 w-full max-w-xl shadow-2xl animate-slide-up border border-outline-variant">
            <h2 className="text-2xl font-black mb-6">{editingBanner ? "Chỉnh sửa Banner" : "Thêm Banner mới"}</h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-on-surface mb-1.5">Link Hình Ảnh *</label>
                <input 
                  type="text" 
                  required
                  className="w-full px-4 py-3 rounded-xl border border-outline-variant bg-surface focus:border-primary outline-none transition-all" 
                  value={formData.hinh_anh_url} 
                  onChange={(e) => setFormData({...formData, hinh_anh_url: e.target.value})}
                  placeholder="https://example.com/image.jpg"
                />
                {formData.hinh_anh_url && (
                    <div className="mt-3 w-full h-32 rounded-xl overflow-hidden border border-outline-variant bg-surface-container">
                        <img src={formData.hinh_anh_url} alt="Preview" className="w-full h-full object-cover" onError={(e) => (e.currentTarget.src = 'https://placehold.co/800x300?text=Invalid+Image')} />
                    </div>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-bold text-on-surface mb-1.5">Tiêu đề (Tùy chọn)</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-3 rounded-xl border border-outline-variant bg-surface focus:border-primary outline-none transition-all" 
                  value={formData.tieu_de} 
                  onChange={(e) => setFormData({...formData, tieu_de: e.target.value})}
                  placeholder="Chú thích ảnh..."
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-on-surface mb-1.5">Đường dẫn khi Click (Tùy chọn)</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-3 rounded-xl border border-outline-variant bg-surface focus:border-primary outline-none transition-all" 
                  value={formData.duong_dan} 
                  onChange={(e) => setFormData({...formData, duong_dan: e.target.value})}
                  placeholder="/courses/123"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-sm font-bold text-on-surface mb-1.5">Thứ tự hiển thị</label>
                  <input 
                    type="number" 
                    className="w-full px-4 py-3 rounded-xl border border-outline-variant bg-surface focus:border-primary outline-none transition-all" 
                    value={formData.thu_tu} 
                    onChange={(e) => setFormData({...formData, thu_tu: parseInt(e.target.value) || 0})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-on-surface mb-1.5">Trạng thái</label>
                  <label className="flex items-center gap-3 mt-3 cursor-pointer">
                    <input 
                        type="checkbox" 
                        checked={formData.trang_thai} 
                        onChange={(e) => setFormData({...formData, trang_thai: e.target.checked})}
                        className="w-5 h-5 accent-primary cursor-pointer"
                    />
                    <span className="font-medium text-on-surface">Hiển thị trên Trang chủ</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-3 justify-end mt-8 pt-4 border-t border-outline-variant/30">
                <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 rounded-xl font-bold hover:bg-surface-container transition-colors text-on-surface-variant">Hủy</button>
                <button type="submit" className="px-5 py-2.5 rounded-xl font-bold bg-primary hover:bg-primary-600 text-white transition-colors shadow-md shadow-primary/20">Lưu lại</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
