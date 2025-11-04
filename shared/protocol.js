import { z } from 'zod';

// Shared protocol definitions using Zod.  This module is imported by
// both the frontend and backend to enforce a consistent data contract.

// Schema for a component instance in the model
export const ComponentSchema = z.object({
  type: z.string(),
  inputs: z.record(z.string(), z.any()).optional(),
  groups: z.array(z.string()).optional(),
});

// Schema for the overall model
export const ModelSchema = z.object({
  include: z.array(z.string()).optional(),
  define: z.record(z.string(), ComponentSchema),
  links: z.array(z.object({
    from: z.string(),
    to: z.string(),
    via: z.string().optional(),
    condition: z.any().optional(),
  })),
  globals: z.any().optional(),
});

// WebSocket message definitions
export const WsMessage = z.union([
  z.object({ type: z.literal('HELLO'), data: z.object({ version: z.string() }) }),
  z.object({ type: z.literal('STATE'), data: z.any() }),
  z.object({ type: z.literal('ENTITY_MOVE'), data: z.any() }),
  z.object({ type: z.literal('METRIC'), data: z.any() }),
  z.object({ type: z.literal('LOG'), data: z.any() }),
  z.object({ type: z.literal('ERROR'), data: z.any() }),
]);

// Commands sent from client to server over WebSocket
export const ClientCommand = z.union([
  z.object({ type: z.literal('SET_PARAM'), data: z.any() }),
  z.object({ type: z.literal('LOAD_MODEL'), data: ModelSchema }),
]);