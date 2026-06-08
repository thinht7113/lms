import Link from "next/link";
import { ArrowRight, CheckCircle2, CreditCard, FileText, ShieldCheck } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const sections = [
  {
    title: "Đăng ký và sử dụng tài khoản",
    points: [
      "Người dùng chịu trách nhiệm bảo mật thông tin đăng nhập của mình.",
      "Tài khoản học viên, giảng viên và quản trị viên có phạm vi quyền khác nhau theo phân quyền hệ thống.",
      "Thông tin hồ sơ cần được cung cấp chính xác để phục vụ cấp chứng chỉ và hỗ trợ học tập."
    ]
  },
  {
    title: "Mua khóa học và thanh toán",
    points: [
      "Học viên có thể thêm khóa học vào giỏ hàng, áp dụng mã giảm giá hợp lệ và thực hiện thanh toán.",
      "Quyền truy cập khóa học được cấp sau khi đơn hàng ở trạng thái thành công.",
      "Giá tiền, ưu đãi và trạng thái thanh toán được ghi nhận theo dữ liệu đơn hàng tại thời điểm mua."
    ]
  },
  {
    title: "Nội dung học tập và chứng chỉ",
    points: [
      "Giảng viên chịu trách nhiệm về tính hợp lệ của bài học, video, PDF, bài kiểm tra và tài nguyên đã tải lên.",
      "Hệ thống theo dõi tiến độ học tập, kết quả kiểm tra và cấp chứng chỉ khi học viên đủ điều kiện.",
      "LuminaLMS có quyền kiểm duyệt hoặc tạm ẩn nội dung không phù hợp trước khi công khai."
    ]
  },
  {
    title: "Hoàn tiền và hỗ trợ",
    points: [
      "Yêu cầu hoàn tiền được gửi từ đơn hàng và cần được quản trị viên xét duyệt.",
      "Các trường hợp gian lận, chia sẻ tài khoản hoặc lạm dụng mã giảm giá có thể bị từ chối hỗ trợ.",
      "Mọi tranh chấp được xử lý dựa trên lịch sử giao dịch, quyền truy cập và nhật ký hệ thống."
    ]
  }
];

export default function TermsPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[#F8FAFC] pt-28">
        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="overflow-hidden rounded-[2.5rem] border border-blue-100 bg-white shadow-sm">
            <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-sky-500 p-8 text-white md:p-12">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-xs font-black uppercase tracking-widest">
                <FileText className="h-4 w-4" />
                Điều khoản giao dịch
              </div>
              <h1 className="mt-6 max-w-3xl text-4xl font-black tracking-tight md:text-5xl">
                Nguyên tắc sử dụng và giao dịch trên LuminaLMS
              </h1>
              <p className="mt-5 max-w-3xl text-base font-medium leading-8 text-blue-50">
                Trang này tóm tắt các điều kiện chính khi học viên mua khóa học, giảng viên xây dựng nội dung và quản trị viên vận hành hệ thống.
              </p>
            </div>

            <div className="grid gap-6 p-6 md:grid-cols-3 md:p-8">
              <div className="rounded-2xl bg-blue-50 p-5">
                <ShieldCheck className="h-6 w-6 text-blue-600" />
                <p className="mt-3 text-sm font-black text-slate-950">Bảo vệ tài khoản</p>
                <p className="mt-1 text-sm text-slate-600">Ưu tiên xác thực an toàn và phân quyền đúng vai trò.</p>
              </div>
              <div className="rounded-2xl bg-emerald-50 p-5">
                <CreditCard className="h-6 w-6 text-emerald-600" />
                <p className="mt-3 text-sm font-black text-slate-950">Giao dịch minh bạch</p>
                <p className="mt-1 text-sm text-slate-600">Đơn hàng, mã giảm giá và thanh toán được ghi nhận rõ ràng.</p>
              </div>
              <div className="rounded-2xl bg-amber-50 p-5">
                <CheckCircle2 className="h-6 w-6 text-amber-600" />
                <p className="mt-3 text-sm font-black text-slate-950">Nội dung được kiểm duyệt</p>
                <p className="mt-1 text-sm text-slate-600">Khóa học cần qua quy trình duyệt trước khi công khai.</p>
              </div>
            </div>
          </div>

          <div className="mt-8 space-y-5">
            {sections.map((section) => (
              <article key={section.title} className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-black text-slate-950">{section.title}</h2>
                <ul className="mt-4 space-y-3">
                  {section.points.map((point) => (
                    <li key={point} className="flex gap-3 text-sm font-medium leading-7 text-slate-600">
                      <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-blue-600" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>

          <div className="mt-8 flex flex-col gap-3 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-950">Cần xem lại đơn hàng?</h2>
              <p className="mt-1 text-sm font-medium text-slate-500">Bạn có thể kiểm tra lịch sử mua khóa học và yêu cầu hoàn tiền tại trang đơn hàng.</p>
            </div>
            <Link href="/orders" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white hover:bg-blue-700">
              Xem đơn hàng
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
