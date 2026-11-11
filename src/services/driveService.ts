import { CarpetPatternInfo, SizeCategory } from './carpetNaming';

export interface CarpetItem {
  id: string;
  originalId?: string;
  whiteBgId?: string;
  perspectiveDriveId?: string | null;
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
  whiteBgUrl?: string;
  perspectiveUrl?: string;
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

let cachedFallbacksPromise: Promise<Record<string, string>> | null = null;

export async function getStaticPerspectiveFallback(originalId: string): Promise<string | null> {
  try {
    if (!cachedFallbacksPromise) {
      cachedFallbacksPromise = fetch('./perspective-fallbacks.json')
        .then((r) => (r.ok ? r.json() : {}))
        .catch(() => ({}));
    }
    const map = await cachedFallbacksPromise;
    return map[originalId] || null;
  } catch {
    return null;
  }
}

function normalizeCatalogUrls(data: ServerCatalogResponse): ServerCatalogResponse {
  return {
    ...data,
    items: data.items.map((item) => {
      const whiteId = item.whiteBgId || item.id;
      const origId = item.originalId || item.id;
      return {
        ...item,
        id: whiteId,
        whiteBgId: whiteId,
        originalId: origId,
        localUrl: `./api/carpet-white/${whiteId}?v=topdown34`,
        whiteBgUrl: `./api/carpet-white/${whiteId}?v=topdown34`,
        perspectiveUrl: `./api/carpet-perspective/${origId}?v=persp2`,
      };
    }),
  };
}

export async function fetchStoredCatalogFromServer(): Promise<ServerCatalogResponse> {
  try {
    const res = await fetch('./api/catalog');
    if (res.ok) {
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = (await res.json()) as ServerCatalogResponse;
        if (data && Array.isArray(data.items) && data.items.length > 0) {
          return normalizeCatalogUrls(data);
        }
      }
    }
  } catch {
    // Fallback to static public/catalog.json (e.g. GitHub Pages / static hosting)
  }

  const staticRes = await fetch('./catalog.json');
  if (!staticRes.ok) {
    throw new Error('خطا در خواندن کاتالوگ فرش');
  }
  const staticData = (await staticRes.json()) as ServerCatalogResponse;
  return normalizeCatalogUrls(staticData);
}
