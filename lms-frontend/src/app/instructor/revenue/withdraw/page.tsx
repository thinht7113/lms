"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CreditCard, Building2, User, Wallet, CheckCircle2, AlertCircle, Clock, Check, XCircle, RefreshCw } from "lucide-react";
import { apiService } from "@/services/api";
import { useToast } from "@/contexts/ToastContext";
import SystemLogo from "@/components/SystemLogo";

export default function WithdrawAtmPage() {
    const router = useRouter();
    const toast = useToast();
    const [stats, setStats] = useState<any>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [amount, setAmount] = useState<string>("");
    const [bankName, setBankName] = useState("");
    const [accountNumber, setAccountNumber] = useState("");
    const [accountName, setAccountName] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const loadData = async () => {
        try {
            const [statsData, historyData] = await Promise.all([
                apiService.getInstructorStudioStats(),
                apiService.getMyPayouts()
            ]);
            setStats(statsData);
            setHistory(historyData);
        } catch (err: any) {
            toast.error("Không thể tải dữ liệu rút tiền");
        }
    };

    useEffect(() => {
        loadData();
    }, [toast]);

    // Calculate available balance considering pending/success payouts
    const totalRevenue = stats?.total_revenue || 0;
    const totalWithdrawn = history
        .filter(p => p.status !== 'rejected')
        .reduce((sum, p) => sum + p.amount, 0);
    const availableBalance = (totalRevenue * 0.7) - totalWithdrawn;

    const handleWithdraw = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const withdrawAmount = parseInt(amount.replace(/\D/g, ''));
        
        if (!withdrawAmount || withdrawAmount < 100000) {
            toast.error("Số tiền rút tối thiểu là 100,000 đ");
            return;
        }
        
        if (withdrawAmount > availableBalance) {
            toast.error("Số dư khả dụng không đủ");
            return;
        }

        setIsSubmitting(true);
        
        try {
            await apiService.requestPayout({
                amount: withdrawAmount,
                bank_name: bankName,
                account_number: accountNumber,
                account_name: accountName
            });

            setIsSuccess(true);
            toast.success("Yêu cầu rút tiền thành công!");
            
            // Tự động quay về sau 3 giây
            setTimeout(() => {
                router.push("/instructor/revenue");
            }, 3000);
        } catch (err: any) {
            toast.error(err.message || "Lỗi khi tạo yêu cầu rút tiền");
            setIsSubmitting(false);
        }
    };

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // Chỉ lấy số
        const rawValue = e.target.value.replace(/\D/g, '');
        if (rawValue) {
            // Định dạng hàng nghìn
            setAmount(parseInt(rawValue).toLocaleString('vi-VN'));
        } else {
            setAmount("");
        }
    };

    if (isSuccess) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="bg-white border border-slate-200 rounded-[3rem] p-10 max-w-md w-full text-center space-y-6 animate-in zoom-in-95 duration-500 shadow-2xl shadow-emerald-900/5">
                    <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                        <CheckCircle2 className="w-12 h-12 text-emerald-600" />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-2xl font-black text-slate-900">Giao dịch thành công</h2>
                        <p className="text-slate-500 text-sm font-medium">Hệ thống đang xử lý chuyển {amount} đ về tài khoản {bankName} của bạn. Vui lòng đợi trong giây lát...</p>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-emerald-500 h-full w-full animate-pulse"></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center py-12 px-4 sm:px-8 font-sans">
            {/* Top Navigation */}
            <div className="w-full max-w-5xl mb-8 flex justify-between items-center">
                <button 
                    onClick={() => router.push('/instructor/revenue')}
                    className="text-slate-500 hover:text-purple-600 flex items-center gap-2 text-sm font-bold tracking-widest uppercase transition-colors bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm"
                >
                    <ArrowLeft className="w-4 h-4" /> Thoát
                </button>
                <SystemLogo textLabel="BANK" textColorClass="text-slate-900" iconColorClass="text-white" iconBgClass="bg-purple-600" />
            </div>

            {/* Main Content */}
            <div className="w-full max-w-5xl space-y-12">
                
                {/* ATM Machine Wrapper */}
                <div className="grid md:grid-cols-2 gap-8 lg:gap-12 items-center bg-white p-8 md:p-12 rounded-[3rem] shadow-sm border border-slate-200">
                    
                    {/* Left: Info & Branding */}
                    <div className="space-y-8">
                        <div>
                            <h1 className="text-4xl lg:text-5xl font-black text-slate-900 tracking-tighter leading-tight">
                                Rút tiền <br/>
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-indigo-600">
                                    siêu tốc.
                                </span>
                            </h1>
                            <p className="text-slate-500 mt-4 font-medium leading-relaxed">
                                Yêu cầu quyết toán doanh thu giảng dạy trực tiếp về tài khoản ngân hàng của bạn chỉ với vài thao tác cơ bản.
                            </p>
                        </div>

                        <div className="bg-purple-50 border border-purple-100 rounded-3xl p-6 shadow-inner relative overflow-hidden group">
                            <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <div className="flex items-center gap-4 relative z-10">
                                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm">
                                    <Wallet className="w-6 h-6 text-purple-600" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-purple-600/70 mb-1">Số dư khả dụng</p>
                                    <p className="text-2xl font-black text-purple-900">{availableBalance.toLocaleString('vi-VN')} đ</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right: ATM Form */}
                    <div className="bg-slate-50 border border-slate-200 rounded-[2.5rem] p-8 shadow-inner relative">
                        <form onSubmit={handleWithdraw} className="relative z-10 space-y-6">
                            
                            {/* Amount Input */}
                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-widest text-slate-500">Số tiền muốn rút (VNĐ)</label>
                                <div className="relative">
                                    <input 
                                        type="text" 
                                        value={amount}
                                        onChange={handleAmountChange}
                                        placeholder="100.000"
                                        className="w-full bg-white border border-slate-200 text-slate-900 rounded-2xl py-4 pl-6 pr-16 text-2xl font-black tracking-wider focus:outline-none focus:border-purple-400 focus:ring-4 focus:ring-purple-400/10 transition-all placeholder:text-slate-300 shadow-sm"
                                        required
                                    />
                                    <span className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 font-black">đ</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-600 mt-2">
                                    <AlertCircle className="w-3 h-3" /> Tối thiểu 100,000 đ
                                </div>
                            </div>

                            <div className="h-px w-full bg-slate-200 my-4"></div>

                            {/* Bank Info */}
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                        <Building2 className="w-3 h-3 text-slate-400" /> Ngân hàng thụ hưởng
                                    </label>
                                    <input 
                                        type="text" 
                                        value={bankName}
                                        onChange={(e) => setBankName(e.target.value)}
                                        placeholder="VD: Vietcombank, Techcombank..."
                                        className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 transition-all placeholder:text-slate-400 shadow-sm"
                                        required
                                    />
                                </div>
                                
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                        <CreditCard className="w-3 h-3 text-slate-400" /> Số tài khoản
                                    </label>
                                    <input 
                                        type="text" 
                                        value={accountNumber}
                                        onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))}
                                        placeholder="Nhập số tài khoản..."
                                        className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl px-4 py-3 text-sm font-bold tracking-widest focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 transition-all placeholder:text-slate-400 shadow-sm"
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                        <User className="w-3 h-3 text-slate-400" /> Tên chủ tài khoản
                                    </label>
                                    <input 
                                        type="text" 
                                        value={accountName}
                                        onChange={(e) => setAccountName(e.target.value.toUpperCase())}
                                        placeholder="NGUYEN VAN A"
                                        className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl px-4 py-3 text-sm font-bold uppercase focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 transition-all placeholder:text-slate-400 shadow-sm"
                                        required
                                    />
                                </div>
                            </div>

                            <button 
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full bg-purple-600 hover:bg-purple-700 text-white py-4 rounded-xl font-black uppercase tracking-widest text-sm transition-colors shadow-lg shadow-purple-600/30 disabled:opacity-50 mt-4 flex justify-center items-center gap-2"
                            >
                                {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                                {isSubmitting ? "Đang xử lý..." : "Xác nhận rút tiền"}
                            </button>
                        </form>
                    </div>
                </div>

                {/* Withdrawal History Section */}
                <div className="bg-white p-8 md:p-12 rounded-[3rem] shadow-sm border border-slate-200">
                    <h3 className="text-xl font-black text-slate-900 mb-8 flex items-center gap-3">
                        <Clock className="w-6 h-6 text-purple-600" />
                        Lịch sử rút tiền
                    </h3>
                    
                    {history.length === 0 ? (
                        <div className="py-12 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                            <Clock className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            <p className="text-sm font-medium">Bạn chưa thực hiện giao dịch rút tiền nào.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-100">
                                        <th className="pb-4 font-black uppercase tracking-widest text-[10px] text-slate-400">Mã giao dịch</th>
                                        <th className="pb-4 font-black uppercase tracking-widest text-[10px] text-slate-400">Thời gian</th>
                                        <th className="pb-4 font-black uppercase tracking-widest text-[10px] text-slate-400">Số tiền (VNĐ)</th>
                                        <th className="pb-4 font-black uppercase tracking-widest text-[10px] text-slate-400">Ngân hàng</th>
                                        <th className="pb-4 font-black uppercase tracking-widest text-[10px] text-slate-400 text-right">Trạng thái</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {history.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="py-4 font-bold text-sm text-slate-700">{item.id}</td>
                                            <td className="py-4 text-xs font-medium text-slate-500">
                                                {new Date(item.date).toLocaleDateString('vi-VN')} <br/>
                                                <span className="text-[10px]">{new Date(item.date).toLocaleTimeString('vi-VN')}</span>
                                            </td>
                                            <td className="py-4 font-black text-sm text-slate-900">
                                                {item.amount.toLocaleString('vi-VN')} đ
                                            </td>
                                            <td className="py-4 text-sm font-bold text-slate-600">
                                                {item.bank} <br/>
                                                <span className="text-[10px] text-slate-400">{item.account_number}</span>
                                            </td>
                                            <td className="py-4 text-right">
                                                {item.status === 'success' ? (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-100">
                                                        <Check className="w-3.5 h-3.5" /> Thành công
                                                    </span>
                                                ) : item.status === 'pending' ? (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-bold border border-amber-100">
                                                        <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Đang xử lý
                                                    </span>
                                                ) : (
                                                    <div className="flex flex-col items-end gap-1">
                                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-700 text-xs font-bold border border-rose-100">
                                                            <XCircle className="w-3.5 h-3.5" /> Bị từ chối
                                                        </span>
                                                        {item.reason && <span className="text-[10px] text-rose-500 font-medium">{item.reason}</span>}
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
