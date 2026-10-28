import { CarpetPatternInfo, SizeCategory } from './carpetNaming';

export interface CarpetItem {
  id: string;
  driveFileName: string;
  code: string;
  tabletCode?: string;
  tabletGrade?: string;
  persianName: string;
  category: CarpetPatternInfo['category'];
  categoryLabel: string;
  motifDescription: string;
  lengthCm?: number;
  widthCm?: number;
  areaSqM?: number;
  dimensionsLabel?: string;
  sizeCategory: Exclude<SizeCategory, 'all'>;
  sizeLabel: string;
  albumId: string;
  albumName: string;
  mimeType: string;
  localUrl: string;
}

export interface CartItem {
  carpet: CarpetItem;
  quantity: number;
}

export interface ServerCatalogResponse {
  syncedAt: string | null;
  carpetFolderName: string;
  carpetFolderId: string | null;
  duplicatesRemovedCount: number;
  items: CarpetItem[];
}

export async function fetchStoredCatalogFromServer(): Promise<ServerCatalogResponse> {
  try {
    const res = await fetch('/api/catalog');
    if (res.ok) {
      const data = (await res.json()) as ServerCatalogResponse;
      if (data && Array.isArray(data.items) && data.items.length > 0) {
        return data;
      }
    }
  } catch {
    // Fallback to static public/catalog.json (e.g. GitHub Pages / static hosting)
  }

  const staticRes = await fetch('./catalog.json');
  if (!staticRes.ok) {
    throw new Error('خطا در خواندن کاتالوگ فرش');
  }
  return staticRes.json() as Promise<ServerCatalogResponse>;
}
