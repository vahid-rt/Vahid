import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  Volume2,
  VolumeX,
  ShoppingBag,
  X,
} from 'lucide-react';
import {
  FILTER_PRESETS,
  OfflineFilterSettings,
  PATTERN_CATEGORIES,
  PatternCategory,
  SIZE_CATEGORIES,
  SizeCategory,
  toPersianDigits,
} from './services/carpetNaming';
import {
  CarpetItem,
  CartItem,
  fetchStoredCatalogFromServer,
} from './services/driveService';
import { CarpetFramePage, FrameTemplateStyle } from './components/CarpetFramePage';
import { CatalogDrawer } from './components/CatalogDrawer';
import { CartInvoiceModal } from './components/CartInvoiceModal';

function playPageFlipSound() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const duration = 0.14;
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      const env = Math.sin((i / bufferSize) * Math.PI);
      data[i] = (Math.random() * 2 - 1) * env * 0.08;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(950, ctx.currentTime);
    filter.Q.setValueAtTime(1.4, ctx.currentTime);

    noise.connect(filter);
    filter.connect(ctx.destination);
    noise.start();
  } catch {
    // Ignore audio context restrictions
  }
}

export function App() {
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);
  const [items, setItems] = useState<CarpetItem[]>([]);

  // Album Filters: Size (4, 6, 7.5, 9m) & Pattern Category
  const [selectedSize, setSelectedSize] = useState<SizeCategory>('all');
  const [selectedCategory, setSelectedCategory] = useState<PatternCategory>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);

  // Shopping Cart & Invoice Modal State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);

  // Offline Filter & Frame Style State
  const [filter, setFilter] = useState<OfflineFilterSettings>({
    presetId: 'hd_wool',
    ...FILTER_PRESETS[0].settings,
  });
  const [frameStyle, setFrameStyle] = useState<FrameTemplateStyle>('ivory_gold');
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // 3D Page Flip & Touch Swipe State
  const [dragDeltaX, setDragDeltaX] = useState<number>(0);
  const [isDraggingPage, setIsDraggingPage] = useState<boolean>(false);
  const [flipDirection, setFlipDirection] = useState<'next' | 'prev' | null>(null);
  const pointerStartXRef = useRef<number | null>(null);
  const pointerStartYRef = useRef<number | null>(null);

  // Load stored carpet catalog from server (/api/catalog)
  useEffect(() => {
    let mounted = true;
    fetchStoredCatalogFromServer()
      .then((catalog) => {
        if (!mounted) return;
        setItems(catalog.items || []);
      })
      .catch((err) => {
        console.error('Failed to fetch stored catalog:', err);
      })
      .finally(() => {
        if (mounted) setIsInitialLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  // Filtered Carpet Items by Size Album, Pattern Album, and Search
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (selectedSize !== 'all' && item.sizeCategory !== selectedSize) {
        return false;
      }
      if (selectedCategory !== 'all' && item.category !== selectedCategory) {
        return false;
      }
      if (searchQuery.trim() !== '') {
        const q = searchQuery.trim().toLowerCase();
        const matchName = item.persianName.toLowerCase().includes(q);
        const matchCode = item.code.toLowerCase().includes(q);
        const matchDim = (item.dimensionsLabel || '').toLowerCase().includes(q);
        return matchName || matchCode || matchDim;
      }
      return true;
    });
  }, [items, selectedSize, selectedCategory, searchQuery]);

  useEffect(() => {
    if (currentPageIndex >= filteredItems.length) {
      setCurrentPageIndex(Math.max(0, filteredItems.length - 1));
    }
  }, [filteredItems.length, currentPageIndex]);

  const currentCarpet = filteredItems[currentPageIndex] || null;

  // Cart Handlers
  const handleAddToCart = useCallback((carpet: CarpetItem) => {
    setCart((prev) => {
      const existingIdx = prev.findIndex((c) => c.carpet.id === carpet.id);
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx] = {
          ...updated[existingIdx],
          quantity: updated[existingIdx].quantity + 1,
        };
        return updated;
      }
      return [...prev, { carpet, quantity: 1 }];
    });
  }, []);

  const handleUpdateCartQuantity = useCallback((itemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) =>
          c.carpet.id === itemId ? { ...c, quantity: c.quantity + delta } : c
        )
        .filter((c) => c.quantity > 0)
    );
  }, []);

  const handleClearCart = useCallback(() => {
    setCart([]);
  }, []);

  const totalCartItemsCount = useMemo(
    () => cart.reduce((sum, c) => sum + c.quantity, 0),
    [cart]
  );

  const currentCarpetCartQty = useMemo(() => {
    if (!currentCarpet) return 0;
    return cart.find((c) => c.carpet.id === currentCarpet.id)?.quantity || 0;
  }, [cart, currentCarpet]);

  // Page Flip Navigation
  const goToNextPage = useCallback(() => {
    if (currentPageIndex >= filteredItems.length - 1 || flipDirection) return;
    if (soundEnabled) playPageFlipSound();
    setFlipDirection('next');
    setTimeout(() => {
      setCurrentPageIndex((prev) => Math.min(filteredItems.length - 1, prev + 1));
      setFlipDirection(null);
    }, 180);
  }, [currentPageIndex, filteredItems.length, flipDirection, soundEnabled]);

  const goToPrevPage = useCallback(() => {
    if (currentPageIndex <= 0 || flipDirection) return;
    if (soundEnabled) playPageFlipSound();
    setFlipDirection('prev');
    setTimeout(() => {
      setCurrentPageIndex((prev) => Math.max(0, prev - 1));
      setFlipDirection(null);
    }, 180);
  }, [currentPageIndex, flipDirection, soundEnabled]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isDrawerOpen || isCartOpen) return;
      if (e.key === 'ArrowLeft') {
        goToNextPage();
      } else if (e.key === 'ArrowRight') {
        goToPrevPage();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNextPage, goToPrevPage, isDrawerOpen, isCartOpen]);

  const handlePointerDown = (e: React.PointerEvent) => {
    pointerStartXRef.current = e.clientX;
    pointerStartYRef.current = e.clientY;
    setIsDraggingPage(true);
    setDragDeltaX(0);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingPage || pointerStartXRef.current === null || pointerStartYRef.current === null) {
      return;
    }
    const dx = e.clientX - pointerStartXRef.current;
    const dy = e.clientY - pointerStartYRef.current;

    if (Math.abs(dx) > Math.abs(dy)) {
      setDragDeltaX(Math.max(-180, Math.min(180, dx)));
    }
  };

  const handlePointerUp = () => {
    if (!isDraggingPage) return;
    setIsDraggingPage(false);
    const threshold = 42;
    if (dragDeltaX < -threshold) {
      goToNextPage();
    } else if (dragDeltaX > threshold) {
      goToPrevPage();
    }
    setDragDeltaX(0);
    pointerStartXRef.current = null;
    pointerStartYRef.current = null;
  };

  const rotationYDeg = useMemo(() => {
    if (flipDirection === 'next') return -26;
    if (flipDirection === 'prev') return 26;
    if (isDraggingPage && Math.abs(dragDeltaX) > 4) {
      return (dragDeltaX / 180) * 22;
    }
    return 0;
  }, [flipDirection, isDraggingPage, dragDeltaX]);

  const pageOpacity = flipDirection ? 0.84 : 1;

  const activeSizeLabel =
    selectedSize !== 'all'
      ? SIZE_CATEGORIES.find((s) => s.id === selectedSize)?.label
      : null;
  const activePatternLabel =
    selectedCategory !== 'all'
      ? PATTERN_CATEGORIES.find((p) => p.id === selectedCategory)?.label
      : null;

  return (
    <div
      className="h-dvh w-screen overflow-hidden bg-[#050505] flex items-center justify-center select-none"
      dir="rtl"
    >
      {/* DEDICATED MOBILE PHONE VIEWPORT SHELL */}
      <div className="relative w-full max-w-[420px] h-dvh sm:h-[95dvh] sm:max-h-[896px] bg-[#0A0A0A] text-white flex flex-col overflow-hidden sm:rounded-[38px] sm:border-[6px] sm:border-[#222222] sm:shadow-[0_25px_80px_rgba(0,0,0,0.95)]">
        {/* Subtle Phone Earpiece Notch Indicator on Desktop Preview */}
        <div className="hidden sm:flex items-center justify-center py-1 bg-[#0E0E0E]">
          <div className="w-20 h-1 rounded-full bg-neutral-700" />
        </div>

        {/* MOBILE TOP APP BAR (52px height) */}
        <header className="h-13 shrink-0 px-3 bg-[#0E0E0E] border-b border-neutral-800/90 flex items-center justify-between gap-2 z-30">
          {/* Brand Title */}
          <a
            href="#catalog"
            onClick={(e) => {
              e.preventDefault();
              setCurrentPageIndex(0);
            }}
            className="text-base font-bold tracking-tight text-[#FACC15] whitespace-nowrap shrink-0"
          >
            کاتالوگ فرش پشمی
          </a>

          {/* Right Actions: Shopping Cart Button + Drawer Trigger */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="relative min-h-[38px] px-2.5 py-1.5 rounded-xl bg-[#1A1A1A] hover:bg-neutral-800 text-white border border-[#FACC15]/50 text-xs font-bold flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
              title="مشاهده سبد خرید و فاکتور"
            >
              <ShoppingBag className="w-4 h-4 text-[#FACC15]" />
              <span>سبد خرید</span>
              {totalCartItemsCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-[#FACC15] text-black text-[11px] font-extrabold tabular-nums">
                  {toPersianDigits(totalCartItemsCount)}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setIsDrawerOpen(true)}
              className="min-h-[38px] px-3 py-1.5 rounded-xl bg-[#FACC15] hover:bg-yellow-300 text-[#0A0A0A] text-xs font-bold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 shadow-sm cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>آلبوم‌ها</span>
            </button>
          </div>
        </header>

        {/* Active Album/Size Filter Indicator Strip (if filtered) */}
        {(activeSizeLabel || activePatternLabel) && (
          <div className="shrink-0 bg-[#141412] border-b border-neutral-800 px-3 py-1.5 flex items-center justify-between gap-2 text-[11px] z-20">
            <div className="flex items-center gap-1.5 truncate text-neutral-300">
              <span>آلبوم فعال:</span>
              {activeSizeLabel && (
                <strong className="text-[#FACC15]">{activeSizeLabel}</strong>
              )}
              {activeSizeLabel && activePatternLabel && <span>·</span>}
              {activePatternLabel && (
                <strong className="text-white">{activePatternLabel}</strong>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedSize('all');
                setSelectedCategory('all');
                setCurrentPageIndex(0);
              }}
              className="text-neutral-400 hover:text-[#FACC15] flex items-center gap-0.5 shrink-0 cursor-pointer"
            >
              <span>نمایش همه</span>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* MAIN MOBILE FULL-SCREEN INTERACTIVE FLIPBOOK STAGE */}
        <main
          className="relative flex-1 min-h-0 w-full flex items-center justify-center px-2.5 py-2 overflow-hidden"
          style={{ perspective: '1600px' }}
          onPointerDown={items.length > 0 ? handlePointerDown : undefined}
          onPointerMove={items.length > 0 ? handlePointerMove : undefined}
          onPointerUp={items.length > 0 ? handlePointerUp : undefined}
          onPointerCancel={items.length > 0 ? handlePointerUp : undefined}
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-15"
            style={{
              backgroundImage:
                'radial-gradient(#FACC15 1px, transparent 1px), radial-gradient(#FFFFFF 0.5px, #0A0A0A 0.5px)',
              backgroundSize: '24px 24px',
            }}
          />

          {isInitialLoading ? (
            <div className="relative z-10 w-full rounded-2xl border-2 border-[#FACC15] bg-[#121212] flex flex-col items-center justify-center gap-4 p-6 text-center shadow-2xl">
              <div className="w-11 h-11 border-4 border-[#FACC15] border-t-transparent rounded-full animate-spin" />
              <h3 className="text-base font-bold text-[#FACC15]">
                در حال بارگذاری کاتالوگ فرش...
              </h3>
            </div>
          ) : currentCarpet ? (
            <div
              className="relative w-full h-full flex items-center justify-center"
              style={{
                transform: `rotateY(${rotationYDeg}deg) translateX(${dragDeltaX * 0.16}px)`,
                transformOrigin: rotationYDeg < 0 ? 'left center' : 'right center',
                opacity: pageOpacity,
                transition: isDraggingPage
                  ? 'none'
                  : 'transform 180ms cubic-bezier(0.16, 1, 0.3, 1), opacity 180ms ease',
              }}
            >
              {Math.abs(rotationYDeg) > 1 && (
                <div
                  className="pointer-events-none absolute inset-0 z-30 rounded-2xl"
                  style={{
                    background:
                      rotationYDeg < 0
                        ? 'linear-gradient(to right, rgba(0,0,0,0.48), rgba(250,204,21,0.09) 35%, transparent)'
                        : 'linear-gradient(to left, rgba(0,0,0,0.48), rgba(250,204,21,0.09) 35%, transparent)',
                  }}
                />
              )}

              <CarpetFramePage
                item={currentCarpet}
                pageNumber={currentPageIndex + 1}
                totalPages={filteredItems.length}
                filter={filter}
                frameStyle={frameStyle}
                cartQuantity={currentCarpetCartQty}
                onAddToCart={handleAddToCart}
                onUpdateCartQuantity={handleUpdateCartQuantity}
              />
            </div>
          ) : (
            <div className="w-full h-full rounded-2xl border border-neutral-800 bg-[#121212] flex flex-col items-center justify-center gap-3 p-6 text-center">
              <p className="text-sm font-bold text-white">فرشی در این دسته یافت نشد</p>
              <button
                type="button"
                onClick={() => {
                  setSelectedSize('all');
                  setSelectedCategory('all');
                  setSearchQuery('');
                }}
                className="px-4 py-2 rounded-xl bg-[#FACC15] text-black text-xs font-bold cursor-pointer"
              >
                نمایش همه فرش‌ها
              </button>
            </div>
          )}
        </main>

        {/* ERGONOMIC MOBILE THUMB-ZONE BOTTOM NAVIGATION BAR (56px height) */}
        <footer className="h-14 shrink-0 px-3 bg-[#0E0E0E] border-t border-neutral-800/90 flex items-center justify-between gap-2 z-20">
          {/* Right Thumb Button: Previous Page */}
          <button
            type="button"
            onClick={goToPrevPage}
            disabled={currentPageIndex <= 0}
            className={`min-h-[42px] px-3.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all whitespace-nowrap shrink-0 ${
              currentPageIndex <= 0
                ? 'opacity-30 pointer-events-none bg-neutral-900 text-neutral-500'
                : 'bg-[#1A1A1A] hover:bg-neutral-800 text-white border border-neutral-700 active:scale-95 cursor-pointer'
            }`}
          >
            <ChevronRight className="w-4 h-4 text-[#FACC15]" />
            <span>برگ قبلی</span>
          </button>

          {/* Center: Sound Toggle + Page Indicator */}
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={() => setSoundEnabled((s) => !s)}
              className="min-w-[38px] min-h-[38px] rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 flex items-center justify-center transition-colors shrink-0 cursor-pointer"
              title="صدای ورق زدن"
            >
              {soundEnabled ? (
                <Volume2 className="w-4 h-4 text-[#FACC15]" />
              ) : (
                <VolumeX className="w-4 h-4 text-neutral-500" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setIsDrawerOpen(true)}
              className="px-2.5 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 text-[11px] font-bold text-neutral-200 tabular-nums whitespace-nowrap cursor-pointer"
              title="انتخاب آلبوم یا برگ"
            >
              <span className="text-[#FACC15]">{toPersianDigits(currentPageIndex + 1)}</span>
              <span className="text-neutral-500 mx-1">/</span>
              <span>{toPersianDigits(filteredItems.length)}</span>
            </button>
          </div>

          {/* Left Thumb Button: Next Page */}
          <button
            type="button"
            onClick={goToNextPage}
            disabled={currentPageIndex >= filteredItems.length - 1}
            className={`min-h-[42px] px-3.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all whitespace-nowrap shrink-0 ${
              currentPageIndex >= filteredItems.length - 1
                ? 'opacity-30 pointer-events-none bg-neutral-900 text-neutral-500'
                : 'bg-[#FACC15] hover:bg-yellow-300 text-black shadow-md active:scale-95 cursor-pointer'
            }`}
          >
            <span>برگ بعدی</span>
            <ChevronLeft className="w-4 h-4" />
          </button>
        </footer>

        {/* SLIDE-OUT PERSIAN DRAWER FOR SIZE/PATTERN ALBUMS & SELECTABLE FILTERS */}
        <CatalogDrawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          allItems={items}
          filteredItems={filteredItems}
          selectedSize={selectedSize}
          onSelectSize={(sz) => {
            setSelectedSize(sz);
            setCurrentPageIndex(0);
          }}
          selectedCategory={selectedCategory}
          onSelectCategory={(cat) => {
            setSelectedCategory(cat);
            setCurrentPageIndex(0);
          }}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          currentPageIndex={currentPageIndex}
          onJumpToPage={(index) => {
            if (soundEnabled) playPageFlipSound();
            setCurrentPageIndex(index);
          }}
          cart={cart}
          onAddToCart={handleAddToCart}
          filter={filter}
          onUpdateFilter={setFilter}
          frameStyle={frameStyle}
          onSelectFrameStyle={setFrameStyle}
        />

        {/* SHOPPING CART & SHAREABLE INVOICE MODAL */}
        <CartInvoiceModal
          isOpen={isCartOpen}
          onClose={() => setIsCartOpen(false)}
          cart={cart}
          onUpdateQuantity={handleUpdateCartQuantity}
          onClearCart={handleClearCart}
          onJumpToCarpet={(carpetId) => {
            const idx = filteredItems.findIndex((c) => c.id === carpetId);
            if (idx >= 0) {
              setCurrentPageIndex(idx);
            } else {
              setSelectedSize('all');
              setSelectedCategory('all');
              const allIdx = items.findIndex((c) => c.id === carpetId);
              if (allIdx >= 0) setCurrentPageIndex(allIdx);
            }
          }}
        />
      </div>
    </div>
  );
}

export default App;
