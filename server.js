#!/usr/bin/env node
/*
 * server.js
 *
 * A lightweight HTTP server for the music media site. It serves the static front-end
 * from the `public` directory and exposes simple API endpoints under `/api` to
 * retrieve band data, trigger an update (simulating aggregation), and generate
 * recommendations based on user preferences.
 */

import http from 'http';
import fs from 'fs';
import path from 'path';

const port = process.env.PORT || 3000;
const publicDir = path.join(process.cwd(), 'public');
const dataPath = path.join(process.cwd(), 'data', 'bands.json');

// Predefined potential artists used for simulated updates
const potentialArtists = [
  {
    name: '夜明けのシンフォニー (Symphony at Dawn)',
    genre: 'クラシック',
    mood: '朝',
    description: 'クラシックとエレクトロを融合した新感覚インストゥルメンタルユニット。',
    image: 'images/band5.jpg',
    source: 'aggregated-source-1'
  },
  {
    name: '電子海月 (Digital Jellyfish)',
    genre: 'エレクトロニカ',
    mood: '集中',
    description: '深海のようなサウンドスケープで人気のデジタルアーティスト。',
    image: 'images/band6.jpg',
    source: 'aggregated-source-2'
  },
  {
    name: '星屑ラテン (Stardust Latin)',
    genre: 'ラテン',
    mood: 'パーティー',
    description: 'ラテンのリズムに日本語詞を乗せた異色バンド。',
    image: 'images/band7.jpg',
    source: 'aggregated-source-3'
  }
];

function loadBands() {
  try {
    const json = fs.readFileSync(dataPath, 'utf8');
    return JSON.parse(json);
  } catch (err) {
    console.error('Failed to read bands.json', err);
    return [];
  }
}

function saveBands(bands) {
  fs.writeFileSync(dataPath, JSON.stringify(bands, null, 2), 'utf8');
}

// Simulate adding a new artist to the dataset
function simulateUpdate(bands) {
  const existingNames = new Set(bands.map(b => b.name));
  const candidates = potentialArtists.filter(artist => !existingNames.has(artist.name));
  if (candidates.length === 0) return null;
  const candidate = candidates[Math.floor(Math.random() * candidates.length)];
  const maxId = bands.reduce((max, b) => Math.max(max, b.id), 0);
  const newBand = { id: maxId + 1, ...candidate };
  bands.push(newBand);
  saveBands(bands);
  return newBand;
}

// Generate recommendations based on user preferences (genre and mood/time)
function generateRecommendations(bands, preferences) {
  // simple scoring: +2 for genre match, +1 for mood match
  return bands
    .map(band => {
      let score = 0;
      if (preferences.genre && preferences.genre !== 'all' && band.genre === preferences.genre) {
        score += 2;
      }
      if (preferences.mood && preferences.mood !== 'all' && band.mood === preferences.mood) {
        score += 1;
      }
      return { band, score };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(item => item.band)
    .slice(0, 5); // limit to top 5
}

function serveStaticFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml'
  }[ext] || 'application/octet-stream';
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not Found');
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    }
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  // Handle API endpoints
  if (pathname.startsWith('/api/')) {
    if (req.method === 'GET' && pathname === '/api/bands') {
      const bands = loadBands();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(bands));
      return;
    }
    if (req.method === 'POST' && pathname === '/api/update') {
      // Update dataset by simulating a new band addition
      let bands = loadBands();
      const newBand = simulateUpdate(bands);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ updated: !!newBand, newBand }));
      return;
    }
    if (req.method === 'POST' && pathname === '/api/recommend') {
      // Read request body
      let body = '';
      req.on('data', chunk => {
        body += chunk;
      });
      req.on('end', () => {
        try {
          const prefs = JSON.parse(body || '{}');
          const bands = loadBands();
          const recommendations = generateRecommendations(bands, prefs);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(recommendations));
        } catch (err) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid JSON' }));
        }
      });
      return;
    }
    // Unknown API route
    res.writeHead(404);
    res.end('API Not Found');
    return;
  }

  // Serve static files
  let filePath = path.join(publicDir, pathname);
  if (pathname === '/' || pathname === '') {
    filePath = path.join(publicDir, 'index.html');
  }
  // Prevent directory traversal
  if (!filePath.startsWith(publicDir)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  serveStaticFile(res, filePath);
});

server.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});