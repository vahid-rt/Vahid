import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import {
  assignCarpetPattern,
  generateCarpetCode,
} from './src/services/carpetNaming.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PUBLIC_CARPETS_DIR = path.join(__dirname, 'public', 'carpets');
const DATA_DIR = path.join(__dirname, 'data');
const CATALOG_FILE = path.join(DATA_DIR, 'catalog.json');

// Ensure directories exist
if (!fs.existsSync(PUBLIC_CARPETS_DIR)) {
  fs.mkdirSync(PUBLIC_CARPETS_DIR, { recursive: true });
}
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export interface StoredCarpetItem {
  id: string;
  driveFileName: string;
  code: string;
  persianName: string;
  category: 'afshan' | 'toranj' | 'kheshti' | 'minimal';
  categoryLabel: string;
  motifDescription: string;
  albumId: string;
  albumName: string;
  mimeType: string;
  localUrl: string; // e.g. /carpets/<id>.jpg
  md5Checksum?: string;
  size?: number;
  width?: number;
  height?: number;
  visualHash?: string;
}

export interface StoredCatalogData {
  syncedAt: string | null;
  carpetFolderName: string;
  carpetFolderId: string | null;
  duplicatesRemovedCount: number;
  items: StoredCarpetItem[];
  albums: Array<{
    id: string;
    name: string;
    count: number;
    isDriveFolder: boolean;
  }>;
}

function readStoredCatalog(): StoredCatalogData {
  try {
    if (fs.existsSync(CATALOG_FILE)) {
      const raw = fs.readFileSync(CATALOG_FILE, 'utf-8');
      return JSON.parse(raw) as StoredCatalogData;
    }
  } catch (err) {
    console.error('Error reading catalog.json:', err);
  }
  return {
    syncedAt: null,
    carpetFolderName: 'carpet',
    carpetFolderId: null,
    duplicatesRemovedCount: 0,
    items: [],
    albums: [],
  };
}

function writeStoredCatalog(data: StoredCatalogData) {
  // Recalculate albums count from items
  const albumMap = new Map<
    string,
    { id: string; name: string; count: number; isDriveFolder: boolean }
  >();
  for (const item of data.items) {
    const ex = albumMap.get(item.albumId);
    if (ex) {
      ex.count += 1;
    } else {
      albumMap.set(item.albumId, {
        id: item.albumId,
        name: item.albumName,
        count: 1,
        isDriveFolder: true,
      });
    }
  }
  data.albums = Array.from(albumMap.values());
  fs.writeFileSync(CATALOG_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * Normalizes a filename to detect obvious copy suffixes like "IMG_123 (1).jpg" or "carpet - Copy.jpg"
 */
function normalizeBaseFilename(name: string): string {
  return name
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, '') // strip extension
    .replace(/\s*\(\d+\)\s*$/g, '') // strip (1), (2)
    .replace(/\s*-\s*copy.*$/i, '') // strip - Copy
    .replace(/\s*copy\s*\d*$/i, '')
    .replace(/[_-]\s*copy.*$/i, '')
    .trim();
}

interface DriveFileNode {
  id: string;
  name: string;
  mimeType: string;
  md5Checksum?: string;
  size?: string;
  parents?: string[];
  thumbnailLink?: string;
  imageMediaMetadata?: {
    width?: number;
    height?: number;
  };
}

async function driveApiGet<T>(url: string, accessToken: string): Promise<T> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (res.status === 401 || res.status === 403) {
    throw new Error('AUTH_EXPIRED');
  }
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Drive API error (${res.status}): ${txt}`);
  }
  return res.json() as Promise<T>;
}

async function downloadDriveFileToDisk(
  fileId: string,
  accessToken: string,
  destPath: string,
  thumbnailLink?: string
): Promise<boolean> {
  try {
    const mediaUrl = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`;
    const res = await fetch(mediaUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (res.ok) {
      const arrayBuffer = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      if (buffer.length > 100) {
        fs.writeFileSync(destPath, buffer);
        return true;
      }
    }
  } catch (err) {
    console.warn(`Direct alt=media download failed for ${fileId}:`, err);
  }

  // Fallback to high-res thumbnailLink if alt=media failed
  if (thumbnailLink) {
    try {
      const hiResThumb = thumbnailLink.replace(/=s\d+/, '=s1600');
      const res = await fetch(hiResThumb, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const arrayBuffer = await res.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        if (buffer.length > 100) {
          fs.writeFileSync(destPath, buffer);
          return true;
        }
      }
    } catch (err) {
      console.warn(`Thumbnail download failed for ${fileId}:`, err);
    }
  }

  return false;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // Serve downloaded carpet images directly from /public/carpets
  app.use('/carpets', express.static(PUBLIC_CARPETS_DIR, { maxAge: '7d' }));

  // 1. GET /api/catalog - Returns the permanently uploaded carpet catalog on the site
  app.get('/api/catalog', (_req, res) => {
    const catalog = readStoredCatalog();
    res.json(catalog);
  });

  // 2. POST /api/catalog/sync-drive - Downloads all unique images from 'carpet' folder in Google Drive & saves to server
  app.post('/api/catalog/sync-drive', async (req, res) => {
    try {
      const { accessToken, customFolderId } = req.body as {
        accessToken?: string;
        customFolderId?: string;
      };

      if (!accessToken) {
        res.status(400).json({ error: 'توکن دسترسی گوگل درایو ارسال نشده است.' });
        return;
      }

      // Fetch all folders in user's Drive
      const foldersQuery = encodeURIComponent(
        "mimeType = 'application/vnd.google-apps.folder' and trashed = false"
      );
      const foldersUrl = `https://www.googleapis.com/drive/v3/files?q=${foldersQuery}&pageSize=200&fields=files(id,name,parents)&orderBy=name`;
      const foldersData = await driveApiGet<{
        files: Array<{ id: string; name: string; parents?: string[] }>;
      }>(foldersUrl, accessToken);
      const allFolders = foldersData.files || [];

      // Locate 'carpet' folder (or customFolderId)
      let targetFolder = customFolderId
        ? allFolders.find((f) => f.id === customFolderId)
        : allFolders.find((f) => f.name.trim().toLowerCase() === 'carpet');

      if (!targetFolder && !customFolderId) {
        targetFolder = allFolders.find(
          (f) =>
            f.name.toLowerCase().includes('carpet') ||
            f.name.includes('فرش') ||
            f.name.toLowerCase().includes('rug')
        );
      }

      // Collect all descendant folders inside 'carpet' (1st and 2nd level subfolders)
      const folderIdToAlbumName = new Map<string, string>();
      const targetParentIds: string[] = [];

      if (targetFolder) {
        targetParentIds.push(targetFolder.id);
        folderIdToAlbumName.set(targetFolder.id, `آلبوم اصلی (${targetFolder.name})`);

        // Level 1 subfolders
        const subFolders1 = allFolders.filter(
          (f) => f.parents && f.parents.includes(targetFolder!.id)
        );
        for (const sf1 of subFolders1) {
          targetParentIds.push(sf1.id);
          folderIdToAlbumName.set(sf1.id, sf1.name);

          // Level 2 subfolders
          const subFolders2 = allFolders.filter(
            (f) => f.parents && f.parents.includes(sf1.id)
          );
          for (const sf2 of subFolders2) {
            targetParentIds.push(sf2.id);
            folderIdToAlbumName.set(sf2.id, `${sf1.name} - ${sf2.name}`);
          }
        }
      }

      // Query all images inside targetParentIds
      let rawImages: DriveFileNode[] = [];
      if (targetParentIds.length > 0) {
        // Chunk parent clauses in groups of 15 to respect Drive query limits
        for (let i = 0; i < targetParentIds.length; i += 15) {
          const chunk = targetParentIds.slice(i, i + 15);
          const parentClause = chunk.map((id) => `'${id}' in parents`).join(' or ');
          const q = encodeURIComponent(
            `(${parentClause}) and mimeType contains 'image/' and trashed = false`
          );
          const url = `https://www.googleapis.com/drive/v3/files?q=${q}&pageSize=300&fields=files(id,name,mimeType,md5Checksum,size,parents,thumbnailLink,imageMediaMetadata)&orderBy=name`;
          const resp = await driveApiGet<{ files: DriveFileNode[] }>(url, accessToken);
          if (resp.files) {
            rawImages.push(...resp.files);
          }
        }
      }

      // Fallback if no images were inside 'carpet' folder
      if (rawImages.length === 0) {
        const q = encodeURIComponent("mimeType contains 'image/' and trashed = false");
        const url = `https://www.googleapis.com/drive/v3/files?q=${q}&pageSize=100&fields=files(id,name,mimeType,md5Checksum,size,parents,thumbnailLink,imageMediaMetadata)&orderBy=createdTime desc`;
        const resp = await driveApiGet<{ files: DriveFileNode[] }>(url, accessToken);
        rawImages = resp.files || [];
        for (const img of rawImages) {
          const pid = img.parents?.[0];
          if (pid && !folderIdToAlbumName.has(pid)) {
            const mf = allFolders.find((f) => f.id === pid);
            folderIdToAlbumName.set(pid, mf ? mf.name : 'آلبوم تصاویر درایو');
          }
        }
      }

      // DEDUPLICATION STEP 1 & 2 (Server-side before downloading):
      // Sort images so higher resolution / original filenames (without "(1)" or "Copy") come first
      rawImages.sort((a, b) => {
        const aIsCopy = /\(\d+\)|copy/i.test(a.name) ? 1 : 0;
        const bIsCopy = /\(\d+\)|copy/i.test(b.name) ? 1 : 0;
        if (aIsCopy !== bIsCopy) return aIsCopy - bIsCopy;
        const aArea = (a.imageMediaMetadata?.width || 0) * (a.imageMediaMetadata?.height || 0);
        const bArea = (b.imageMediaMetadata?.width || 0) * (b.imageMediaMetadata?.height || 0);
        return bArea - aArea;
      });

      const seenMd5 = new Set<string>();
      const seenNameAndSize = new Set<string>();
      const seenBaseName = new Set<string>();
      const uniqueDriveFiles: DriveFileNode[] = [];
      let duplicatesSkipped = 0;

      for (const file of rawImages) {
        const md5 = file.md5Checksum?.trim();
        const baseName = normalizeBaseFilename(file.name);
        const sizeKey = `${baseName}::${file.size || ''}`;

        // 1. Exact binary duplicate via MD5 checksum
        if (md5 && seenMd5.has(md5)) {
          duplicatesSkipped++;
          continue;
        }

        // 2. Same normalized name + file size
        if (seenNameAndSize.has(sizeKey)) {
          duplicatesSkipped++;
          continue;
        }

        // 3. Same normalized filename (e.g. "IMG_2041 (1).jpg" and "IMG_2041.jpg")
        if (baseName.length >= 3 && seenBaseName.has(baseName)) {
          duplicatesSkipped++;
          continue;
        }

        if (md5) seenMd5.add(md5);
        seenNameAndSize.add(sizeKey);
        if (baseName.length >= 3) seenBaseName.add(baseName);

        uniqueDriveFiles.push(file);
      }

      // Download each unique image to /public/carpets/<id>.jpg on the server
      const existingCatalog = readStoredCatalog();
      const existingMap = new Map<string, StoredCarpetItem>();
      existingCatalog.items.forEach((it) => existingMap.set(it.id, it));

      const savedItems: StoredCarpetItem[] = [];

      // Download in parallel batches of 5 for high speed
      const BATCH_SIZE = 5;
      for (let i = 0; i < uniqueDriveFiles.length; i += BATCH_SIZE) {
        const batch = uniqueDriveFiles.slice(i, i + BATCH_SIZE);
        const batchResults = await Promise.all(
          batch.map(async (file, batchIdx) => {
            const globalIdx = i + batchIdx;
            const ext = file.mimeType.includes('png')
              ? 'png'
              : file.mimeType.includes('webp')
              ? 'webp'
              : 'jpg';
            const filenameOnDisk = `${file.id}.${ext}`;
            const fullDiskPath = path.join(PUBLIC_CARPETS_DIR, filenameOnDisk);
            const publicUrl = `/carpets/${filenameOnDisk}`;

            // If not already downloaded on disk, download from Google Drive
            let downloadedOk = fs.existsSync(fullDiskPath) && fs.statSync(fullDiskPath).size > 100;
            if (!downloadedOk) {
              downloadedOk = await downloadDriveFileToDisk(
                file.id,
                accessToken,
                fullDiskPath,
                file.thumbnailLink
              );
            }

            if (!downloadedOk) {
              return null;
            }

            // Preserve existing custom name/code if previously synced
            const prev = existingMap.get(file.id);
            const patternInfo = assignCarpetPattern(file.name, file.id, globalIdx);
            const parentId = file.parents?.[0] || targetFolder?.id || 'main-carpet';
            const albumName =
              folderIdToAlbumName.get(parentId) ||
              (targetFolder ? targetFolder.name : 'آلبوم اصلی فرش');

            const item: StoredCarpetItem = {
              id: file.id,
              driveFileName: file.name,
              code: prev?.code || generateCarpetCode(file.id, globalIdx),
              persianName: prev?.persianName || patternInfo.persianName,
              category: prev?.category || patternInfo.category,
              categoryLabel: prev?.categoryLabel || patternInfo.categoryLabel,
              motifDescription: prev?.motifDescription || patternInfo.motifDescription,
              albumId: parentId,
              albumName,
              mimeType: file.mimeType,
              localUrl: publicUrl,
              md5Checksum: file.md5Checksum,
              size: file.size ? Number(file.size) : undefined,
              width: file.imageMediaMetadata?.width,
              height: file.imageMediaMetadata?.height,
              visualHash: prev?.visualHash,
            };
            return item;
          })
        );

        for (const resItem of batchResults) {
          if (resItem) savedItems.push(resItem);
        }
      }

      const updatedCatalog: StoredCatalogData = {
        syncedAt: new Date().toISOString(),
        carpetFolderName: targetFolder ? targetFolder.name : 'carpet',
        carpetFolderId: targetFolder ? targetFolder.id : null,
        duplicatesRemovedCount: duplicatesSkipped,
        items: savedItems,
        albums: [],
      };

      writeStoredCatalog(updatedCatalog);

      res.json({
        ...updatedCatalog,
        allDriveFolders: allFolders.map((f) => ({ id: f.id, name: f.name })),
      });
    } catch (err: unknown) {
      console.error('Error syncing Drive catalog to server:', err);
      const msg = err instanceof Error ? err.message : 'خطا در دانلود تصاویر از گوگل درایو';
      res.status(msg === 'AUTH_EXPIRED' ? 401 : 500).json({ error: msg });
    }
  });

  // 3. POST /api/catalog/remove-visual-duplicates - Removes visually identical carpets detected by client perceptual hashing
  app.post('/api/catalog/remove-visual-duplicates', (req, res) => {
    const { duplicateIds, visualHashes } = req.body as {
      duplicateIds?: string[];
      visualHashes?: Record<string, string>;
    };

    const catalog = readStoredCatalog();

    if (visualHashes) {
      catalog.items.forEach((it) => {
        if (visualHashes[it.id]) {
          it.visualHash = visualHashes[it.id];
        }
      });
    }

    if (duplicateIds && duplicateIds.length > 0) {
      const dupSet = new Set(duplicateIds);
      const beforeCount = catalog.items.length;
      catalog.items = catalog.items.filter((it) => {
        if (dupSet.has(it.id)) {
          // Also remove file from disk to keep server clean
          const diskFile = path.join(__dirname, 'public', it.localUrl);
          if (fs.existsSync(diskFile)) {
            try {
              fs.unlinkSync(diskFile);
            } catch {
              // ignore
            }
          }
          return false;
        }
        return true;
      });
      const removedNow = beforeCount - catalog.items.length;
      catalog.duplicatesRemovedCount = (catalog.duplicatesRemovedCount || 0) + removedNow;
    }

    writeStoredCatalog(catalog);
    res.json(catalog);
  });

  // 4. PATCH /api/catalog/item/:id - Update a carpet's Persian name, code, or refined pattern permanently on the server
  app.patch('/api/catalog/item/:id', (req, res) => {
    const { id } = req.params;
    const updates = req.body as Partial<StoredCarpetItem>;
    const catalog = readStoredCatalog();
    let updated = false;

    catalog.items = catalog.items.map((it) => {
      if (it.id === id) {
        updated = true;
        return {
          ...it,
          ...(updates.persianName ? { persianName: updates.persianName } : {}),
          ...(updates.code ? { code: updates.code } : {}),
          ...(updates.category ? { category: updates.category } : {}),
          ...(updates.categoryLabel ? { categoryLabel: updates.categoryLabel } : {}),
          ...(updates.motifDescription ? { motifDescription: updates.motifDescription } : {}),
        };
      }
      return it;
    });

    if (updated) {
      writeStoredCatalog(catalog);
    }
    res.json(catalog);
  });

  // 5. DELETE /api/catalog/item/:id - Delete a specific carpet photo from the catalog
  app.delete('/api/catalog/item/:id', (req, res) => {
    const { id } = req.params;
    const catalog = readStoredCatalog();
    catalog.items = catalog.items.filter((it) => {
      if (it.id === id) {
        const diskFile = path.join(__dirname, 'public', it.localUrl);
        if (fs.existsSync(diskFile)) {
          try {
            fs.unlinkSync(diskFile);
          } catch {
            // ignore
          }
        }
        return false;
      }
      return true;
    });
    writeStoredCatalog(catalog);
    res.json(catalog);
  });

  // Mount Vite middleware in development or static dist in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
