import React, { useEffect, useRef, useState } from 'react';
import { OfflineFilterSettings } from '../services/carpetNaming';
import { CarpetItem } from '../services/driveService';

interface OfflineCarpetCanvasProps {
  item: CarpetItem;
  filter: OfflineFilterSettings;
  showOriginalHold: boolean;
  zoomLevel: number;
  fitMode: 'cover' | 'contain';
}

function applyOfflineCarpetFilter(
  sourceCtx: CanvasRenderingContext2D,
  destCtx: CanvasRenderingContext2D,
  width: number,
  height: number,
  filter: OfflineFilterSettings
) {
  const srcImage = sourceCtx.getImageData(0, 0, width, height);
  const src = srcImage.data;

  if (
    filter.presetId === 'original' &&
    filter.contrast === 100 &&
    filter.sharpness === 0 &&
    filter.brightness === 100 &&
    filter.saturation === 100 &&
    filter.warmth === 0
  ) {
    destCtx.putImageData(srcImage, 0, 0);
    return;
  }

  const outImage = destCtx.createImageData(width, height);
  const dst = outImage.data;

  const contrastFactor = filter.contrast / 100;
  const brightnessOffset = (filter.brightness - 100) * 2.2;
  const lut = new Uint8ClampedArray(256);

  for (let i = 0; i < 256; i++) {
    let v = i / 255;
    if (contrastFactor > 1.02) {
      const sCurveStrength = (contrastFactor - 1) * 0.65;
      v = v - (sCurveStrength * Math.sin(2 * Math.PI * v)) / (2 * Math.PI);
    }
    v = (v - 0.5) * contrastFactor + 0.5;
    const finalVal = v * 255 + brightnessOffset;
    lut[i] = Math.min(255, Math.max(0, Math.round(finalVal)));
  }

  const satFactor = filter.saturation / 100;
  const warmthR = filter.warmth * 1.15;
  const warmthG = filter.warmth * 0.45;
  const warmthB = -filter.warmth * 1.1;

  const graded = new Uint8ClampedArray(src.length);

  for (let i = 0; i < src.length; i += 4) {
    let r = lut[src[i]] + warmthR;
    let g = lut[src[i + 1]] + warmthG;
    let b = lut[src[i + 2]] + warmthB;

    if (satFactor !== 1) {
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      r = gray + (r - gray) * satFactor;
      g = gray + (g - gray) * satFactor;
      b = gray + (b - gray) * satFactor;
    }

    graded[i] = r;
    graded[i + 1] = g;
    graded[i + 2] = b;
    graded[i + 3] = src[i + 3];
  }

  const sharpAmount = (filter.sharpness / 100) * 0.85;
  const vigStrength = filter.vignette / 100;
  const halfW = width / 2;
  const halfH = height / 2;
  const maxDistSq = halfW * halfW + halfH * halfH;

  if (sharpAmount <= 0.01) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        let vig = 1;
        if (vigStrength > 0) {
          const dx = x - halfW;
          const dy = y - halfH;
          vig = 1 - ((dx * dx + dy * dy) / maxDistSq) * vigStrength;
        }
        dst[idx] = graded[idx] * vig;
        dst[idx + 1] = graded[idx + 1] * vig;
        dst[idx + 2] = graded[idx + 2] * vig;
        dst[idx + 3] = graded[idx + 3];
      }
    }
  } else {
    const centerWeight = 1 + 4 * sharpAmount;
    const neighborWeight = -sharpAmount;
    const rowStride = width * 4;

    for (let y = 0; y < height; y++) {
      const dy = y - halfH;
      const dySq = dy * dy;
      const isEdgeY = y === 0 || y === height - 1;

      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        let vig = 1;
        if (vigStrength > 0) {
          const dx = x - halfW;
          vig = 1 - ((dx * dx + dySq) / maxDistSq) * vigStrength;
        }

        if (isEdgeY || x === 0 || x === width - 1) {
          dst[idx] = graded[idx] * vig;
          dst[idx + 1] = graded[idx + 1] * vig;
          dst[idx + 2] = graded[idx + 2] * vig;
          dst[idx + 3] = graded[idx + 3];
          continue;
        }

        const up = idx - rowStride;
        const down = idx + rowStride;
        const left = idx - 4;
        const right = idx + 4;

        const r =
          graded[idx] * centerWeight +
          (graded[up] + graded[down] + graded[left] + graded[right]) * neighborWeight;
        const g =
          graded[idx + 1] * centerWeight +
          (graded[up + 1] + graded[down + 1] + graded[left + 1] + graded[right + 1]) *
            neighborWeight;
        const b =
          graded[idx + 2] * centerWeight +
          (graded[up + 2] + graded[down + 2] + graded[left + 2] + graded[right + 2]) *
            neighborWeight;

        dst[idx] = r * vig;
        dst[idx + 1] = g * vig;
        dst[idx + 2] = b * vig;
        dst[idx + 3] = graded[idx + 3];
      }
    }
  }

  destCtx.putImageData(outImage, 0, 0);
}

export const OfflineCarpetCanvas: React.FC<OfflineCarpetCanvasProps> = ({
  item,
  filter,
  showOriginalHold,
  zoomLevel,
  fitMode,
}) => {
  const displayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const sourceCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    if (zoomLevel <= 1) {
      setPanOffset({ x: 0, y: 0 });
    }
  }, [zoomLevel, item.id]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const srcCanvas = document.createElement('canvas');
    sourceCanvasRef.current = srcCanvas;

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      if (cancelled) return;
      const maxDim = 1150;
      const scale = Math.min(
        1,
        maxDim / Math.max(img.naturalWidth || 800, img.naturalHeight || 1000)
      );
      const w = Math.max(250, Math.round((img.naturalWidth || 750) * scale));
      const h = Math.max(300, Math.round((img.naturalHeight || 1000) * scale));

      srcCanvas.width = w;
      srcCanvas.height = h;
      const sCtx = srcCanvas.getContext('2d');
      if (sCtx) {
        sCtx.drawImage(img, 0, 0, w, h);
        setLoading(false);

        const destCanvas = displayCanvasRef.current;
        if (destCanvas) {
          destCanvas.width = w;
          destCanvas.height = h;
          const dCtx = destCanvas.getContext('2d');
          if (dCtx) {
            const activeFilter: OfflineFilterSettings = showOriginalHold
              ? {
                  presetId: 'original',
                  contrast: 100,
                  sharpness: 0,
                  brightness: 100,
                  saturation: 100,
                  warmth: 0,
                  vignette: 0,
                }
              : filter;
            applyOfflineCarpetFilter(sCtx, dCtx, w, h, activeFilter);
          }
        }
      }
    };

    img.onerror = () => {
      if (!cancelled) {
        setLoading(false);
      }
    };

    img.src = item.localUrl;

    return () => {
      cancelled = true;
    };
  }, [item.id, item.localUrl]);

  useEffect(() => {
    if (loading) return;
    const srcCanvas = sourceCanvasRef.current;
    const destCanvas = displayCanvasRef.current;
    if (!srcCanvas || !destCanvas || srcCanvas.width === 0) return;

    destCanvas.width = srcCanvas.width;
    destCanvas.height = srcCanvas.height;
    const sCtx = srcCanvas.getContext('2d');
    const dCtx = destCanvas.getContext('2d');
    if (!sCtx || !dCtx) return;

    const activeFilter: OfflineFilterSettings = showOriginalHold
      ? {
          presetId: 'original',
          contrast: 100,
          sharpness: 0,
          brightness: 100,
          saturation: 100,
          warmth: 0,
          vignette: 0,
        }
      : filter;

    applyOfflineCarpetFilter(sCtx, dCtx, srcCanvas.width, srcCanvas.height, activeFilter);
  }, [filter, showOriginalHold, loading]);

  return (
    <div
      className="relative w-full h-full flex items-center justify-center overflow-hidden bg-[#0D0D0D]"
      onPointerDown={(e) => {
        if (zoomLevel > 1) {
          e.stopPropagation();
          setIsPanning(true);
          panStartRef.current = { x: e.clientX - panOffset.x, y: e.clientY - panOffset.y };
        }
      }}
      onPointerMove={(e) => {
        if (isPanning && zoomLevel > 1) {
          e.stopPropagation();
          setPanOffset({
            x: e.clientX - panStartRef.current.x,
            y: e.clientY - panStartRef.current.y,
          });
        }
      }}
      onPointerUp={() => setIsPanning(false)}
      onPointerCancel={() => setIsPanning(false)}
    >
      {loading && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#0F0F0E] gap-2.5">
          <div className="w-9 h-9 border-3 border-[#FACC15] border-t-transparent rounded-full animate-spin" />
          <span className="text-[11px] font-medium text-neutral-300">
            پردازش آفلاین تصویر فرش...
          </span>
        </div>
      )}

      <canvas
        ref={displayCanvasRef}
        style={{
          transform: `scale(${zoomLevel}) translate(${panOffset.x / zoomLevel}px, ${panOffset.y / zoomLevel}px)`,
          transition: isPanning ? 'none' : 'transform 180ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        className={`w-full h-full max-h-full max-w-full ${
          fitMode === 'cover' ? 'object-cover object-center' : 'object-contain'
        }`}
      />

      {showOriginalHold && (
        <div className="absolute top-2.5 right-2.5 z-10 bg-black/90 text-[#FACC15] border border-[#FACC15]/50 px-2.5 py-1 rounded-md text-[11px] font-semibold pointer-events-none">
          تصویر اصلی (بدون فیلتر)
        </div>
      )}
    </div>
  );
};
