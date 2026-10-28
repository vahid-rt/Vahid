import React, { useMemo, useState } from 'react';
import {
  X,
  Sliders,
  Sparkles,
  Frame,
  CheckCircle2,
  BookOpen,
  Search,
  Ruler,
  Layers,
  Plus,
  Check,
} from 'lucide-react';
import {
  FILTER_PRESETS,
  OfflineFilterSettings,
  PATTERN_CATEGORIES,
  PatternCategory,
  SIZE_CATEGORIES,
  SizeCategory,
  toPersianDigits,
} from '../services/carpetNaming';
import { CarpetItem, CartItem } from '../services/driveService';
import { FrameTemplateStyle } from './CarpetFramePage';

interface CatalogDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  allItems: CarpetItem[];
  filteredItems: CarpetItem[];
  // Size & Pattern Album Filters
  selectedSize: SizeCategory;
  onSelectSize: (size: SizeCategory) => void;
  selectedCategory: PatternCategory;
  onSelectCategory: (cat: PatternCategory) => void;
  // Search & Quick Jump
  searchQuery: string;
  onSearchChange: (q: string) => void;
  currentPageIndex: number;
  onJumpToPage: (index: number) => void;
  // Cart
  cart: CartItem[];
  onAddToCart: (item: CarpetItem) => void;
  // Offline Image Filter & Frame Template
  filter: OfflineFilterSettings;
  onUpdateFilter: (next: OfflineFilterSettings) => void;
  frameStyle: FrameTemplateStyle;
  onSelectFrameStyle: (style: FrameTemplateStyle) => void;
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
  filter,
  onUpdateFilter,
  frameStyle,
  onSelectFrameStyle,
}) => {
  const [activeTab, setActiveTab] = useState<'albums' | 'filters'>('albums');

  // Compute exact counts per size and per pattern
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
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Slide-out Drawer Panel inside Mobile Viewport */}
      <aside className="relative z-10 w-[88%] max-w-[365px] h-full bg-[#0E0E0E] text-white border-l-2 border-[#FACC15] flex flex-col shadow-2xl">
        {/* Drawer Header */}
        <div className="px-4 py-3.5 bg-[#141414] border-b border-neutral-800 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#FACC15] tracking-tight">
              آلبوم‌های فرش و فیلترها
            </h2>
            <p className="text-[11px] text-neutral-400">
              دسته‌بندی بر اساس متراژ و نوع طرح · {toPersianDigits(allItems.length)} تخته فرش
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-w-[40px] min-h-[40px] rounded-xl bg-neutral-800 hover:bg-[#FACC15] hover:text-black flex items-center justify-center transition-colors cursor-pointer"
            aria-label="بستن منو"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Segmented Navigation Tabs */}
        <div className="p-2.5 bg-[#111111] border-b border-neutral-800 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('albums')}
            className={`min-h-[42px] px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'albums'
                ? 'bg-[#FACC15] text-black shadow-md'
                : 'bg-neutral-900 text-neutral-300 hover:bg-neutral-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>آلبوم طرح و متراژ ({toPersianDigits(filteredItems.length)})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('filters')}
            className={`min-h-[42px] px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'filters'
                ? 'bg-[#FACC15] text-black shadow-md'
                : 'bg-neutral-900 text-neutral-300 hover:bg-neutral-800'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>فیلتر تصویر و قاب</span>
          </button>
        </div>

        {/* Scrollable Drawer Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {activeTab === 'albums' ? (
            <>
              {/* Section 1: Albums by Carpet Size (متراژ: ۴، ۶، ۷.۵ و ۹ متری) */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-[#FACC15] flex items-center gap-1.5">
                    <Ruler className="w-4 h-4" />
                    <span>آلبوم بر اساس متراژ فرش</span>
                  </h3>
                  {selectedSize !== 'all' && (
                    <button
                      type="button"
                      onClick={() => onSelectSize('all')}
                      className="text-[11px] text-neutral-400 hover:text-white underline"
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
                        onClick={() => onSelectSize(sz.id)}
                        className={`p-2.5 rounded-xl border text-right flex flex-col justify-between transition-all cursor-pointer ${
                          sz.id === 'all' ? 'col-span-2 flex-row items-center' : ''
                        } ${
                          active
                            ? 'bg-[#FACC15] text-black border-[#FACC15] font-bold shadow-sm'
                            : 'bg-[#161616] text-neutral-200 border-neutral-800 hover:border-neutral-600'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="text-xs font-bold">{sz.label}</span>
                          <span
                            className={`text-[11px] tabular-nums px-1.5 py-0.5 rounded ${
                              active ? 'bg-black text-[#FACC15]' : 'bg-neutral-800 text-neutral-300'
                            }`}
                          >
                            {toPersianDigits(count)}
                          </span>
                        </div>
                        {sz.id !== 'all' && (
                          <span
                            className={`text-[10px] mt-1 ${
                              active ? 'text-black/80' : 'text-neutral-400'
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
                  <h3 className="text-xs font-bold text-[#FACC15] flex items-center gap-1.5">
                    <Layers className="w-4 h-4" />
                    <span>آلبوم بر اساس نوع طرح و نقش</span>
                  </h3>
                  {selectedCategory !== 'all' && (
                    <button
                      type="button"
                      onClick={() => onSelectCategory('all')}
                      className="text-[11px] text-neutral-400 hover:text-white underline"
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
                        onClick={() => onSelectCategory(pat.id)}
                        className={`min-h-[42px] px-3.5 py-2 rounded-xl border text-right flex items-center justify-between transition-all cursor-pointer ${
                          active
                            ? 'bg-white text-black border-2 border-[#FACC15] font-bold shadow-sm'
                            : 'bg-[#161616] text-neutral-200 border-neutral-800 hover:border-neutral-600'
                        }`}
                      >
                        <span className="text-xs font-bold">{pat.label}</span>
                        <span
                          className={`text-[11px] tabular-nums px-2 py-0.5 rounded-md ${
                            active
                              ? 'bg-black text-[#FACC15] font-bold'
                              : 'bg-neutral-800 text-neutral-300'
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
              <div className="space-y-2.5 pt-1 border-t border-neutral-800">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-[#FACC15]" />
                    <span>فرش‌های این دسته ({toPersianDigits(filteredItems.length)} مورد)</span>
                  </h3>
                </div>

                <div className="relative">
                  <Search className="w-4 h-4 text-neutral-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder="جستجوی نام نقش، کد فرش یا ابعاد..."
                    className="w-full h-10 pr-9 pl-3 rounded-xl bg-[#161616] border border-neutral-800 text-xs text-white placeholder:text-neutral-500 focus:border-[#FACC15] focus:outline-none"
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
                            ? 'bg-[#1F1E18] border-[#FACC15] text-white'
                            : 'bg-[#141414] border-neutral-800/80 text-neutral-300 hover:bg-neutral-800/60'
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
                            className="w-10 h-11 rounded-md object-cover border border-neutral-700 shrink-0 bg-black"
                          />
                          <div className="min-w-0">
                            <div className="text-xs font-bold truncate">
                              {toPersianDigits(idx + 1)}. نقش {carpet.persianName}
                            </div>
                            <div className="text-[10px] text-neutral-400 truncate mt-0.5">
                              <span className="text-[#FACC15] font-semibold">
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
                          <span className="font-mono-code text-[11px] font-bold px-2 py-1 rounded bg-black text-[#FACC15] border border-[#FACC15]/40">
                            {carpet.code}
                          </span>
                          <button
                            type="button"
                            onClick={() => onAddToCart(carpet)}
                            title="افزودن به سبد خرید"
                            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                              inCart
                                ? 'bg-[#FACC15] text-black font-bold'
                                : 'bg-neutral-800 hover:bg-[#FACC15] hover:text-black text-white'
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
            </>
          ) : (
            <>
              {/* Tab 2: Selectable Offline Photo Filters & Frame Style */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-[#FACC15] flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" />
                  <span>انتخاب فیلتر آفلاین کیفیت و کنتراست عکس</span>
                </h3>
                <p className="text-[11px] text-neutral-400 leading-relaxed">
                  یکی از فیلترهای آماده زیر را برای بهبود کنتراست و وضوح بافت پشم انتخاب کنید:
                </p>

                <div className="space-y-2">
                  {FILTER_PRESETS.map((preset) => {
                    const isSelected = filter.presetId === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          onUpdateFilter({
                            presetId: preset.id,
                            ...preset.settings,
                          });
                        }}
                        className={`w-full p-3.5 rounded-xl border text-right flex items-center justify-between transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-[#1D1B10] border-[#FACC15] text-white'
                            : 'bg-[#161616] border-neutral-800 text-neutral-300 hover:border-neutral-600'
                        }`}
                      >
                        <div>
                          <div className="text-xs sm:text-sm font-bold">{preset.name}</div>
                          <div className="text-[11px] text-neutral-400 mt-0.5">
                            {preset.subtitle}
                          </div>
                        </div>
                        {isSelected && (
                          <CheckCircle2 className="w-5 h-5 text-[#FACC15] shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2.5 pt-2 border-t border-neutral-800">
                <h3 className="text-xs font-bold text-[#FACC15] flex items-center gap-1.5">
                  <Frame className="w-4 h-4" />
                  <span>تمپلیت رنگ قاب کاتالوگ (زرد، سفید، مشکی)</span>
                </h3>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    {
                      id: 'ivory_gold' as FrameTemplateStyle,
                      name: 'قاب گالری سفید و طلایی',
                      desc: 'پاسپارتو سفید با کادر زرد و پلاک مشکی',
                    },
                    {
                      id: 'obsidian_yellow' as FrameTemplateStyle,
                      name: 'قاب سلطنتی مشکی و زرد',
                      desc: 'قاب مشکی عمیق با خطوط زرد و کد طلایی',
                    },
                    {
                      id: 'saffron_modern' as FrameTemplateStyle,
                      name: 'قاب مدرن زرد و مشکی',
                      desc: 'قاب زرد درخشان با پلاک مشخصات مشکی',
                    },
                  ].map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => onSelectFrameStyle(st.id)}
                      className={`p-3 rounded-xl border text-right flex items-center justify-between transition-colors cursor-pointer ${
                        frameStyle === st.id
                          ? 'bg-[#FACC15] text-black border-[#FACC15] font-bold'
                          : 'bg-[#161616] text-neutral-200 border-neutral-800 hover:border-neutral-600'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-bold">{st.name}</div>
                        <div
                          className={`text-[10px] mt-0.5 ${
                            frameStyle === st.id ? 'text-black/80' : 'text-neutral-400'
                          }`}
                        >
                          {st.desc}
                        </div>
                      </div>
                      {frameStyle === st.id && <CheckCircle2 className="w-4 h-4 shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </aside>
    </div>
  );
};
