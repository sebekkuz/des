import { parse as parseYaml } from 'yaml';
import { ModelSchema } from './schema.js';

// Load a model definition from JSON or YAML.  Accepts either a string
// (via body parser) or an object.  Validates against the shared
// schema.  Throws on error.

export function loadModel(src) {
  let data;
  if (typeof src === 'string') {
    try {
      data = JSON.parse(src);
    } catch (jsonErr) {
      data = parseYaml(src);
    }
  } else {
    data = src;
  }
  const result = ModelSchema.safeParse(data);
  if (!result.success) {
    throw new Error('Model validation failed');
  }
  return result.data;
}