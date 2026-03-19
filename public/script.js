// script.js
// Static-site version: reads bands from ./data/bands.json
// and filters on the client side.

document.addEventListener('DOMContentLoaded', () => {
  let allBands = [];

  const trendingContainer = document.getElementById('trending-cards');
  const resultsContainer = document.getElementById('results');
  const searchBtn = document.getElementById('search-btn');
  const genreSelect = document.getElementById('genre-select');
  const moodSelect = document.getElementById('mood-select');

  function fetchBands() {
    fetch('./data/bands.json')
      .then(res => res.json())
      .then(data => {
        allBands = data;
        populateTrending();
      })
      .catch(err => {
        console.error('Error fetching bands:', err);
      });
  }

  function populateTrending() {
    if (!allBands || allBands.length === 0) return;

    const trending = [...allBands]
      .sort((a, b) => (b.id || 0) - (a.id || 0))
      .slice(0, 3);

    trendingContainer.innerHTML = '';
    trending.forEach(band => {
      const card = createBandCard(band);
      trendingContainer.appendChild(card);
    });
  }

  function createBandCard(band) {
    const card = document.createElement('div');
    card.className = 'card';

    const img = document.createElement('img');
    img.src = band.image || 'images/placeholder.png';
    img.alt = band.name || '';

    const content = document.createElement('div');
    content.className = 'card-content';

    const title = document.createElement('h3');
    title.textContent = band.name || '';

    const desc = document.createElement('p');
    desc.textContent = band.description || '';

    content.appendChild(title);
    content.appendChild(desc);
    card.appendChild(img);
    card.appendChild(content);

    return card;
  }

  function displayResults(bands) {
    resultsContainer.innerHTML = '';

    if (!bands || bands.length === 0) {
      resultsContainer.innerHTML = '<p>該当するバンドが見つかりませんでした。</p>';
      return;
    }

    bands.forEach(band => {
      const card = createBandCard(band);
      resultsContainer.appendChild(card);
    });
  }

  function filterBands(genre, mood) {
    return allBands.filter(band => {
      const genreMatch = genre === 'all' || band.genre === genre;
      const moodMatch = mood === 'all' || band.mood === mood;
      return genreMatch && moodMatch;
    });
  }

  if (searchBtn) {
    searchBtn.addEventListener('click', () => {
      const genre = genreSelect ? genreSelect.value : 'all';
      const mood = moodSelect ? moodSelect.value : 'all';

      if (genre === 'all' && mood === 'all') {
        displayResults(allBands);
        return;
      }

      const filtered = filterBands(genre, mood);
      displayResults(filtered);
    });
  }

  fetchBands();
});
