import { parse as parseYaml } from 'yaml';
import { ZodSchema } from 'zod';

// Functions for loading and validating model definitions in JSON or YAML.  A
// shared Zod schema should be imported from the shared module (see shared/
// protocol.js) to validate the structure.

export function loadModelFromString(src: string, schema: ZodSchema): any {
  let data: any;
  try {
    // Try JSON first
    data = JSON.parse(src);
  } catch (jsonErr) {
    try {
      data = parseYaml(src);
    } catch (yamlErr) {
      throw new Error('Invalid JSON or YAML');
    }
  }
  // Validate with provided schema
  const result = schema.safeParse(data);
  if (!result.success) {
    console.error(result.error);
    throw new Error('Model validation failed');
  }
  return result.data;
}