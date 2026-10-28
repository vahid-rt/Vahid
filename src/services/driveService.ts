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
  const res = await fetch('/api/catalog');
  if (!res.ok) {
    throw new Error('خطا در خواندن کاتالوگ از سرور سایت');
  }
  return res.json() as Promise<ServerCatalogResponse>;
}
