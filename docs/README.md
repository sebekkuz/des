# DES Simulator

Ten projekt stanowi szkic aplikacji typu **discrete‑event simulation (DES)** do modelowania linii produkcyjnych w przeglądarce. Repozytorium ma strukturę monorepo z modułami front‑end, back‑end, częścią współdzieloną oraz dokumentacją.

## Uruchomienie lokalne

1. Zainstaluj zależności w modułach:

```bash
cd backend
npm install --no-audit --no-fund
cd ../frontend
npm install --no-audit --no-fund
```

2. Uruchom backend (domyślnie na porcie 3000):

```bash
cd backend
npm start
```

3. W osobnym terminalu uruchom front‑end w trybie deweloperskim (port 5173):

```bash
cd frontend
npm run dev
```

4. Otwórz przeglądarkę na `http://localhost:5173`. Interfejs umożliwia przeciąganie obiektów na scenę, sterowanie symulacją i podgląd wyników. WebSocket komunikuje się z backendem w celu odbierania stanu symulacji i metryk.

## Endpointy REST

* `POST /api/load` – wczytuje model symulacji w formacie JSON/YAML (treść żądania). Po walidacji tworzy instancję silnika.
* `POST /api/start` – rozpoczyna symulację.
* `POST /api/pause` – wstrzymuje symulację.
* `POST /api/reset` – resetuje symulację do t=0.
* `GET /api/health` – zwraca `{ ok: true }` jako health‑check.

### Przykładowe wywołania cURL

Wczytanie przykładowego modelu (przechowywanego w pliku `examples/line-basic.yaml`):

```bash
curl -X POST -H "Content-Type: application/json" \
  --data @../examples/line-basic.yaml \
  http://localhost:3000/api/load
```

Rozpoczęcie symulacji:

```bash
curl -X POST http://localhost:3000/api/start
```

## Dodawanie nowych obiektów (plugin)

Aby dodać nowy typ komponentu w silniku:

1. Utwórz plik w `backend/src/sim/components/NewComponent.js` implementujący interfejs (metody `onEntity`, `reset`, opcjonalnie `onQueueUpdated`).
2. Zarejestruj typ w `engine.js` przy budowaniu modelu (mapa `components`).
3. W `frontend/src/components/Palette` dodaj ikonę i definicję obiektu w pliku `shared/protocol.js` (schema i typ). Zaimplementuj renderer w `Canvas3D` i formularz w `PropertyPanel`.

## Licencja

Projekt jest udostępniony do celów edukacyjnych. Zależności zewnętrzne posiadają własne licencje.