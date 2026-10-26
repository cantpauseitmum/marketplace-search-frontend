# 🌐 MarketplaceSearch - Frontend SPA (`marketplace-search-frontend`)

Nowoczesna aplikacja webowa Single Page Application (SPA) dla platformy **MarketplaceSearch**, służąca do przeglądania, filtrowania i zapisywania ogłoszeń zebranych równolegle z:
- **OLX** (`olx.pl`)
- **Allegro** (`allegro.pl`)
- **Allegro Lokalnie** (`allegrolokalnie.pl`)
- **Facebook Marketplace** (`facebook.com/marketplace`)

---

## 🎨 Design & Interfejs Użytkownika

- **Dark Glassmorphism**: Ciemny, elegancki motyw z półprzezroczystymi tłami (`backdrop-filter: blur(12px)`), miękkimi cieniami i czytelnymi kontrastami.
- **Wyraziste oznaczenia źródeł (Badges)**: Każde ogłoszenie posiada widoczną plakietkę w kolorze brandowym portalu, z którego pochodzi:
  - 🟢 **OLX**: ciemna zieleń morska (`#002f34` / `#23e5db`)
  - 🟠 **Allegro**: firmowy pomarańcz (`#ff5a00`)
  - 🔸 **Allegro Lokalnie**: bursztynowy pomarańcz (`#ff8c00`)
  - 🔵 **Facebook Marketplace**: niebieski (`#1877f2`)
- **Dopasowanie w opisie**: Specjalna plakietka `📝 W opisie` informuje, kiedy oferta została znaleziona w treści ogłoszenia (a nie w samym tytule).
- **Podświetlanie słów kluczowych**: Automatyczne zaznaczanie (`<mark>`) wyszukiwanych słów w tytułach ofert.
- **Pasek statusu marketplace'ów**: Prezentuje na żywo stan połączenia z każdym z serwisów, czas odpowiedzi w milisekundach oraz liczbę znalezionych ofert.
- **Przełącznik widoków**: Kafelki (grid) lub kompaktowa lista.
- **Ulubione / Zakładki**: Błyskawiczne dodawanie do zapisanych ofert jednym kliknięciem gwiazdki.

---

## 🏗️ Struktura plików

```
marketplace-search-frontend/
├── index.html             # Główny szkielet widoku SPA z formularzem i modalem
├── nginx.conf             # Konfiguracja serwera Nginx (produkcja)
├── Dockerfile             # Lekki obraz Nginx:alpine
├── docker-compose.yml     # Uruchomienie kontenera frontendu na porcie 3000
├── package.json           # Skrypty deweloperskie
├── serve.py               # Wbudowany serwer deweloperski Pythona (bez zależności)
│
├── css/
│   └── styles.css         # Pełny system stylów CSS3, tokeny zmiennych, RWD
│
└── js/
    ├── api.js             # Asynchroniczny klient API z automatycznym wykrywaniem backendu
    └── app.js             # Logika interakcji, obsługa formularza, sortowanie, stan UI
```

---

## ⚡ Szybki start

Frontend można uruchomić natychmiast na kilka sposobów:

### Opcja 1: Wbudowany serwer developerski Pythona (zalecane)
```bash
python3 serve.py 3000
```
Następnie otwórz w przeglądarce: **`http://localhost:3000`**.

### Opcja 2: Narzędzia Node.js / npx
```bash
npx serve -l 3000
```

### Opcja 3: Uruchomienie w Dockerze (Nginx)
```bash
docker compose up --build
```
Aplikacja będzie dostępna pod adresem: **`http://localhost:3000`**.

---

## 🔗 Konfiguracja połączenia z Backendem

Klient `js/api.js` automatycznie wykrywa adres backendu REST API:
1. Jeśli frontend jest uruchomiony na porcie deweloperskim (`3000`, `5000`, `5173`, `8080`), automatycznie łączy się z backendem pod adresem **`http://localhost:8000`**.
2. W środowisku produkcyjnym (np. za reverse proxy) korzysta z `window.location.origin`.
3. Możesz również wymusić dowolny adres API w konsoli przeglądarki:
   ```javascript
   localStorage.setItem('API_BASE_URL', 'http://twoj-serwer-backendu:8000');
   location.reload();
   ```
   lub ustawiając zmienną globalną `window.__API_BASE_URL__`.

---

## 📱 Responsywność (RWD)

Interfejs został przetestowany i zoptymalizowany dla:
- **Desktop (1400px+)**: Pełna siatka 3-kolumnowa z panelem filtrów
- **Tablet (768px - 1024px)**: Siatka 2-kolumnowa, elastyczny pasek statusów
- **Mobile (< 768px)**: Układ 1-kolumnowy, dotykowe pigułki filtrów i paski przewijane horyzontalnie
