import { z } from 'zod';

// Define a Zod schema for the simulation model.  This schema is
// intentionally simplified but follows the structure described in the
// prompt.  Each component is a record keyed by an identifier.  Links
// describe connections between components.

const InputValue = z.any();

const ComponentDef = z.object({
  type: z.string(),
  inputs: z.record(z.string(), InputValue).optional(),
  groups: z.array(z.string()).optional(),
});

const LinkDef = z.object({
  from: z.string(),
  to: z.string(),
  via: z.string().optional(),
  condition: z.any().optional(),
});

const GlobalsDef = z.object({
  units: z.record(z.string(), z.string()).optional(),
  rng: z.object({ seed: z.number() }).optional(),
  calendar: z.any().optional(),
  warmup: z.number().optional(),
  stopCondition: z.record(z.string(), z.any()).optional(),
}).optional();

export const ModelSchema = z.object({
  include: z.array(z.string()).optional(),
  define: z.record(z.string(), ComponentDef),
  links: z.array(LinkDef),
  globals: GlobalsDef,
});