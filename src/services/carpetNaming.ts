export type PatternCategory = 'all' | 'afshan' | 'toranj' | 'kheshti' | 'minimal';
export type SizeCategory = 'all' | '4' | '6' | '7.5' | '9';

export interface CarpetPatternInfo {
  persianName: string;
  category: Exclude<PatternCategory, 'all'>;
  categoryLabel: string;
  motifDescription: string;
}

export interface OfflineFilterSettings {
  presetId: 'hd_wool' | 'hdr_knot' | 'golden_warm' | 'deep_studio' | 'original';
  contrast: number;
  sharpness: number;
  brightness: number;
  saturation: number;
  warmth: number;
  vignette: number;
}

export const FILTER_PRESETS: Array<{
  id: OfflineFilterSettings['presetId'];
  name: string;
  subtitle: string;
  settings: Omit<OfflineFilterSettings, 'presetId'>;
}> = [
  {
    id: 'hd_wool',
    name: 'کنتراست و وضوح ویژه (پیش‌فرض)',
    subtitle: 'بهینه‌سازی آفلاین بافت پشم و تفکیک نقوش',
    settings: {
      contrast: 126,
      sharpness: 52,
      brightness: 104,
      saturation: 116,
      warmth: 8,
      vignette: 12,
    },
  },
  {
    id: 'hdr_knot',
    name: 'بافت برجسته تار و پود (HDR)',
    subtitle: 'حداکثر شارپنس و وضوح گره‌های فرش',
    settings: {
      contrast: 135,
      sharpness: 78,
      brightness: 102,
      saturation: 112,
      warmth: 4,
      vignette: 16,
    },
  },
  {
    id: 'golden_warm',
    name: 'نور گرم گالری',
    subtitle: 'تقویت طیف طلایی، کرم و رنگ‌های گرم',
    settings: {
      contrast: 120,
      sharpness: 45,
      brightness: 106,
      saturation: 124,
      warmth: 18,
      vignette: 10,
    },
  },
  {
    id: 'deep_studio',
    name: 'کنتراست عمیق استودیویی',
    subtitle: 'عمق بیشتر رنگ‌های تیره و درخشش زمینه',
    settings: {
      contrast: 142,
      sharpness: 55,
      brightness: 99,
      saturation: 110,
      warmth: 2,
      vignette: 22,
    },
  },
  {
    id: 'original',
    name: 'تصویر طبیعی (بدون فیلتر)',
    subtitle: 'نمایش عکس اصلی بدون پردازش کنتراست',
    settings: {
      contrast: 100,
      sharpness: 0,
      brightness: 100,
      saturation: 100,
      warmth: 0,
      vignette: 0,
    },
  },
];

export const PATTERN_CATEGORIES: Array<{
  id: PatternCategory;
  label: string;
  shortLabel: string;
}> = [
  { id: 'all', label: 'همه طرح‌ها و نقوش', shortLabel: 'همه طرح‌ها' },
  { id: 'afshan', label: 'طرح افشان و گل‌دار', shortLabel: 'افشان و گل‌دار' },
  { id: 'toranj', label: 'طرح لچک و ترنج', shortLabel: 'لچک و ترنج' },
  { id: 'kheshti', label: 'طرح خشتی و هندسی', shortLabel: 'خشتی و هندسی' },
  { id: 'minimal', label: 'طرح وینتیج و پتینه', shortLabel: 'وینتیج و پتینه' },
];

export const SIZE_CATEGORIES: Array<{
  id: SizeCategory;
  label: string;
  shortLabel: string;
  desc: string;
}> = [
  { id: 'all', label: 'همه متراژها', shortLabel: 'همه سایزها', desc: 'تمامی ابعاد موجود در کاتالوگ' },
  { id: '4', label: 'فرش ۴ متری', shortLabel: '۴ متری', desc: 'ابعاد حدود ۱.۵×۲.۲۵ تا ۱.۷۵×۲.۴' },
  { id: '6', label: 'فرش ۶ متری', shortLabel: '۶ متری', desc: 'ابعاد استاندارد ۲×۳ متر' },
  { id: '7.5', label: 'فرش ۷.۵ متری', shortLabel: '۷.۵ متری', desc: 'ابعاد حدود ۲.۵×۳ متر' },
  { id: '9', label: 'فرش ۹ متری', shortLabel: '۹ متری', desc: 'ابعاد حدود ۲.۵×۳.۵ متر' },
];

export function hashString(str: string): number {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
}

export function toPersianDigits(val: string | number): string {
  const persian = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return String(val).replace(/[0-9]/g, (d) => persian[Number(d)]);
}

export function generateCarpetCode(seedString: string, index: number): string {
  const h = hashString(`${seedString}-${index}`);
  const num = 10000 + (h % 89999);
  return `WL-${num}`;
}

export function assignCarpetPattern(fileName: string, fileId: string, index: number): CarpetPatternInfo {
  const fallbackNames: CarpetPatternInfo[] = [
    { persianName: 'افشان زرین', category: 'afshan', categoryLabel: 'طرح افشان و گل‌دار', motifDescription: 'نقوش گل و بوته افشان' },
    { persianName: 'ترنج کهن', category: 'toranj', categoryLabel: 'طرح لچک و ترنج', motifDescription: 'ترنج میانی اصیل ایرانی' },
    { persianName: 'خشتی یشمی', category: 'kheshti', categoryLabel: 'طرح خشتی و هندسی', motifDescription: 'قاب‌بندی خشتی منظم' },
    { persianName: 'پتینه نقره‌ای', category: 'minimal', categoryLabel: 'طرح وینتیج و پتینه', motifDescription: 'بافت پتینه پشم طبیعی' },
  ];
  return fallbackNames[(hashString(fileId + fileName) + index) % fallbackNames.length];
}
