const API_KEY = import.meta.env.VITE_NEWS_API_KEY;
// We'll use our new local/Vercel proxy to bypass CORS
const BASE_URL = '/gnews-api';

// DOM Elements
const searchForm = document.getElementById('searchForm');
const searchInput = document.getElementById('searchInput');
const newsGrid = document.getElementById('newsGrid');
const loadingIndicator = document.getElementById('loadingIndicator');
const errorMessage = document.getElementById('errorMessage');
const errorText = document.getElementById('errorText');
const emptyState = document.getElementById('emptyState');
const retryBtn = document.getElementById('retryBtn');
const sectionTitle = document.getElementById('sectionTitle');
const heroSection = document.getElementById('heroSection');
const heroSlider = document.getElementById('heroSlider');
const sliderControls = document.getElementById('sliderControls');

// Current State
let currentQuery = '';
let sliderInterval = null;
let currentSlideIndex = 0;
let sliderSlides = [];
let sliderDots = [];

// Initialize
function init() {
  if (!API_KEY) {
    showError("API Key is missing. Please add VITE_NEWS_API_KEY to your .env file.");
    return;
  }
  
  fetchTopHeadlines();

  // Event Listeners
  searchForm.addEventListener('submit', handleSearch);
  retryBtn.addEventListener('click', () => {
    if (currentQuery) {
      fetchSearchNews(currentQuery);
    } else {
      fetchTopHeadlines();
    }
  });
}

// Fetch Top Headlines
async function fetchTopHeadlines() {
  currentQuery = '';
  sectionTitle.textContent = 'Top Headlines';
  heroSection.classList.remove('hidden');
  
  const url = `${BASE_URL}/top-headlines?category=general&lang=en&max=10&apikey=${API_KEY}`;
  await fetchData(url, true);
}

// Fetch Search Results
async function fetchSearchNews(query) {
  currentQuery = query;
  sectionTitle.textContent = `Search Results for "${query}"`;
  heroSection.classList.add('hidden'); // Hide hero section on search
  stopSlider();
  
  const url = `${BASE_URL}/search?q=${encodeURIComponent(query)}&lang=en&max=10&apikey=${API_KEY}`;
  await fetchData(url, false);
}

// Core Fetch Logic
async function fetchData(url, isTopHeadlines = false) {
  showLoading();
  
  try {
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch news data');
    }

    if (data.errors) {
      throw new Error(data.errors[0] || 'An error occurred with the request');
    }

    if (data.articles && data.articles.length > 0) {
      if (isTopHeadlines) {
        // Take top 4 for slider, remaining for grid
        const sliderArts = data.articles.slice(0, 4);
        const gridArts = data.articles.slice(4);
        renderHeroSlider(sliderArts);
        renderNewsCards(gridArts.length > 0 ? gridArts : data.articles);
      } else {
        renderNewsCards(data.articles);
      }
    } else {
      showEmptyState();
    }
  } catch (error) {
    console.error('API Error:', error);
    showError(error.message);
  }
}

// Render News Cards
function renderNewsCards(articles) {
  hideAllStates();
  newsGrid.innerHTML = ''; // Clear previous

  if (articles.length === 0) return;

  articles.forEach(article => {
    const card = document.createElement('article');
    card.className = 'news-card';

    // Format Date
    const publishDate = new Date(article.publishedAt);
    const dateFormatted = publishDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    // Default image if missing
    const imageUrl = article.image || 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=800&q=80';

    card.innerHTML = `
      <div class="card-image-wrapper">
        <img src="${imageUrl}" alt="${escapeHTML(article.title)}" class="card-image" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=800&q=80'" />
      </div>
      <div class="card-content">
        <span class="card-source">${escapeHTML(article.source.name)}</span>
        <h3 class="card-title">${escapeHTML(article.title)}</h3>
        <p class="card-description">${escapeHTML(article.description || 'No description available for this article.')}</p>
        <div class="card-footer">
          <span class="card-date">${dateFormatted}</span>
          <a href="${article.url}" target="_blank" rel="noopener noreferrer" class="read-more">
            Read Full <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
          </a>
        </div>
      </div>
    `;

    newsGrid.appendChild(card);
  });
}

// Handlers
function handleSearch(e) {
  e.preventDefault();
  const query = searchInput.value.trim();
  if (query) {
    fetchSearchNews(query);
  }
}

// Hero Slider Implementation
function renderHeroSlider(articles) {
  stopSlider();
  heroSlider.innerHTML = '';
  sliderControls.innerHTML = '';
  sliderSlides = [];
  sliderDots = [];
  currentSlideIndex = 0;

  if (articles.length === 0) {
    heroSection.classList.add('hidden');
    return;
  }

  articles.forEach((article, index) => {
    // Create Slide
    const slide = document.createElement('div');
    slide.className = `hero-slide ${index === 0 ? 'active' : ''}`;
    const imageUrl = article.image || 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=1200&q=80';
    slide.style.backgroundImage = `url('${imageUrl}')`;

    slide.innerHTML = `
      <div class="hero-slide-content">
        <h2 class="hero-slide-title">${escapeHTML(article.title)}</h2>
        <p class="hero-slide-desc">${escapeHTML(article.description || '')}</p>
      </div>
    `;
    heroSlider.appendChild(slide);
    sliderSlides.push(slide);

    // Create Dot
    const dot = document.createElement('button');
    dot.className = `slider-dot ${index === 0 ? 'active' : ''}`;
    dot.setAttribute('aria-label', `Go to slide ${index + 1}`);
    dot.addEventListener('click', () => {
      goToSlide(index);
      startSlider(); // reset interval
    });
    sliderControls.appendChild(dot);
    sliderDots.push(dot);
  });

  startSlider();
}

function goToSlide(index) {
  if (sliderSlides.length === 0) return;
  
  // Remove active classes
  sliderSlides[currentSlideIndex].classList.remove('active');
  sliderDots[currentSlideIndex].classList.remove('active');
  
  // Update index
  currentSlideIndex = index;
  
  // Add active classes
  sliderSlides[currentSlideIndex].classList.add('active');
  sliderDots[currentSlideIndex].classList.add('active');
}

function nextSlide() {
  let next = currentSlideIndex + 1;
  if (next >= sliderSlides.length) next = 0;
  goToSlide(next);
}

function startSlider() {
  stopSlider();
  if (sliderSlides.length > 1) {
    sliderInterval = setInterval(nextSlide, 5000); // 5 seconds interval
  }
}

function stopSlider() {
  if (sliderInterval) {
    clearInterval(sliderInterval);
    sliderInterval = null;
  }
}

// UI State Management Utils
function showLoading() {
  hideAllStates();
  newsGrid.innerHTML = '';
  if (heroSection.classList.contains('hidden') === false && heroSlider.innerHTML === '') {
    heroSlider.innerHTML = '<div class="hero-content-loader">Loading Top Stories...</div>';
  }
  loadingIndicator.classList.remove('hidden');
}

function showError(message) {
  hideAllStates();
  newsGrid.innerHTML = '';
  errorText.textContent = message;
  errorMessage.classList.remove('hidden');
}

function showEmptyState() {
  hideAllStates();
  newsGrid.innerHTML = '';
  emptyState.classList.remove('hidden');
}

function hideAllStates() {
  loadingIndicator.classList.add('hidden');
  errorMessage.classList.add('hidden');
  emptyState.classList.add('hidden');
}

// HTML Escaping Utility to prevent XSS
function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}

// Boot the app
document.addEventListener('DOMContentLoaded', init);
