"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BadgeCheck,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  Compass,
  DollarSign,
  FileText,
  GraduationCap,
  Lightbulb,
  Lock,
  Mail,
  MessageCircle,
  Phone,
  Rocket,
  Send,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  Video,
  User
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { apiService } from "@/services/api";
import { useToast } from "@/contexts/ToastContext";

const benefits = [
  {
    icon: Target,
    title: "Khám phá tiềm năng chuyên môn",
    description: "Biến kinh nghiệm, kỹ năng và câu chuyện nghề nghiệp của bạn thành một lộ trình học có cấu trúc, dễ tiếp cận."
  },
  {
    icon: Users,
    title: "Chia sẻ với cộng đồng học tập",
    description: "Kết nối với học viên đang cần định hướng, phản hồi và nguồn cảm hứng thực tế từ người đã đi trước."
  },
  {
    icon: DollarSign,
    title: "Tăng thu nhập thụ động",
    description: "Một khóa học chất lượng có thể tiếp tục tạo doanh thu sau khi xuất bản, trong khi bạn vẫn tập trung phát triển chuyên môn."
  },
  {
    icon: BarChart3,
    title: "Theo dõi hiệu quả rõ ràng",
    description: "Dashboard giảng viên giúp bạn nắm lượt học, tiến độ, phản hồi và doanh thu để cải thiện khóa học liên tục."
  }
];

const growthCards = [
  {
    title: "Đóng gói tri thức",
    text: "Từ ghi chú rời rạc, slide, kinh nghiệm dự án thành chương học, bài giảng, quiz và tài liệu có thể học lại nhiều lần.",
    icon: FileText
  },
  {
    title: "Xây dựng thương hiệu cá nhân",
    text: "Mỗi khóa học là một hồ sơ năng lực sống động, giúp học viên hiểu cách bạn tư duy và giải quyết vấn đề.",
    icon: BadgeCheck
  },
  {
    title: "Mở rộng ảnh hưởng",
    text: "Không bị giới hạn bởi lớp học trực tiếp. Nội dung của bạn có thể chạm tới học viên ở nhiều địa phương khác nhau.",
    icon: Rocket
  }
];

const processSteps = [
  {
    icon: Lightbulb,
    title: "1. Chọn ý tưởng khóa học",
    description: "Xác định đối tượng học viên, đầu ra cần đạt và vấn đề thực tế khóa học sẽ giải quyết."
  },
  {
    icon: ClipboardCheck,
    title: "2. Thiết kế đề cương",
    description: "Chia nội dung thành chương, bài học, bài tập và tài liệu để học viên đi theo một nhịp học rõ ràng."
  },
  {
    icon: Video,
    title: "3. Sản xuất nội dung",
    description: "Quay video, biên soạn tài liệu, chuẩn bị quiz và ví dụ thực hành theo chuẩn dễ xem, dễ hiểu."
  },
  {
    icon: ShieldCheck,
    title: "4. Duyệt chất lượng",
    description: "Lumina hỗ trợ kiểm tra nội dung, trải nghiệm học và thông tin khóa học trước khi xuất bản."
  },
  {
    icon: MessageCircle,
    title: "5. Đồng hành sau khi mở bán",
    description: "Theo dõi phản hồi, trả lời câu hỏi và cập nhật bài học để khóa học ngày càng có giá trị hơn."
  }
];

const supportItems = [
  "Công cụ quản lý chương, bài học, video, tài liệu và quiz.",
  "Trang khóa học riêng với đánh giá, lượt học và nội dung preview.",
  "Hệ thống giỏ hàng, thanh toán, chứng chỉ và theo dõi tiến độ.",
  "Kênh quản trị giảng viên để xem khóa học, học viên và doanh thu."
];

export default function BecomeInstructorPage() {
  const toast = useToast();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [expertise, setExpertise] = useState("");
  const [courseIdea, setCourseIdea] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setRegisteredEmail(null);

    try {
      await apiService.register(email, password, fullName, phone, "instructor");
      setRegisteredEmail(email);
      toast.success("Đăng ký tài khoản giảng viên thành công. Hãy đăng nhập để bắt đầu tạo khóa học.");
      setFullName("");
      setEmail("");
      setPhone("");
      setPassword("");
      setExpertise("");
      setCourseIdea("");
    } catch (error: any) {
      toast.error(error.message || "Không thể gửi đăng ký giảng viên. Vui lòng thử lại.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-950 flex flex-col overflow-hidden">
      <Navbar />

      <main>
        <section className="relative pt-36 pb-20 lg:pt-44 lg:pb-28">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_12%_18%,rgba(37,99,235,0.18),transparent_32%),radial-gradient(circle_at_82%_4%,rgba(124,58,237,0.16),transparent_30%),linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)]" />
          <div className="absolute left-1/2 top-28 -z-10 h-80 w-80 -translate-x-1/2 rounded-full bg-blue-200/40 blur-3xl" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7 space-y-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white/85 px-4 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-primary shadow-sm">
                <Sparkles className="h-4 w-4" />
                Lumina Instructor Studio
              </div>

              <div className="space-y-5">
                <h1 className="max-w-4xl text-4xl sm:text-5xl lg:text-7xl font-black tracking-[-0.06em] leading-[0.95] text-slate-950">
                  Trở thành giảng viên và biến tri thức của bạn thành tác động thật.
                </h1>
                <p className="max-w-2xl text-base sm:text-lg text-slate-600 leading-8 font-medium">
                  Lumina giúp bạn đóng gói chuyên môn thành khóa học trực tuyến, xây dựng cộng đồng học viên và tạo thêm nguồn thu nhập bền vững từ nội dung chất lượng.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <a
                  href="#register"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-7 py-4 text-sm font-black uppercase tracking-widest text-white shadow-xl shadow-primary/20 transition-all hover:-translate-y-0.5 hover:bg-blue-700"
                >
                  Đăng ký giảng viên
                  <ArrowRight className="h-4 w-4" />
                </a>
                <a
                  href="#process"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-7 py-4 text-sm font-black uppercase tracking-widest text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:text-primary"
                >
                  Xem quy trình
                </a>
              </div>

              <div className="grid grid-cols-3 gap-3 max-w-2xl">
                {[
                  ["5 bước", "ra mắt khóa học"],
                  ["24/7", "học viên truy cập"],
                  ["100%", "quản lý online"]
                ].map(([value, label]) => (
                  <div key={label} className="rounded-2xl border border-slate-100 bg-white/80 p-4 shadow-sm">
                    <p className="text-2xl font-black text-slate-950">{value}</p>
                    <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="relative">
                <div className="absolute -inset-6 rounded-[3rem] bg-gradient-to-br from-blue-100 via-white to-violet-100 blur-2xl" />
                <div className="relative rounded-[2.5rem] border border-white bg-white/85 p-5 shadow-2xl shadow-blue-900/10 backdrop-blur">
                  <div className="rounded-[2rem] border border-slate-100 bg-slate-50 p-5 space-y-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Instructor Dashboard</p>
                        <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950">Khóa học đầu tiên</h2>
                      </div>
                      <div className="h-12 w-12 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/25">
                        <GraduationCap className="h-6 w-6" />
                      </div>
                    </div>

                    <div className="rounded-3xl bg-white p-4 border border-slate-100 shadow-sm space-y-4">
                      {[
                        ["Đề cương", "Hoàn thành", "bg-emerald-500"],
                        ["Video bài giảng", "Đang sản xuất", "bg-primary"],
                        ["Quiz & tài liệu", "Tiếp theo", "bg-amber-400"]
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

                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-3xl bg-white p-5 border border-slate-100 shadow-sm">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Học viên</p>
                        <p className="mt-2 text-3xl font-black text-slate-950">1.240</p>
                      </div>
                      <div className="rounded-3xl bg-slate-950 p-5 text-white shadow-sm">
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/50">Doanh thu</p>
                        <p className="mt-2 text-3xl font-black">+38%</p>
                      </div>
                    </div>

                    <div className="rounded-3xl bg-blue-600 p-5 text-white">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-100">Gợi ý hôm nay</p>
                      <p className="mt-2 text-sm font-bold leading-6">
                        Thêm một bài học preview để tăng niềm tin trước khi học viên mua khóa học.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {benefits.map((benefit) => {
              const Icon = benefit.icon;
              return (
                <div key={benefit.title} className="group rounded-[2rem] border border-slate-100 bg-white p-7 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-900/10">
                  <div className="h-12 w-12 rounded-2xl bg-blue-50 text-primary flex items-center justify-center transition-all group-hover:bg-primary group-hover:text-white">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-7 text-lg font-black tracking-tight text-slate-950">{benefit.title}</h3>
                  <p className="mt-3 text-sm leading-7 font-medium text-slate-600">{benefit.description}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="bg-slate-50/80 py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-12 gap-10 items-start">
            <div className="lg:col-span-4 space-y-5">
              <div className="h-14 w-14 rounded-2xl bg-blue-100 text-primary flex items-center justify-center">
                <Compass className="h-7 w-7" />
              </div>
              <h2 className="text-3xl sm:text-5xl font-black tracking-[-0.04em] text-slate-950">
                Khám phá tiềm năng lớn hơn từ điều bạn đã biết.
              </h2>
              <p className="text-sm leading-7 font-medium text-slate-600">
                Bạn không cần bắt đầu bằng một học viện hoàn chỉnh. Chỉ cần một chủ đề đủ rõ, một nhóm học viên cụ thể và một lộ trình có thể giúp họ tiến bộ.
              </p>
            </div>
            <div className="lg:col-span-8 grid md:grid-cols-3 gap-5">
              {growthCards.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="rounded-[2rem] bg-white p-7 border border-slate-100 shadow-sm">
                    <Icon className="h-7 w-7 text-primary" />
                    <h3 className="mt-5 text-xl font-black tracking-tight">{item.title}</h3>
                    <p className="mt-3 text-sm leading-7 font-medium text-slate-600">{item.text}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section id="process" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="max-w-3xl space-y-4">
            <p className="text-[11px] font-black uppercase tracking-[0.25em] text-primary">Quy trình triển khai khóa học</p>
            <h2 className="text-3xl sm:text-5xl font-black tracking-[-0.04em] text-slate-950">
              Từ ý tưởng ban đầu đến khóa học được xuất bản.
            </h2>
            <p className="text-sm sm:text-base leading-8 font-medium text-slate-600">
              Lumina chia quá trình xây dựng khóa học thành các bước nhỏ, giúp giảng viên mới không bị choáng và giảng viên có kinh nghiệm có thể vận hành nhanh hơn.
            </p>
          </div>

          <div className="mt-12 space-y-4">
            {processSteps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={step.title} className="grid lg:grid-cols-[96px_1fr] gap-5 rounded-[2rem] border border-slate-100 bg-white p-5 sm:p-7 shadow-sm">
                  <div className="flex lg:flex-col items-center lg:items-start gap-4">
                    <div className="h-14 w-14 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20">
                      <Icon className="h-7 w-7" />
                    </div>
                    <span className="text-4xl font-black text-slate-100">{String(index + 1).padStart(2, "0")}</span>
                  </div>
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div>
                      <h3 className="text-xl sm:text-2xl font-black tracking-tight text-slate-950">{step.title}</h3>
                      <p className="mt-2 text-sm leading-7 font-medium text-slate-600 max-w-3xl">{step.description}</p>
                    </div>
                    <ArrowRight className="hidden lg:block h-6 w-6 text-slate-300" />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="relative py-24">
          <div className="absolute inset-x-0 top-0 -z-10 h-full bg-gradient-to-b from-white via-blue-50/70 to-white" />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="rounded-[3rem] border border-blue-100 bg-white/80 p-6 sm:p-10 lg:p-12 shadow-2xl shadow-blue-900/5">
              <div className="grid lg:grid-cols-12 gap-10 items-center">
                <div className="lg:col-span-5">
                  <p className="text-[11px] font-black uppercase tracking-[0.25em] text-primary">Lumina đồng hành</p>
                  <h2 className="mt-4 text-3xl sm:text-5xl font-black tracking-[-0.04em] text-slate-950">
                    Bạn tập trung vào chuyên môn, hệ thống lo phần vận hành.
                  </h2>
                  <p className="mt-5 text-sm leading-7 font-medium text-slate-600">
                    Từ trang khóa học, bài giảng, quiz đến thanh toán và chứng chỉ, Lumina cung cấp các mảnh ghép cần thiết để bạn triển khai khóa học trực tuyến mạch lạc hơn.
                  </p>
                </div>
                <div className="lg:col-span-7 grid sm:grid-cols-2 gap-4">
                  {supportItems.map((item) => (
                    <div key={item} className="flex gap-3 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                      <p className="text-sm font-bold leading-6 text-slate-700">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="register" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
          <div className="grid lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-5 rounded-[3rem] bg-slate-950 p-8 sm:p-10 text-white shadow-2xl shadow-slate-900/20 sticky top-28">
              <div className="h-14 w-14 rounded-2xl bg-white/10 flex items-center justify-center">
                <BookOpen className="h-7 w-7 text-blue-300" />
              </div>
              <h2 className="mt-7 text-3xl sm:text-5xl font-black tracking-[-0.04em] leading-tight text-white">
                Sẵn sàng mở lớp học đầu tiên?
              </h2>
              <p className="mt-5 text-sm leading-7 font-medium text-white/70">
                Điền thông tin cơ bản để tạo tài khoản giảng viên. Sau khi đăng nhập, bạn có thể vào kênh giảng viên và bắt đầu xây dựng khóa học.
              </p>
              <div className="mt-8 space-y-4">
                {[
                  "Tài khoản giảng viên được tạo trực tiếp trên hệ thống.",
                  "Có thể đăng nhập và truy cập kênh giảng viên sau khi đăng ký.",
                  "Ý tưởng khóa học giúp bạn chuẩn bị nội dung trước khi tạo khóa."
                ].map((item) => (
                  <div key={item} className="flex gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
                    <p className="text-sm font-bold leading-6 text-white/80">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-7 rounded-[3rem] border border-slate-100 bg-white p-6 sm:p-8 lg:p-10 shadow-2xl shadow-blue-900/5 flex flex-col items-center justify-center text-center space-y-6">
              <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                <Mail className="w-10 h-10 text-primary" />
              </div>
              <h3 className="text-2xl font-black text-slate-900">Liên hệ với bộ phận Quản lý Giảng viên</h3>
              <p className="text-slate-500 font-medium max-w-md leading-relaxed">
                Để đảm bảo chất lượng giảng dạy trên nền tảng Lumina LMS, quá trình đăng ký tài khoản Giảng viên đang được kiểm duyệt thủ công. Vui lòng gửi email cho chúng tôi kèm theo hồ sơ năng lực của bạn.
              </p>
              
              <div className="bg-slate-50 w-full rounded-2xl p-6 border border-slate-100 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-widest text-slate-400">Email liên hệ</span>
                  <a href="mailto:admin@luminalms.vn" className="text-sm font-black text-primary hover:underline">admin@luminalms.vn</a>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-widest text-slate-400">Hotline hỗ trợ</span>
                  <a href="tel:19001000" className="text-sm font-black text-slate-900 hover:underline">1900 1000</a>
                </div>
              </div>

              <a 
                href="mailto:admin@luminalms.vn?subject=Đăng ký làm Giảng viên tại Lumina LMS"
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-7 py-4 text-sm font-black uppercase tracking-widest text-white shadow-xl shadow-primary/20 transition-all hover:-translate-y-0.5 hover:bg-blue-700"
              >
                Gửi Email Ngay <Send className="h-4 w-4" />
              </a>

              <p className="text-center text-xs font-medium leading-6 text-slate-500 mt-4">
                Chúng tôi sẽ phản hồi trong vòng 24 - 48 giờ làm việc.
              </p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
