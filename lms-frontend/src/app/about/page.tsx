"use client";

import React from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Compass,
  GraduationCap,
  Layers,
  Lightbulb,
  LineChart,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  Users
} from "lucide-react";

const stats = [
  { value: "25K+", label: "Học viên đang học", tone: "text-blue-600" },
  { value: "500+", label: "Bài học thực chiến", tone: "text-emerald-600" },
  { value: "120+", label: "Giảng viên đồng hành", tone: "text-amber-600" },
  { value: "4.9/5", label: "Mức độ hài lòng", tone: "text-rose-600" }
];

const values = [
  {
    icon: BookOpen,
    title: "Học để làm được",
    description: "Mỗi bài học được thiết kế quanh tình huống thực tế, giúp học viên hiểu nhanh và áp dụng ngay vào dự án."
  },
  {
    icon: Users,
    title: "Đồng hành rõ ràng",
    description: "Lumina kết nối học viên, giảng viên và lộ trình học trong một trải nghiệm liền mạch, dễ theo dõi."
  },
  {
    icon: ShieldCheck,
    title: "Tin cậy và minh bạch",
    description: "Tiến độ học, chứng chỉ, thanh toán và dữ liệu cá nhân được tổ chức minh bạch, an toàn và dễ kiểm chứng."
  }
];

const learningSteps = [
  {
    icon: Compass,
    title: "Chọn đúng lộ trình",
    description: "Học viên bắt đầu từ mục tiêu nghề nghiệp, trình độ hiện tại và thời gian có thể đầu tư."
  },
  {
    icon: Layers,
    title: "Học theo từng lớp kỹ năng",
    description: "Nội dung được chia thành chương, bài, quiz và tiến độ rõ ràng để không bị lạc trong quá trình học."
  },
  {
    icon: MessageCircle,
    title: "Nhận phản hồi liên tục",
    description: "Giảng viên, cộng đồng và dữ liệu tiến độ giúp học viên điều chỉnh cách học trước khi mất động lực."
  },
  {
    icon: Trophy,
    title: "Hoàn thành có chứng nhận",
    description: "Khi hoàn thành khóa học, chứng chỉ số có thể xác minh công khai và dùng trong hồ sơ nghề nghiệp."
  }
];

const timeline = [
  { year: "2024", title: "Khởi tạo nền tảng", text: "Xây dựng hệ thống khóa học, giỏ hàng, thanh toán và quản trị nội dung." },
  { year: "2025", title: "Mở rộng trải nghiệm học", text: "Bổ sung tiến độ học, quiz, chứng chỉ số và dashboard cá nhân." },
  { year: "2026", title: "Tập trung vào chất lượng", text: "Tối ưu thiết kế, dữ liệu học tập và công cụ vận hành cho giảng viên." }
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white text-foreground flex flex-col overflow-hidden">
      <Navbar />

      <main>
        {/* Hero */}
        <section className="relative pt-36 pb-20 lg:pt-44 lg:pb-28">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.16),transparent_34%),radial-gradient(circle_at_80%_10%,rgba(16,185,129,0.13),transparent_28%),linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)]" />
          <div className="absolute left-1/2 top-28 -z-10 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7 space-y-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white/80 px-4 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-primary shadow-sm">
                <Sparkles className="h-4 w-4" />
                Về Lumina LMS
              </div>

              <div className="space-y-5">
                <h1 className="max-w-4xl text-4xl sm:text-5xl lg:text-7xl font-black tracking-[-0.06em] leading-[0.95] text-slate-950">
                  Nơi việc học trở nên sáng rõ, có lộ trình và thật sự tiến bộ.
                </h1>
                <p className="max-w-2xl text-base sm:text-lg text-slate-600 leading-8 font-medium">
                  Lumina LMS là nền tảng học trực tuyến được xây dựng để giúp học viên đi từ tò mò đến năng lực thực tế. Chúng tôi kết hợp nội dung có cấu trúc, công cụ theo dõi tiến độ và trải nghiệm học tập nhẹ nhàng, hiện đại.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/courses"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-7 py-4 text-sm font-black uppercase tracking-widest text-white shadow-xl shadow-primary/20 transition-all hover:-translate-y-0.5 hover:bg-blue-700"
                >
                  Khám phá khóa học
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/my-courses"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-7 py-4 text-sm font-black uppercase tracking-widest text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:text-primary"
                >
                  Xem phòng học
                </Link>
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="relative">
                <div className="absolute -inset-6 rounded-[3rem] bg-gradient-to-br from-blue-100 via-white to-emerald-100 blur-2xl" />
                <div className="relative rounded-[2.5rem] border border-white bg-white/85 p-5 shadow-2xl shadow-blue-900/10 backdrop-blur">
                  <div className="rounded-[2rem] border border-slate-100 bg-slate-50 p-5 space-y-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Learning Campus</p>
                        <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950">Lộ trình Frontend</h2>
                      </div>
                      <div className="h-12 w-12 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/25">
                        <GraduationCap className="h-6 w-6" />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      {["HTML", "React", "API"].map((item, index) => (
                        <div key={item} className="rounded-2xl bg-white p-4 text-center shadow-sm border border-slate-100">
                          <p className="text-lg font-black text-slate-950">{index === 0 ? "92%" : index === 1 ? "68%" : "41%"}</p>
                          <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-slate-400">{item}</p>
                        </div>
                      ))}
                    </div>

                    <div className="rounded-3xl bg-white p-4 border border-slate-100 shadow-sm space-y-4">
                      {[
                        ["Tư duy giao diện", "Hoàn thành", "bg-emerald-500"],
                        ["Component React", "Đang học", "bg-primary"],
                        ["Kết nối API", "Tiếp theo", "bg-amber-400"]
                      ].map(([title, status, color]) => (
                        <div key={title} className="flex items-center gap-3">
                          <div className={`h-3 w-3 rounded-full ${color}`} />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-slate-900">{title}</p>
                            <p className="text-xs font-medium text-slate-500">{status}</p>
                          </div>
                          <CheckCircle2 className="h-5 w-5 text-slate-300" />
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between rounded-3xl bg-slate-950 p-5 text-white">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50">Tuần này</p>
                        <p className="mt-1 text-2xl font-black">7.5 giờ học</p>
                      </div>
                      <LineChart className="h-10 w-10 text-emerald-300" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm shadow-slate-200/70">
                <p className={`text-3xl sm:text-4xl font-black tracking-tight ${stat.tone}`}>{stat.value}</p>
                <p className="mt-2 text-xs font-black uppercase tracking-widest text-slate-500">{stat.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Mission */}
        <section className="bg-slate-50/80 py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-12 gap-10 items-start">
            <div className="lg:col-span-5 space-y-5">
              <div className="h-14 w-14 rounded-2xl bg-blue-100 text-primary flex items-center justify-center">
                <Target className="h-7 w-7" />
              </div>
              <h2 className="text-3xl sm:text-5xl font-black tracking-[-0.04em] text-slate-950">
                Chúng tôi thiết kế Lumina như một người bạn học kiên nhẫn.
              </h2>
            </div>
            <div className="lg:col-span-7 grid sm:grid-cols-2 gap-5">
              <div className="rounded-[2rem] bg-white p-7 border border-slate-100 shadow-sm">
                <Lightbulb className="h-7 w-7 text-amber-500" />
                <h3 className="mt-5 text-xl font-black tracking-tight">Sứ mệnh</h3>
                <p className="mt-3 text-sm leading-7 font-medium text-slate-600">
                  Giúp người học tiếp cận tri thức chất lượng bằng một hệ thống dễ hiểu, dễ theo dõi và đủ linh hoạt cho nhịp sống bận rộn.
                </p>
              </div>
              <div className="rounded-[2rem] bg-white p-7 border border-slate-100 shadow-sm">
                <Trophy className="h-7 w-7 text-emerald-500" />
                <h3 className="mt-5 text-xl font-black tracking-tight">Tầm nhìn</h3>
                <p className="mt-3 text-sm leading-7 font-medium text-slate-600">
                  Trở thành không gian học tập số đáng tin cậy, nơi mỗi khóa học đều tạo ra kỹ năng đo được và kết quả nhìn thấy được.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Learning model */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="max-w-3xl space-y-4">
            <p className="text-[11px] font-black uppercase tracking-[0.25em] text-primary">Cách Lumina vận hành</p>
            <h2 className="text-3xl sm:text-5xl font-black tracking-[-0.04em] text-slate-950">
              Một hành trình học rõ ràng từ ngày đầu tiên.
            </h2>
          </div>

          <div className="mt-12 grid lg:grid-cols-4 gap-5">
            {learningSteps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={step.title} className="group relative rounded-[2rem] border border-slate-100 bg-white p-7 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-900/10">
                  <div className="absolute right-6 top-5 text-5xl font-black text-slate-100">
                    {String(index + 1).padStart(2, "0")}
                  </div>
                  <div className="relative h-12 w-12 rounded-2xl bg-blue-50 text-primary flex items-center justify-center transition-all group-hover:bg-primary group-hover:text-white">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-7 text-lg font-black tracking-tight text-slate-950">{step.title}</h3>
                  <p className="mt-3 text-sm leading-7 font-medium text-slate-600">{step.description}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Values */}
        <section className="relative py-24">
          <div className="absolute inset-x-0 top-0 -z-10 h-full bg-gradient-to-b from-white via-blue-50/70 to-white" />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="rounded-[3rem] border border-blue-100 bg-white/80 p-6 sm:p-10 lg:p-12 shadow-2xl shadow-blue-900/5">
              <div className="grid lg:grid-cols-12 gap-10">
                <div className="lg:col-span-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.25em] text-primary">Giá trị cốt lõi</p>
                  <h2 className="mt-4 text-3xl sm:text-5xl font-black tracking-[-0.04em] text-slate-950">
                    Sáng, thật và có ích.
                  </h2>
                  <p className="mt-5 text-sm leading-7 font-medium text-slate-600">
                    Thiết kế sản phẩm của Lumina luôn xoay quanh một câu hỏi: điều này có giúp người học tiến bộ rõ hơn không?
                  </p>
                </div>
                <div className="lg:col-span-8 grid md:grid-cols-3 gap-5">
                  {values.map((value) => {
                    const Icon = value.icon;
                    return (
                      <div key={value.title} className="rounded-[2rem] bg-white p-6 border border-slate-100 shadow-sm">
                        <div className="h-11 w-11 rounded-2xl bg-slate-50 text-primary flex items-center justify-center">
                          <Icon className="h-5 w-5" />
                        </div>
                        <h3 className="mt-6 text-lg font-black tracking-tight">{value.title}</h3>
                        <p className="mt-3 text-sm leading-7 font-medium text-slate-600">{value.description}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Timeline */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="grid lg:grid-cols-12 gap-12 items-start">
            <div className="lg:col-span-4 space-y-4">
              <p className="text-[11px] font-black uppercase tracking-[0.25em] text-primary">Hành trình phát triển</p>
              <h2 className="text-3xl sm:text-5xl font-black tracking-[-0.04em] text-slate-950">
                Từng bước làm nền tảng tốt hơn.
              </h2>
            </div>
            <div className="lg:col-span-8 space-y-4">
              {timeline.map((item) => (
                <div key={item.year} className="grid sm:grid-cols-[120px_1fr] gap-4 rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
                  <div className="text-3xl font-black text-primary">{item.year}</div>
                  <div>
                    <h3 className="text-xl font-black tracking-tight text-slate-950">{item.title}</h3>
                    <p className="mt-2 text-sm leading-7 font-medium text-slate-600">{item.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
          <div className="relative overflow-hidden rounded-[3rem] bg-slate-950 px-6 py-14 sm:px-12 lg:px-16 text-white shadow-2xl shadow-slate-900/20">
            <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-primary/30 blur-3xl" />
            <div className="absolute bottom-0 left-10 h-48 w-48 rounded-full bg-emerald-400/20 blur-3xl" />
            <div className="relative grid lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-8">
                <p className="text-[11px] font-black uppercase tracking-[0.25em] text-blue-200">Bắt đầu cùng Lumina</p>
                <h2 className="mt-4 text-3xl sm:text-5xl font-black tracking-[-0.04em] leading-tight">
                  Học một kỹ năng mới hôm nay, mở thêm một lựa chọn cho ngày mai.
                </h2>
              </div>
              <div className="lg:col-span-4 flex lg:justify-end">
                <Link
                  href="/courses"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-7 py-4 text-sm font-black uppercase tracking-widest text-slate-950 transition-all hover:-translate-y-0.5 hover:bg-blue-50"
                >
                  Vào danh sách khóa học
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
