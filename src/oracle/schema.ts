import { z } from 'zod';

const stateTypeSchema = z.enum([
  'Frozen',
  'Overwhelmed',
  'Avoiding',
  'Exhausted',
  'Blank',
  'AnxiousLoop',
  'Any',
  'Unknown',
]);

const intensityBandSchema = z.enum(['LOW', 'MED', 'HIGH', 'Any']);

const oracleTextSchema = z.object({
  title: z.string(),
  reflection: z.string(),
  guidance: z.string(),
});

const cardActionSchema = z.object({
  label: z.string(),
  instruction: z.string(),
  timer_sec: z.number(),
  completion_check: z.enum(['TAP_DONE', 'TIMER_DONE', 'CHECKLIST']),
});

const cardFallbackSchema = z.object({
  when: z.enum(['TOO_HARD', 'SKIP']),
  next_kind: z.string(),
  instruction_override: z.string(),
});

const deckCardSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    kind: z.string(),
    state_affinity: z.array(stateTypeSchema),
    intensity_affinity: z.array(intensityBandSchema),
    difficulty: z.number(),
    duration_sec: z.number(),
    oracle_text: oracleTextSchema,
    action: cardActionSchema,
    fallbacks: z.array(cardFallbackSchema),
    escalate_to: z.array(z.string()),
    tags: z.array(z.string()),
  })
  .passthrough();

export const deckSchema = z
  .object({
    version: z.string(),
    language: z.string(),
    card_schema: z.record(z.string(), z.unknown()),
    cards: z.array(deckCardSchema),
  })
  .passthrough();

// NOTE: The engine currently consumes the "v0" spreads format used by public/spreads.json:
// spreads[].state, spreads[].slots[].slot_name/required_kind/pool_filter/selection.
// Keep schema aligned with the runtime engine.

const spreadSlotSchema = z
  .object({
    slot_name: z.string(),
    required_kind: z.string(),
    pool_filter: z.record(z.string(), z.unknown()).optional(),
    selection: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();

const spreadSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    state: stateTypeSchema,
    description: z.string().optional(),
    slots: z.array(spreadSlotSchema),
  })
  .passthrough();

export const spreadsSchema = z
  .object({
    version: z.string(),
    spread_schema: z.record(z.string(), z.unknown()),
    spreads: z.array(spreadSchema),
    // Additional optional keys present in the spec file.
    states: z.array(stateTypeSchema).optional(),
    one_card_pulls: z.array(z.record(z.string(), z.unknown())).optional(),
  })
  .passthrough();

export const policySchema = z
  .object({
    version: z.string(),
    principles: z.array(z.string()),
    intensity_bands: z.record(
      z.string(),
      z.object({
        stuck_min: z.number(),
        stuck_max: z.number(),
      }),
    ),
    spread_selection: z.record(z.string(), z.unknown()),
    adapter: z.record(z.string(), z.unknown()),
    guards: z.record(z.string(), z.unknown()),
  })
  .passthrough();

export const eventsSchema = z
  .object({
    version: z.string(),
    goals: z.record(z.string(), z.array(z.string())),
    event_schema: z.record(z.string(), z.unknown()),
    derived_metrics: z.record(z.string(), z.string()),
    ethics: z.record(z.string(), z.unknown()),
  })
  .passthrough();
