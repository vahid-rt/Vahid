import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Layers,
  Volume2,
  VolumeX,
  ShoppingBag,
  X,
  Share2,
  Check,
  ChevronLeft,
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
import { CarpetFramePage } from './components/CarpetFramePage';
import { CatalogDrawer } from './components/CatalogDrawer';
import { CartInvoiceModal } from './components/CartInvoiceModal';

const PUBLIC_SHARED_URL = 'https://ais-pre-jixdrhwyui6hymqa6qtjae-8584636582.europe-west2.run.app';

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
  const [linkCopied, setLinkCopied] = useState<boolean>(false);

  // Automatic high-contrast wool enhancement (no manual filter UI needed)
  const [filter] = useState<OfflineFilterSettings>({
    presetId: 'hd_wool',
    ...FILTER_PRESETS[0].settings,
  });
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // 3D Page Flip & Touch Swipe State
  const [dragDeltaX, setDragDeltaX] = useState<number>(0);
  const [isDraggingPage, setIsDraggingPage] = useState<boolean>(false);
  const [flipDirection, setFlipDirection] = useState<'next' | 'prev' | null>(null);
  const pointerStartXRef = useRef<number | null>(null);
  const pointerStartYRef = useRef<number | null>(null);

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

  const handleShareCatalogLink = async () => {
    const shareUrl =
      window.location.hostname.includes('ais-dev')
        ? PUBLIC_SHARED_URL
        : window.location.origin + window.location.pathname;

    try {
      if (navigator.share) {
        await navigator.share({
          title: 'کاتالوگ دیجیتال فرش ماشینی پشمی',
          text: 'مشاهده کاتالوگ ورق‌زدنی فرش‌های ماشینی پشمی:',
          url: shareUrl,
        });
        return;
      }
    } catch {
      // fallback to clipboard
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2500);
    } catch {
      // ignore
    }
  };

  const totalCartItemsCount = useMemo(
    () => cart.reduce((sum, c) => sum + c.quantity, 0),
    [cart]
  );

  const currentCarpetCartQty = useMemo(() => {
    if (!currentCarpet) return 0;
    return cart.find((c) => c.carpet.id === currentCarpet.id)?.quantity || 0;
  }, [cart, currentCarpet]);

  const goToNextPage = useCallback(() => {
    if (currentPageIndex >= filteredItems.length - 1 || flipDirection) return;
    if (soundEnabled) playPageFlipSound();
    setFlipDirection('next');
    setTimeout(() => {
      setCurrentPageIndex((prev) => Math.min(filteredItems.length - 1, prev + 1));
      setFlipDirection(null);
    }, 170);
  }, [currentPageIndex, filteredItems.length, flipDirection, soundEnabled]);

  const goToPrevPage = useCallback(() => {
    if (currentPageIndex <= 0 || flipDirection) return;
    if (soundEnabled) playPageFlipSound();
    setFlipDirection('prev');
    setTimeout(() => {
      setCurrentPageIndex((prev) => Math.max(0, prev - 1));
      setFlipDirection(null);
    }, 170);
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
    if (flipDirection === 'next') return -22;
    if (flipDirection === 'prev') return 22;
    if (isDraggingPage && Math.abs(dragDeltaX) > 4) {
      return (dragDeltaX / 180) * 18;
    }
    return 0;
  }, [flipDirection, isDraggingPage, dragDeltaX]);

  const pageOpacity = flipDirection ? 0.85 : 1;

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
      className="h-dvh w-screen overflow-hidden bg-[#040B14] flex items-center justify-center select-none"
      dir="rtl"
    >
      {/* DEDICATED MOBILE FULL-SCREEN VIEWPORT (Navy Blue & White Frosted Theme) */}
      <div className="relative w-full max-w-[430px] h-dvh sm:h-[96dvh] sm:max-h-[900px] bg-[#07111E] text-white flex flex-col overflow-hidden sm:rounded-[34px] sm:border-[4px] sm:border-white/15 sm:shadow-[0_25px_80px_rgba(0,0,0,0.95)]">
        {/* FLOATING FROSTED-GLASS TOP HEADER OVERLAY */}
        <header className="absolute top-0 inset-x-0 z-30 px-3 pt-2.5 pb-2 flex flex-col gap-1.5 pointer-events-none">
          <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-2xl bg-[#0B192C]/75 backdrop-blur-xl border border-white/20 shadow-lg pointer-events-auto">
            {/* Right: Prominent Easy-Access Albums Drawer Button + Page Counter */}
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                onClick={() => setIsDrawerOpen(true)}
                className="h-9 px-3 rounded-xl bg-white hover:bg-slate-100 text-[#0B192C] text-xs font-extrabold flex items-center gap-1.5 transition shadow-sm cursor-pointer shrink-0"
              >
                <Layers className="w-4 h-4 text-[#0B192C]" />
                <span>آلبوم‌ها و متراژ</span>
              </button>

              {filteredItems.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(true)}
                  className="h-9 px-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-bold text-white tabular-nums cursor-pointer"
                  title="شماره برگ"
                >
                  <span className="text-sky-200">{toPersianDigits(currentPageIndex + 1)}</span>
                  <span className="opacity-50 mx-0.5">/</span>
                  <span>{toPersianDigits(filteredItems.length)}</span>
                </button>
              )}
            </div>

            {/* Left: Frosted Controls (Sound, Share, Cart) */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setSoundEnabled((s) => !s)}
                className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white flex items-center justify-center transition cursor-pointer"
                title="صدای ورق زدن"
              >
                {soundEnabled ? (
                  <Volume2 className="w-4 h-4 text-sky-200" />
                ) : (
                  <VolumeX className="w-4 h-4 text-slate-400" />
                )}
              </button>

              <button
                type="button"
                onClick={handleShareCatalogLink}
                className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white flex items-center justify-center transition cursor-pointer"
                title="کپی لینک کاتالوگ"
              >
                {linkCopied ? (
                  <Check className="w-4 h-4 text-sky-200" />
                ) : (
                  <Share2 className="w-4 h-4 text-white" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setIsCartOpen(true)}
                className="relative h-9 px-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/30 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                title="سبد خرید و فاکتور"
              >
                <ShoppingBag className="w-4 h-4 text-sky-200" />
                <span>سبد</span>
                {totalCartItemsCount > 0 && (
                  <span className="px-1.5 rounded-full bg-white text-[#0B192C] text-[10px] font-extrabold tabular-nums">
                    {toPersianDigits(totalCartItemsCount)}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Active Filter Tag Overlay (if filtered) */}
          {(activeSizeLabel || activePatternLabel) && (
            <div className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-[#0B192C]/80 backdrop-blur-xl border border-white/20 text-[11px] pointer-events-auto shadow-md">
              <div className="flex items-center gap-1.5 truncate text-slate-200">
                <span>آلبوم فعال:</span>
                {activeSizeLabel && (
                  <strong className="text-sky-200">{activeSizeLabel}</strong>
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
                className="text-sky-200 hover:text-white flex items-center gap-0.5 shrink-0 font-bold cursor-pointer"
              >
                <span>نمایش همه</span>
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </header>

        {/* EASY SIDE PULL-TAB ON RIGHT EDGE TO SLIDE OPEN ALBUMS DRAWER */}
        {!isDrawerOpen && (
          <button
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-30 py-3.5 px-1.5 rounded-l-2xl bg-[#0B192C]/85 hover:bg-white hover:text-[#0B192C] backdrop-blur-xl border-y border-l border-white/30 text-white shadow-xl flex flex-col items-center gap-1.5 transition cursor-pointer"
            title="باز کردن منوی کشویی آلبوم‌ها"
          >
            <ChevronLeft className="w-4 h-4 text-sky-200" />
            <span
              className="text-[11px] font-extrabold tracking-wide"
              style={{ writingMode: 'vertical-rl' }}
            >
              آلبوم‌ها
            </span>
          </button>
        )}

        {/* FULL-SCREEN INTERACTIVE FLIPBOOK STAGE */}
        <main
          className="relative w-full h-full flex items-center justify-center overflow-hidden"
          style={{ perspective: '1600px' }}
          onPointerDown={items.length > 0 ? handlePointerDown : undefined}
          onPointerMove={items.length > 0 ? handlePointerMove : undefined}
          onPointerUp={items.length > 0 ? handlePointerUp : undefined}
          onPointerCancel={items.length > 0 ? handlePointerUp : undefined}
        >
          {isInitialLoading ? (
            <div className="relative z-10 flex flex-col items-center justify-center gap-3 p-6 text-center">
              <div className="w-10 h-10 border-3 border-white border-t-transparent rounded-full animate-spin" />
              <h3 className="text-sm font-bold text-white">
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
                  : 'transform 170ms cubic-bezier(0.16, 1, 0.3, 1), opacity 170ms ease',
              }}
            >
              {Math.abs(rotationYDeg) > 1 && (
                <div
                  className="pointer-events-none absolute inset-0 z-30"
                  style={{
                    background:
                      rotationYDeg < 0
                        ? 'linear-gradient(to right, rgba(7,17,30,0.55), rgba(255,255,255,0.06) 35%, transparent)'
                        : 'linear-gradient(to left, rgba(7,17,30,0.55), rgba(255,255,255,0.06) 35%, transparent)',
                  }}
                />
              )}

              <CarpetFramePage
                item={currentCarpet}
                pageNumber={currentPageIndex + 1}
                totalPages={filteredItems.length}
                filter={filter}
                cartQuantity={currentCarpetCartQty}
                onAddToCart={handleAddToCart}
                onUpdateCartQuantity={handleUpdateCartQuantity}
                onNextPage={goToNextPage}
                onPrevPage={goToPrevPage}
                hasNextPage={currentPageIndex < filteredItems.length - 1}
                hasPrevPage={currentPageIndex > 0}
              />
            </div>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-3 p-6 text-center">
              <p className="text-sm font-bold text-white">فرشی در این دسته یافت نشد</p>
              <button
                type="button"
                onClick={() => {
                  setSelectedSize('all');
                  setSelectedCategory('all');
                  setSearchQuery('');
                }}
                className="px-4 py-2 rounded-xl bg-white text-[#0B192C] text-xs font-extrabold cursor-pointer"
              >
                نمایش همه فرش‌ها
              </button>
            </div>
          )}
        </main>

        {/* SLIDE-OUT FROSTED GLASS DRAWER FOR SIZE & PATTERN ALBUMS */}
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
