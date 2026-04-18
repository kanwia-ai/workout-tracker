// JSON Schemas for Gemini structured output. Keys must match the client-side
// Zod types in src/types/*.ts exactly. When those types change, update here.
export const pingSchema = {
  type: 'object',
  properties: {
    message: { type: 'string' },
    now: { type: 'string' },
  },
  required: ['message', 'now'],
  propertyOrdering: ['message', 'now'],
} as const
