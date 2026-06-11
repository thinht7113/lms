"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { RefreshCw } from "lucide-react";

// Load pdfjs-dist directly from CDN at runtime, completely bypassing Webpack bundling.
// This avoids the ESM "Object.defineProperty called on non-object" error.
const PDFJS_CDN_VERSION = "4.4.168";
const PDFJS_CDN_URL = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_CDN_VERSION}/build/pdf.min.mjs`;
const PDFJS_WORKER_URL = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_CDN_VERSION}/build/pdf.worker.min.mjs`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pdfjsLibCache: any = null;

async function loadPdfJs() {
  if (pdfjsLibCache) return pdfjsLibCache;
  // webpackIgnore tells Webpack to leave this import() as a native browser import
  const pdfjs = await import(/* webpackIgnore: true */ PDFJS_CDN_URL);
  pdfjs.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
  pdfjsLibCache = pdfjs;
  return pdfjs;
}

interface PdfViewerProps {
  url: string;
}

export default function PdfViewer({ url }: PdfViewerProps) {
  const [pageCount, setPageCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfDocRef = useRef<any>(null);

  // Load PDF document
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      setPageCount(0);

      try {
        const pdfjs = await loadPdfJs();
        // Proxy PDF fetch through Next.js API route to bypass CORS
        const proxyUrl = `/api/pdf-proxy?url=${encodeURIComponent(url)}`;
        const loadingTask = pdfjs.getDocument(proxyUrl);
        const doc = await loadingTask.promise;

        if (cancelled) return;

        pdfDocRef.current = doc;
        setPageCount(doc.numPages);
      } catch (err) {
        if (!cancelled) {
          console.error("PDF load error:", err);
          setError("Không thể tải tài liệu PDF.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [url]);

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center rounded-2xl bg-slate-50">
        <div className="text-center">
          <RefreshCw className="mx-auto h-8 w-8 animate-spin text-blue-600" />
          <p className="mt-3 text-sm font-medium text-slate-500">Đang tải tài liệu PDF...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[200px] items-center justify-center rounded-2xl border border-dashed border-red-200 bg-red-50 p-6">
        <p className="text-sm font-medium text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col items-center gap-6 rounded-2xl bg-slate-100 py-8">
      {Array.from({ length: pageCount }, (_, i) => (
        <PdfPage key={i} pageNumber={i + 1} pdfDoc={pdfDocRef.current} />
      ))}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function PdfPage({ pageNumber, pdfDoc }: { pageNumber: number; pdfDoc: any }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderTaskRef = useRef<any>(null);
  const runningPromiseRef = useRef<Promise<any> | null>(null);
  const renderIdRef = useRef<number>(0);

  const renderPage = useCallback(async () => {
    if (!pdfDoc || !canvasRef.current) return;

    const currentRenderId = ++renderIdRef.current;

    // Cancel any in-progress render task before starting a new one
    if (renderTaskRef.current) {
      renderTaskRef.current.cancel();
      renderTaskRef.current = null;
    }

    // Wait for any previously cancelled or active render task to fully finish/reject
    if (runningPromiseRef.current) {
      try {
        await runningPromiseRef.current;
      } catch (e) {
        // Ignore cancellation errors from previous task
      }
    }

    // If a newer render request was initiated while we were waiting, abort this stale render
    if (currentRenderId !== renderIdRef.current) {
      return;
    }

    try {
      const page = await pdfDoc.getPage(pageNumber);
      if (currentRenderId !== renderIdRef.current) return;

      const canvas = canvasRef.current;
      if (!canvas) return;
      const context = canvas.getContext("2d");
      if (!context) return;

      // Calculate scale to fit container width (max ~850px)
      const containerWidth = Math.min(window.innerWidth - 80, 850);
      const unscaledViewport = page.getViewport({ scale: 1 });
      const scale = containerWidth / unscaledViewport.width;

      // Use devicePixelRatio for sharp rendering on HiDPI screens
      const dpr = window.devicePixelRatio || 1;
      const viewport = page.getViewport({ scale: scale * dpr });

      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.style.width = `${viewport.width / dpr}px`;
      canvas.style.height = `${viewport.height / dpr}px`;

      const task = page.render({ canvasContext: context, viewport });
      renderTaskRef.current = task;
      runningPromiseRef.current = task.promise;

      await task.promise;
    } catch (err: unknown) {
      // Ignore cancellation errors (expected when re-rendering)
      if (err instanceof Error && err.message?.includes("Rendering cancelled")) return;
      console.error(`Error rendering page ${pageNumber}:`, err);
    } finally {
      if (currentRenderId === renderIdRef.current) {
        renderTaskRef.current = null;
        runningPromiseRef.current = null;
      }
    }
  }, [pdfDoc, pageNumber]);

  useEffect(() => {
    renderPage();

    let resizeTimer: ReturnType<typeof setTimeout>;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(renderPage, 300);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(resizeTimer);
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }
    };
  }, [renderPage]);

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
      <canvas ref={canvasRef} />
    </div>
  );
}
