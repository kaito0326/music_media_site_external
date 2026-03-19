#!/usr/bin/env node
/*
 * aggregator.js
 *
 * This script simulates crawling various music blogs and sites to discover new indie artists.
 * Since internet access is restricted in this environment, we use a predefined list of potential
 * artists and randomly pick one to append to our existing dataset. The script updates
 * data/bands.json by adding the new artist if it isn't already present.
 */

import fs from 'fs';
import path from 'path';

// Path to the bands data file
const dataPath = path.join(process.cwd(), 'data', 'bands.json');

// Predefined list of potential new artists (could come from scraping in a real implementation)
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

// Load existing bands
function loadBands() {
  try {
    const json = fs.readFileSync(dataPath, 'utf8');
    return JSON.parse(json);
  } catch (err) {
    console.error('Failed to load bands.json', err);
    return [];
  }
}

// Save bands
function saveBands(bands) {
  fs.writeFileSync(dataPath, JSON.stringify(bands, null, 2), 'utf8');
}

function generateNewBand(bands) {
  // Choose a random potential artist not already included
  const existingNames = new Set(bands.map(b => b.name));
  const candidates = potentialArtists.filter(artist => !existingNames.has(artist.name));
  if (candidates.length === 0) return null;
  const randomIndex = Math.floor(Math.random() * candidates.length);
  const candidate = candidates[randomIndex];
  // Assign a new unique ID
  const maxId = bands.reduce((max, b) => Math.max(max, b.id), 0);
  return {
    id: maxId + 1,
    ...candidate
  };
}

function main() {
  const bands = loadBands();
  const newBand = generateNewBand(bands);
  if (!newBand) {
    console.log('No new artists to add.');
    return;
  }
  bands.push(newBand);
  saveBands(bands);
  console.log(`Added new artist: ${newBand.name}`);
}

if (require.main === module) {
  main();
}