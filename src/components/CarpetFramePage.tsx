import React, { useState } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Eye,
  Maximize2,
  Minimize2,
  ShoppingBag,
  Plus,
  Minus,
} from 'lucide-react';
import { OfflineFilterSettings, toPersianDigits } from '../services/carpetNaming';
import { CarpetItem } from '../services/driveService';
import { OfflineCarpetCanvas } from './OfflineCarpetCanvas';

export type FrameTemplateStyle = 'ivory_gold' | 'obsidian_yellow' | 'saffron_modern';

interface CarpetFramePageProps {
  item: CarpetItem;
  pageNumber: number;
  totalPages: number;
  filter: OfflineFilterSettings;
  frameStyle: FrameTemplateStyle;
  cartQuantity: number;
  onAddToCart: (item: CarpetItem) => void;
  onUpdateCartQuantity: (itemId: string, delta: number) => void;
}

export const CarpetFramePage: React.FC<CarpetFramePageProps> = ({
  item,
  pageNumber,
  totalPages,
  filter,
  frameStyle,
  cartQuantity,
  onAddToCart,
  onUpdateCartQuantity,
}) => {
  const [showOriginalHold, setShowOriginalHold] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [fitMode, setFitMode] = useState<'cover' | 'contain'>('cover');

  const toggleZoom = (e: React.MouseEvent) => {
    e.stopPropagation();
    setZoomLevel((prev) => (prev === 1 ? 1.85 : 1));
  };

  const toggleFitMode = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFitMode((prev) => (prev === 'cover' ? 'contain' : 'cover'));
  };

  const frameTheme = {
    ivory_gold: {
      outerBg: 'bg-[#FAF9F5] text-[#0A0A0A] border-2 border-[#FACC15]',
      innerBorder: 'border border-[#0A0A0A]/25',
      imageWellBg: 'bg-[#0E0E0E] border-2 border-[#0A0A0A]',
      plaqueBg: 'bg-[#FFFFFF] border-t-2 border-[#0A0A0A]',
      titleColor: 'text-[#0A0A0A]',
      metaColor: 'text-neutral-600',
      codeBox: 'bg-[#0A0A0A] text-[#FACC15] border border-[#FACC15]',
      cornerMark: 'border-[#0A0A0A]',
      controlBtn: 'bg-neutral-100 hover:bg-[#FACC15] text-[#0A0A0A] border border-neutral-300',
      cartBtn: 'bg-[#0A0A0A] hover:bg-neutral-800 text-[#FACC15] border border-[#FACC15]',
    },
    obsidian_yellow: {
      outerBg: 'bg-[#111111] text-white border-2 border-[#FACC15]',
      innerBorder: 'border border-[#FACC15]/35',
      imageWellBg: 'bg-[#070707] border-2 border-[#FACC15]/80',
      plaqueBg: 'bg-[#161616] border-t-2 border-[#FACC15]',
      titleColor: 'text-white',
      metaColor: 'text-neutral-400',
      codeBox: 'bg-[#FACC15] text-[#0A0A0A] border border-white/20',
      cornerMark: 'border-[#FACC15]',
      controlBtn: 'bg-neutral-800 hover:bg-[#FACC15] hover:text-black text-neutral-200 border border-neutral-700',
      cartBtn: 'bg-[#FACC15] hover:bg-yellow-300 text-[#0A0A0A] border border-white/20',
    },
    saffron_modern: {
      outerBg: 'bg-[#FACC15] text-[#0A0A0A] border-2 border-white',
      innerBorder: 'border border-[#0A0A0A]/30',
      imageWellBg: 'bg-[#0A0A0A] border-2 border-[#0A0A0A]',
      plaqueBg: 'bg-[#0A0A0A] text-white border-t-2 border-[#0A0A0A]',
      titleColor: 'text-[#FACC15]',
      metaColor: 'text-neutral-300',
      codeBox: 'bg-white text-[#0A0A0A] border border-[#FACC15]',
      cornerMark: 'border-[#0A0A0A]',
      controlBtn: 'bg-neutral-800 hover:bg-white hover:text-black text-white border border-neutral-700',
      cartBtn: 'bg-[#FACC15] hover:bg-yellow-300 text-[#0A0A0A] border border-black',
    },
  }[frameStyle];

  const dimensionsText =
    item.lengthCm && item.widthCm
      ? `${toPersianDigits(item.lengthCm)}×${toPersianDigits(item.widthCm)} سانتی‌متر`
      : item.sizeLabel;

  return (
    <div
      className={`relative w-full h-full rounded-2xl p-2 flex flex-col justify-between shadow-[0_16px_40px_rgba(0,0,0,0.75)] transition-colors duration-200 ${frameTheme.outerBg}`}
    >
      <div className={`relative w-full h-full rounded-xl flex flex-col overflow-hidden ${frameTheme.innerBorder}`}>
        <span className={`pointer-events-none absolute top-1.5 right-1.5 w-2.5 h-2.5 border-t-2 border-r-2 z-20 ${frameTheme.cornerMark}`} />
        <span className={`pointer-events-none absolute top-1.5 left-1.5 w-2.5 h-2.5 border-t-2 border-l-2 z-20 ${frameTheme.cornerMark}`} />

        {/* ZONE 1: Dedicated Carpet Photo Well (بدون هیچ متن مزاحم روی عکس فرش) */}
        <div className={`relative flex-1 min-h-0 w-full overflow-hidden ${frameTheme.imageWellBg}`}>
          <OfflineCarpetCanvas
            item={item}
            filter={filter}
            showOriginalHold={showOriginalHold}
            zoomLevel={zoomLevel}
            fitMode={fitMode}
          />
        </div>

        {/* ZONE 2: Dedicated Plaque Inside the Frame Below the Photo (مشخصات، متراژ و افزودن به سبد خرید) */}
        <div
          className={`shrink-0 px-3 py-2.5 flex flex-col gap-2 transition-colors ${frameTheme.plaqueBg}`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Row 1: Two-Word Persian Name + Size/Dimensions (Right) & Carpet Code (Left) */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-1.5 h-8 bg-[#FACC15] rounded-full shrink-0" />
              <div className="min-w-0">
                <h2
                  className={`text-lg font-bold tracking-tight truncate leading-tight ${frameTheme.titleColor}`}
                >
                  نقش {item.persianName}
                </h2>
                <div className={`flex items-center gap-1.5 text-[11px] font-medium truncate mt-0.5 ${frameTheme.metaColor}`}>
                  <strong className={frameTheme.titleColor}>{item.sizeLabel}</strong>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">{dimensionsText}</span>
                  <span aria-hidden="true">·</span>
                  <span>{item.categoryLabel}</span>
                </div>
              </div>
            </div>

            {/* Read-only Carpet Code Plaque */}
            <div
              className={`px-2.5 py-1.5 rounded-lg flex flex-col text-left shrink-0 shadow-sm ${frameTheme.codeBox}`}
            >
              <span className="text-[8px] uppercase tracking-wider opacity-75 font-semibold leading-none mb-0.5">
                کد فرش
              </span>
              <span className="font-mono-code text-xs font-bold tracking-wider leading-none">
                {item.code}
              </span>
            </div>
          </div>

          {/* Row 2: Add to Cart Button + Image View Tools */}
          <div className="flex items-center justify-between gap-1.5 pt-1.5 border-t border-current/10">
            {/* Add to Cart / Quantity Selector */}
            {cartQuantity === 0 ? (
              <button
                type="button"
                onClick={() => onAddToCart(item)}
                className={`min-h-[36px] px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer shrink-0 shadow-sm ${frameTheme.cartBtn}`}
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>افزودن به سبد خرید</span>
              </button>
            ) : (
              <div className="min-h-[36px] px-2 py-1 rounded-lg bg-[#FACC15] text-black border border-black/20 flex items-center gap-2 shrink-0 shadow-sm">
                <button
                  type="button"
                  onClick={() => onUpdateCartQuantity(item.id, 1)}
                  className="w-6 h-6 rounded bg-black text-[#FACC15] flex items-center justify-center active:scale-90 cursor-pointer"
                  title="افزایش تعداد"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
                <span className="text-xs font-bold tabular-nums px-1">
                  {toPersianDigits(cartQuantity)} تخته در سبد
                </span>
                <button
                  type="button"
                  onClick={() => onUpdateCartQuantity(item.id, -1)}
                  className="w-6 h-6 rounded bg-black/15 hover:bg-black hover:text-white text-black flex items-center justify-center active:scale-90 cursor-pointer"
                  title="کاهش یا حذف"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* View Controls (Hold Compare, Fit Mode, Zoom, Page Counter) */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onPointerDown={() => setShowOriginalHold(true)}
                onPointerUp={() => setShowOriginalHold(false)}
                onPointerLeave={() => setShowOriginalHold(false)}
                title="نگه‌دارید: مقایسه قبل از فیلتر آفلاین"
                className={`min-h-[34px] px-2 rounded-lg text-[10px] font-medium flex items-center justify-center gap-1 transition-colors whitespace-nowrap ${frameTheme.controlBtn}`}
              >
                <Eye className="w-3.5 h-3.5 shrink-0" />
                <span>قبل فیلتر</span>
              </button>

              <button
                type="button"
                onClick={toggleFitMode}
                title={fitMode === 'cover' ? 'نمایش کامل عکس' : 'پر کردن قاب'}
                className={`min-h-[34px] px-2 rounded-lg text-[10px] font-medium flex items-center justify-center gap-1 transition-colors whitespace-nowrap ${frameTheme.controlBtn}`}
              >
                {fitMode === 'cover' ? (
                  <Minimize2 className="w-3.5 h-3.5 shrink-0" />
                ) : (
                  <Maximize2 className="w-3.5 h-3.5 shrink-0" />
                )}
              </button>

              <button
                type="button"
                onClick={toggleZoom}
                title="ذره‌بین بافت فرش"
                className={`min-h-[34px] px-2 rounded-lg text-[10px] font-medium flex items-center justify-center gap-1 transition-colors whitespace-nowrap ${frameTheme.controlBtn}`}
              >
                {zoomLevel > 1 ? (
                  <ZoomOut className="w-3.5 h-3.5 shrink-0" />
                ) : (
                  <ZoomIn className="w-3.5 h-3.5 shrink-0" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
