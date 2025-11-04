# Wdrożenie na Render.com

Ta instrukcja opisuje, jak wdrożyć backend i front‑end aplikacji DES Simulator na Render.com. Można wykorzystać podobną konfigurację na innych platformach PaaS (np. Heroku, Fly.io).

## Backend (Web Service)

1. Utwórz nowy serwis typu **Web Service** w panelu Render. Połącz repozytorium GitHub.
2. Wybierz branch z kodem.
3. Ustaw *Build Command* na:

```
cd backend && npm install --no-audit --no-fund
```

4. Ustaw *Start Command* na:

```
cd backend && npm start
```

5. Ustaw *Environment* na `Node 22` i zmienną `PORT` na `3000` (Render automatycznie ustawia PORT w runtime).
6. Ustaw health check na `GET /api/health`.

## Front‑end (Static Site)

1. Utwórz nowy serwis typu **Static Site**. Wskaż to samo repozytorium.
2. Ustaw *Build Command* na:

```
cd frontend && npm install --no-audit --no-fund && npm run build
```

3. Ustaw *Publish Directory* na `frontend/dist`.
4. W konfiguracji statycznej strony ustaw zmienne środowiskowe:
   - `VITE_BACKEND_HTTP_URL=https://your-backend-service.onrender.com`
   - `VITE_BACKEND_WS_URL=wss://your-backend-service.onrender.com/ws`
5. Po zakończeniu budowy i publikacji front‑end będzie dostępny pod unikalnym adresem Render.

## Aktualizacje

Każdy commit do głównego brancha repozytorium automatycznie wyzwala przebudowę front‑ i back‑endu na Render. Upewnij się, że wersje paczek są przypięte w `package.json` w celu stabilnego builda.