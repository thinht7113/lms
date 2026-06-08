"use client";

import React, { useState, useEffect } from "react";
import { Search, RefreshCw, Mail, Calendar, BookOpen } from "lucide-react";
import { apiService } from "@/services/api";
import { useToast } from "@/contexts/ToastContext";

export default function InstructorStudentsPage() {
    const toast = useToast();
    const [students, setStudents] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        const fetchStudents = async () => {
            try {
                const data = await apiService.getInstructorStudioStudents();
                setStudents(data);
            } catch (err: any) {
                toast.error(err.message || "Không thể tải danh sách học viên");
            } finally {
                setIsLoading(false);
            }
        };
        fetchStudents();
    }, []);

    const filteredStudents = students.filter(s => 
        s.ho_ten.toLowerCase().includes(searchTerm.toLowerCase()) || 
        s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.course_title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <RefreshCw className="w-8 h-8 animate-spin text-purple-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">Học viên của tôi</h1>
                    <p className="text-sm font-medium text-slate-500">Quản lý và theo dõi những người đang học khóa học của bạn.</p>
                </div>
                <div className="relative w-full sm:w-80">
                    <input 
                        type="text"
                        placeholder="Tìm học viên hoặc khóa học..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all"
                    />
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Học viên</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Khóa học</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Ngày đăng ký</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Liên hệ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredStudents.length > 0 ? (
                                filteredStudents.map((s, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full overflow-hidden bg-purple-100 border border-purple-200">
                                                    <img 
                                                        src={s.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${s.ho_ten}`} 
                                                        alt={s.ho_ten} 
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900 text-sm">{s.ho_ten}</p>
                                                    <p className="text-xs text-slate-500">ID: {s.student_id}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-slate-700">
                                                <BookOpen className="w-3.5 h-3.5 text-purple-500" />
                                                <span className="text-sm font-medium">{s.course_title}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-slate-500">
                                                <Calendar className="w-3.5 h-3.5" />
                                                <span className="text-xs">{new Date(s.ngay_dang_ky).toLocaleDateString('vi-VN')}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <a 
                                                href={`mailto:${s.email}`} 
                                                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-purple-600 hover:text-white transition-all text-xs font-bold"
                                            >
                                                <Mail className="w-3.5 h-3.5" />
                                                <span>Gửi Email</span>
                                            </a>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                                        <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                        <p className="text-sm font-medium">Không tìm thấy học viên nào</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

import { Users } from "lucide-react";
