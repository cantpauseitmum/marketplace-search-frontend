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

  // Elementy Watchlist (Monitorowane co 1h)
  const addToWatchlistBtn = document.getElementById('addToWatchlistBtn');
  const watchlistNavBtn = document.getElementById('watchlistNavBtn');
  const watchlistSection = document.getElementById('watchlistSection');
  const closeWatchlistBtn = document.getElementById('closeWatchlistBtn');
  const watchlistCardsContainer = document.getElementById('watchlistCardsContainer');
  const watchlistEmptyState = document.getElementById('watchlistEmptyState');
  const watchlistCountEl = document.getElementById('watchlistCount');
  const watchedSearchBanner = document.getElementById('watchedSearchBanner');
  const backToWatchlistBtn = document.getElementById('backToWatchlistBtn');
  const watchedSearchTitle = document.getElementById('watchedSearchTitle');
  const watchedSearchMeta = document.getElementById('watchedSearchMeta');
  const refreshWatchedItemBtn = document.getElementById('refreshWatchedItemBtn');
  const deleteWatchedItemBtn = document.getElementById('deleteWatchedItemBtn');

  // Elementy sekcji Załaduj więcej
  const loadMoreSection = document.getElementById('loadMoreSection');
  const loadMoreBtn = document.getElementById('loadMoreBtn');
  const loadMoreSpinner = document.getElementById('loadMoreSpinner');
  const loadMoreIcon = document.getElementById('loadMoreIcon');
  const loadMoreText = document.getElementById('loadMoreText');
  const loadMoreStatus = document.getElementById('loadMoreStatus');

  // Liczniki w pigułkach źródeł
  const countAllEl = document.getElementById('count-all');
  const countOlxEl = document.getElementById('count-olx');
  const countAllokEl = document.getElementById('count-allok');
  const countFbEl = document.getElementById('count-fb');

  // Karty statusu źródeł
  const statusCards = {
    'OLX': document.getElementById('status-olx'),
    'Allegro Lokalnie': document.getElementById('status-allegro-lokalnie'),
    'Facebook Marketplace': document.getElementById('status-facebook'),
  };

  // Stan aplikacji
  let currentOffers = [];
  let activeSourceFilter = 'ALL';
  let isBookmarkedView = false;
  let bookmarkedIds = new Set();

  // Stan Watchlist (obserwowane oferty co 1h)
  let watchlistItems = [];
  let activeWatchedItem = null;
  let isWatchlistView = false;

  // Stan paginacji i parametrów bieżącego zapytania
  let currentPage = 1;
  let currentQuery = '';
  let currentLocation = '';
  let currentRadius = 'all';
  let currentInDesc = true;
  let currentMinPrice = null;
  let currentMaxPrice = null;
  let currentSources = [];
  let hasMoreOffers = true;
  let isLoadingMore = false;

  // Inicjalizacja
  init();

  function init() {
    bindEvents();
    loadWatchlist();
    if (queryInput.value.trim()) {
      executeSearch();
    } else {
      renderWelcomeState();
    }
  }

  function renderWelcomeState() {
    resultsHeading.textContent = 'Wyszukiwarka ofert';
    resultsSubheading.textContent = 'Wpisz szukaną frazę powyżej lub wybierz jeden z popularnych tagów';
    offersContainer.innerHTML = `
      <div class="welcome-card" style="grid-column: 1 / -1; text-align: center; padding: 4rem 1.5rem; background: var(--bg-card); border: 1px dashed var(--border-color); border-radius: var(--radius-lg); margin-top: 1rem;">
        <div style="font-size: 3rem; margin-bottom: 1rem;">🔎</div>
        <h3 style="font-size: 1.35rem; font-weight: 700; margin-bottom: 0.5rem; color: var(--text-main);">Wpisz czego szukasz</h3>
        <p style="color: var(--text-secondary); max-width: 520px; margin: 0 auto 1.5rem; font-size: 0.95rem; line-height: 1.6;">
          Podaj dowolną frazę (np. telefon, konsola, rower) w polu wyszukiwania powyżej, opcjonalnie podaj miasto i kliknij <strong>Przeszukaj serwisy</strong>, aby przeszukać OLX, Allegro Lokalnie i Facebook Marketplace w jednym miejscu.
        </p>
      </div>
    `;
  }

  function bindEvents() {
    // Formularz wyszukiwania (Tryb 1: Wyszukiwanie jednorazowe)
    searchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      hideWatchedBanner();
      isBookmarkedView = false;
      bookmarkedOnlyBtn.classList.remove('active');
      executeSearch();
    });

    // Tryb 2: Dodaj do listy automatycznego przeszukiwania (co 1h)
    if (addToWatchlistBtn) {
      addToWatchlistBtn.addEventListener('click', () => {
        handleAddToWatchlist();
      });
    }

    // Przycisk nawigacji do listy monitorowanych
    if (watchlistNavBtn) {
      watchlistNavBtn.addEventListener('click', () => {
        toggleWatchlistView();
      });
    }

    // Zamknięcie sekcji listy monitorowanych
    if (closeWatchlistBtn) {
      closeWatchlistBtn.addEventListener('click', () => {
        toggleWatchlistView(false);
      });
    }

    // Pasek aktywnego monitorowanego zapytania: powrót do listy
    if (backToWatchlistBtn) {
      backToWatchlistBtn.addEventListener('click', () => {
        hideWatchedBanner();
        toggleWatchlistView(true);
      });
    }

    // Pasek aktywnego monitorowanego zapytania: odśwież teraz
    if (refreshWatchedItemBtn) {
      refreshWatchedItemBtn.addEventListener('click', () => {
        if (activeWatchedItem) {
          refreshWatchedItem(activeWatchedItem.id);
        }
      });
    }

    // Pasek aktywnego monitorowanego zapytania: usuń z listy
    if (deleteWatchedItemBtn) {
      deleteWatchedItemBtn.addEventListener('click', () => {
        if (activeWatchedItem) {
          deleteWatchedItem(activeWatchedItem.id);
        }
      });
    }

    // Przycisk czyszczenia pola zapytania
    clearQueryBtn.addEventListener('click', () => {
      queryInput.value = '';
      queryInput.focus();
    });

    // Szybkie tagi popularnych zapytań
    document.querySelectorAll('.tag-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        queryInput.value = btn.dataset.query;
        hideWatchedBanner();
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
      hideWatchedBanner();
      isBookmarkedView = !isBookmarkedView;
      bookmarkedOnlyBtn.classList.toggle('active', isBookmarkedView);
      if (isBookmarkedView) {
        loadBookmarkedOffers();
      } else {
        renderFilteredOffers();
      }
    });

    // Przycisk "Załaduj więcej ofert"
    if (loadMoreBtn) {
      loadMoreBtn.addEventListener('click', () => {
        executeLoadMore();
      });
    }

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

    const rawLocation = locationInput.value.trim();
    const radiusVal = radiusSelect.value;

    // Logika obszaru:
    // Wpisanie miasta daje punkt startowy, a obok wybierany jest obszar (+0km, +5km, Cała Polska).
    // Jeśli wybrano "all" (Cała Polska) LUB miasto jest puste -> szukamy w całej Polsce!
    // Przykład: Poznań + Cała Polska = Cała Polska
    // Przykład: Wrocław + 100km = Wrocław + 100km
    let effectiveLocation = rawLocation;
    let effectiveRadius = radiusVal;

    if (radiusVal === 'all' || !rawLocation) {
      effectiveLocation = '';
      effectiveRadius = 'all';
    }

    const searchInDescription = inDescCheckbox.checked;
    const minPrice = minPriceInput.value ? parseFloat(minPriceInput.value) : null;
    const maxPrice = maxPriceInput.value ? parseFloat(maxPriceInput.value) : null;

    // Pobranie zaznaczonych serwisów
    const selectedSources = Array.from(
      document.querySelectorAll('input[name="source"]:checked')
    ).map((cb) => cb.value);

    // Zapamiętanie bieżących parametrów na potrzeby paginacji ("Załaduj więcej")
    currentPage = 1;
    currentQuery = query;
    currentLocation = effectiveLocation;
    currentRadius = effectiveRadius;
    currentInDesc = searchInDescription;
    currentMinPrice = minPrice;
    currentMaxPrice = maxPrice;
    currentSources = selectedSources;
    hasMoreOffers = true;
    isLoadingMore = false;

    // Aktualizacja UI na stan wyszukiwania
    setLoadingState(true);
    resetStatusBadges('Wyszukiwanie...');
    if (loadMoreSection) {
      loadMoreSection.classList.add('hidden');
    }

    try {
      const data = await API.searchMarketplaces({
        query: currentQuery,
        location: currentLocation,
        radius: currentRadius,
        searchInDescription: currentInDesc,
        minPrice: currentMinPrice,
        maxPrice: currentMaxPrice,
        sources: currentSources,
        sortBy: sortSelect.value,
        page: 1,
      });

      currentOffers = data.items || [];
      updateStatusBadges(data.scraper_statuses || []);
      updateResultsHeader(currentQuery, currentLocation, currentRadius, currentOffers.length, data.latency_ms);
      updateSourceCountsFromOffers(currentOffers);
      sortCurrentOffers(sortSelect.value);
      renderFilteredOffers();

      // Obsługa sekcji "Załaduj więcej"
      if (loadMoreSection) {
        if (currentOffers.length > 0) {
          loadMoreSection.classList.remove('hidden');
          loadMoreBtn.disabled = false;
          loadMoreBtn.classList.remove('disabled');
          loadMoreText.textContent = 'Załaduj więcej ofert';
          loadMoreStatus.textContent = `Pobrano ${currentOffers.length} ogłoszeń (strona ${currentPage}). Kliknij, aby załadować kolejne oferty.`;
        } else {
          loadMoreSection.classList.add('hidden');
        }
      }
    } catch (err) {
      console.error('Błąd wyszukiwania:', err);
      showErrorState(err.message || 'Wystąpił błąd podczas odpytywania serwisów.');
    } finally {
      setLoadingState(false);
    }
  }

  /**
   * Paginacja - pobiera kolejne oferty ze wszystkich serwisów ("Załaduj więcej")
   */
  async function executeLoadMore() {
    if (isLoadingMore || !hasMoreOffers) return;

    isLoadingMore = true;
    setLoadMoreLoading(true);

    const nextPage = currentPage + 1;

    try {
      const data = await API.searchMarketplaces({
        query: currentQuery,
        location: currentLocation,
        radius: currentRadius,
        searchInDescription: currentInDesc,
        minPrice: currentMinPrice,
        maxPrice: currentMaxPrice,
        sources: currentSources,
        sortBy: sortSelect.value,
        page: nextPage,
      });

      const newItems = data.items || [];
      if (newItems.length > 0) {
        // Deduplikacja nowych ofert po URL i ID
        const existingUrls = new Set(currentOffers.map((o) => o.url));
        const uniqueNew = newItems.filter((o) => !existingUrls.has(o.url));

        if (uniqueNew.length > 0) {
          currentOffers = currentOffers.concat(uniqueNew);
          currentPage = nextPage;
          sortCurrentOffers(sortSelect.value);
          renderFilteredOffers();
          updateResultsHeader(currentQuery, currentLocation, currentRadius, currentOffers.length, data.latency_ms);
          updateSourceCountsFromOffers(currentOffers);
          loadMoreStatus.textContent = `Pobrano ${uniqueNew.length} nowych ofert (strona ${currentPage}). Łącznie: ${currentOffers.length} ogłoszeń.`;
        } else {
          hasMoreOffers = false;
          loadMoreStatus.textContent = 'Brak dalszych nowych ogłoszeń w wybranych serwisach.';
          loadMoreBtn.disabled = true;
          loadMoreBtn.classList.add('disabled');
          loadMoreText.textContent = 'Załadowano wszystkie oferty';
        }
      } else {
        hasMoreOffers = false;
        loadMoreStatus.textContent = 'Dotarto do końca wyników wyszukiwania.';
        loadMoreBtn.disabled = true;
        loadMoreBtn.classList.add('disabled');
        loadMoreText.textContent = 'Załadowano wszystkie oferty';
      }
    } catch (err) {
      console.error('Błąd ładowania kolejnych ofert:', err);
      loadMoreStatus.textContent = `Błąd ładowania kolejnej strony: ${err.message || 'Spróbuj ponownie'}`;
    } finally {
      isLoadingMore = false;
      setLoadMoreLoading(false);
    }
  }

  function setLoadMoreLoading(loading) {
    if (loading) {
      loadMoreSpinner.classList.remove('hidden');
      loadMoreIcon.classList.add('hidden');
      loadMoreBtn.disabled = true;
      loadMoreText.textContent = 'Wczytywanie kolejnych ofert...';
    } else {
      loadMoreSpinner.classList.add('hidden');
      loadMoreIcon.classList.remove('hidden');
      if (hasMoreOffers) {
        loadMoreBtn.disabled = false;
        loadMoreText.textContent = 'Załaduj więcej ofert';
      }
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
            card.removeAttribute('title');
          } else if (s.status === 'WARNING') {
            info.textContent = `⚠ ${s.message || 'Ostrzeżenie'}`;
            info.style.color = 'var(--accent-amber)';
            card.title = s.message || 'Wystąpiło ostrzeżenie podczas pobierania ofert z tego źródła.';
          } else {
            info.textContent = `✕ Błąd (${s.status})`;
            info.style.color = 'var(--accent-rose)';
            if (s.message) card.title = s.message;
          }
        }
      }
    });
  }

  function updateResultsHeader(query, location, radius, totalCount, latencyMs) {
    resultsHeading.textContent = `Wyniki dla: "${query}"`;
    let locText = 'Cała Polska';
    if (radius === 'all' || !location) {
      locText = 'Cała Polska (cały kraj)';
    } else if (radius === '0' || radius === 0) {
      locText = `${location} (tylko miasto)`;
    } else {
      locText = `${location} (+${radius} km)`;
    }
    resultsSubheading.textContent = `Znaleziono ${totalCount} ogłoszeń w obszarze: ${locText} (${latencyMs}ms)`;
  }

  function updateSourceCounts(stats) {
    const total = Object.values(stats).reduce((a, b) => a + b, 0);
    countAllEl.textContent = total;
    countOlxEl.textContent = stats['OLX'] || 0;
    countAllokEl.textContent = stats['Allegro Lokalnie'] || 0;
    countFbEl.textContent = stats['Facebook Marketplace'] || 0;
  }

  function updateSourceCountsFromOffers(offers) {
    const stats = {
      'OLX': 0,
      'Allegro Lokalnie': 0,
      'Facebook Marketplace': 0,
    };
    offers.forEach((o) => {
      if (stats[o.source] !== undefined) {
        stats[o.source]++;
      } else {
        stats[o.source] = 1;
      }
    });
    updateSourceCounts(stats);
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
          <a href="${offer.url}" target="_blank" rel="noopener noreferrer" class="card-media-link" tabindex="-1">
            <img src="${imgSrc}" alt="${escapeHTML(offer.title)}" loading="lazy" onerror="this.src='${placeholderImg}'">
          </a>
          
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
            <a href="${offer.url}" target="_blank" rel="noopener noreferrer">${highlightedTitle}</a>
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
      case 'Allegro Lokalnie': return 'badge-allok';
      case 'Facebook Marketplace': return 'badge-facebook';
      default: return 'badge-olx';
    }
  }

  function highlightSearchWords(text, query) {
    if (!text || !query) return escapeHTML(text || '');
    const rawQuery = query.trim();
    const words = rawQuery.split(/\s+/).filter(Boolean);
    if (words.length === 0) return escapeHTML(text || '');

    let escaped = escapeHTML(text);

    // 1. Wyróżnienie pełnej frazy w całości (np. "Switch 2" jako jeden spójny blok)
    const phrasePattern = words.map(escapeRegex).join('[\\s\\-_/.:,+]*');
    const phraseRegex = new RegExp(`(?<![a-zA-Z0-9ąćęłńóśźżĄĆĘŁŃÓŚŹŻ])(${phrasePattern})(?![a-zA-Z0-9ąćęłńóśźżĄĆĘŁŃÓŚŹŻ])`, 'gi');
    if (phraseRegex.test(escaped)) {
      return escaped.replace(phraseRegex, '<mark>$1</mark>');
    }

    // 2. Wyróżnianie pojedynczych słów z zachowaniem granic (nigdy "2" wewnątrz "v2" lub "2024")
    words.forEach((w) => {
      const regex = new RegExp(`(?<![a-zA-Z0-9ąćęłńóśźżĄĆĘŁŃÓŚŹŻ])(${escapeRegex(w)})(?![a-zA-Z0-9ąćęłńóśźżĄĆĘŁŃÓŚŹŻ])`, 'gi');
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

  // =========================================================================
  // LOGIKA WATCHLIST / MONITOROWANE (AUTO CO 1H)
  // =========================================================================

  async function loadWatchlist() {
    try {
      const data = await API.getWatchlist();
      watchlistItems = data.watchlist || [];
      if (watchlistCountEl) {
        watchlistCountEl.textContent = watchlistItems.length;
      }
      if (isWatchlistView) {
        renderWatchlistCards();
      }
    } catch (err) {
      console.error('Błąd pobierania listy monitorowanych:', err);
    }
  }

  function renderWatchlistCards() {
    if (!watchlistCardsContainer) return;
    watchlistCardsContainer.innerHTML = '';

    if (!watchlistItems || watchlistItems.length === 0) {
      if (watchlistEmptyState) watchlistEmptyState.classList.remove('hidden');
      return;
    }

    if (watchlistEmptyState) watchlistEmptyState.classList.add('hidden');

    watchlistItems.forEach((item) => {
      const card = document.createElement('div');
      card.className = 'watchlist-card';

      const locText = item.location
        ? `📍 ${escapeHTML(item.location)}${item.radius_km > 0 ? ' (+' + item.radius_km + ' km)' : ''}`
        : '📍 Cała Polska';

      let priceText = '';
      if (item.min_price != null && item.max_price != null) {
        priceText = `${item.min_price} - ${item.max_price} zł`;
      } else if (item.min_price != null) {
        priceText = `od ${item.min_price} zł`;
      } else if (item.max_price != null) {
        priceText = `do ${item.max_price} zł`;
      }

      const sources = Array.isArray(item.sources) ? item.sources : [];
      const lastCheckFormatted = formatDate(item.last_checked_at);
      const resultsCount = item.last_results_count != null ? item.last_results_count : '—';

      card.innerHTML = `
        <div>
          <div class="watchlist-card-top">
            <h4 class="watchlist-card-title" title="Kliknij, aby wyświetlić oferty">
              <span>🔍 ${escapeHTML(item.title || item.query_text)}</span>
            </h4>
            <button type="button" class="watchlist-delete-btn" title="Usuń z wyszukiwarki automatycznej" data-id="${item.id}">
              🗑️
            </button>
          </div>

          <div class="watchlist-params-chips">
            <span class="param-chip chip-location">${locText}</span>
            ${priceText ? `<span class="param-chip chip-price">💰 ${priceText}</span>` : ''}
            <span class="param-chip chip-sources">🌐 ${sources.length > 0 ? sources.join(', ') : 'Wszystkie serwisy'}</span>
            ${item.search_in_description ? '<span class="param-chip">📝 Szukaj w opisie</span>' : ''}
            <span class="param-chip" style="color: #34d399; border-color: rgba(52,211,153,0.3);">⏱️ Co 1h</span>
          </div>
        </div>

        <div>
          <div class="watchlist-meta-row">
            <span>🕒 Ostatnio: ${lastCheckFormatted}</span>
            <span class="watchlist-offers-count">
              📦 Oferty: ${resultsCount}
            </span>
          </div>

          <div class="watchlist-card-actions">
            <button type="button" class="btn-card-view" data-id="${item.id}">
              <span>👁️ Pokaż oferty</span>
            </button>
            <button type="button" class="btn-card-refresh" data-id="${item.id}" title="Odśwież teraz w serwisach">
              🔄
            </button>
          </div>
        </div>
      `;

      // Kliknięcie w tytuł lub przycisk "Pokaż oferty"
      card.querySelector('.watchlist-card-title').addEventListener('click', () => openWatchedItemOffers(item));
      card.querySelector('.btn-card-view').addEventListener('click', () => openWatchedItemOffers(item));

      // Kliknięcie w odświeżenie
      card.querySelector('.btn-card-refresh').addEventListener('click', (e) => {
        e.stopPropagation();
        refreshWatchedItem(item.id);
      });

      // Kliknięcie w usunięcie z listy
      card.querySelector('.watchlist-delete-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        deleteWatchedItem(item.id);
      });

      watchlistCardsContainer.appendChild(card);
    });
  }

  async function handleAddToWatchlist() {
    const query = queryInput.value.trim();
    if (!query) {
      queryInput.focus();
      showToast('Wpisz szukaną frazę przed dodaniem do listy', 'error');
      return;
    }

    const rawLocation = locationInput.value.trim();
    const radiusVal = radiusSelect.value;
    let effectiveLocation = rawLocation;
    let effectiveRadius = radiusVal;

    if (radiusVal === 'all' || !rawLocation) {
      effectiveLocation = '';
      effectiveRadius = 0;
    } else {
      effectiveRadius = parseInt(radiusVal, 10) || 0;
    }

    const searchInDescription = inDescCheckbox.checked;
    const minPrice = minPriceInput.value ? parseFloat(minPriceInput.value) : null;
    const maxPrice = maxPriceInput.value ? parseFloat(maxPriceInput.value) : null;

    const selectedSources = Array.from(
      document.querySelectorAll('input[name="source"]:checked')
    ).map((cb) => {
      const val = cb.value;
      if (val === 'olx') return 'OLX';
      if (val === 'allegro_lokalnie') return 'Allegro Lokalnie';
      if (val === 'facebook') return 'Facebook Marketplace';
      return val;
    });

    try {
      addToWatchlistBtn.disabled = true;
      addToWatchlistBtn.style.opacity = '0.7';

      await API.addToWatchlist({
        title: query,
        query: query,
        location: effectiveLocation,
        radius_km: effectiveRadius,
        search_in_description: searchInDescription,
        min_price: minPrice,
        max_price: maxPrice,
        sources: selectedSources,
        sort_by: sortSelect.value,
        interval_seconds: 3600,
      });

      showToast(`Dodano "${query}" do monitorowania co 1h! Zapisano w pliku offer_list.json.`, 'success');
      await loadWatchlist();
      toggleWatchlistView(true);
    } catch (err) {
      console.error('Błąd dodawania do monitorowania:', err);
      showToast(`Błąd: ${err.message}`, 'error');
    } finally {
      addToWatchlistBtn.disabled = false;
      addToWatchlistBtn.style.opacity = '1';
    }
  }

  async function openWatchedItemOffers(item) {
    activeWatchedItem = item;
    toggleWatchlistView(false);

    if (watchedSearchBanner) {
      watchedSearchBanner.classList.remove('hidden');
      if (watchedSearchTitle) watchedSearchTitle.textContent = item.title || item.query_text;
      if (watchedSearchMeta) {
        const loc = item.location ? item.location + (item.radius_km > 0 ? ' (+' + item.radius_km + ' km)' : '') : 'Cała Polska';
        const lastCheck = formatDate(item.last_checked_at);
        watchedSearchMeta.textContent = `Lokalizacja: ${loc} • Ostatnie sprawdzenie: ${lastCheck}`;
      }
    }

    setLoadingState(true);
    resultsHeading.textContent = `Monitorowane: ${item.title || item.query_text}`;
    resultsSubheading.textContent = 'Pobieranie aktualnych ofert dla zapisanego zapytania...';

    try {
      const data = await API.getWatchlistOffers(item.id);
      currentOffers = data.items || [];
      updateResultsHeader(item.title || item.query_text, item.location, item.radius_km, currentOffers.length, 0);
      updateSourceCountsFromOffers(currentOffers);
      renderFilteredOffers();
      resultsHeading.scrollIntoView({ behavior: 'smooth' });
    } catch (err) {
      console.error('Błąd pobierania ofert z watchlisty:', err);
      showErrorState('Nie udało się pobrać aktualnych ofert dla wybranego przedmiotu.');
    } finally {
      setLoadingState(false);
    }
  }

  async function deleteWatchedItem(id) {
    const item = watchlistItems.find((it) => it.id === id);
    const title = item ? item.title : `ID ${id}`;
    if (!confirm(`Czy na pewno chcesz usunąć "${title}" z wyszukiwarki automatycznej?`)) {
      return;
    }

    try {
      await API.deleteFromWatchlist(id);
      showToast(`Usunięto "${title}" z automatycznego wyszukiwania.`);

      if (activeWatchedItem && activeWatchedItem.id === id) {
        hideWatchedBanner();
        renderWelcomeState();
      }

      await loadWatchlist();
      if (isWatchlistView) {
        renderWatchlistCards();
      }
    } catch (err) {
      console.error('Błąd usuwania:', err);
      showToast(`Błąd usuwania: ${err.message}`, 'error');
    }
  }

  async function refreshWatchedItem(id) {
    const item = watchlistItems.find((it) => it.id === id);
    const title = item ? item.title : `ID ${id}`;
    showToast(`Odświeżam "${title}" w serwisach...`);

    try {
      const res = await API.refreshWatchlist(id);
      await loadWatchlist();
      showToast(`Zaktualizowano "${title}": znaleziono ${res.result?.results_count ?? 'nowe'} ofert.`);

      if (activeWatchedItem && activeWatchedItem.id === id) {
        const refreshedItem = watchlistItems.find((it) => it.id === id);
        if (refreshedItem) {
          openWatchedItemOffers(refreshedItem);
        }
      }
    } catch (err) {
      console.error('Błąd odświeżania:', err);
      showToast(`Błąd odświeżania: ${err.message}`, 'error');
    }
  }

  function toggleWatchlistView(show) {
    if (typeof show === 'boolean') {
      isWatchlistView = show;
    } else {
      isWatchlistView = !isWatchlistView;
    }

    if (watchlistSection) {
      watchlistSection.classList.toggle('hidden', !isWatchlistView);
      if (isWatchlistView) {
        renderWatchlistCards();
        watchlistSection.scrollIntoView({ behavior: 'smooth' });
      }
    }
    if (watchlistNavBtn) {
      watchlistNavBtn.classList.toggle('active', isWatchlistView);
    }
  }

  function hideWatchedBanner() {
    activeWatchedItem = null;
    if (watchedSearchBanner) {
      watchedSearchBanner.classList.add('hidden');
    }
  }

  function formatDate(isoStr) {
    if (!isoStr) return 'Oczekuje na sprawdzenie';
    try {
      const date = new Date(isoStr);
      const now = new Date();
      const diffMs = now - date;
      const diffMinutes = Math.floor(diffMs / 60000);

      if (diffMinutes < 1) return 'przed chwilą';
      if (diffMinutes < 60) return `${diffMinutes} min temu`;

      const hours = String(date.getHours()).padStart(2, '0');
      const mins = String(date.getMinutes()).padStart(2, '0');
      return `dziś o ${hours}:${mins}`;
    } catch (_) {
      return isoStr;
    }
  }

  function showToast(msg, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast-notification ${type === 'error' ? 'toast-error' : 'toast-success'}`;
    toast.innerHTML = `
      <span>${type === 'error' ? '⚠️' : '✅'}</span>
      <span>${escapeHTML(msg)}</span>
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(20px)';
      setTimeout(() => toast.remove(), 400);
    }, 4000);
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
