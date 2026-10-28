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
    carpetFolderId: null,
    duplicatesRemovedCount: 0,
    items: [],
    albums: [],
  };
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Serve downloaded carpet images from /public/carpets
  app.use('/carpets', express.static(PUBLIC_CARPETS_DIR, { maxAge: '7d' }));

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
