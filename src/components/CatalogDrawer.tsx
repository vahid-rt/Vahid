import React, { useMemo } from 'react';
import {
  X,
  BookOpen,
  Search,
  Ruler,
  Layers,
  Plus,
  Check,
} from 'lucide-react';
import {
  PATTERN_CATEGORIES,
  PatternCategory,
  SIZE_CATEGORIES,
  SizeCategory,
  toPersianDigits,
} from '../services/carpetNaming';
import { CarpetItem, CartItem } from '../services/driveService';

interface CatalogDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  allItems: CarpetItem[];
  filteredItems: CarpetItem[];
  selectedSize: SizeCategory;
  onSelectSize: (size: SizeCategory) => void;
  selectedCategory: PatternCategory;
  onSelectCategory: (cat: PatternCategory) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  currentPageIndex: number;
  onJumpToPage: (index: number) => void;
  cart: CartItem[];
  onAddToCart: (item: CarpetItem) => void;
}

export const CatalogDrawer: React.FC<CatalogDrawerProps> = ({
  isOpen,
  onClose,
  allItems,
  filteredItems,
  selectedSize,
  onSelectSize,
  selectedCategory,
  onSelectCategory,
  searchQuery,
  onSearchChange,
  currentPageIndex,
  onJumpToPage,
  cart,
  onAddToCart,
}) => {
  const sizeCounts = useMemo(() => {
    const counts: Record<SizeCategory, number> = {
      all: allItems.length,
      '4': 0,
      '6': 0,
      '7.5': 0,
      '9': 0,
    };
    allItems.forEach((it) => {
      if (counts[it.sizeCategory] !== undefined) {
        counts[it.sizeCategory] += 1;
      }
    });
    return counts;
  }, [allItems]);

  const patternCounts = useMemo(() => {
    const counts: Record<PatternCategory, number> = {
      all: allItems.length,
      afshan: 0,
      toranj: 0,
      kheshti: 0,
      minimal: 0,
    };
    allItems.forEach((it) => {
      if (counts[it.category] !== undefined) {
        counts[it.category] += 1;
      }
    });
    return counts;
  }, [allItems]);

  const cartIds = useMemo(() => new Set(cart.map((c) => c.carpet.id)), [cart]);

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-50 flex justify-start overflow-hidden" dir="rtl">
      {/* Frosted Backdrop */}
      <div
        className="absolute inset-0 bg-[#050C16]/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Slide-out Frosted Matte Glass Navy Blue & White Drawer */}
      <aside className="relative z-10 w-[88%] max-w-[365px] h-full bg-[#0B192C]/90 backdrop-blur-2xl text-white border-l border-white/25 flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.8)]">
        {/* Drawer Header */}
        <div className="px-4 py-3.5 bg-white/5 border-b border-white/15 flex items-center justify-between">
          <div>
            <h2 className="text-base font-extrabold text-white tracking-tight">
              آلبوم‌های متراژ و طرح فرش
            </h2>
            <p className="text-[11px] text-sky-200 mt-0.5">
              مجموعه کامل {toPersianDigits(allItems.length)} تخته فرش پشمی
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-w-[38px] min-h-[38px] rounded-xl bg-white/10 hover:bg-white hover:text-[#0B192C] border border-white/20 flex items-center justify-center transition-colors cursor-pointer"
            aria-label="بستن منو"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Albums Content (No photo filter tabs) */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* Section 1: Albums by Carpet Size (متراژ: ۴، ۶، ۷.۵ و ۹ متری) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold text-sky-200 flex items-center gap-1.5">
                <Ruler className="w-4 h-4" />
                <span>انتخاب آلبوم بر اساس متراژ</span>
              </h3>
              {selectedSize !== 'all' && (
                <button
                  type="button"
                  onClick={() => onSelectSize('all')}
                  className="text-[11px] text-slate-300 hover:text-white underline cursor-pointer"
                >
                  همه متراژها
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              {SIZE_CATEGORIES.map((sz) => {
                const active = selectedSize === sz.id;
                const count = sizeCounts[sz.id];
                return (
                  <button
                    key={sz.id}
                    type="button"
                    onClick={() => {
                      onSelectSize(sz.id);
                      if (sz.id !== 'all') onClose();
                    }}
                    className={`p-2.5 rounded-xl border text-right flex flex-col justify-between transition-all cursor-pointer ${
                      sz.id === 'all' ? 'col-span-2 flex-row items-center' : ''
                    } ${
                      active
                        ? 'bg-white text-[#0B192C] border-white font-extrabold shadow-md'
                        : 'bg-white/10 text-white border-white/15 hover:bg-white/15 hover:border-white/30'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-extrabold">{sz.label}</span>
                      <span
                        className={`text-[11px] tabular-nums px-2 py-0.5 rounded-lg font-bold ${
                          active
                            ? 'bg-[#0B192C] text-white'
                            : 'bg-white/15 text-sky-200'
                        }`}
                      >
                        {toPersianDigits(count)}
                      </span>
                    </div>
                    {sz.id !== 'all' && (
                      <span
                        className={`text-[10px] mt-1 ${
                          active ? 'text-[#0B192C]/80 font-medium' : 'text-slate-300'
                        }`}
                      >
                        {sz.desc}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Albums by Carpet Design Pattern (نوع طرح و نقش) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold text-sky-200 flex items-center gap-1.5">
                <Layers className="w-4 h-4" />
                <span>انتخاب آلبوم بر اساس نوع طرح</span>
              </h3>
              {selectedCategory !== 'all' && (
                <button
                  type="button"
                  onClick={() => onSelectCategory('all')}
                  className="text-[11px] text-slate-300 hover:text-white underline cursor-pointer"
                >
                  همه طرح‌ها
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-1.5">
              {PATTERN_CATEGORIES.map((pat) => {
                const active = selectedCategory === pat.id;
                const count = patternCounts[pat.id];
                return (
                  <button
                    key={pat.id}
                    type="button"
                    onClick={() => {
                      onSelectCategory(pat.id);
                      if (pat.id !== 'all') onClose();
                    }}
                    className={`min-h-[42px] px-3.5 py-2 rounded-xl border text-right flex items-center justify-between transition-all cursor-pointer ${
                      active
                        ? 'bg-white text-[#0B192C] border-white font-extrabold shadow-md'
                        : 'bg-white/10 text-white border-white/15 hover:bg-white/15 hover:border-white/30'
                    }`}
                  >
                    <span className="text-xs font-bold">{pat.label}</span>
                    <span
                      className={`text-[11px] tabular-nums px-2 py-0.5 rounded-lg font-bold ${
                        active
                          ? 'bg-[#0B192C] text-white'
                          : 'bg-white/15 text-sky-200'
                      }`}
                    >
                      {toPersianDigits(count)} تخته
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 3: Search & Quick Carpet List */}
          <div className="space-y-2.5 pt-2 border-t border-white/15">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold text-white flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-sky-300" />
                <span>فرش‌های این آلبوم ({toPersianDigits(filteredItems.length)} مورد)</span>
              </h3>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-300 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="جستجوی نام نقش، کد فرش یا ابعاد..."
                className="w-full h-10 pr-9 pl-3 rounded-xl bg-white/10 border border-white/20 text-xs text-white placeholder:text-slate-300 focus:border-white focus:outline-none"
              />
            </div>

            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-0.5">
              {filteredItems.map((carpet, idx) => {
                const isCurrent = idx === currentPageIndex;
                const inCart = cartIds.has(carpet.id);
                return (
                  <div
                    key={carpet.id}
                    className={`w-full min-h-[54px] p-2 rounded-xl border flex items-center justify-between gap-2 transition-colors ${
                      isCurrent
                        ? 'bg-white/20 border-white text-white'
                        : 'bg-white/5 border-white/10 text-slate-200 hover:bg-white/15'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        onJumpToPage(idx);
                        onClose();
                      }}
                      className="flex-1 flex items-center gap-2.5 min-w-0 text-right cursor-pointer"
                    >
                      <img
                        src={carpet.localUrl}
                        alt={carpet.persianName}
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          const fallback = `https://drive.google.com/thumbnail?id=${carpet.id}&sz=w300`;
                          if (e.currentTarget.src !== fallback) {
                            e.currentTarget.src = fallback;
                          }
                        }}
                        className="w-10 h-11 rounded-lg object-cover border border-white/25 shrink-0 bg-[#07111E]"
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-bold truncate">
                          {toPersianDigits(idx + 1)}. نقش {carpet.persianName}
                        </div>
                        <div className="text-[10px] text-slate-300 truncate mt-0.5">
                          <span className="text-sky-200 font-bold">
                            {carpet.sizeLabel}
                          </span>
                          <span> · </span>
                          <span className="tabular-nums">
                            {carpet.lengthCm && carpet.widthCm
                              ? `${toPersianDigits(carpet.lengthCm)}×${toPersianDigits(carpet.widthCm)}`
                              : ''}
                          </span>
                        </div>
                      </div>
                    </button>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="font-mono-code text-[11px] font-bold px-2 py-1 rounded-lg bg-white/15 text-white border border-white/25">
                        {carpet.code}
                      </span>
                      <button
                        type="button"
                        onClick={() => onAddToCart(carpet)}
                        title="افزودن به سبد خرید"
                        className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                          inCart
                            ? 'bg-white text-[#0B192C] font-bold'
                            : 'bg-white/15 hover:bg-white hover:text-[#0B192C] text-white'
                        }`}
                      >
                        {inCart ? (
                          <Check className="w-3.5 h-3.5" />
                        ) : (
                          <Plus className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
};
