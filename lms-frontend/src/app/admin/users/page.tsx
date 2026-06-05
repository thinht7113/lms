"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/context/user-context";
import { apiFetch } from "@/lib/api";
import Link from "next/link";

interface UserItem {
  id: number;
  ho_ten: string;
  email: string;
  vai_tro: string;
  trang_thai_hoat_dong: boolean;
  ngay_tao: string;
}

export default function AdminUsersPage() {
  const { role, token, isAuthenticated, user: currentUser } = useUser();
  const router = useRouter();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const loadUsers = async () => {
    if (!token) return;
    setLoading(true);
    try {
      let url = "/admin/users?";
      if (searchTerm) url += `search=${encodeURIComponent(searchTerm)}&`;
      if (filterRole) url += `role=${encodeURIComponent(filterRole)}&`;

      const res = await apiFetch(url, token);
      if (res.ok) {
        setUsers(await res.json());
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    if (role !== "admin") {
      router.push("/");
      return;
    }
    loadUsers();
  }, [token, role, isAuthenticated, router]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadUsers();
  };

  const handleChangeRole = async (userId: number, newRole: string) => {
    if (!token) return;
    if (userId === currentUser?.id) {
      alert("Bạn không thể tự đổi quyền của chính mình!");
      return;
    }

    setActionLoading(userId);
    try {
      const res = await apiFetch(`/admin/users/${userId}/role`, token, {
        method: "PUT",
        body: JSON.stringify({ vai_tro: newRole })
      });
      if (res.ok) {
        setUsers(users.map(u => u.id === userId ? { ...u, vai_tro: newRole } : u));
      } else {
        const err = await res.json();
        alert(err.detail || "Lỗi thay đổi quyền");
      }
    } catch (e) {
      alert("Lỗi kết nối");
    }
    setActionLoading(null);
  };

  const handleToggleStatus = async (userId: number, currentStatus: boolean) => {
    if (!token) return;
    if (userId === currentUser?.id) {
      alert("Bạn không thể tự khóa tài khoản của chính mình!");
      return;
    }

    if (currentStatus && !confirm("Bạn có chắc chắn muốn khóa tài khoản này? Người dùng sẽ không thể đăng nhập.")) {
      return;
    }

    setActionLoading(userId);
    try {
      const res = await apiFetch(`/admin/users/${userId}/status`, token, {
        method: "PUT",
        body: JSON.stringify({ trang_thai_hoat_dong: !currentStatus })
      });
      if (res.ok) {
        setUsers(users.map(u => u.id === userId ? { ...u, trang_thai_hoat_dong: !currentStatus } : u));
      } else {
        const err = await res.json();
        alert(err.detail || "Lỗi cập nhật trạng thái");
      }
    } catch (e) {
      alert("Lỗi kết nối");
    }
    setActionLoading(null);
  };

  const handleResetPassword = async (userId: number) => {
    if (!token) return;
    if (!confirm("Bạn có chắc chắn muốn khôi phục mật khẩu của người này thành một mật khẩu ngẫu nhiên?")) {
      return;
    }

    setActionLoading(userId);
    try {
      const res = await apiFetch(`/admin/users/${userId}/reset-password`, token, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        alert(`Khôi phục mật khẩu thành công!\n\nMật khẩu mới là: ${data.new_password}\n\nVui lòng copy và gửi cho người dùng.`);
      } else {
        const err = await res.json();
        alert(err.detail || "Lỗi khôi phục mật khẩu");
      }
    } catch (e) {
      alert("Lỗi kết nối");
    }
    setActionLoading(null);
  };

  const handleDeleteUser = async (userId: number) => {
    if (!token) return;
    if (userId === currentUser?.id) {
      alert("Bạn không thể tự xóa tài khoản của chính mình!");
      return;
    }
    if (!confirm("CẢNH BÁO: Bạn có chắc chắn muốn XÓA VĨNH VIỄN người dùng này? Hành động này không thể hoàn tác!")) {
      return;
    }

    setActionLoading(userId);
    try {
      const res = await apiFetch(`/admin/users/${userId}`, token, {
        method: "DELETE",
      });
      if (res.ok) {
        setUsers(users.filter(u => u.id !== userId));
        alert("Đã xóa người dùng thành công!");
      } else {
        const err = await res.json();
        alert(err.detail || "Lỗi xóa người dùng");
      }
    } catch (e) {
      alert("Lỗi kết nối");
    }
    setActionLoading(null);
  };

  if (!isAuthenticated || role !== "admin") {
    return null;
  }

  return (
    <div className="animate-slide-up">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-on-surface-variant mb-6">
        <Link href="/admin" className="hover:text-primary transition-colors flex items-center gap-1">
          <i className="ph-fill ph-shield-star"></i> Quản trị
        </Link>
        <i className="ph ph-caret-right text-xs"></i>
        <span className="text-on-surface font-medium">Người dùng</span>
      </nav>
      {/* Filters */}
      <div className="glass-panel p-4 rounded-2xl border border-outline-variant bg-surface">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <i className="ph ph-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg"></i>
            <input
              type="text"
              placeholder="Tìm theo Tên hoặc Email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl py-2.5 pl-12 pr-4 text-sm focus:outline-none focus:border-primary transition-colors"
            />
          </div>
          <div className="w-full sm:w-48">
            <select
              value={filterRole}
              onChange={(e) => {
                setFilterRole(e.target.value);
                // We'll let user press search, or we could trigger loadUsers in useEffect if filterRole changes.
                // Let's just make it simple: they click search. Actually, it's better if it auto-updates.
              }}
              className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:border-primary transition-colors appearance-none relative"
            >
              <option value="">Tất cả vai trò</option>
              <option value="student">Học viên</option>
              <option value="instructor">Giảng viên</option>
              <option value="admin">Quản trị viên</option>
            </select>
          </div>
          <button type="submit" className="px-6 py-2.5 bg-primary text-on-primary font-bold rounded-xl hover:bg-primary/90 transition-colors whitespace-nowrap">
            Tìm kiếm
          </button>
        </form>
      </div>

      {/* Table */}
      <div className="glass-panel border border-outline-variant bg-surface rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant text-xs uppercase text-on-surface-variant font-bold tracking-wider">
                <th className="px-6 py-4">Người dùng</th>
                <th className="px-6 py-4">Vai trò</th>
                <th className="px-6 py-4">Trạng thái</th>
                <th className="px-6 py-4">Ngày đăng ký</th>
                <th className="px-6 py-4 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-on-surface-variant">
                    <i className="ph ph-spinner-gap animate-spin text-3xl text-primary mb-2 inline-block"></i>
                    <p>Đang tải danh sách...</p>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-on-surface-variant">
                    <div className="w-16 h-16 bg-surface-container rounded-full flex items-center justify-center mx-auto mb-3">
                      <i className="ph-fill ph-users text-2xl opacity-50"></i>
                    </div>
                    <p>Không tìm thấy người dùng nào</p>
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-surface-container-lowest transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary-container/30 text-primary flex items-center justify-center font-bold text-sm flex-shrink-0">
                          {u.ho_ten.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-on-surface truncate">{u.ho_ten}</div>
                          <div className="text-xs text-on-surface-variant truncate">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {u.vai_tro === "admin" && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-error-container/20 text-error border border-error/20"><i className="ph-fill ph-shield-star"></i> Admin</span>}
                      {u.vai_tro === "instructor" && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-secondary-container/20 text-secondary border border-secondary/20"><i className="ph-fill ph-chalkboard-teacher"></i> Giảng viên</span>}
                      {u.vai_tro === "student" && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-surface-container text-on-surface-variant border border-outline-variant"><i className="ph-fill ph-student"></i> Học viên</span>}
                    </td>
                    <td className="px-6 py-4">
                      {u.trang_thai_hoat_dong ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-success"><span className="w-1.5 h-1.5 rounded-full bg-success"></span> Hoạt động</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-error"><span className="w-1.5 h-1.5 rounded-full bg-error"></span> Đã khóa</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-on-surface-variant">
                      {new Date(u.ngay_tao).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {actionLoading === u.id ? (
                        <i className="ph ph-spinner-gap animate-spin text-lg text-primary inline-block"></i>
                      ) : u.id === currentUser?.id ? (
                        <span className="text-xs text-on-surface-variant italic">Bạn</span>
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          <select
                            value={u.vai_tro}
                            onChange={(e) => handleChangeRole(u.id, e.target.value)}
                            className="bg-surface-container-lowest border border-outline-variant rounded-lg px-2 py-1.5 text-xs font-medium focus:outline-none focus:border-primary cursor-pointer"
                          >
                            <option value="student">Học viên</option>
                            <option value="instructor">Giảng viên</option>
                            <option value="admin">Admin</option>
                          </select>

                          <button
                            onClick={() => handleToggleStatus(u.id, u.trang_thai_hoat_dong)}
                            className={`p-1.5 rounded-lg border transition-colors ${u.trang_thai_hoat_dong
                              ? "border-outline-variant text-on-surface-variant hover:bg-error-container hover:text-error hover:border-error-container"
                              : "border-success/30 text-success hover:bg-success hover:text-on-success"
                              }`}
                            title={u.trang_thai_hoat_dong ? "Khóa tài khoản" : "Mở khóa tài khoản"}
                          >
                            <i className={`ph-bold text-base ${u.trang_thai_hoat_dong ? "ph-lock-key" : "ph-lock-key-open"}`}></i>
                          </button>

                          <button
                            onClick={() => handleResetPassword(u.id)}
                            className="p-1.5 rounded-lg border border-outline-variant text-on-surface-variant hover:bg-surface-container hover:text-primary transition-colors"
                            title="Tạo lại mật khẩu ngẫu nhiên"
                          >
                            <i className="ph-bold ph-key text-base"></i>
                          </button>

                          <button
                            onClick={() => handleDeleteUser(u.id)}
                            className="p-1.5 rounded-lg border border-error/30 text-error hover:bg-error hover:text-on-error transition-colors"
                            title="Xóa vĩnh viễn"
                          >
                            <i className="ph-bold ph-trash text-base"></i>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
