
BACKEND PATCH — /api/load (JSON/YAML autodetect) + kontrola start/pause/reset
=============================================================================

Co dostajesz:
  - src/apiPatch.js                → router Express z bezpiecznym /api/load
  - package.json.additions.json    → podpowiedź zależności (cors, yaml)

Jak użyć (2 linijki w Twoim backend/src/index.js):

  1) Na górze pliku:
       import buildApiRouter from './apiPatch.js';

  2) Po utworzeniu `const app = express();`
     (PRZED globalnym app.use(express.json(...))):
       app.use('/api', buildApiRouter(engine));

Ważne:
  - Router sam używa `express.text()` dla POST /api/load, więc kolejność jest kluczowa.
  - Nie nadpisuje WebSocketów ani innych tras. Twoje istniejące start/pause/reset mogą zostać,
    ale po testach możesz je usunąć (duplikaty nie szkodzą, jeśli ścieżki te same — zostaw tylko jeden zestaw).

Zależności (upewnij się, że są w backend/package.json):
  "cors": "2.8.5",
  "yaml": "2.3.3"

Na Render po zmianach:
  - Manual Deploy → Clear build cache → Deploy

Test:
  curl -s https://<BACKEND>/api/health
  curl -s -X POST https://<BACKEND>/api/load -H "Content-Type: text/plain" --data-binary @model.json
  curl -s -X POST https://<BACKEND>/api/start
