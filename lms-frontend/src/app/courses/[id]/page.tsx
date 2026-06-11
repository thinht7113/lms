"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Activity,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Lock,
  PlayCircle,
  RefreshCw,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Star,
  Video,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { apiService, Course, CourseDetail, Lesson, Review, Section, tokenHelper } from "@/services/api";
import { useToast } from "@/contexts/ToastContext";

type TabKey = "overview" | "curriculum" | "reviews";

const levelLabels: Record<string, string> = {
  beginner: "Cơ bản",
  intermediate: "Trung cấp",
  advanced: "Chuyên sâu",
};

export default function CourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const courseId = Number(params.id);

  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [relatedCourses, setRelatedCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [expandedSections, setExpandedSections] = useState<number[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>("overview");

  useEffect(() => {
    setCurrentUser(tokenHelper.getCurrentUser());
  }, []);

  useEffect(() => {
    async function loadData() {
      if (!courseId) return;
      setIsLoading(true);
      try {
        const data = await apiService.getCourseDetail(courseId);
        setCourse(data);
        if (data?.chuong_hoc?.length) {
          setExpandedSections([data.chuong_hoc[0].id]);
        }

        const related = await apiService.getCourses({
          ma_danh_muc: data?.ma_danh_muc,
          limit: 8,
        });
        setRelatedCourses(related.filter((item) => item.id !== courseId).slice(0, 6));

        if (tokenHelper.getToken()) {
          const enrolled = await apiService.getMyEnrolledCourses();
          setIsEnrolled(enrolled.some((item) => item.id === courseId));
        }
      } catch (err) {
        toast.error("Lỗi khi tải dữ liệu khóa học");
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [courseId, toast]);

  const toggleSection = (sectionId: number) => {
    setExpandedSections((prev) =>
      prev.includes(sectionId) ? prev.filter((id) => id !== sectionId) : [...prev, sectionId]
    );
  };

  const formatPrice = (value: number) => {
    return Number(value) === 0 ? "Miễn phí" : `${Number(value).toLocaleString("vi-VN")} đ`;
  };

  const handleAddToCart = async () => {
    if (!tokenHelper.getToken()) {
      router.push(`/login?next=/courses/${courseId}`);
      return;
    }
    setIsAddingToCart(true);
    try {
      await apiService.addToCart(courseId);
      toast.success("Đã thêm vào giỏ hàng!");
      window.dispatchEvent(new Event("lumina-cart-updated"));
    } catch (err: any) {
      toast.error(err.message || "Vui lòng đăng nhập để thêm vào giỏ hàng");
    } finally {
      setIsAddingToCart(false);
    }
  };

  const handleBuyNow = async () => {
    if (!tokenHelper.getToken()) {
      router.push(`/login?next=/courses/${courseId}`);
      return;
    }
    setIsAddingToCart(true);
    try {
      await apiService.addToCart(courseId);
      window.dispatchEvent(new Event("lumina-cart-updated"));
      router.push("/cart");
    } catch (err: any) {
      if (typeof err.message === "string" && err.message.includes("giỏ hàng")) {
        router.push("/cart");
        return;
      }
      toast.error(err.message || "Không thể mua khóa học này");
    } finally {
      setIsAddingToCart(false);
    }
  };

  const handleSubmitReview = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!tokenHelper.getToken()) {
      router.push("/login");
      return;
    }

    setIsSubmittingReview(true);
    try {
      const review = await apiService.createCourseReview(courseId, {
        so_sao: reviewRating,
        binh_luan: reviewComment.trim() || undefined,
      });
      setCourse((prev) =>
        prev
          ? {
              ...prev,
              danh_gia_khoa_hoc: [review, ...(prev.danh_gia_khoa_hoc || [])],
            }
          : prev
      );
      setReviewComment("");
      setReviewRating(5);
      toast.success("Đã gửi đánh giá khóa học");
    } catch (err: any) {
      toast.error(err.message || "Không thể gửi đánh giá");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const stats = useMemo(() => {
    const sections = course?.chuong_hoc || [];
    const lessons = sections.flatMap((section) => section.bai_hoc || []);
    const totalDuration = lessons.reduce((sum, lesson) => sum + (lesson.thoi_luong || 0), 0);
    const previewLessons = lessons.filter((lesson) => lesson.xem_truoc).length;
    const hours = Math.floor(totalDuration / 3600);
    const minutes = Math.floor((totalDuration % 3600) / 60);

    return {
      sectionsCount: sections.length,
      lessonsCount: lessons.length,
      previewLessons,
      hours,
      minutes,
    };
  }, [course]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-[#f7f9fc]">
        <Navbar />
        <div className="flex flex-1 items-center justify-center">
          <RefreshCw className="h-10 w-10 animate-spin text-primary" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex min-h-screen flex-col bg-[#f7f9fc]">
        <Navbar />
        <div className="flex flex-1 flex-col items-center justify-center space-y-4 p-8 text-center">
          <h1 className="text-2xl font-black">Không tìm thấy khóa học</h1>
          <button onClick={() => router.push("/courses")} className="font-bold text-primary hover:underline">
            Quay lại danh sách
          </button>
        </div>
        <Footer />
      </div>
    );
  }

  const isOwnCourse = Boolean(currentUser && course.ma_giang_vien === currentUser.id);
  const rating = Number(course.danh_gia_trung_binh || 0);
  const level = levelLabels[course.trinh_do] || course.trinh_do || "Cơ bản";

  return (
    <div className="flex min-h-screen flex-col bg-[#f7f9fc] text-slate-950">
      <Navbar />

      <main className="flex-1 pt-28">
        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto grid max-w-[1380px] gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[470px_1fr_280px] lg:px-8 lg:py-14">
            <div>
              <div className="overflow-hidden rounded-[1.8rem] border-[5px] border-lime-400 bg-white shadow-xl shadow-slate-900/10">
                <div className="relative w-full overflow-hidden bg-slate-50 flex items-center justify-center min-h-[300px]">
                {course.anh_dai_dien ? (
                  <img src={course.anh_dai_dien} alt={course.tieu_de} className="w-full h-auto object-contain" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-600 to-indigo-700">
                    <BookOpen className="h-16 w-16 text-white/45" />
                  </div>
                )}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/75 to-transparent p-5">
                    <div className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-[10px] font-black uppercase tracking-widest text-blue-700 shadow-lg">
                    <PlayCircle className="h-3.5 w-3.5" />
                    {stats.previewLessons > 0 ? `${stats.previewLessons} bài học thử` : "Nội dung khóa học"}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex min-w-0 flex-col">
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <span className="rounded-md bg-blue-600 px-3 py-1 text-xs font-black text-white">
                  Khóa học chuyên sâu
                </span>
                <span className="rounded-md bg-slate-100 px-3 py-1 text-xs font-black uppercase tracking-widest text-slate-700 ring-1 ring-slate-200">
                  {level}
                </span>
              </div>

              <h1 className="text-2xl font-black leading-tight text-slate-950 sm:text-3xl lg:text-[2rem]">
                {course.tieu_de}
              </h1>

              <p className="mt-4 text-sm font-medium leading-7 text-slate-600">
                {course.mo_ta || "Khóa học này cung cấp kiến thức nền tảng, bài học có cấu trúc rõ ràng và giúp học viên áp dụng vào thực tế sau từng chương."}
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <span className="text-2xl font-black text-red-600">{formatPrice(course.gia_tien)}</span>
                <span className="flex items-center gap-1 text-sm font-bold text-amber-500">
                  <Star className="h-4 w-4 fill-current" />
                  {rating.toFixed(1)}
                </span>
                <span className="text-sm font-medium text-slate-500">({course.danh_gia_khoa_hoc?.length || 0} đánh giá)</span>
              </div>

              <div className="mt-4 overflow-hidden border-y border-slate-300">
                <InfoRow label="Thời lượng" value={stats.hours > 0 || stats.minutes > 0 ? `${stats.hours} giờ ${stats.minutes} phút` : `${stats.lessonsCount} bài học`} />
                <InfoRow label="Sở hữu khóa học" value="Trọn đời" />
                <InfoRow label="Quyền học viên" value="Xem & tải về" />
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                {isOwnCourse ? (
                  <button
                    type="button"
                    onClick={() => router.push("/instructor/dashboard")}
                    className="flex h-12 flex-1 items-center justify-center rounded-xl bg-blue-600 px-5 text-sm font-black text-white shadow-lg shadow-blue-100 transition hover:bg-blue-700"
                  >
                    Vào kênh giảng viên
                  </button>
                ) : isEnrolled ? (
                  <button
                    type="button"
                    onClick={() => router.push(`/learn/${courseId}`)}
                    className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-black text-white shadow-lg shadow-emerald-100 transition hover:bg-emerald-700"
                  >
                    <PlayCircle className="h-5 w-5" />
                    Vào học ngay
                  </button>
                ) : (
                  <>
                    <button
                      onClick={handleAddToCart}
                      disabled={isAddingToCart}
                      className="flex h-12 min-w-[170px] flex-1 items-center justify-center gap-2 rounded-xl bg-[#3155a4] px-5 text-sm font-black text-white shadow-lg shadow-blue-100 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isAddingToCart ? <RefreshCw className="h-5 w-5 animate-spin" /> : <ShoppingCart className="h-5 w-5" />}
                      Thêm giỏ hàng
                    </button>
                    <button
                      onClick={handleBuyNow}
                      disabled={isAddingToCart}
                      className="flex h-12 min-w-[170px] flex-1 items-center justify-center rounded-xl bg-blue-600 px-5 text-sm font-black text-white shadow-lg shadow-blue-100 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Thanh toán ngay
                    </button>
                  </>
                )}
              </div>

              <div className="mt-5 grid grid-cols-3 gap-3 text-center">
                <div className="rounded-xl bg-slate-100 px-3 py-2">
                  <p className="text-lg font-black text-blue-600">{stats.sectionsCount}</p>
                  <p className="text-[10px] font-bold uppercase text-slate-500">Chương</p>
                </div>
                <div className="rounded-xl bg-slate-100 px-3 py-2">
                  <p className="text-lg font-black text-blue-600">{stats.lessonsCount}</p>
                  <p className="text-[10px] font-bold uppercase text-slate-500">Bài học</p>
                </div>
                <div className="rounded-xl bg-slate-100 px-3 py-2">
                  <p className="text-lg font-black text-blue-600">{course.so_luong_hoc_vien || 0}</p>
                  <p className="text-[10px] font-bold uppercase text-slate-500">Học viên</p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm font-bold text-slate-500">
                <ShieldCheck className="h-5 w-5 text-blue-600" />
                <span>Cập nhật {new Date(course.ngay_tao).toLocaleDateString("vi-VN")} • Học mọi lúc, mọi nơi</span>
              </div>
            </div>

            <aside className="self-start rounded-[0.45rem] border-4 border-yellow-400 border-l-lime-500 bg-white p-6 shadow-sm">
              <BenefitItem
                icon={<Video className="h-9 w-9 text-red-500" />}
                title="Đầy đủ bài giảng"
                description="Video bài giảng và tài liệu giống mô tả"
              />
              <BenefitItem
                icon={<BookOpen className="h-9 w-9 text-sky-500" />}
                title="Học online tiện lợi"
                description="Học online trên trình duyệt và thiết bị cá nhân"
              />
              <BenefitItem
                icon={<Activity className="h-9 w-9 text-amber-500" />}
                title="Kích hoạt nhanh"
                description="Khóa học được mở ngay sau khi thanh toán thành công"
              />
            </aside>
          </div>
        </section>

        <section className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_330px] lg:px-8">
          <div className="space-y-8">
            <div className="overflow-hidden rounded-[1.6rem] border border-slate-200 bg-white shadow-sm">
              <div className="flex border-b border-slate-200">
                {[
                  { id: "overview" as const, label: "Mô tả" },
                  { id: "curriculum" as const, label: "Nội dung khóa học" },
                  { id: "reviews" as const, label: "Đánh giá" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`border-b-2 px-5 py-4 text-sm font-black transition ${
                      activeTab === tab.id
                        ? "border-blue-600 text-blue-600"
                        : "border-transparent text-slate-500 hover:text-slate-950"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {activeTab === "overview" && <OverviewTab course={course} />}
              {activeTab === "curriculum" && (
                <CurriculumTab
                  sections={course.chuong_hoc || []}
                  expandedSections={expandedSections}
                  onToggleSection={toggleSection}
                />
              )}
              {activeTab === "reviews" && (
                <ReviewsTab
                  course={course}
                  reviewRating={reviewRating}
                  reviewComment={reviewComment}
                  isSubmittingReview={isSubmittingReview}
                  onRatingChange={setReviewRating}
                  onCommentChange={setReviewComment}
                  onSubmit={handleSubmitReview}
                />
              )}
            </div>
          </div>

          <aside className="space-y-6">
            <section className="rounded-[1.6rem] border border-blue-100 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <Sparkles className="h-6 w-6 text-amber-500" />
                <h2 className="text-xl font-black">Lợi ích khi học</h2>
              </div>
              <div className="mt-5 space-y-4">
                {[
                  "Bài học được chia theo chương rõ ràng.",
                  "Theo dõi tiến độ học và tiếp tục học bất cứ lúc nào.",
                  "Có thể nhận chứng chỉ khi hoàn thành.",
                ].map((item) => (
                  <div key={item} className="flex gap-3 rounded-2xl bg-blue-50/60 p-4 text-sm font-bold text-slate-700">
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-blue-600" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </section>

            <RelatedCourses courses={relatedCourses} formatPrice={formatPrice} />
          </aside>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function OverviewTab({ course }: { course: CourseDetail }) {
  const outcomes = [
    "Nắm được kiến thức trọng tâm của khóa học.",
    "Biết cách áp dụng nội dung đã học vào bài tập hoặc dự án thực tế.",
    "Theo dõi lộ trình học theo từng chương, từng bài.",
    "Có nền tảng để tiếp tục học các khóa nâng cao hơn.",
  ];

  return (
    <div className="p-6 sm:p-8">
      <h2 className="text-2xl font-black text-slate-950">Tổng quan khóa học</h2>
      <p className="mt-4 text-base font-medium leading-8 text-slate-600">
        {course.mo_ta || "Khóa học đang được giảng viên cập nhật mô tả chi tiết. Học viên có thể xem trước cấu trúc chương học và nội dung bài học bên dưới."}
      </p>

      <div className="mt-8 rounded-[1.25rem] border border-emerald-100 bg-emerald-50/70 p-6">
        <h3 className="text-lg font-black text-slate-950">Bạn sẽ học được gì?</h3>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {outcomes.map((item) => (
            <div key={item} className="flex gap-3 text-sm font-bold leading-6 text-slate-700">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[150px_1fr] items-center border-b border-slate-300 py-3 last:border-b-0">
      <span className="text-sm font-medium text-slate-950">{label}</span>
      <span className="rounded-md bg-slate-100 px-4 py-2 text-center text-sm font-medium text-slate-950">
        {value}
      </span>
    </div>
  );
}

function BenefitItem({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-4 border-b border-slate-100 py-4 first:pt-0 last:border-b-0 last:pb-0">
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-slate-50">
        {icon}
      </div>
      <div>
        <h3 className="text-base font-black text-slate-950">{title}</h3>
        <p className="mt-2 text-sm font-medium leading-6 text-slate-600">{description}</p>
      </div>
    </div>
  );
}

function CurriculumTab({
  sections,
  expandedSections,
  onToggleSection,
}: {
  sections: Section[];
  expandedSections: number[];
  onToggleSection: (sectionId: number) => void;
}) {
  if (!sections.length) {
    return (
      <div className="p-10 text-center">
        <BookOpen className="mx-auto h-12 w-12 text-slate-300" />
        <p className="mt-4 text-sm font-bold text-slate-500">Khóa học này đang được cập nhật nội dung.</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-200">
      {sections.map((section, index) => {
        const isExpanded = expandedSections.includes(section.id);
        return (
          <div key={section.id}>
            <button
              onClick={() => onToggleSection(section.id)}
              className="flex w-full items-center justify-between gap-4 bg-white p-5 text-left transition hover:bg-blue-50/40"
            >
              <div className="flex min-w-0 items-center gap-4">
                {isExpanded ? <ChevronUp className="h-5 w-5 text-blue-600" /> : <ChevronDown className="h-5 w-5 text-slate-400" />}
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-blue-600">Chương {index + 1}</p>
                  <h3 className="mt-1 line-clamp-1 font-black text-slate-950">{section.tieu_de}</h3>
                </div>
              </div>
              <span className="hidden rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500 sm:inline-flex">
                {section.bai_hoc?.length || 0} bài học
              </span>
            </button>

            {isExpanded && (
              <div className="bg-slate-50/70">
                {section.bai_hoc?.length ? (
                  <div className="divide-y divide-slate-200/80">
                    {section.bai_hoc.map((lesson: Lesson) => (
                      <div key={lesson.id} className="flex items-center justify-between gap-4 px-6 py-4 sm:px-14">
                        <div className="flex min-w-0 items-center gap-3">
                          {lesson.xem_truoc ? (
                            <PlayCircle className="h-4 w-4 shrink-0 text-blue-600" />
                          ) : (
                            <Lock className="h-4 w-4 shrink-0 text-slate-400" />
                          )}
                          <div className="min-w-0">
                            <p className="line-clamp-1 text-sm font-bold text-slate-700">{lesson.tieu_de}</p>
                            {lesson.xem_truoc && (
                              <span className="mt-1 inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-emerald-700">
                                Học thử
                              </span>
                            )}
                          </div>
                        </div>
                        {lesson.thoi_luong > 0 && (
                          <span className="shrink-0 text-xs font-bold text-slate-400">
                            {Math.floor(lesson.thoi_luong / 60)} phút
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="px-14 py-6 text-sm font-bold text-slate-400">Chưa có bài học nào trong chương này.</div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ReviewsTab({
  course,
  reviewRating,
  reviewComment,
  isSubmittingReview,
  onRatingChange,
  onCommentChange,
  onSubmit,
}: {
  course: CourseDetail;
  reviewRating: number;
  reviewComment: string;
  isSubmittingReview: boolean;
  onRatingChange: (rating: number) => void;
  onCommentChange: (comment: string) => void;
  onSubmit: (event: React.FormEvent) => void;
}) {
  const reviews = course.danh_gia_khoa_hoc || [];

  return (
    <div className="p-6 sm:p-8">
      <form onSubmit={onSubmit} className="rounded-[1.25rem] border border-amber-100 bg-amber-50/70 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-black text-slate-950">Gửi đánh giá của bạn</p>
            <p className="mt-1 text-xs font-bold text-slate-500">Hệ thống sẽ kiểm tra quyền học trước khi lưu đánh giá.</p>
          </div>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => onRatingChange(star)}
                className="rounded-lg p-1 text-amber-500 transition hover:bg-white"
                aria-label={`Chọn ${star} sao`}
              >
                <Star className={`h-6 w-6 ${star <= reviewRating ? "fill-current" : "text-slate-300"}`} />
              </button>
            ))}
          </div>
        </div>
        <textarea
          value={reviewComment}
          onChange={(event) => onCommentChange(event.target.value)}
          maxLength={1000}
          placeholder="Chia sẻ cảm nhận sau khi học khóa này..."
          className="mt-4 min-h-28 w-full rounded-2xl border border-amber-100 bg-white p-4 text-sm font-medium outline-none transition focus:border-amber-300"
        />
        <div className="mt-4 flex justify-end">
          <button
            type="submit"
            disabled={isSubmittingReview}
            className="rounded-2xl bg-slate-950 px-6 py-3 text-xs font-black uppercase tracking-widest text-white transition hover:bg-blue-600 disabled:opacity-50"
          >
            {isSubmittingReview ? "Đang gửi..." : "Gửi đánh giá"}
          </button>
        </div>
      </form>

      {reviews.length > 0 ? (
        <div className="mt-7 space-y-4">
          {reviews.map((review: Review) => (
            <div key={review.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-black text-blue-700">
                    {review.nguoi_dung?.ho_ten?.charAt(0) || "H"}
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-950">{review.nguoi_dung?.ho_ten || "Học viên ẩn danh"}</p>
                    <p className="text-[10px] font-bold text-slate-400">{new Date(review.ngay_tao).toLocaleDateString("vi-VN")}</p>
                  </div>
                </div>
                <div className="flex text-amber-500">
                  {[...Array(5)].map((_, index) => (
                    <Star key={index} className={`h-4 w-4 ${index < review.so_sao ? "fill-current" : "text-slate-300"}`} />
                  ))}
                </div>
              </div>
              <p className="mt-4 text-sm font-medium leading-7 text-slate-600">
                {review.binh_luan || "Học viên đã đánh giá khóa học này mà không để lại bình luận."}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-7 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm font-bold text-slate-500">
          Chưa có đánh giá nào cho khóa học này.
        </div>
      )}
    </div>
  );
}

function RelatedCourses({ courses, formatPrice }: { courses: Course[]; formatPrice: (value: number) => string }) {
  if (!courses.length) {
    return (
      <section className="rounded-[1.6rem] border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-black">Khóa học liên quan</h2>
        <p className="mt-4 text-sm font-bold leading-6 text-slate-500">Chưa có khóa học liên quan trong cùng danh mục.</p>
        <Link href="/courses" className="mt-5 inline-flex rounded-2xl bg-blue-600 px-5 py-3 text-xs font-black uppercase tracking-widest text-white">
          Xem tất cả
        </Link>
      </section>
    );
  }

  return (
    <section className="rounded-[1.6rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black">Khóa học liên quan</h2>
        <Link href="/courses" className="text-xs font-black uppercase tracking-widest text-blue-600">
          Xem thêm
        </Link>
      </div>
      <div className="mt-5 space-y-4">
        {courses.map((course) => (
          <Link key={course.id} href={`/courses/${course.id}`} className="group flex gap-3 rounded-2xl p-2 transition hover:bg-blue-50">
            <div className="h-16 w-20 shrink-0 overflow-hidden rounded-xl bg-slate-100">
              {course.anh_dai_dien ? (
                <img src={course.anh_dai_dien} alt={course.tieu_de} className="h-full w-full object-cover transition group-hover:scale-105" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-blue-100">
                  <BookOpen className="h-6 w-6 text-blue-600" />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <h3 className="line-clamp-2 text-sm font-black leading-5 text-slate-950 transition group-hover:text-blue-600">{course.tieu_de}</h3>
              <p className="mt-1 text-sm font-black text-red-500">{formatPrice(course.gia_tien)}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
