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

/**
 * Generates a high-resolution official PNG Invoice image on an HTML5 <canvas>
 * including the yellow/black/white header, customer info, item rows, codes, dimensions, and totals.
 */
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
  ctx.fillStyle = '#FAF9F5';
  ctx.fillRect(0, 0, width, height);

  // Outer Border
  ctx.strokeStyle = '#0A0A0A';
  ctx.lineWidth = 8;
  ctx.strokeRect(12, 12, width - 24, height - 24);

  ctx.strokeStyle = '#FACC15';
  ctx.lineWidth = 3;
  ctx.strokeRect(20, 20, width - 40, height - 40);

  // Header Banner
  ctx.fillStyle = '#0A0A0A';
  ctx.fillRect(24, 24, width - 48, 115);

  ctx.fillStyle = '#FACC15';
  ctx.font = 'bold 30px Vazirmatn, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('فاکتور سفارش کاتالوگ فرش ماشینی پشمی', width - 48, 72);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '16px Vazirmatn, sans-serif';
  ctx.fillText(
    `شماره فاکتور: ${toPersianDigits(invoiceNumber)}   |   تاریخ: ${dateStr}`,
    width - 48,
    112
  );

  if (customerName.trim()) {
    ctx.fillStyle = '#FACC15';
    ctx.textAlign = 'left';
    ctx.font = 'bold 16px Vazirmatn, sans-serif';
    ctx.fillText(`سفارش‌دهنده: ${customerName.trim()}`, 48, 112);
  }

  // Table Header
  const tableTop = 152;
  ctx.fillStyle = '#FACC15';
  ctx.fillRect(32, tableTop, width - 64, 44);

  ctx.fillStyle = '#0A0A0A';
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
    ctx.fillStyle = idx % 2 === 0 ? '#FFFFFF' : '#F3F2EE';
    ctx.fillRect(32, y, width - 64, rowHeight - 4);

    ctx.strokeStyle = '#E5E5E0';
    ctx.lineWidth = 1;
    ctx.strokeRect(32, y, width - 64, rowHeight - 4);

    // Row Text
    ctx.fillStyle = '#0A0A0A';
    ctx.textAlign = 'right';
    ctx.font = 'bold 18px Vazirmatn, sans-serif';
    ctx.fillText(
      `${toPersianDigits(idx + 1)}. نقش ${entry.carpet.persianName}`,
      width - 48,
      y + 32
    );

    ctx.fillStyle = '#555555';
    ctx.font = '14px Vazirmatn, sans-serif';
    ctx.fillText(entry.carpet.categoryLabel, width - 48, y + 56);

    // Code badge
    ctx.fillStyle = '#0A0A0A';
    ctx.font = 'bold 16px monospace';
    ctx.fillText(entry.carpet.code, width - 310, y + 42);

    // Size & Dimensions
    ctx.fillStyle = '#111111';
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
    ctx.fillStyle = '#0A0A0A';
    ctx.font = 'bold 18px Vazirmatn, sans-serif';
    ctx.fillText(`${toPersianDigits(entry.quantity)} تخته`, 56, y + 42);
  });

  // Footer Totals Box
  const footerY = headerHeight + cart.length * rowHeight + 16;
  ctx.fillStyle = '#0A0A0A';
  ctx.fillRect(32, footerY, width - 64, 100);

  ctx.fillStyle = '#FACC15';
  ctx.textAlign = 'right';
  ctx.font = 'bold 22px Vazirmatn, sans-serif';
  ctx.fillText(
    `جمع کل سفارش: ${toPersianDigits(totalCount)} تخته فرش پشمی`,
    width - 52,
    footerY + 44
  );

  ctx.fillStyle = '#FFFFFF';
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
      return '۱۴۰۵/۰۸/۰۶';
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

  // Formatted Plain-Text Invoice for WhatsApp / Telegram / SMS / Copy
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

      // Fallback if Web Share API is not supported on desktop browser: download image + copy text
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
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Bottom-Sheet / Full Mobile Invoice Panel */}
      <div className="relative z-10 w-full h-[92%] bg-[#0E0E0E] text-white rounded-t-3xl border-t-2 border-[#FACC15] flex flex-col shadow-2xl overflow-hidden">
        {/* Top Grab Handle & Header */}
        <div className="px-4 pt-3 pb-3 bg-[#141414] border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-[#FACC15] text-black flex items-center justify-center font-bold">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white leading-tight">
                سبد خرید و فاکتور سفارش فرش
              </h2>
              <p className="text-[11px] text-neutral-400">
                شماره فاکتور: {toPersianDigits(invoiceNumber)} · تاریخ: {todayPersian}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="min-w-[38px] min-h-[38px] rounded-xl bg-neutral-800 hover:bg-[#FACC15] hover:text-black flex items-center justify-center transition-colors cursor-pointer"
            aria-label="بستن سبد خرید"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {cart.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-500">
              <ShoppingBag className="w-7 h-7" />
            </div>
            <p className="text-sm font-bold text-neutral-300">
              سبد خرید شما در حال حاضر خالی است
            </p>
            <p className="text-xs text-neutral-500 max-w-xs leading-relaxed">
              هنگام ورق زدن کاتالوگ، روی دکمه «افزودن به سبد خرید» در پایین قاب هر فرش بزنید تا فاکتور شما آماده شود.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-2 px-5 py-2.5 rounded-xl bg-[#FACC15] text-black text-xs font-bold cursor-pointer"
            >
              بازگشت به کاتالوگ فرش
            </button>
          </div>
        ) : (
          <>
            {/* Scrollable Invoice Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Customer Name Input for Official Invoice */}
              <div className="p-3 rounded-2xl bg-[#161616] border border-neutral-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#FACC15] flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" />
                    <span>مشخصات سفارش‌دهنده در فاکتور (اختیاری)</span>
                  </label>
                  <button
                    type="button"
                    onClick={onClearCart}
                    className="text-[11px] text-red-400 hover:underline flex items-center gap-1 cursor-pointer"
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
                  className="w-full h-10 px-3 rounded-xl bg-black border border-neutral-700 text-xs text-white placeholder:text-neutral-500 focus:border-[#FACC15] focus:outline-none"
                />
              </div>

              {/* Official Printable/Shareable Invoice Card Preview */}
              <div className="rounded-2xl bg-[#FAF9F5] text-[#0A0A0A] border-2 border-[#FACC15] overflow-hidden shadow-lg">
                {/* Invoice Header */}
                <div className="bg-[#0A0A0A] text-white px-3.5 py-3 flex items-center justify-between border-b-2 border-[#FACC15]">
                  <div>
                    <div className="text-sm font-bold text-[#FACC15]">
                      پیش‌فاکتور سفارش فرش پشمی
                    </div>
                    {customerName.trim() && (
                      <div className="text-[11px] text-neutral-300 mt-0.5">
                        سفارش‌دهنده: {customerName.trim()}
                      </div>
                    )}
                  </div>
                  <div className="text-left text-[11px] text-neutral-300 tabular-nums">
                    <div>شماره: #{toPersianDigits(invoiceNumber)}</div>
                    <div>تاریخ: {todayPersian}</div>
                  </div>
                </div>

                {/* Invoice Items List */}
                <div className="divide-y divide-neutral-200">
                  {cart.map((entry, idx) => (
                    <div
                      key={entry.carpet.id}
                      className="p-2.5 flex items-center justify-between gap-2 hover:bg-neutral-100 transition-colors"
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
                          className="w-11 h-14 rounded-lg object-cover border border-black/20 shrink-0 bg-black"
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-black truncate">
                            {toPersianDigits(idx + 1)}. نقش {entry.carpet.persianName}
                          </div>
                          <div className="text-[11px] text-neutral-700 font-medium mt-0.5">
                            <span>{entry.carpet.sizeLabel}</span>
                            {entry.carpet.lengthCm && entry.carpet.widthCm && (
                              <span className="tabular-nums">
                                {' '}
                                ({toPersianDigits(entry.carpet.lengthCm)}×
                                {toPersianDigits(entry.carpet.widthCm)} س.م)
                              </span>
                            )}
                          </div>
                          <div className="inline-block mt-1 px-1.5 py-0.5 rounded bg-[#0A0A0A] text-[#FACC15] font-mono-code text-[10px] font-bold">
                            کد: {entry.carpet.code}
                          </div>
                        </div>
                      </button>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-1.5 bg-neutral-200/80 p-1 rounded-xl shrink-0">
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(entry.carpet.id, 1)}
                          className="w-7 h-7 rounded-lg bg-[#0A0A0A] text-[#FACC15] flex items-center justify-center active:scale-90 cursor-pointer"
                          title="افزایش"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-6 text-center text-xs font-bold text-black tabular-nums">
                          {toPersianDigits(entry.quantity)}
                        </span>
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(entry.carpet.id, -1)}
                          className="w-7 h-7 rounded-lg bg-white text-black border border-neutral-300 flex items-center justify-center active:scale-90 cursor-pointer"
                          title="کاهش یا حذف"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Invoice Totals Footer */}
                <div className="bg-[#141414] text-white px-3.5 py-3 flex items-center justify-between border-t border-neutral-300">
                  <div className="text-xs">
                    <span className="text-neutral-400">تعداد کل سفارش: </span>
                    <strong className="text-[#FACC15] text-sm tabular-nums">
                      {toPersianDigits(totalCount)} تخته فرش
                    </strong>
                  </div>
                  <div className="text-xs">
                    <span className="text-neutral-400">مجموع متراژ: </span>
                    <strong className="text-white text-sm tabular-nums">
                      {toPersianDigits(totalAreaSqM)} متر مربع
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Sticky Share & Export Invoice Bar */}
            <div className="p-3.5 bg-[#141414] border-t border-neutral-800 space-y-2">
              {/* Primary Native Share Invoice Button (Image + Text) */}
              <button
                type="button"
                onClick={handleNativeShareInvoice}
                disabled={isSharingImage}
                className="w-full h-11 rounded-xl bg-[#FACC15] hover:bg-yellow-300 text-black text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-md active:scale-[0.99] transition-all cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
                <span>
                  {isSharingImage
                    ? 'در حال آماده‌سازی تصویر فاکتور...'
                    : 'اشتراک‌گذاری مستقیم فاکتور (تصویر و متن)'}
                </span>
              </button>

              {/* Secondary Quick Share Actions: WhatsApp, Telegram, Download PNG, Copy Text */}
              <div className="grid grid-cols-4 gap-1.5">
                <a
                  href={whatsappShareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-9 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-[11px] font-bold flex items-center justify-center gap-1 transition-colors"
                >
                  <Send className="w-3 h-3 text-[#FACC15]" />
                  <span>واتساپ</span>
                </a>

                <a
                  href={telegramShareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-9 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-[11px] font-bold flex items-center justify-center gap-1 transition-colors"
                >
                  <Send className="w-3 h-3 text-[#FACC15]" />
                  <span>تلگرام</span>
                </a>

                <button
                  type="button"
                  onClick={handleDownloadInvoiceImage}
                  disabled={isSharingImage}
                  className="h-9 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-[11px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                >
                  <Download className="w-3 h-3 text-[#FACC15]" />
                  <span>عکس فاکتور</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyInvoiceText}
                  className="h-9 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-[11px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                >
                  {copiedText ? (
                    <>
                      <Check className="w-3 h-3 text-[#FACC15]" />
                      <span className="text-[#FACC15]">کپی شد</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 text-[#FACC15]" />
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
