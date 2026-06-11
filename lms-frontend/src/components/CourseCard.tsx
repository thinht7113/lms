"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Star, BookOpen, BarChart3 } from "lucide-react";

interface CourseCardProps {
  id: number;
  title: string;
  thumbnail?: string;
  instructor: string;
  category: string;
  level: string;
  rating: number;
  price: number;
  studentsCount?: number;
  gradient: string;
}

export default function CourseCard({
  id,
  title,
  thumbnail,
  instructor,
  category,
  level,
  rating,
  price,
  studentsCount = 0,
  gradient
}: CourseCardProps) {
  const formatPrice = (val: number) => {
    return val === 0 ? "Miễn phí" : new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(val);
  };

  const levelLabels: Record<string, string> = {
    beginner: "Cơ bản",
    intermediate: "Trung cấp",
    advanced: "Chuyên sâu"
  };

  return (
    <Link
      href={`/courses/${id}`}
      className="group bg-card border border-border/50 rounded-2xl overflow-hidden shadow-sm hover:shadow-2xl hover:border-primary/20 transition-all duration-500 flex flex-col h-full cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
    >
      {/* Media Block */}
      <div className="relative aspect-video w-full overflow-hidden bg-slate-50 flex items-center justify-center">
        {thumbnail ? (
          <Image
            src={thumbnail}
            alt={title}
            fill
            unoptimized
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-contain p-1 group-hover:scale-105 transition-transform duration-700"
          />
        ) : (
          <div className={`absolute inset-0 bg-gradient-to-br ${gradient} flex items-center justify-center p-8`}>
            <BookOpen className="w-12 h-12 text-white/40 group-hover:scale-125 transition-transform duration-500" />
          </div>
        )}

        {/* Overlay Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          <span className="bg-background/90 backdrop-blur-md text-foreground text-[10px] font-black uppercase px-3 py-1 rounded-lg border border-border shadow-sm">
            {category}
          </span>
        </div>
      </div>

      {/* Content Block */}
      <div className="p-6 flex flex-col flex-grow space-y-4">
        <div className="space-y-2 flex-grow">
          <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">
            <div className="flex items-center space-x-1">
              <BarChart3 className="w-3 h-3 text-primary" />
              <span>{levelLabels[level] || level}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
              <span className="text-foreground">{rating.toFixed(1)}</span>
            </div>
          </div>

          <h3 className="font-sans font-black text-base text-foreground leading-tight line-clamp-2 group-hover:text-primary transition-colors">
            {title}
          </h3>

          <p className="text-[11px] text-muted-foreground font-medium">
            Dẫn dắt bởi <span className="text-foreground font-bold">{instructor}</span>
          </p>
        </div>

        {/* Footer Meta */}
        <div className="pt-4 border-t border-border/40 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-lg font-black text-primary tracking-tighter">
              {formatPrice(price)}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
