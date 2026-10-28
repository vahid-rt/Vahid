import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PUBLIC_CARPETS_DIR = path.join(__dirname, 'public', 'carpets');
const CATALOG_FILE = path.join(__dirname, 'data', 'catalog.json');
const PUBLIC_CATALOG_FILE = path.join(__dirname, 'public', 'catalog.json');

if (!fs.existsSync(PUBLIC_CARPETS_DIR)) {
  fs.mkdirSync(PUBLIC_CARPETS_DIR, { recursive: true });
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

function isValidJpegBuffer(buf: Buffer): boolean {
  if (!buf || buf.length < 4) return false;
  // JPEG magic bytes: FF D8 FF, or PNG: 89 50 4E 47, or WebP: 52 49 46 46
  const isJpeg = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  const isPng = buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
  const isWebp = buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46;
  return isJpeg || isPng || isWebp;
}

async function fetchPublicDriveImage(fileId: string): Promise<Buffer | null> {
  const candidateUrls = [
    `https://drive.google.com/thumbnail?id=${encodeURIComponent(fileId)}&sz=w1200`,
    `https://lh3.googleusercontent.com/d/${encodeURIComponent(fileId)}=w1200`,
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

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Serve cached carpet images or fetch them on demand from public Google Drive
  app.get('/api/carpet-image/:id', async (req, res) => {
    const rawId = req.params.id || '';
    const fileId = rawId.replace(/\.jpg$/i, '').replace(/[^a-zA-Z0-9_-]/g, '');
    if (!fileId) {
      res.status(400).send('Invalid file ID');
      return;
    }

    const cachedFilePath = path.join(PUBLIC_CARPETS_DIR, `${fileId}.jpg`);

    try {
      if (fs.existsSync(cachedFilePath)) {
        const existingBuf = fs.readFileSync(cachedFilePath);
        if (isValidJpegBuffer(existingBuf)) {
          res.setHeader('Content-Type', 'image/jpeg');
          res.setHeader('Cache-Control', 'public, max-age=604800');
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
          // Ignore write error if read-only filesystem
        }
        res.setHeader('Content-Type', 'image/jpeg');
        res.setHeader('Cache-Control', 'public, max-age=604800');
        res.send(downloadedBuf);
        return;
      }

      res.status(404).json({
        error: 'DRIVE_FOLDER_RESTRICTED',
        message:
          'پوشه carpet در گوگل درایو هنوز روی حالت Anyone with the link (عمومی) قرار نگرفته است.',
      });
    } catch (err) {
      console.error('Error serving carpet image:', err);
      res.status(500).send('Error loading image');
    }
  });

  // Also handle /carpets/:filename by routing through the same caching logic
  app.get('/carpets/:filename', async (req, res) => {
    const rawName = req.params.filename || '';
    const fileId = rawName.replace(/\.jpg$/i, '').replace(/[^a-zA-Z0-9_-]/g, '');
    if (!fileId) {
      res.status(400).send('Invalid filename');
      return;
    }

    const cachedFilePath = path.join(PUBLIC_CARPETS_DIR, `${fileId}.jpg`);
    if (fs.existsSync(cachedFilePath)) {
      const existingBuf = fs.readFileSync(cachedFilePath);
      if (isValidJpegBuffer(existingBuf)) {
        res.setHeader('Content-Type', 'image/jpeg');
        res.setHeader('Cache-Control', 'public, max-age=604800');
        res.send(existingBuf);
        return;
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
      res.setHeader('Cache-Control', 'public, max-age=604800');
      res.send(downloadedBuf);
      return;
    }

    res.status(404).send('Image not accessible yet');
  });

  // Serve stored catalog metadata
  app.get('/api/catalog', (_req, res) => {
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
