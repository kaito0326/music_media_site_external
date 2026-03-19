// script.js
// Handles fetching data, filtering, recommending and updating for the music media site.

document.addEventListener('DOMContentLoaded', () => {
  let allBands = [];

  // Get DOM elements
  const trendingContainer = document.getElementById('trending-cards');
  const resultsContainer = document.getElementById('results');
  const searchBtn = document.getElementById('search-btn');
  const genreSelect = document.getElementById('genre-select');
  const moodSelect = document.getElementById('mood-select');
  const updateBtn = document.getElementById('update-btn');
  const updateStatus = document.getElementById('update-status');

  // Fetch all bands from the API
  function fetchBands() {
    fetch('/api/bands')
      .then(res => res.json())
      .then(data => {
        allBands = data;
        populateTrending();
      })
      .catch(err => {
        console.error('Error fetching bands:', err);
      });
  }

  // Populate trending section with top 3 latest bands (by ID)
  function populateTrending() {
    if (!allBands || allBands.length === 0) return;
    // Sort by id descending and take top 3
    const trending = [...allBands].sort((a, b) => b.id - a.id).slice(0, 3);
    trendingContainer.innerHTML = '';
    trending.forEach(band => {
      const card = createBandCard(band);
      trendingContainer.appendChild(card);
    });
  }

  // Create a card element for a band
  function createBandCard(band) {
    const card = document.createElement('div');
    card.className = 'card';
    const img = document.createElement('img');
    img.src = band.image;
    img.alt = band.name;
    const content = document.createElement('div');
    content.className = 'card-content';
    const title = document.createElement('h3');
    title.textContent = band.name;
    const desc = document.createElement('p');
    desc.textContent = band.description;
    content.appendChild(title);
    content.appendChild(desc);
    card.appendChild(img);
    card.appendChild(content);
    return card;
  }

  // Display search results or recommendations
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

  // Handle search button click
  searchBtn.addEventListener('click', () => {
    const genre = genreSelect.value;
    const mood = moodSelect.value;
    // If both are all, show all bands
    if (genre === 'all' && mood === 'all') {
      displayResults(allBands);
      return;
    }
    // Use the API to get recommendations
    fetch('/api/recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ genre, mood })
    })
      .then(res => res.json())
      .then(data => {
        displayResults(data);
      })
      .catch(err => {
        console.error('Error recommending bands:', err);
      });
  });

  // Handle update button click (simulate aggregation)
  updateBtn.addEventListener('click', () => {
    updateBtn.disabled = true;
    updateStatus.textContent = '更新中…';
    fetch('/api/update', { method: 'POST' })
      .then(res => res.json())
      .then(result => {
        if (result.updated) {
          updateStatus.textContent = `${result.newBand.name} を追加しました！`;
        } else {
          updateStatus.textContent = '追加できるバンドはありません。';
        }
        fetchBands();
        updateBtn.disabled = false;
      })
      .catch(err => {
        updateStatus.textContent = '更新に失敗しました。';
        console.error('Error updating bands:', err);
        updateBtn.disabled = false;
      });
  });

  // Initial load
  fetchBands();
});
