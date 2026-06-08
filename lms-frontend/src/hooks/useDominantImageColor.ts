"use client";

import { useEffect, useState } from "react";

const CANVAS_SIZE = 48;
const BUCKET_SIZE = 24;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function quantize(value: number) {
  return Math.round(value / BUCKET_SIZE) * BUCKET_SIZE;
}

function isUsablePixel(r: number, g: number, b: number, a: number) {
  if (a < 180) return false;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const brightness = (r + g + b) / 3;

  if (brightness < 24 || brightness > 238) return false;
  return max - min > 12;
}

function toRgbString(r: number, g: number, b: number) {
  return `${clamp(Math.round(r), 0, 255)}, ${clamp(Math.round(g), 0, 255)}, ${clamp(Math.round(b), 0, 255)}`;
}

export function useDominantImageColor(src?: string, fallbackRgb = "37, 99, 235") {
  const [dominantColor, setDominantColor] = useState(fallbackRgb);

  useEffect(() => {
    if (!src) {
      setDominantColor(fallbackRgb);
      return;
    }

    let cancelled = false;
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.decoding = "async";

    image.onload = () => {
      if (cancelled) return;

      try {
        const canvas = document.createElement("canvas");
        canvas.width = CANVAS_SIZE;
        canvas.height = CANVAS_SIZE;

        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) {
          setDominantColor(fallbackRgb);
          return;
        }

        context.drawImage(image, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
        const pixels = context.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE).data;
        const buckets = new Map<string, { count: number; r: number; g: number; b: number }>();

        for (let i = 0; i < pixels.length; i += 4) {
          const r = pixels[i];
          const g = pixels[i + 1];
          const b = pixels[i + 2];
          const a = pixels[i + 3];

          if (!isUsablePixel(r, g, b, a)) continue;

          const key = `${quantize(r)},${quantize(g)},${quantize(b)}`;
          const bucket = buckets.get(key) || { count: 0, r: 0, g: 0, b: 0 };
          bucket.count += 1;
          bucket.r += r;
          bucket.g += g;
          bucket.b += b;
          buckets.set(key, bucket);
        }

        let winner: { count: number; r: number; g: number; b: number } | undefined;
        for (const bucket of buckets.values()) {
          if (!winner || bucket.count > winner.count) {
            winner = bucket;
          }
        }

        if (!winner) {
          setDominantColor(fallbackRgb);
          return;
        }

        setDominantColor(toRgbString(winner.r / winner.count, winner.g / winner.count, winner.b / winner.count));
      } catch {
        setDominantColor(fallbackRgb);
      }
    };

    image.onerror = () => {
      if (!cancelled) setDominantColor(fallbackRgb);
    };

    image.src = src;

    return () => {
      cancelled = true;
    };
  }, [src, fallbackRgb]);

  return dominantColor;
}
