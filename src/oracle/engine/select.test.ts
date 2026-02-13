import { describe, it, expect } from 'vitest';
import { buildReading, selectSpreadId } from './select.ts';

const basePolicy = {
  spread_selection: {
    by_state: {
      Frozen: 'SP_FROZEN',
      Overwhelmed: 'SP_OVERWHELMED',
    },
  },
};

const spreadsConfig = {
  spreads: [
    {
      id: 'SP_FROZEN',
      name: 'Frozen Flow',
      slots: [
        {
          slot_name: 'First Action',
          required_kind: 'EXECUTE',
          pool_filter: { state_affinity_any_of: ['Any'], intensity_any_of: ['Any'], max_difficulty: 3, tags_any_of: ['micro'] },
          selection: { mode: 'WEIGHTED', weights: { state_match: 1, intensity_match: 1, recently_failed_penalty: -1, recently_succeeded_bonus: 1 } },
        },
      ],
    },
    {
      id: 'SP_OVERWHELMED',
      name: 'Overwhelmed Flow',
      slots: [
        {
          slot_name: 'Externalize',
          required_kind: 'EXTERNALIZE',
          pool_filter: { state_affinity_any_of: ['Overwhelmed', 'Any'], intensity_any_of: ['Any'], max_difficulty: 2, tags_any_of: ['externalize'] },
          selection: { mode: 'WEIGHTED', weights: { state_match: 4, intensity_match: 1, recently_failed_penalty: -1, recently_succeeded_bonus: 1 } },
        },
        {
          slot_name: 'Action',
          required_kind: 'EXECUTE',
          pool_filter: { state_affinity_any_of: ['Any'], intensity_any_of: ['Any'], max_difficulty: 2, tags_any_of: ['micro'] },
          selection: { mode: 'WEIGHTED', weights: { state_match: 2, intensity_match: 1, recently_failed_penalty: -1, recently_succeeded_bonus: 1 } },
        },
      ],
    },
    {
      id: 'SP_FILTERS',
      name: 'Filter Checks',
      slots: [
        {
          slot_name: 'Bounded',
          required_kind: 'EXECUTE',
          pool_filter: { state_affinity_any_of: ['Any'], intensity_any_of: ['Any'], max_difficulty: 1, tags_any_of: ['micro'] },
          selection: { mode: 'WEIGHTED', weights: { state_match: 1, intensity_match: 1, recently_failed_penalty: -1, recently_succeeded_bonus: 1 } },
        },
      ],
    },
    {
      id: 'SP_TAGS',
      name: 'Tag Checks',
      slots: [
        {
          slot_name: 'Tag Slot',
          required_kind: 'EXECUTE',
          pool_filter: { state_affinity_any_of: ['Any'], intensity_any_of: ['Any'], max_difficulty: 3, tags_any_of: ['entry'] },
          selection: { mode: 'WEIGHTED', weights: { state_match: 1, intensity_match: 1, recently_failed_penalty: -1, recently_succeeded_bonus: 1 } },
        },
      ],
    },
  ],
};

const deck = {
  cards: [
    { id: 'EXE_1', kind: 'EXECUTE', state_affinity: ['Any'], intensity_affinity: ['Any'], difficulty: 1, tags: ['micro'] },
    { id: 'SOMA_1', kind: 'SOMATIC', state_affinity: ['Frozen', 'Any'], intensity_affinity: ['HIGH', 'Any'], difficulty: 1, tags: ['breath', 'micro'] },
    { id: 'ENV_1', kind: 'ENV', state_affinity: ['Any'], intensity_affinity: ['Any'], difficulty: 1, tags: ['setup'] },
    { id: 'EXT_1', kind: 'EXTERNALIZE', state_affinity: ['Overwhelmed', 'Any'], intensity_affinity: ['Any'], difficulty: 1, tags: ['externalize'] },
    { id: 'EXE_EASY', kind: 'EXECUTE', state_affinity: ['Any'], intensity_affinity: ['Any'], difficulty: 1, tags: ['micro', 'entry'] },
    { id: 'EXE_HARD', kind: 'EXECUTE', state_affinity: ['Any'], intensity_affinity: ['Any'], difficulty: 4, tags: ['micro', 'entry'] },
    { id: 'EXE_NO_TAG', kind: 'EXECUTE', state_affinity: ['Any'], intensity_affinity: ['Any'], difficulty: 1, tags: ['timer'] },
  ],
};

describe('oracle engine selection', () => {
  it('Frozen + HIGH produces first actionable step SOMATIC or ENV (not EXECUTE)', () => {
    const spreadId = selectSpreadId('Frozen', basePolicy);
    const reading = buildReading(
      spreadId,
      deck,
      spreadsConfig,
      basePolicy,
      { state_type: 'Frozen', intensity_band: 'HIGH' },
      {},
    );

    expect(reading.steps[0].selected_kind).not.toBe('EXECUTE');
    expect(['SOMATIC', 'ENV']).toContain(reading.steps[0].selected_kind);
  });

  it('Overwhelmed spread includes EXTERNALIZE before EXECUTE', () => {
    const spreadId = selectSpreadId('Overwhelmed', basePolicy);
    const reading = buildReading(
      spreadId,
      deck,
      spreadsConfig,
      basePolicy,
      { state_type: 'Overwhelmed', intensity_band: 'MED' },
      {},
    );

    expect(reading.steps[0].selected_kind).toBe('EXTERNALIZE');
    expect(reading.steps[1].selected_kind).toBe('EXECUTE');
  });

  it('max_difficulty filter is enforced', () => {
    const reading = buildReading(
      'SP_FILTERS',
      deck,
      spreadsConfig,
      basePolicy,
      { state_type: 'Frozen', intensity_band: 'LOW' },
      {},
    );

    expect(reading.steps[0].card.id).not.toBe('EXE_HARD');
    expect(reading.steps[0].card.difficulty).toBe(1);
  });

  it('tags_any_of filter is enforced', () => {
    const reading = buildReading(
      'SP_TAGS',
      deck,
      spreadsConfig,
      basePolicy,
      { state_type: 'Frozen', intensity_band: 'LOW' },
      {},
    );

    expect(reading.steps[0].card.id).not.toBe('EXE_HARD');
    expect(reading.steps[0].card.difficulty).toBe(1);
    expect(reading.steps[0].card.id).not.toBe('EXE_NO_TAG');
  });
});
