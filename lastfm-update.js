#!/usr/bin/env node
/*
 * lastfm-update.js
 *
 * This script fetches trending artists from the Last.fm API and updates
 * our bands dataset accordingly. It requires a valid Last.fm API key.
 *
 * Usage:
 *   node scripts/lastfm-update.js --apiKey=YOUR_LASTFM_API_KEY [--limit=20]
 *
 * The script will request the top artists chart from Last.fm, optionally
 * fetch top tags for each artist to infer a genre and mood, and then
 * merge the new artists into data/bands.json. Existing artists by name
 * will not be duplicated.
 */

import https from 'https';
import fs from 'fs';
import path from 'path';
import { URL, URLSearchParams } from 'url';

// Map Last.fm tags to our site's genre categories. Feel free to extend this map.
const genreMap = {
  rock: 'ロック',
  indie: 'ロック',
  pop: 'ポップ',
  jazz: 'ジャズ',
  folk: 'フォーク',
  classical: 'クラシック',
  electronic: 'エレクトロニカ',
  electronica: 'エレクトロニカ',
  hiphop: 'ポップ',
  rap: 'ポップ',
  reggae: 'レゲエ',
  latin: 'ラテン',
  funk: 'ファンク'
};

// Map tags to moods/time-of-day categories. This is heuristic.
const moodMap = {
  energetic: 'エネルギー',
  upbeat: 'エネルギー',
  happy: '喜び',
  dance: 'パーティー',
  party: 'パーティー',
  calm: 'リラックス',
  chillout: 'リラックス',
  ambient: 'リラックス',
  relaxing: 'リラックス',
  morning: '朝',
  sleep: '夜',
  night: '夜',
  focus: '集中',
  study: '集中'
};

// Utility to perform an HTTPS GET request and return a parsed JSON object.
function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, res => {
        let data = '';
        res.on('data', chunk => {
          data += chunk;
        });
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            resolve(json);
          } catch (err) {
            reject(err);
          }
        });
      })
      .on('error', reject);
  });
}

// Fetch top tags for a given artist. Returns an array of tag names (lowercase).
async function fetchArtistTags(artistName, apiKey) {
  const params = new URLSearchParams({
    method: 'artist.gettoptags',
    artist: artistName,
    api_key: apiKey,
    format: 'json'
  });
  const url = `https://ws.audioscrobbler.com/2.0/?${params.toString()}`;
  try {
    const data = await fetchJson(url);
    const tags =
      data?.toptags?.tag?.map(tag => tag.name?.toLowerCase())?.filter(Boolean) || [];
    return tags;
  } catch (err) {
    console.warn(`Failed to fetch tags for ${artistName}:`, err.message);
    return [];
  }
}

// Determine our genre and mood for a list of tags.
function inferGenreAndMood(tags) {
  let genre = 'その他';
  let mood = 'エネルギー';
  for (const tag of tags) {
    const key = tag.replace(/\s+/g, '').toLowerCase();
    if (genre === 'その他' && genreMap[key]) {
      genre = genreMap[key];
    }
    if (mood === 'エネルギー' && moodMap[key]) {
      mood = moodMap[key];
    }
    if (genre !== 'その他' && mood !== 'エネルギー') break;
  }
  return { genre, mood };
}

// Read existing bands from data file
function loadBands(dataFile) {
  try {
    const json = fs.readFileSync(dataFile, 'utf8');
    return JSON.parse(json);
  } catch (err) {
    return [];
  }
}

// Save bands to data file
function saveBands(dataFile, bands) {
  fs.writeFileSync(dataFile, JSON.stringify(bands, null, 2), 'utf8');
}

// Main update function
async function updateBands(apiKey, limit = 20) {
  const dataFile = path.join(process.cwd(), 'data', 'bands.json');
  const existingBands = loadBands(dataFile);
  const existingNames = new Set(existingBands.map(b => b.name));
  const params = new URLSearchParams({
    method: 'chart.gettopartists',
    api_key: apiKey,
    format: 'json',
    limit: String(limit)
  });
  const url = `https://ws.audioscrobbler.com/2.0/?${params.toString()}`;
  console.log(`Fetching top artists from Last.fm...`);
  const chartData = await fetchJson(url);
  const artists = chartData?.artists?.artist || [];
  const newBands = [];
  let nextId = existingBands.reduce((max, b) => Math.max(max, b.id), 0) + 1;
  for (const artist of artists) {
    const name = artist.name;
    if (existingNames.has(name)) continue;
    // Fetch tags for the artist
    const tags = await fetchArtistTags(name, apiKey);
    const { genre, mood } = inferGenreAndMood(tags);
    // Build description using playcount and listeners
    const playcount = artist.playcount || 'unknown';
    const listeners = artist.listeners || 'unknown';
    const description = `${name} は人気上昇中のアーティストで、再生回数 ${playcount}、リスナー数 ${listeners} を誇ります。`;
    // Choose the medium size image if available
    let imageUrl = '';
    if (Array.isArray(artist.image)) {
      const img = artist.image.find(img => img.size === 'extralarge') || artist.image[0];
      imageUrl = img?.['#text'] || '';
    }
    newBands.push({
      id: nextId++,
      name,
      genre,
      mood,
      description,
      image: imageUrl || 'images/placeholder.png',
      source: 'Last.fm'
    });
  }
  if (newBands.length > 0) {
    const updatedBands = existingBands.concat(newBands);
    saveBands(dataFile, updatedBands);
    console.log(`Added ${newBands.length} new artists to bands.json`);
  } else {
    console.log('No new artists were added.');
  }
}

// Parse CLI arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {};
  for (const arg of args) {
    const [key, value] = arg.split('=');
    if (key === '--apiKey') {
      opts.apiKey = value;
    } else if (key === '--limit') {
      opts.limit = Number(value);
    }
  }
  return opts;
}

// Entry point
(async () => {
  const { apiKey, limit } = parseArgs();
  if (!apiKey) {
    console.error('Error: An API key must be provided via --apiKey argument');
    process.exit(1);
  }
  try {
    await updateBands(apiKey, limit);
  } catch (err) {
    console.error('Update failed:', err.message);
    process.exit(1);
  }
})();