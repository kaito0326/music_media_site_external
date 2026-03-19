#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import https from 'https';

const API_KEY = process.env.YOUTUBE_API_KEY || '';
const REGION_CODE = process.env.YOUTUBE_REGION_CODE || 'JP';
const DATA_PATH = path.join(process.cwd(), 'data', 'bands.json');

const QUERIES = [
  'indie band new single',
  'indie rock new release',
  'Japanese indie rock new song',
  'shoegaze new release',
  'dream pop new single'
];

const GENRE_KEYWORDS = {
  shoegaze: 'ロック',
  indie: 'ロック',
  rock: 'ロック',
  dream: 'ポップ',
  pop: 'ポップ',
  folk: 'フォーク',
  jazz: 'ジャズ',
  electronic: 'エレクトロニカ',
  synth: 'エレクトロニカ',
  punk: 'パンク'
};

const MOOD_KEYWORDS = {
  chill: 'リラックス',
  ambient: 'リラックス',
  live: 'エネルギー',
  upbeat: 'エネルギー',
  acoustic: 'リラックス',
  focus: '集中',
  morning: '朝',
  night: '夜'
};

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', reject);
  });
}

function isoDaysAgo(days) {
  const date = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return date.toISOString();
}

function inferGenre(text) {
  const lower = text.toLowerCase();
  for (const [keyword, genre] of Object.entries(GENRE_KEYWORDS)) {
    if (lower.includes(keyword)) return genre;
  }
  return 'その他';
}

function inferMood(text) {
  const lower = text.toLowerCase();
  for (const [keyword, mood] of Object.entries(MOOD_KEYWORDS)) {
    if (lower.includes(keyword)) return mood;
  }
  return 'エネルギー';
}

function extractArtistName(title, channelTitle) {
  const separators = [' - ', ' – ', ' — ', ' | ', ' / '];
  for (const sep of separators) {
    if (title.includes(sep)) {
      const first = title.split(sep)[0].trim();
      if (first && first.length < 60) return first;
    }
  }
  return channelTitle || '';
}

function loadBands() {
  try {
    return JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  } catch {
    return [];
  }
}

function saveBands(bands) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(bands, null, 2), 'utf8');
}

async function searchQuery(query) {
  const params = new URLSearchParams({
    part: 'snippet',
    type: 'video',
    order: 'date',
    maxResults: '10',
    q: query,
    publishedAfter: isoDaysAgo(14),
    regionCode: REGION_CODE,
    key: API_KEY
  });
  const url = `https://www.googleapis.com/youtube/v3/search?${params.toString()}`;
  return fetchJson(url);
}

async function main() {
  if (!API_KEY) {
    console.error('YOUTUBE_API_KEY is missing.');
    process.exit(1);
  }

  const bands = loadBands();
  const existingNames = new Set(bands.map(b => b.name.toLowerCase()));
  let nextId = bands.reduce((max, band) => Math.max(max, band.id || 0), 0) + 1;
  let added = 0;

  for (const query of QUERIES) {
    try {
      const data = await searchQuery(query);
      const items = data.items || [];

      for (const item of items) {
        const snippet = item.snippet || {};
        const artistName = extractArtistName(snippet.title || '', snippet.channelTitle || '');
        if (!artistName) continue;
        if (existingNames.has(artistName.toLowerCase())) continue;

        const text = `${snippet.title || ''} ${snippet.description || ''}`;
        bands.push({
          id: nextId++,
          name: artistName,
          genre: inferGenre(text),
          mood: inferMood(text),
          description: (snippet.description || `${artistName} の新着動画が見つかりました。`).slice(0, 220),
          image: snippet.thumbnails?.high?.url || snippet.thumbnails?.medium?.url || 'images/placeholder.png',
          source: 'YouTube',
          link: `https://www.youtube.com/watch?v=${item.id?.videoId || ''}`,
          publishedAt: snippet.publishedAt || ''
        });

        existingNames.add(artistName.toLowerCase());
        added += 1;
      }
    } catch (error) {
      console.warn(`YouTube query failed: ${query}`, error.message);
    }
  }

  saveBands(bands);
  console.log(`YouTube update complete. Added ${added} artists.`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
