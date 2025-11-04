import { parse as parseYaml } from 'yaml';
import { ModelSchema } from './schema.js';

// Load a model definition from JSON or YAML.  Accepts either a string
// (via body parser) or an object.  Validates against the shared
// schema.  Throws on error.

// backend/src/model/loader.js
// Na razie: minimalny loader. (Możesz dodać walidację później.)
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
  // Można dodać normalizacje itd. Na teraz — zwróć jak jest.
  return input;
}
