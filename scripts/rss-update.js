#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import https from 'https';

const DATA_PATH = path.join(process.cwd(), 'public', 'data', 'bands.json');

// カンマ区切りで上書き可能。
// 例: RSS_FEEDS="https://pitchfork.com/feed/feed-news/rss,https://example.com/feed.xml"
const FEEDS = (process.env.RSS_FEEDS
  ? process.env.RSS_FEEDS.split(',').map(v => v.trim()).filter(Boolean)
  : [
      'https://pitchfork.com/feed/feed-news/rss'
    ]);

const GENRE_KEYWORDS = {
  rock: 'ロック',
  indie: 'ロック',
  pop: 'ポップ',
  jazz: 'ジャズ',
  folk: 'フォーク',
  classical: 'クラシック',
  electronic: 'エレクトロニカ',
  electronica: 'エレクトロニカ',
  synth: 'エレクトロニカ',
  punk: 'パンク',
  latin: 'ラテン',
  soul: 'ソウル',
  'r&b': 'R&B'
};

const MOOD_KEYWORDS = {
  morning: '朝',
  night: '夜',
  ambient: 'リラックス',
  chill: 'リラックス',
  relaxing: 'リラックス',
  focus: '集中',
  study: '集中',
  dance: 'パーティー',
  party: 'パーティー',
  energetic: 'エネルギー',
  upbeat: 'エネルギー',
  nostalgic: '懐かしさ',
  retro: '懐かしさ'
};

function fetchText(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        resolve(fetchText(res.headers.location));
        return;
      }
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function decodeEntities(text) {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1');
}

function stripHtml(text) {
  return decodeEntities(text).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function extractTag(xml, tag) {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return match ? stripHtml(match[1]) : '';
}

function parseItems(xml) {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(match => {
    const itemXml = match[1];
    return {
      title: extractTag(itemXml, 'title'),
      link: extractTag(itemXml, 'link'),
      description: extractTag(itemXml, 'description'),
      pubDate: extractTag(itemXml, 'pubDate')
    };
  });
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

function extractArtistName(title) {
  const patterns = [
    /^Listen to\s+(.+?)['’]s\s+/i,
    /^(.+?)\s+(Shares|Share|Announces|Announce|Releases|Release|Drops|Drop|Unveils|Unveil|Returns|Return)\b/i,
    /^(.+?)\s+(New Song|New Album|EP|Mixtape|Single)\b/i,
    /^Watch\s+(.+?)\b/i
  ];
  for (const pattern of patterns) {
    const match = title.match(pattern);
    if (match) return match[1].trim();
  }
  return '';
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

async function main() {
  const bands = loadBands();
  const existingNames = new Set(bands.map(b => b.name.toLowerCase()));
  let nextId = bands.reduce((max, band) => Math.max(max, band.id || 0), 0) + 1;
  let added = 0;

  for (const feedUrl of FEEDS) {
    try {
      const xml = await fetchText(feedUrl);
      const items = parseItems(xml).slice(0, 20);

      for (const item of items) {
        const artistName = extractArtistName(item.title);
        if (!artistName) continue;
        if (existingNames.has(artistName.toLowerCase())) continue;

        const combined = `${item.title} ${item.description}`;
        bands.push({
          id: nextId++,
          name: artistName,
          genre: inferGenre(combined),
          mood: inferMood(combined),
          description: item.description || `${artistName} が音楽メディアで話題になっています。`,
          image: 'images/placeholder.png',
          source: 'RSS',
          link: item.link,
          publishedAt: item.pubDate || ''
        });

        existingNames.add(artistName.toLowerCase());
        added += 1;
      }
    } catch (error) {
      console.warn(`RSS update failed: ${feedUrl}`, error.message);
    }
  }

  saveBands(bands);
  console.log(`RSS update complete. Added ${added} artists.`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
