import React from "react";
import Link from "next/link";
import { Mail, Phone, MapPin, LayoutGrid } from "lucide-react";
import SystemLogo from "@/components/SystemLogo";

export default function Footer() {
  return (
    <footer className="bg-card border-t border-border mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12">
          {/* Logo & Description */}
          <div className="md:col-span-4 space-y-6">
            <Link href="/">
              <SystemLogo />
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed font-medium">
              Nền tảng đào tạo trực tuyến hiện đại bậc nhất, giúp học viên trang bị kỹ năng chuyên nghiệp vững bước vào tương lai số.
            </p>
            <div className="flex space-x-3">
              <a href="https://www.facebook.com/" target="_blank" rel="noreferrer" className="p-2.5 bg-secondary text-muted-foreground hover:bg-primary hover:text-white rounded-xl transition-all" aria-label="Facebook">
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                  <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c4.56-.93 8-4.96 8-9.75z" />
                </svg>
              </a>
              <a href="https://x.com/" target="_blank" rel="noreferrer" className="p-2.5 bg-secondary text-muted-foreground hover:bg-primary hover:text-white rounded-xl transition-all" aria-label="Twitter">
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              <a href="https://www.linkedin.com/" target="_blank" rel="noreferrer" className="p-2.5 bg-secondary text-muted-foreground hover:bg-primary hover:text-white rounded-xl transition-all" aria-label="LinkedIn">
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.779-1.75-1.75s.784-1.75 1.75-1.75 1.75.779 1.75 1.75-.784 1.75-1.75 1.75zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                </svg>
              </a>
              <a href="https://www.youtube.com/" target="_blank" rel="noreferrer" className="p-2.5 bg-secondary text-muted-foreground hover:bg-primary hover:text-white rounded-xl transition-all" aria-label="YouTube">
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                  <path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.11C19.518 3.545 12 3.545 12 3.545s-7.518 0-9.388.507a3.003 3.003 0 0 0-2.11 2.11C0 8.033 0 12 0 12s0 3.967.502 5.837a3.003 3.003 0 0 0 2.11 2.11c1.87.507 9.388.507 9.388.507s7.518 0 9.388-.507a3.003 3.003 0 0 0 2.11-2.11C24 15.967 24 12 24 12s0-3.967-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="md:col-span-2">
            <h3 className="text-xs font-black text-foreground tracking-widest uppercase mb-5">
              Khám phá
            </h3>
            <ul className="space-y-3">
              <li>
                <Link href="/courses" className="text-sm text-muted-foreground font-medium hover:text-primary transition-colors">
                  Tất cả khóa học
                </Link>
              </li>
              <li>
                <Link href="/courses?level=beginner" className="text-sm text-muted-foreground font-medium hover:text-primary transition-colors">
                  Dành cho người mới
                </Link>
              </li>
              <li>
                <Link href="/instructors" className="text-sm text-muted-foreground font-medium hover:text-primary transition-colors">
                  Đội ngũ giảng viên
                </Link>
              </li>
            </ul>
          </div>

          {/* Student Hub */}
          <div className="md:col-span-3">
            <h3 className="text-xs font-black text-foreground tracking-widest uppercase mb-5">
              Học viên & Chính sách
            </h3>
            <ul className="space-y-3">
              <li>
                <Link href="/my-courses" className="text-sm text-muted-foreground font-medium hover:text-primary transition-colors">
                  Phòng học của tôi
                </Link>
              </li>
              <li>
                <Link href="/cart" className="text-sm text-muted-foreground font-medium hover:text-primary transition-colors">
                  Giỏ hàng & Thanh toán
                </Link>
              </li>
              <li>
                <Link href="/certificates" className="text-sm text-muted-foreground font-medium hover:text-primary transition-colors">
                  Chứng chỉ của tôi
                </Link>
              </li>
              <li>
                <Link href="/verify-certificate" className="text-sm text-muted-foreground font-medium hover:text-primary transition-colors">
                  Xác minh chứng chỉ công khai
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-sm text-muted-foreground font-medium hover:text-primary transition-colors">
                  Điều khoản giao dịch
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Details */}
          <div className="md:col-span-3 space-y-4">
            <h3 className="text-xs font-black text-foreground tracking-widest uppercase mb-5">
              Kết nối
            </h3>
            <div className="flex items-start space-x-3 text-sm font-medium text-muted-foreground">
              <MapPin className="h-5 w-5 text-primary shrink-0" />
              <span>Lumina Tower, Khu Công nghệ cao, Quận 9, TP.HCM</span>
            </div>
            <div className="flex items-center space-x-3 text-sm font-medium text-muted-foreground">
              <Phone className="h-5 w-5 text-primary shrink-0" />
              <span>+84 1900 8888</span>
            </div>
            <div className="flex items-center space-x-3 text-sm font-medium text-muted-foreground">
              <Mail className="h-5 w-5 text-primary shrink-0" />
              <span>hello@luminalms.vn</span>
            </div>
          </div>
        </div>

        <div className="border-t border-border mt-12 pt-8 flex flex-col sm:flex-row justify-between items-center text-xs font-bold text-muted-foreground uppercase tracking-widest">
          <p>© 2026 LUMINA LMS. ALL RIGHTS RESERVED.</p>
          <div className="flex space-x-6 mt-4 sm:mt-0">
            <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500" /> Hệ thống hoạt động bình thường</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
