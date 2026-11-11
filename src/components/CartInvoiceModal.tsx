import React, { useMemo, useState } from 'react';
import {
  X,
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  Share2,
  Download,
  Copy,
  Check,
  FileText,
  Send,
} from 'lucide-react';
import { toPersianDigits } from '../services/carpetNaming';
import { CartItem } from '../services/driveService';

interface CartInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  onUpdateQuantity: (itemId: string, delta: number) => void;
  onClearCart: () => void;
  onJumpToCarpet: (itemId: string) => void;
}

async function generateInvoiceCanvasBlob(
  cart: CartItem[],
  customerName: string,
  invoiceNumber: string,
  dateStr: string,
  totalCount: number,
  totalAreaSqM: string
): Promise<Blob | null> {
  const width = 800;
  const rowHeight = 76;
  const headerHeight = 210;
  const footerHeight = 160;
  const height = headerHeight + cart.length * rowHeight + footerHeight;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Background
  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(0, 0, width, height);

  // Outer Border
  ctx.strokeStyle = '#0B192C';
  ctx.lineWidth = 8;
  ctx.strokeRect(12, 12, width - 24, height - 24);

  ctx.strokeStyle = '#1E3A5F';
  ctx.lineWidth = 2;
  ctx.strokeRect(20, 20, width - 40, height - 40);

  // Header Banner
  ctx.fillStyle = '#0B192C';
  ctx.fillRect(24, 24, width - 48, 115);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 30px Vazirmatn, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('فاکتور سفارش کاتالوگ فرش ماشینی پشمی', width - 48, 72);

  ctx.fillStyle = '#BAE6FD';
  ctx.font = '16px Vazirmatn, sans-serif';
  ctx.fillText(
    `شماره فاکتور: ${toPersianDigits(invoiceNumber)}   |   تاریخ: ${dateStr}`,
    width - 48,
    112
  );

  if (customerName.trim()) {
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'left';
    ctx.font = 'bold 16px Vazirmatn, sans-serif';
    ctx.fillText(`سفارش‌دهنده: ${customerName.trim()}`, 48, 112);
  }

  // Table Header
  const tableTop = 152;
  ctx.fillStyle = '#1E3A5F';
  ctx.fillRect(32, tableTop, width - 64, 44);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 16px Vazirmatn, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('ردیف و نام نقش فرش', width - 48, tableTop + 28);
  ctx.fillText('کد فرش', width - 310, tableTop + 28);
  ctx.fillText('متراژ و ابعاد (سانتی‌متر)', width - 460, tableTop + 28);
  ctx.textAlign = 'left';
  ctx.fillText('تعداد', 56, tableTop + 28);

  // Table Rows
  cart.forEach((entry, idx) => {
    const y = headerHeight + idx * rowHeight;
    ctx.fillStyle = idx % 2 === 0 ? '#FFFFFF' : '#F1F5F9';
    ctx.fillRect(32, y, width - 64, rowHeight - 4);

    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 1;
    ctx.strokeRect(32, y, width - 64, rowHeight - 4);

    // Row Text
    ctx.fillStyle = '#0B192C';
    ctx.textAlign = 'right';
    ctx.font = 'bold 18px Vazirmatn, sans-serif';
    ctx.fillText(
      `${toPersianDigits(idx + 1)}. نقش ${entry.carpet.persianName}`,
      width - 48,
      y + 32
    );

    ctx.fillStyle = '#475569';
    ctx.font = '14px Vazirmatn, sans-serif';
    ctx.fillText(entry.carpet.categoryLabel, width - 48, y + 56);

    // Code badge
    ctx.fillStyle = '#0B192C';
    ctx.font = 'bold 16px monospace';
    ctx.fillText(entry.carpet.code, width - 310, y + 42);

    // Size & Dimensions
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 16px Vazirmatn, sans-serif';
    const dimStr =
      entry.carpet.lengthCm && entry.carpet.widthCm
        ? `${entry.carpet.sizeLabel} (${toPersianDigits(entry.carpet.lengthCm)}×${toPersianDigits(
            entry.carpet.widthCm
          )})`
        : entry.carpet.sizeLabel;
    ctx.fillText(dimStr, width - 460, y + 42);

    // Quantity
    ctx.textAlign = 'left';
    ctx.fillStyle = '#0B192C';
    ctx.font = 'bold 18px Vazirmatn, sans-serif';
    ctx.fillText(`${toPersianDigits(entry.quantity)} تخته`, 56, y + 42);
  });

  // Footer Totals Box
  const footerY = headerHeight + cart.length * rowHeight + 16;
  ctx.fillStyle = '#0B192C';
  ctx.fillRect(32, footerY, width - 64, 100);

  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'right';
  ctx.font = 'bold 22px Vazirmatn, sans-serif';
  ctx.fillText(
    `جمع کل سفارش: ${toPersianDigits(totalCount)} تخته فرش پشمی`,
    width - 52,
    footerY + 44
  );

  ctx.fillStyle = '#BAE6FD';
  ctx.font = '18px Vazirmatn, sans-serif';
  ctx.fillText(
    `مجموع مساحت کل فرش‌ها: ${toPersianDigits(totalAreaSqM)} متر مربع`,
    width - 52,
    footerY + 80
  );

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png', 0.95);
  });
}

export const CartInvoiceModal: React.FC<CartInvoiceModalProps> = ({
  isOpen,
  onClose,
  cart,
  onUpdateQuantity,
  onClearCart,
  onJumpToCarpet,
}) => {
  const [customerName, setCustomerName] = useState<string>('');
  const [copiedText, setCopiedText] = useState<boolean>(false);
  const [isSharingImage, setIsSharingImage] = useState<boolean>(false);

  const invoiceNumber = useMemo(
    () => String(1000 + ((cart.length * 137 + 421) % 8999)),
    [cart.length]
  );

  const todayPersian = useMemo(() => {
    try {
      return new Intl.DateTimeFormat('fa-IR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date());
    } catch {
      return '۱۴۰۵/۰۸/۲۰';
    }
  }, []);

  const totalCount = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart]
  );

  const totalAreaSqM = useMemo(() => {
    const area = cart.reduce((sum, item) => {
      const itemArea =
        item.carpet.areaSqM ||
        ((item.carpet.lengthCm || 300) * (item.carpet.widthCm || 200)) / 10000;
      return sum + itemArea * item.quantity;
    }, 0);
    return area.toFixed(2);
  }, [cart]);

  const invoicePlainText = useMemo(() => {
    const lines: string[] = [
      '📋 *فاکتور سفارش کاتالوگ فرش ماشینی پشمی*',
      `🔢 شماره فاکتور: ${toPersianDigits(invoiceNumber)} | 📅 تاریخ: ${todayPersian}`,
    ];
    if (customerName.trim()) {
      lines.push(`👤 نام سفارش‌دهنده: ${customerName.trim()}`);
    }
    lines.push('────────────────────');

    cart.forEach((entry, idx) => {
      const dim =
        entry.carpet.lengthCm && entry.carpet.widthCm
          ? `${toPersianDigits(entry.carpet.lengthCm)}×${toPersianDigits(
              entry.carpet.widthCm
            )} سانتی‌متر`
          : '';
      lines.push(
        `${toPersianDigits(idx + 1)}. *نقش ${entry.carpet.persianName}* (${
          entry.carpet.categoryLabel
        })`
      );
      lines.push(
        `   ▫️ کد فرش: ${entry.carpet.code} | سایز: ${entry.carpet.sizeLabel} (${dim})`
      );
      lines.push(`   ▫️ تعداد: ${toPersianDigits(entry.quantity)} تخته`);
    });

    lines.push('────────────────────');
    lines.push(`✅ *تعداد کل سفارش:* ${toPersianDigits(totalCount)} تخته فرش`);
    lines.push(`📐 *مجموع متراژ کل:* ${toPersianDigits(totalAreaSqM)} متر مربع`);
    return lines.join('\n');
  }, [cart, customerName, invoiceNumber, todayPersian, totalCount, totalAreaSqM]);

  if (!isOpen) return null;

  const handleCopyInvoiceText = async () => {
    try {
      await navigator.clipboard.writeText(invoicePlainText);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2500);
    } catch {
      // ignore
    }
  };

  const handleDownloadInvoiceImage = async () => {
    if (cart.length === 0) return;
    setIsSharingImage(true);
    try {
      const blob = await generateInvoiceCanvasBlob(
        cart,
        customerName,
        invoiceNumber,
        todayPersian,
        totalCount,
        totalAreaSqM
      );
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `factor-farsh-${invoiceNumber}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } finally {
      setIsSharingImage(false);
    }
  };

  const handleNativeShareInvoice = async () => {
    if (cart.length === 0) return;
    setIsSharingImage(true);
    try {
      const blob = await generateInvoiceCanvasBlob(
        cart,
        customerName,
        invoiceNumber,
        todayPersian,
        totalCount,
        totalAreaSqM
      );

      if (blob && navigator.share) {
        const file = new File([blob], `factor-farsh-${invoiceNumber}.png`, {
          type: 'image/png',
        });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: `فاکتور سفارش فرش #${invoiceNumber}`,
            text: invoicePlainText,
            files: [file],
          });
          return;
        }
        await navigator.share({
          title: `فاکتور سفارش فرش #${invoiceNumber}`,
          text: invoicePlainText,
        });
        return;
      }

      await handleCopyInvoiceText();
      await handleDownloadInvoiceImage();
    } catch {
      // User cancelled share sheet
    } finally {
      setIsSharingImage(false);
    }
  };

  const whatsappShareUrl = `https://wa.me/?text=${encodeURIComponent(invoicePlainText)}`;
  const telegramShareUrl = `https://t.me/share/url?url=${encodeURIComponent(
    window.location.href
  )}&text=${encodeURIComponent(invoicePlainText)}`;

  return (
    <div className="absolute inset-0 z-50 flex flex-col justify-end overflow-hidden" dir="rtl">
      {/* Frosted Backdrop */}
      <div
        className="absolute inset-0 bg-[#050C16]/75 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Frosted Matte Glass Navy Blue & White Bottom Sheet */}
      <div className="relative z-10 w-full h-[92%] bg-[#0B192C]/92 backdrop-blur-2xl text-white rounded-t-3xl border-t border-white/25 flex flex-col shadow-2xl overflow-hidden">
        {/* Top Header */}
        <div className="px-4 pt-3.5 pb-3 bg-white/5 border-b border-white/15 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white text-[#0B192C] flex items-center justify-center font-bold shadow-sm">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white leading-tight">
                سبد خرید و فاکتور سفارش فرش
              </h2>
              <p className="text-[11px] text-sky-200">
                شماره فاکتور: {toPersianDigits(invoiceNumber)} · تاریخ: {todayPersian}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="min-w-[38px] min-h-[38px] rounded-xl bg-white/10 hover:bg-white hover:text-[#0B192C] border border-white/20 flex items-center justify-center transition-colors cursor-pointer"
            aria-label="بستن سبد خرید"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {cart.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-sky-200">
              <ShoppingBag className="w-7 h-7" />
            </div>
            <p className="text-sm font-bold text-white">
              سبد خرید شما در حال حاضر خالی است
            </p>
            <p className="text-xs text-slate-300 max-w-xs leading-relaxed">
              هنگام ورق زدن کاتالوگ، روی دکمه «افزودن به سبد خرید» در پایین صفحه بزنید تا فاکتور شما آماده شود.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-2 px-5 py-2.5 rounded-xl bg-white text-[#0B192C] text-xs font-extrabold cursor-pointer shadow-md"
            >
              بازگشت به کاتالوگ فرش
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Customer Name Input */}
              <div className="p-3 rounded-2xl bg-white/10 border border-white/20 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-sky-200 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" />
                    <span>مشخصات سفارش‌دهنده در فاکتور (اختیاری)</span>
                  </label>
                  <button
                    type="button"
                    onClick={onClearCart}
                    className="text-[11px] text-rose-300 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>خالی کردن سبد</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="نام مشتری، فروشگاه یا توضیحات سفارش را وارد کنید..."
                  className="w-full h-10 px-3 rounded-xl bg-[#07111E]/80 border border-white/20 text-xs text-white placeholder:text-slate-400 focus:border-white focus:outline-none"
                />
              </div>

              {/* Official Printable/Shareable Invoice Card Preview */}
              <div className="rounded-2xl bg-white text-[#0B192C] border border-white/40 overflow-hidden shadow-xl">
                <div className="bg-[#0B192C] text-white px-3.5 py-3 flex items-center justify-between border-b border-white/20">
                  <div>
                    <div className="text-sm font-extrabold text-white">
                      پیش‌فاکتور سفارش فرش پشمی
                    </div>
                    {customerName.trim() && (
                      <div className="text-[11px] text-sky-200 mt-0.5">
                        سفارش‌دهنده: {customerName.trim()}
                      </div>
                    )}
                  </div>
                  <div className="text-left text-[11px] text-slate-300 tabular-nums">
                    <div>شماره: #{toPersianDigits(invoiceNumber)}</div>
                    <div>تاریخ: {todayPersian}</div>
                  </div>
                </div>

                <div className="divide-y divide-slate-200">
                  {cart.map((entry, idx) => (
                    <div
                      key={entry.carpet.id}
                      className="p-2.5 flex items-center justify-between gap-2 hover:bg-slate-50 transition-colors"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          onJumpToCarpet(entry.carpet.id);
                          onClose();
                        }}
                        className="flex items-center gap-2.5 min-w-0 text-right flex-1 cursor-pointer"
                      >
                        <img
                          src={entry.carpet.localUrl}
                          alt={entry.carpet.persianName}
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            const fallback = `https://drive.google.com/thumbnail?id=${entry.carpet.id}&sz=w300`;
                            if (e.currentTarget.src !== fallback) {
                              e.currentTarget.src = fallback;
                            }
                          }}
                          className="w-11 h-14 rounded-lg object-cover border border-slate-300 shrink-0 bg-[#07111E]"
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-extrabold text-[#0B192C] truncate">
                            {toPersianDigits(idx + 1)}. نقش {entry.carpet.persianName}
                          </div>
                          <div className="text-[11px] text-slate-600 font-medium mt-0.5">
                            <span>{entry.carpet.sizeLabel}</span>
                            {entry.carpet.lengthCm && entry.carpet.widthCm && (
                              <span className="tabular-nums">
                                {' '}
                                ({toPersianDigits(entry.carpet.lengthCm)}×
                                {toPersianDigits(entry.carpet.widthCm)} س.م)
                              </span>
                            )}
                          </div>
                          <div className="inline-block mt-1 px-2 py-0.5 rounded-md bg-[#0B192C] text-white font-mono-code text-[10px] font-bold">
                            کد: {entry.carpet.code}
                          </div>
                        </div>
                      </button>

                      <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl shrink-0">
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(entry.carpet.id, 1)}
                          className="w-7 h-7 rounded-lg bg-[#0B192C] text-white flex items-center justify-center active:scale-90 cursor-pointer"
                          title="افزایش"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-6 text-center text-xs font-extrabold text-[#0B192C] tabular-nums">
                          {toPersianDigits(entry.quantity)}
                        </span>
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(entry.carpet.id, -1)}
                          className="w-7 h-7 rounded-lg bg-white text-[#0B192C] border border-slate-300 flex items-center justify-center active:scale-90 cursor-pointer"
                          title="کاهش یا حذف"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-[#0B192C] text-white px-3.5 py-3 flex items-center justify-between border-t border-slate-200">
                  <div className="text-xs">
                    <span className="text-slate-300">تعداد کل سفارش: </span>
                    <strong className="text-white text-sm tabular-nums">
                      {toPersianDigits(totalCount)} تخته فرش
                    </strong>
                  </div>
                  <div className="text-xs">
                    <span className="text-slate-300">مجموع متراژ: </span>
                    <strong className="text-sky-200 text-sm tabular-nums">
                      {toPersianDigits(totalAreaSqM)} متر مربع
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Sticky Share & Export Invoice Bar */}
            <div className="p-3.5 bg-white/5 border-t border-white/15 space-y-2">
              <button
                type="button"
                onClick={handleNativeShareInvoice}
                disabled={isSharingImage}
                className="w-full h-11 rounded-xl bg-white hover:bg-slate-100 text-[#0B192C] text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 shadow-lg active:scale-[0.99] transition-all cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
                <span>
                  {isSharingImage
                    ? 'در حال آماده‌سازی تصویر فاکتور...'
                    : 'اشتراک‌گذاری مستقیم فاکتور (تصویر و متن)'}
                </span>
              </button>

              <div className="grid grid-cols-4 gap-1.5">
                <a
                  href={whatsappShareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-9 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white text-[11px] font-bold flex items-center justify-center gap-1 transition-colors"
                >
                  <Send className="w-3 h-3 text-sky-200" />
                  <span>واتساپ</span>
                </a>

                <a
                  href={telegramShareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-9 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white text-[11px] font-bold flex items-center justify-center gap-1 transition-colors"
                >
                  <Send className="w-3 h-3 text-sky-200" />
                  <span>تلگرام</span>
                </a>

                <button
                  type="button"
                  onClick={handleDownloadInvoiceImage}
                  disabled={isSharingImage}
                  className="h-9 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white text-[11px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                >
                  <Download className="w-3 h-3 text-sky-200" />
                  <span>عکس فاکتور</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyInvoiceText}
                  className="h-9 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white text-[11px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                >
                  {copiedText ? (
                    <>
                      <Check className="w-3 h-3 text-sky-200" />
                      <span className="text-sky-200">کپی شد</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 text-sky-200" />
                      <span>کپی متن</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
