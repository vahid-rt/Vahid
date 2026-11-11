import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PUBLIC_WHITE_DIR = path.join(__dirname, 'public', 'carpets-white');
const PUBLIC_PERSP_DIR = path.join(__dirname, 'public', 'carpets-perspective');
const CATALOG_FILE = path.join(__dirname, 'data', 'catalog.json');
const PUBLIC_CATALOG_FILE = path.join(__dirname, 'public', 'catalog.json');
const PERSP_FALLBACKS_FILE = path.join(__dirname, 'public', 'perspective-fallbacks.json');

for (const dir of [PUBLIC_WHITE_DIR, PUBLIC_PERSP_DIR]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function readStoredCatalog() {
  try {
    if (fs.existsSync(CATALOG_FILE)) {
      return JSON.parse(fs.readFileSync(CATALOG_FILE, 'utf-8'));
    }
    if (fs.existsSync(PUBLIC_CATALOG_FILE)) {
      return JSON.parse(fs.readFileSync(PUBLIC_CATALOG_FILE, 'utf-8'));
    }
  } catch (err) {
    console.error('Error reading catalog.json:', err);
  }
  return {
    syncedAt: null,
    carpetFolderName: 'carpet',
    carpetFolderId: '1RvsIPdD_h84hwKFzKjc4ZgM3dFc_fXHP',
    duplicatesRemovedCount: 0,
    items: [],
    albums: [],
  };
}

let cachedPerspFallbacks: Record<string, string> | null = null;
function getPerspFallbacks(): Record<string, string> {
  if (cachedPerspFallbacks) return cachedPerspFallbacks;
  try {
    if (fs.existsSync(PERSP_FALLBACKS_FILE)) {
      cachedPerspFallbacks = JSON.parse(fs.readFileSync(PERSP_FALLBACKS_FILE, 'utf-8'));
      return cachedPerspFallbacks || {};
    }
  } catch {
    // ignore
  }
  return {};
}

function isValidJpegBuffer(buf: Buffer): boolean {
  if (!buf || buf.length < 4) return false;
  const isJpeg = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  const isPng = buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
  const isWebp = buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46;
  return isJpeg || isPng || isWebp;
}

async function fetchPublicDriveImage(fileId: string): Promise<Buffer | null> {
  const candidateUrls = [
    `https://drive.google.com/thumbnail?id=${encodeURIComponent(fileId)}&sz=w1400`,
    `https://lh3.googleusercontent.com/d/${encodeURIComponent(fileId)}=w1400`,
    `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}`,
  ];

  for (const url of candidateUrls) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
          Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        },
        redirect: 'follow',
      });

      if (!response.ok) continue;

      const contentType = (response.headers.get('content-type') || '').toLowerCase();
      if (contentType.includes('text/html')) {
        continue;
      }

      const arrayBuf = await response.arrayBuffer();
      const buf = Buffer.from(arrayBuf);
      if (isValidJpegBuffer(buf)) {
        return buf;
      }
    } catch {
      // Try next URL
    }
  }

  return null;
}

async function serveWhiteBgImage(req: express.Request, res: express.Response) {
  const rawId = req.params.id || '';
  const fileId = rawId.replace(/\.jpg$/i, '').replace(/[^a-zA-Z0-9_-]/g, '');
  if (!fileId) {
    res.status(400).send('Invalid file ID');
    return;
  }

  const cachedFilePath = path.join(PUBLIC_WHITE_DIR, `${fileId}.jpg`);

  try {
    if (fs.existsSync(cachedFilePath)) {
      const existingBuf = fs.readFileSync(cachedFilePath);
      if (isValidJpegBuffer(existingBuf)) {
        res.setHeader('Content-Type', 'image/jpeg');
        res.setHeader('Cache-Control', 'no-cache, must-revalidate');
        res.send(existingBuf);
        return;
      } else {
        fs.unlinkSync(cachedFilePath);
      }
    }

    const downloadedBuf = await fetchPublicDriveImage(fileId);
    if (downloadedBuf) {
      try {
        fs.writeFileSync(cachedFilePath, downloadedBuf);
      } catch {
        // Ignore write error
      }
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Cache-Control', 'no-cache, must-revalidate');
      res.send(downloadedBuf);
      return;
    }

    res.status(404).json({
      error: 'DRIVE_FOLDER_RESTRICTED',
      message: 'تصویر بک‌گراند سفید در دسترس نیست.',
    });
  } catch (err) {
    console.error('Error serving white-bg carpet image:', err);
    res.status(500).send('Error loading image');
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Slide 1: Serve 3:4 Top-Down White-Background Carpet Image (fresh endpoint to bypass old 7-day browser cache)
  app.get('/api/carpet-white/:id', serveWhiteBgImage);
  app.get('/api/carpet-image/:id', serveWhiteBgImage);

  // Slide 2: Serve Perspective Angle Carpet Image
  app.get('/api/carpet-perspective/:id', async (req, res) => {
    const rawId = req.params.id || '';
    const fileId = rawId.replace(/\.jpg$/i, '').replace(/[^a-zA-Z0-9_-]/g, '');
    if (!fileId) {
      res.status(400).send('Invalid file ID');
      return;
    }

    const cachedPerspPath = path.join(PUBLIC_PERSP_DIR, `${fileId}.jpg`);

    try {
      // 1. Check local perspective cache (/public/carpets-perspective/:id.jpg)
      if (fs.existsSync(cachedPerspPath)) {
        const existingBuf = fs.readFileSync(cachedPerspPath);
        if (isValidJpegBuffer(existingBuf)) {
          res.setHeader('Content-Type', 'image/jpeg');
          res.setHeader('Cache-Control', 'no-cache, must-revalidate');
          res.send(existingBuf);
          return;
        }
      }

      // 2. Check if catalog has a perspectiveDriveId for this item
      const catalog = readStoredCatalog();
      const matchedItem = (catalog.items || []).find(
        (it: { id?: string; originalId?: string; perspectiveDriveId?: string }) =>
          it.originalId === fileId || it.id === fileId || it.perspectiveDriveId === fileId
      );
      const drivePerspId = matchedItem?.perspectiveDriveId || fileId;

      if (drivePerspId) {
        const downloadedBuf = await fetchPublicDriveImage(drivePerspId);
        if (downloadedBuf) {
          try {
            fs.writeFileSync(cachedPerspPath, downloadedBuf);
          } catch {
            // ignore
          }
          res.setHeader('Content-Type', 'image/jpeg');
          res.setHeader('Cache-Control', 'no-cache, must-revalidate');
          res.send(downloadedBuf);
          return;
        }
      }

      // 3. Check persistent Base64 JSON fallback (/public/perspective-fallbacks.json)
      const fallbacks = getPerspFallbacks();
      const dataUrl = fallbacks[fileId] || (matchedItem?.originalId ? fallbacks[matchedItem.originalId] : null);
      if (dataUrl && dataUrl.startsWith('data:image/')) {
        const base64Part = dataUrl.split(',')[1];
        if (base64Part) {
          const buf = Buffer.from(base64Part, 'base64');
          res.setHeader('Content-Type', 'image/jpeg');
          res.setHeader('Cache-Control', 'no-cache, must-revalidate');
          res.send(buf);
          return;
        }
      }

      res.status(404).send('Perspective image not found');
    } catch (err) {
      console.error('Error serving perspective carpet image:', err);
      res.status(500).send('Error loading perspective image');
    }
  });

  // Serve stored catalog metadata
  app.get('/api/catalog', (_req, res) => {
    res.setHeader('Cache-Control', 'no-cache, must-revalidate');
    const catalog = readStoredCatalog();
    res.json(catalog);
  });

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
