"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import Link from "next/link";

type Category = {
  id: number;
  ten_danh_muc: string;
  mo_ta: string | null;
};

export default function CategoriesAdminPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);

  // Form State
  const [tenDanhMuc, setTenDanhMuc] = useState("");
  const [moTa, setMoTa] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await api.get("/categories");
      setCategories(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleOpenModal = (cat?: Category) => {
    setErrorMsg("");
    if (cat) {
      setEditingCat(cat);
      setTenDanhMuc(cat.ten_danh_muc);
      setMoTa(cat.mo_ta || "");
    } else {
      setEditingCat(null);
      setTenDanhMuc("");
      setMoTa("");
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenDanhMuc.trim()) {
      setErrorMsg("Vui lòng nhập tên danh mục.");
      return;
    }
    try {
      if (editingCat) {
        await api.put(`/admin/categories/${editingCat.id}`, {
          ten_danh_muc: tenDanhMuc,
          mo_ta: moTa || null
        });
      } else {
        await api.post("/categories", {
          ten_danh_muc: tenDanhMuc,
          mo_ta: moTa || null
        });
      }
      setIsModalOpen(false);
      fetchCategories();
    } catch (error: any) {
      setErrorMsg(error.response?.data?.detail || "Đã xảy ra lỗi.");
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa danh mục này? Mọi khóa học thuộc danh mục này sẽ bị mồ côi (không có danh mục).")) return;
    try {
      await api.delete(`/admin/categories/${id}`);
      fetchCategories();
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
        <span className="text-on-surface font-medium">Danh mục</span>
      </nav>

      <div className="flex items-center justify-between mb-8">
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-xl font-bold shadow-md hover:bg-primary/90 transition-colors"
        >
          <i className="ph-bold ph-plus"></i> Thêm danh mục
        </button>
      </div>

      <div className="bg-surface rounded-2xl border border-outline-variant shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-on-surface-variant">Đang tải dữ liệu...</div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-container-lowest border-b border-outline-variant text-on-surface-variant">
              <tr>
                <th className="px-6 py-4 font-bold">ID</th>
                <th className="px-6 py-4 font-bold">Tên Danh mục</th>
                <th className="px-6 py-4 font-bold">Mô tả</th>
                <th className="px-6 py-4 font-bold text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {categories.map((cat) => (
                <tr key={cat.id} className="hover:bg-surface-container-lowest/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-on-surface-variant">#{cat.id}</td>
                  <td className="px-6 py-4 font-bold text-on-surface">{cat.ten_danh_muc}</td>
                  <td className="px-6 py-4 text-on-surface-variant truncate max-w-xs">{cat.mo_ta || "-"}</td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => handleOpenModal(cat)} className="w-8 h-8 rounded-full bg-primary-container text-primary flex items-center justify-center hover:bg-primary hover:text-on-primary transition-colors" title="Sửa">
                        <i className="ph-bold ph-pencil-simple"></i>
                      </button>
                      <button onClick={() => handleDelete(cat.id)} className="w-8 h-8 rounded-full bg-error-container text-error flex items-center justify-center hover:bg-error hover:text-on-error transition-colors" title="Xóa">
                        <i className="ph-bold ph-trash"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {categories.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-on-surface-variant">
                    Chưa có danh mục nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-surface w-full max-w-md rounded-3xl shadow-2xl p-8 transform transition-all">
            <h2 className="text-xl font-bold text-on-surface mb-6">
              {editingCat ? "Cập nhật Danh mục" : "Thêm Danh mục mới"}
            </h2>

            {errorMsg && (
              <div className="mb-4 p-3 bg-error-container text-error rounded-xl text-sm font-medium">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-on-surface mb-2">Tên Danh mục <span className="text-error">*</span></label>
                <input
                  type="text"
                  value={tenDanhMuc}
                  onChange={e => setTenDanhMuc(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-surface-container-lowest border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-on-surface outline-none"
                  placeholder="Ví dụ: Lập trình, Design..."
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-on-surface mb-2">Mô tả</label>
                <textarea
                  value={moTa}
                  onChange={e => setMoTa(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl bg-surface-container-lowest border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-on-surface outline-none resize-none"
                  placeholder="Mô tả về danh mục..."
                ></textarea>
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
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
