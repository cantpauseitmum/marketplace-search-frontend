/**
 * Główna logika aplikacji frontendowej MarketplaceSearch.
 */

document.addEventListener('DOMContentLoaded', () => {
  // Elementy DOM
  const searchForm = document.getElementById('searchForm');
  const queryInput = document.getElementById('queryInput');
  const clearQueryBtn = document.getElementById('clearQueryBtn');
  const locationInput = document.getElementById('locationInput');
  const radiusSelect = document.getElementById('radiusSelect');
  const inDescCheckbox = document.getElementById('inDescCheckbox');
  const minPriceInput = document.getElementById('minPriceInput');
  const maxPriceInput = document.getElementById('maxPriceInput');
  const searchSubmitBtn = document.getElementById('searchSubmitBtn');
  const offersContainer = document.getElementById('offersContainer');
  const emptyState = document.getElementById('emptyState');
  const loadingState = document.getElementById('loadingState');
  const resultsHeading = document.getElementById('resultsHeading');
  const resultsSubheading = document.getElementById('resultsSubheading');
  const sortSelect = document.getElementById('sortSelect');
  const viewGridBtn = document.getElementById('viewGridBtn');
  const viewListBtn = document.getElementById('viewListBtn');
  const bookmarkedOnlyBtn = document.getElementById('bookmarkedOnlyBtn');
  const bookmarkCountEl = document.getElementById('bookmarkCount');

  // Liczniki w pigułkach źródeł
  const countAllEl = document.getElementById('count-all');
  const countOlxEl = document.getElementById('count-olx');
  const countAllegroEl = document.getElementById('count-allegro');
  const countAllokEl = document.getElementById('count-allok');
  const countFbEl = document.getElementById('count-fb');

  // Karty statusu źródeł
  const statusCards = {
    'OLX': document.getElementById('status-olx'),
    'Allegro': document.getElementById('status-allegro'),
    'Allegro Lokalnie': document.getElementById('status-allegro-lokalnie'),
    'Facebook Marketplace': document.getElementById('status-facebook'),
  };

  // Stan aplikacji
  let currentOffers = [];
  let activeSourceFilter = 'ALL';
  let isBookmarkedView = false;
  let bookmarkedIds = new Set();

  // Inicjalizacja
  init();

  function init() {
    bindEvents();
    // Automatyczne pierwsze wyszukiwanie dla frazy początkowej
    executeSearch();
  }

  function bindEvents() {
    // Formularz wyszukiwania
    searchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      isBookmarkedView = false;
      bookmarkedOnlyBtn.classList.remove('active');
      executeSearch();
    });

    // Przycisk czyszczenia pola zapytania
    clearQueryBtn.addEventListener('click', () => {
      queryInput.value = '';
      queryInput.focus();
    });

    // Szybkie tagi popularnych zapytań
    document.querySelectorAll('.tag-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        queryInput.value = btn.dataset.query;
        executeSearch();
      });
    });

    // Filtrowanie po wybranym źródle (pigułki nad wynikami)
    document.querySelectorAll('.source-filter-pills .pill').forEach((pill) => {
      pill.addEventListener('click', () => {
        document.querySelectorAll('.source-filter-pills .pill').forEach((p) => p.classList.remove('active'));
        pill.classList.add('active');
        activeSourceFilter = pill.dataset.source;
        renderFilteredOffers();
      });
    });

    // Zmiana sortowania
    sortSelect.addEventListener('change', () => {
      sortCurrentOffers(sortSelect.value);
      renderFilteredOffers();
    });

    // Przełączanie widoku: Siatka / Lista
    viewGridBtn.addEventListener('click', () => {
      viewGridBtn.classList.add('active');
      viewListBtn.classList.remove('active');
      offersContainer.classList.remove('list-view');
    });

    viewListBtn.addEventListener('click', () => {
      viewListBtn.classList.add('active');
      viewGridBtn.classList.remove('active');
      offersContainer.classList.add('list-view');
    });

    // Przełącznik "Zapisane"
    bookmarkedOnlyBtn.addEventListener('click', () => {
      isBookmarkedView = !isBookmarkedView;
      bookmarkedOnlyBtn.classList.toggle('active', isBookmarkedView);
      if (isBookmarkedView) {
        loadBookmarkedOffers();
      } else {
        renderFilteredOffers();
      }
    });

    // Zamknięcie modalu
    const modal = document.getElementById('offerModal');
    const closeBtn = document.getElementById('closeModalBtn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
    }
    window.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.add('hidden');
    });
  }

  /**
   * Główna funkcja wykonująca zapytanie do serwerów
   */
  async function executeSearch() {
    const query = queryInput.value.trim();
    if (!query) {
      queryInput.focus();
      return;
    }

    const location = locationInput.value.trim();
    const radius = parseInt(radiusSelect.value, 10);
    const searchInDescription = inDescCheckbox.checked;
    const minPrice = minPriceInput.value ? parseFloat(minPriceInput.value) : null;
    const maxPrice = maxPriceInput.value ? parseFloat(maxPriceInput.value) : null;

    // Pobranie zaznaczonych serwisów
    const selectedSources = Array.from(
      document.querySelectorAll('input[name="source"]:checked')
    ).map((cb) => cb.value);

    // Aktualizacja UI na stan wyszukiwania
    setLoadingState(true);
    resetStatusBadges('Wyszukiwanie...');

    try {
      const data = await API.searchMarketplaces({
        query,
        location,
        radius,
        searchInDescription,
        minPrice,
        maxPrice,
        sources: selectedSources,
        sortBy: sortSelect.value,
      });

      currentOffers = data.items || [];
      updateStatusBadges(data.scraper_statuses || []);
      updateResultsHeader(query, location, radius, data.total_count, data.latency_ms);
      updateSourceCounts(data.stats_by_source || {});
      sortCurrentOffers(sortSelect.value);
      renderFilteredOffers();
    } catch (err) {
      console.error('Błąd wyszukiwania:', err);
      showErrorState(err.message || 'Wystąpił błąd podczas odpytywania serwisów.');
    } finally {
      setLoadingState(false);
    }
  }

  function setLoadingState(loading) {
    if (loading) {
      searchSubmitBtn.classList.add('loading');
      searchSubmitBtn.disabled = true;
      offersContainer.innerHTML = '';
      emptyState.classList.add('hidden');
      loadingState.classList.remove('hidden');
    } else {
      searchSubmitBtn.classList.remove('loading');
      searchSubmitBtn.disabled = false;
      loadingState.classList.add('hidden');
    }
  }

  function resetStatusBadges(msg) {
    Object.values(statusCards).forEach((card) => {
      if (card) {
        card.classList.add('active');
        const info = card.querySelector('.src-info');
        if (info) info.textContent = msg;
      }
    });
  }

  function updateStatusBadges(statuses) {
    statuses.forEach((s) => {
      const card = statusCards[s.source];
      if (card) {
        const info = card.querySelector('.src-info');
        if (info) {
          if (s.status === 'OK') {
            info.textContent = `✓ ${s.count} ofert (${s.latency_ms}ms)`;
            info.style.color = 'var(--accent-emerald)';
          } else if (s.status === 'FALLBACK') {
            info.textContent = `⚡ ${s.count} ofert (demo)`;
            info.style.color = 'var(--accent-cyan)';
          } else {
            info.textContent = `✕ Błąd (${s.status})`;
            info.style.color = 'var(--accent-rose)';
          }
        }
      }
    });
  }

  function updateResultsHeader(query, location, radius, totalCount, latencyMs) {
    resultsHeading.textContent = `Wyniki dla: "${query}"`;
    const locText = location ? `${location} (+${radius} km)` : 'Cała Polska';
    resultsSubheading.textContent = `Znaleziono ${totalCount} ogłoszeń w obszarze ${locText} (${latencyMs}ms)`;
  }

  function updateSourceCounts(stats) {
    const total = Object.values(stats).reduce((a, b) => a + b, 0);
    countAllEl.textContent = total;
    countOlxEl.textContent = stats['OLX'] || 0;
    countAllegroEl.textContent = stats['Allegro'] || 0;
    countAllokEl.textContent = stats['Allegro Lokalnie'] || 0;
    countFbEl.textContent = stats['Facebook Marketplace'] || 0;
  }

  function sortCurrentOffers(sortBy) {
    if (sortBy === 'price_asc') {
      currentOffers.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
    } else if (sortBy === 'price_desc') {
      currentOffers.sort((a, b) => (b.price ?? -Infinity) - (a.price ?? -Infinity));
    } else if (sortBy === 'relevance') {
      currentOffers.sort((a, b) => (a.matches_description ? 1 : 0) - (b.matches_description ? 1 : 0));
    }
  }

  /**
   * Renderowanie przefiltrowanych ofert na stronie
   */
  function renderFilteredOffers() {
    let filtered = currentOffers;

    if (activeSourceFilter !== 'ALL') {
      filtered = filtered.filter((o) => o.source === activeSourceFilter);
    }

    if (isBookmarkedView) {
      filtered = filtered.filter((o) => o.is_bookmarked || bookmarkedIds.has(o.id));
    }

    if (filtered.length === 0) {
      offersContainer.innerHTML = '';
      emptyState.classList.remove('hidden');
      return;
    }

    emptyState.classList.add('hidden');
    const queryTerm = queryInput.value.trim();

    offersContainer.innerHTML = filtered.map((offer) => createOfferCardHTML(offer, queryTerm)).join('');

    // Podpięcie zdarzeń polubień i podglądu
    attachCardEvents();
  }

  /**
   * Generuje HTML pojedynczej karty oferty z dopiskiem skąd pochodzi (badge)
   */
  function createOfferCardHTML(offer, queryTerm) {
    const badgeClass = getSourceBadgeClass(offer.source);
    const highlightedTitle = highlightSearchWords(offer.title, queryTerm);
    const isBookmarked = offer.is_bookmarked || bookmarkedIds.has(offer.id);
    const placeholderImg = 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=600&auto=format&fit=crop&q=80';
    const imgSrc = offer.image_url || placeholderImg;

    const distanceBadge = offer.distance_km ? `<span class="meta-distance">(+${offer.distance_km} km)</span>` : '';
    const descBadge = offer.matches_description
      ? `<span class="match-desc-badge" title="Słowo kluczowe dopasowane w treści opisu">📝 W opisie</span>`
      : '';

    return `
      <article class="offer-card" data-id="${offer.id}">
        <div class="card-media">
          <img src="${imgSrc}" alt="${escapeHTML(offer.title)}" loading="lazy" onerror="this.src='${placeholderImg}'">
          
          <!-- Dopisek skąd to wzięte (Badge źródła) -->
          <span class="card-source-badge src-badge ${badgeClass}">${offer.source}</span>
          
          <button class="bookmark-btn ${isBookmarked ? 'bookmarked' : ''}" data-id="${offer.id}" title="Zapisz ofertę">
            ${isBookmarked ? '★' : '☆'}
          </button>
        </div>

        <div class="card-body">
          <div class="card-price-row">
            <span class="card-price">${offer.price_formatted || (offer.price ? offer.price + ' zł' : 'Do negocjacji')}</span>
            ${descBadge}
          </div>

          <h3 class="card-title" title="${escapeHTML(offer.title)}">
            ${highlightedTitle}
          </h3>

          <p class="card-desc">${escapeHTML(offer.description || 'Brak dodatkowego opisu oferty.')}</p>

          <div class="card-meta">
            <div class="meta-location">
              <span>📍 ${escapeHTML(offer.location || 'Polska')}</span>
              ${distanceBadge}
            </div>
            <div class="meta-date">
              <span>🕒 ${escapeHTML(offer.published_at || 'Dodano niedawno')}</span>
            </div>
          </div>

          <a href="${offer.url}" target="_blank" rel="noopener noreferrer" class="card-action-btn">
            <span>Zobacz na ${offer.source}</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
              <polyline points="15 3 21 3 21 9"></polyline>
              <line x1="10" y1="14" x2="21" y2="3"></line>
            </svg>
          </a>
        </div>
      </article>
    `;
  }

  function getSourceBadgeClass(source) {
    switch (source) {
      case 'OLX': return 'badge-olx';
      case 'Allegro': return 'badge-allegro';
      case 'Allegro Lokalnie': return 'badge-allok';
      case 'Facebook Marketplace': return 'badge-facebook';
      default: return 'badge-olx';
    }
  }

  function highlightSearchWords(text, query) {
    if (!text || !query) return escapeHTML(text || '');
    const words = query.trim().split(/\s+/).filter(Boolean);
    let escaped = escapeHTML(text);
    words.forEach((w) => {
      const regex = new RegExp(`(${escapeRegex(w)})`, 'gi');
      escaped = escaped.replace(regex, '<mark>$1</mark>');
    });
    return escaped;
  }

  function attachCardEvents() {
    document.querySelectorAll('.bookmark-btn').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = parseInt(btn.dataset.id, 10);
        if (isNaN(id)) return;

        try {
          const res = await API.toggleBookmark(id);
          if (res.is_bookmarked) {
            bookmarkedIds.add(id);
            btn.classList.add('bookmarked');
            btn.textContent = '★';
          } else {
            bookmarkedIds.delete(id);
            btn.classList.remove('bookmarked');
            btn.textContent = '☆';
          }
          bookmarkCountEl.textContent = bookmarkedIds.size;
        } catch (err) {
          console.error('Błąd zapisu polubienia:', err);
        }
      });
    });
  }

  async function loadBookmarkedOffers() {
    try {
      const data = await API.getOffers({ bookmarked: true });
      currentOffers = data.items || [];
      updateResultsHeader('Zapisane oferty', '', 0, currentOffers.length, 0);
      renderFilteredOffers();
    } catch (err) {
      console.error('Błąd pobierania ulubionych:', err);
    }
  }

  function showErrorState(msg) {
    offersContainer.innerHTML = '';
    emptyState.classList.remove('hidden');
    emptyState.querySelector('h3').textContent = 'Błąd pobierania ogłoszeń';
    emptyState.querySelector('p').textContent = msg;
  }

  function escapeHTML(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
});
