/**
 * Klient API do komunikacji z backendem MarketplaceSearch.
 */
const API = {
  /**
   * Dynamiczne ustalenie adresu backendu API:
   * 1. window.__API_BASE_URL__ (jeśli zdefiniowane globalnie)
   * 2. localStorage.getItem('API_BASE_URL')
   * 3. Fallback na http://localhost:8000 jeśli frontend działa na porcie dev (3000, 5000, 5173, 8080) lub pliku lokalnym
   * 4. Domyślnie window.location.origin
   */
  baseUrl: (() => {
    if (window.__API_BASE_URL__) return window.__API_BASE_URL__;
    try {
      const stored = localStorage.getItem('API_BASE_URL');
      if (stored) return stored;
    } catch (_) {}
    const origin = window.location.origin || '';
    if (
      origin.includes(':3000') ||
      origin.includes(':5173') ||
      origin.includes(':8080') ||
      origin.includes(':5000') ||
      window.location.protocol === 'file:'
    ) {
      return 'http://localhost:8000';
    }
    return origin;
  })(),

  /**
   * Wykonuje zapytanie wyszukiwania ofert we wszystkich wybranych marketplace'ach
   */
  async searchMarketplaces({
    query,
    location = '',
    radius = 'all',
    searchInDescription = true,
    minPrice = null,
    maxPrice = null,
    sources = [],
    sortBy = 'newest',
    page = 1,
  }) {
    const params = new URLSearchParams();
    params.append('q', query);
    if (location) params.append('location', location);
    if (radius !== undefined && radius !== null) params.append('radius', radius);
    params.append('in_description', searchInDescription ? 'true' : 'false');
    if (minPrice) params.append('min_price', minPrice);
    if (maxPrice) params.append('max_price', maxPrice);
    if (sources && sources.length > 0) params.append('sources', sources.join(','));
    if (sortBy) params.append('sort_by', sortBy);
    if (page && page > 1) params.append('page', page);

    const response = await fetch(`${this.baseUrl}/api/search?${params.toString()}`);
    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Błąd sieci' }));
      throw new Error(err.error || `Błąd serwera (${response.status})`);
    }
    return await response.json();
  },

  /**
   * Pobiera zapisane w bazie oferty z filtrowaniem i paginacją
   */
  async getOffers({
    query = '',
    location = '',
    sources = [],
    minPrice = null,
    maxPrice = null,
    sortBy = 'newest',
    bookmarked = false,
    limit = 50,
    offset = 0,
  } = {}) {
    const params = new URLSearchParams();
    if (query) params.append('q', query);
    if (location) params.append('location', location);
    if (sources && sources.length > 0) params.append('sources', sources.join(','));
    if (minPrice) params.append('min_price', minPrice);
    if (maxPrice) params.append('max_price', maxPrice);
    if (sortBy) params.append('sort_by', sortBy);
    if (bookmarked) params.append('bookmarked', 'true');
    params.append('limit', limit);
    params.append('offset', offset);

    const response = await fetch(`${this.baseUrl}/api/offers?${params.toString()}`);
    if (!response.ok) throw new Error('Błąd pobierania ofert z bazy');
    return await response.json();
  },

  /**
   * Przełącza polubienie / zapisanie oferty
   */
  async toggleBookmark(offerId) {
    const response = await fetch(`${this.baseUrl}/api/offers/${offerId}/bookmark`, {
      method: 'POST',
    });
    if (!response.ok) throw new Error('Błąd przełączania polubienia');
    return await response.json();
  },

  /**
   * Pobiera dostępne źródła i ich metadane
   */
  async getSources() {
    const response = await fetch(`${this.baseUrl}/api/sources`);
    if (!response.ok) throw new Error('Błąd pobierania listy źródeł');
    return await response.json();
  },

  /**
   * Pobiera historię wyszukiwań
   */
  async getHistory() {
    const response = await fetch(`${this.baseUrl}/api/history`);
    if (!response.ok) throw new Error('Błąd pobierania historii');
    return await response.json();
  },

  /**
   * Pobiera listę obserwowanych wyszukiwań (Watchlist)
   */
  async getWatchlist() {
    const response = await fetch(`${this.baseUrl}/api/watchlist`);
    if (!response.ok) throw new Error('Błąd pobierania listy obserwowanych');
    return await response.json();
  },

  /**
   * Dodaje nowe zapytanie do automatycznego przeszukiwania co 1h
   */
  async addToWatchlist(params) {
    const response = await fetch(`${this.baseUrl}/api/watchlist`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Błąd dodawania do listy' }));
      throw new Error(err.error || 'Nie udało się dodać do listy');
    }
    return await response.json();
  },

  /**
   * Usuwa zapytanie z automatycznego monitorowania
   */
  async deleteFromWatchlist(watchedId) {
    const response = await fetch(`${this.baseUrl}/api/watchlist/${watchedId}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      // Fallback na POST .../delete
      const fbResponse = await fetch(`${this.baseUrl}/api/watchlist/${watchedId}/delete`, {
        method: 'POST',
      });
      if (!fbResponse.ok) throw new Error('Błąd usuwania z monitorowania');
      return await fbResponse.json();
    }
    return await response.json();
  },

  /**
   * Pobiera aktualne oferty dla wybranego zapytania z listy
   */
  async getWatchlistOffers(watchedId, { limit = 100, offset = 0 } = {}) {
    const response = await fetch(`${this.baseUrl}/api/watchlist/${watchedId}/offers?limit=${limit}&offset=${offset}`);
    if (!response.ok) throw new Error('Błąd pobierania ofert dla monitorowanego zapytania');
    return await response.json();
  },

  /**
   * Wymusza natychmiastowe odświeżenie zapytania z listy
   */
  async refreshWatchlist(watchedId) {
    const response = await fetch(`${this.baseUrl}/api/watchlist/${watchedId}/refresh`, {
      method: 'POST',
    });
    if (!response.ok) throw new Error('Błąd odświeżania');
    return await response.json();
  },
};

window.API = API;
