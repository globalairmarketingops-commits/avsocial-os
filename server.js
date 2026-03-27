/* =====================================================================
   Av/SocialOS — Node.js Server
   Static file server + Data API for GlobalAir.com Social Operations
   Port: 8093 (configurable via PORT env var)
   ===================================================================== */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8093;
const APP_DIR = path.join(__dirname, 'app');
const DATA_DIR = path.join(__dirname, 'data');

const MIME_TYPES = {
  '.html': 'text/html',
  '.css':  'text/css',
  '.js':   'application/javascript',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.csv':  'text/csv',
  '.woff': 'font/woff',
  '.woff2':'font/woff2'
};

// Data file mapping: API route -> JSON file
// Populated as Windsor.ai data fetches are added
const DATA_FILES = {};

function serveFile(res, filePath, contentType) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
      return;
    }
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(data);
  });
}

function serveDataFile(res, dataKey) {
  const fileName = DATA_FILES[dataKey];
  if (!fileName) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Unknown data source', available: Object.keys(DATA_FILES) }));
    return;
  }
  const filePath = path.join(DATA_DIR, fileName);
  fs.readFile(filePath, 'utf8', (err, raw) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Data file not found', file: fileName }));
      return;
    }
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(raw);
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  let pathname = url.pathname;

  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }

  // API: Health check
  if (pathname === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      app: 'Av/SocialOS',
      version: '1.0.0',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    }));
    return;
  }

  // API: Data endpoints
  if (pathname.startsWith('/api/data/')) {
    const dataKey = pathname.replace('/api/data/', '');
    serveDataFile(res, dataKey);
    return;
  }

  // API: List available data sources
  if (pathname === '/api/data') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      available: Object.keys(DATA_FILES),
      base_url: '/api/data/'
    }));
    return;
  }

  // Static files: root -> index.html
  if (pathname === '/' || pathname === '/index.html') {
    serveFile(res, path.join(APP_DIR, 'index.html'), 'text/html');
    return;
  }

  // Static files: serve from app/
  const filePath = path.join(APP_DIR, pathname);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  // Security: prevent directory traversal
  if (!filePath.startsWith(APP_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  serveFile(res, filePath, contentType);
});

server.listen(PORT, () => {
  console.log(`\n  Av/SocialOS v1.0.0`);
  console.log(`  ──────────────────────────────`);
  console.log(`  Local:   http://localhost:${PORT}`);
  console.log(`  API:     http://localhost:${PORT}/api/data`);
  console.log(`  Health:  http://localhost:${PORT}/api/health`);
  console.log(`  ──────────────────────────────\n`);
});
