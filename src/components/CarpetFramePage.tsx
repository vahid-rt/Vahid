import React, { useEffect, useState } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  ShoppingBag,
  Plus,
  Minus,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Camera,
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
  cartQuantity: number;
  onAddToCart: (item: CarpetItem) => void;
  onUpdateCartQuantity: (itemId: string, delta: number) => void;
  onNextPage?: () => void;
  onPrevPage?: () => void;
  hasNextPage?: boolean;
  hasPrevPage?: boolean;
}

export const CarpetFramePage: React.FC<CarpetFramePageProps> = ({
  item,
  filter,
  cartQuantity,
  onAddToCart,
  onUpdateCartQuantity,
  onNextPage,
  onPrevPage,
  hasNextPage = false,
  hasPrevPage = false,
}) => {
  // Slide 1 ('white') = White background 3:4 photo, Slide 2 ('perspective') = Perspective angle photo
  const [activeSlide, setActiveSlide] = useState<'white' | 'perspective'>('white');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [fitMode, setFitMode] = useState<'cover' | 'contain'>('contain');

  // Always reset to Slide 1 (White Background) and 1x zoom when switching carpets
  useEffect(() => {
    setActiveSlide('white');
    setZoomLevel(1);
  }, [item.id]);

  const toggleZoom = (e: React.MouseEvent) => {
    e.stopPropagation();
    setZoomLevel((prev) => (prev === 1 ? 1.75 : 1));
  };

  const toggleFitMode = (e: React.MouseEvent) => {
    e.stopPropagation();
    setZoomLevel(1);
    setFitMode((prev) => (prev === 'contain' ? 'cover' : 'contain'));
  };

  const dimensionsText =
    item.lengthCm && item.widthCm
      ? `${toPersianDigits(item.lengthCm)}×${toPersianDigits(item.widthCm)} سانتی‌متر`
      : item.sizeLabel;

  return (
    <div className="relative w-full h-full flex flex-col justify-between overflow-hidden bg-gradient-to-b from-[#07111E] via-[#0B192C] to-[#07111E] pt-14 pb-2.5 px-2.5">
      {/* TOP BAR BELOW HEADER: 2-SLIDE SWITCHER + PERSIAN ZOOM BUTTONS */}
      <div
        className="relative z-20 flex flex-col gap-1.5 shrink-0 mb-1.5"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {/* Row A: 2-Slide Segmented Selector (اسلاید ۱: بک‌گراند سفید | اسلاید ۲: زاویه پرسپکتیو) */}
        <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-[#0B192C]/80 backdrop-blur-xl border border-white/20 shadow-lg">
          <button
            type="button"
            onClick={() => {
              setActiveSlide('white');
              setZoomLevel(1);
            }}
            className={`h-9 px-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition cursor-pointer ${
              activeSlide === 'white'
                ? 'bg-white text-[#0B192C] shadow-md'
                : 'text-slate-200 hover:bg-white/10'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5 shrink-0" />
            <span>اسلاید ۱: از بالا (زمینه سفید)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveSlide('perspective');
              setZoomLevel(1);
            }}
            className={`h-9 px-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition cursor-pointer ${
              activeSlide === 'perspective'
                ? 'bg-white text-[#0B192C] shadow-md'
                : 'text-slate-200 hover:bg-white/10'
            }`}
          >
            <Camera className="w-3.5 h-3.5 shrink-0" />
            <span>اسلاید ۲: زاویه پرسپکتیو</span>
          </button>
        </div>

        {/* Row B: Larger Zoom & Frame Fit Buttons with Explicit Persian Labels */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={toggleZoom}
              className={`h-8 px-3 rounded-xl backdrop-blur-xl border text-[11px] font-bold flex items-center gap-1.5 transition shadow-md cursor-pointer ${
                zoomLevel > 1
                  ? 'bg-white text-[#0B192C] border-white'
                  : 'bg-[#0B192C]/75 hover:bg-[#13294B]/90 text-white border-white/25'
              }`}
            >
              {zoomLevel > 1 ? (
                <>
                  <ZoomOut className="w-3.5 h-3.5 shrink-0" />
                  <span>بستن بزرگ‌نمایی</span>
                </>
              ) : (
                <>
                  <ZoomIn className="w-3.5 h-3.5 shrink-0 text-sky-300" />
                  <span>بزرگ‌نمایی بافت</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={toggleFitMode}
              className={`h-8 px-3 rounded-xl backdrop-blur-xl border text-[11px] font-bold flex items-center gap-1.5 transition shadow-md cursor-pointer ${
                fitMode === 'cover'
                  ? 'bg-white text-[#0B192C] border-white'
                  : 'bg-[#0B192C]/75 hover:bg-[#13294B]/90 text-white border-white/25'
              }`}
            >
              {fitMode === 'contain' ? (
                <>
                  <Maximize2 className="w-3.5 h-3.5 shrink-0 text-sky-300" />
                  <span>پر کردن کادر ۳:۴</span>
                </>
              ) : (
                <>
                  <Minimize2 className="w-3.5 h-3.5 shrink-0" />
                  <span>نمای کامل فرش</span>
                </>
              )}
            </button>
          </div>

          {/* Slide Dots Indicator */}
          <button
            type="button"
            onClick={() =>
              setActiveSlide((prev) => (prev === 'white' ? 'perspective' : 'white'))
            }
            className="h-8 px-2.5 rounded-xl bg-[#0B192C]/75 backdrop-blur-xl border border-white/20 text-[11px] font-bold text-sky-200 flex items-center gap-1.5 cursor-pointer"
            title="تغییر اسلاید عکس"
          >
            <span>عکس {activeSlide === 'white' ? '۱ از ۲' : '۲ از ۲'}</span>
            <span className="flex items-center gap-1">
              <span
                className={`w-2 h-2 rounded-full transition-all ${
                  activeSlide === 'white' ? 'bg-white scale-110' : 'bg-white/30'
                }`}
              />
              <span
                className={`w-2 h-2 rounded-full transition-all ${
                  activeSlide === 'perspective' ? 'bg-white scale-110' : 'bg-white/30'
                }`}
              />
            </span>
          </button>
        </div>
      </div>

      {/* CENTER: DEDICATED 3:4 PORTRAIT CARPET FRAME */}
      <div className="relative flex-1 min-h-0 w-full flex items-center justify-center overflow-hidden my-0.5">
        <div className="relative aspect-[3/4] h-full max-h-full max-w-full rounded-2xl overflow-hidden shadow-[0_18px_50px_rgba(0,0,0,0.75)] bg-[#07111E] border-2 border-white/30">
          <OfflineCarpetCanvas
            item={item}
            activeSlide={activeSlide}
            filter={filter}
            zoomLevel={zoomLevel}
            fitMode={fitMode}
          />

          {/* Quick Side Pill inside 3:4 Frame to Toggle Between Slide 1 & Slide 2 */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setActiveSlide((prev) => (prev === 'white' ? 'perspective' : 'white'));
              setZoomLevel(1);
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="absolute top-2.5 right-2.5 z-20 px-2.5 py-1 rounded-xl bg-[#0B192C]/85 hover:bg-[#0B192C] backdrop-blur-md text-white border border-white/25 text-[11px] font-bold flex items-center gap-1.5 shadow-md transition cursor-pointer"
          >
            {activeSlide === 'white' ? (
              <>
                <Camera className="w-3.5 h-3.5 text-sky-300" />
                <span>مشاهده عکس پرسپکتیو (اسلاید ۲)</span>
              </>
            ) : (
              <>
                <ImageIcon className="w-3.5 h-3.5 text-sky-300" />
                <span>مشاهده عکس از بالا زمینه سفید (اسلاید ۱)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* BOTTOM: FROSTED MATTE GLASS NAVY BLUE & WHITE INFO + CART OVERLAY */}
      <div
        className="relative z-20 shrink-0 rounded-2xl bg-[#0B192C]/80 backdrop-blur-xl border border-white/20 px-3.5 py-2.5 shadow-[0_12px_36px_rgba(0,0,0,0.65)] flex flex-col gap-2 mt-1"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {/* Row 1: Carpet Persian Name, Size & Dimensions, and Code Badge */}
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-5 bg-white rounded-full shrink-0" />
              <h2 className="text-base font-extrabold text-white tracking-tight truncate">
                نقش {item.persianName}
              </h2>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-200 truncate mt-0.5 pr-3.5">
              <span className="text-sky-200 font-bold">{item.sizeLabel}</span>
              <span className="opacity-50">·</span>
              <span className="tabular-nums text-white">{dimensionsText}</span>
              <span className="opacity-50">·</span>
              <span className="text-slate-300">{item.categoryLabel}</span>
            </div>
          </div>

          {/* Frosted White/Navy Code Tag */}
          <div className="px-2.5 py-1.5 rounded-xl bg-white/15 backdrop-blur-md border border-white/30 text-white shrink-0 text-left">
            <span className="text-[9px] text-sky-200 block leading-none mb-0.5">کد فرش</span>
            <span className="font-mono-code text-xs font-extrabold tracking-wider block leading-none">
              {item.code}
            </span>
          </div>
        </div>

        {/* Row 2: Prev / Add to Cart / Next Controls */}
        <div className="flex items-center justify-between gap-2">
          {/* Prev Carpet Button */}
          <button
            type="button"
            onClick={onPrevPage}
            disabled={!hasPrevPage}
            className={`h-9 px-3 rounded-xl text-xs font-bold flex items-center gap-1 transition shrink-0 ${
              !hasPrevPage
                ? 'opacity-30 pointer-events-none bg-white/5 text-slate-400 border border-white/10'
                : 'bg-white/15 hover:bg-white/25 text-white border border-white/25 active:scale-95 cursor-pointer'
            }`}
          >
            <ChevronRight className="w-4 h-4" />
            <span>فرش قبلی</span>
          </button>

          {/* Center: Crisp White & Navy Add to Cart Button */}
          {cartQuantity === 0 ? (
            <button
              type="button"
              onClick={() => onAddToCart(item)}
              className="flex-1 h-9 px-3 rounded-xl bg-white hover:bg-slate-100 text-[#0B192C] text-xs font-extrabold flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer shadow-md"
            >
              <ShoppingBag className="w-3.5 h-3.5 text-[#0B192C]" />
              <span>افزودن به سبد خرید</span>
            </button>
          ) : (
            <div className="flex-1 h-9 px-2 rounded-xl bg-white text-[#0B192C] flex items-center justify-between shadow-md">
              <button
                type="button"
                onClick={() => onUpdateCartQuantity(item.id, 1)}
                className="w-6 h-6 rounded-lg bg-[#0B192C] text-white flex items-center justify-center active:scale-90 cursor-pointer"
                title="افزایش تعداد"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs font-extrabold tabular-nums">
                {toPersianDigits(cartQuantity)} تخته در سبد
              </span>
              <button
                type="button"
                onClick={() => onUpdateCartQuantity(item.id, -1)}
                className="w-6 h-6 rounded-lg bg-slate-200 hover:bg-[#0B192C] hover:text-white text-[#0B192C] flex items-center justify-center active:scale-90 cursor-pointer"
                title="کاهش یا حذف"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Next Carpet Button */}
          <button
            type="button"
            onClick={onNextPage}
            disabled={!hasNextPage}
            className={`h-9 px-3 rounded-xl text-xs font-bold flex items-center gap-1 transition shrink-0 ${
              !hasNextPage
                ? 'opacity-30 pointer-events-none bg-white/5 text-slate-400 border border-white/10'
                : 'bg-white/15 hover:bg-white/25 text-white border border-white/25 active:scale-95 cursor-pointer'
            }`}
          >
            <span>فرش بعدی</span>
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
