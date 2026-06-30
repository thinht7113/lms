"use client";

import { useEffect, useState } from "react";
import CourseImportsClient from "./CourseImportsClient";

function CourseImportsSkeleton() {
  return <div className="space-y-2 text-slate-800" />;
}

export default function CourseImportsClientOnly() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setMounted(true);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  if (!mounted) {
    return <CourseImportsSkeleton />;
  }

  return <CourseImportsClient />;
}
