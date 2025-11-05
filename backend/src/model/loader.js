// backend/src/model/loader.js (Patch 1: relaxed validation)
/**
 * Minimal loader: sprawdza podstawowe sekcje i zwraca model bez ingerencji.
 * W kolejnych etapach można tu podpiąć Zod/JSON Schema.
 */
export function loadModel(input) {
  if (!input || typeof input !== 'object') {
    throw new Error('Model must be an object (JSON/YAML).');
  }
  if (!input.define || typeof input.define !== 'object') {
    throw new Error('Model missing "define" section.');
  }
  if (!Array.isArray(input.links)) {
    throw new Error('Model missing "links" array.');
  }
  // Możliwe miejsce na normalizacje/konwersje, np. strings->numbers.
  return input;
}
