const { describe, it, expect } = require('vitest');
const { applyOutcome } = require('./adapter.ts');

function makePolicy() {
  return {
    adapter: {
      on_done: {
        reward: { mode: 'FOG_CLEAR', haptic: 'SOFT_PULSE' },
        escalate_rule: {
          after_consecutive_dones: 2,
          max_difficulty_increase: 1,
          preferred_next_kinds: ['EXECUTE'],
        },
      },
      on_too_hard: {
        rule_order: ['reduce_duration', 'reduce_difficulty', 'switch_kind_downshift', 'offer_two_choices'],
        reduce_duration_factor: 0.5,
        difficulty_decrease: 1,
        switch_kind_downshift_priority: ['SOMATIC', 'ENV', 'EXTERNALIZE', 'EXECUTE'],
        two_choice_template: {
          option_a_kind: 'SOMATIC',
          option_b_kind: 'ENV',
          copy: 'Choose one tiny door: A) soften body OR B) open the tool.',
        },
      },
      on_skip: {
        switch_kind_priority: ['ENV', 'SOMATIC', 'EXTERNALIZE', 'EXECUTE'],
      },
    },
  };
}

function makeReading(kind = 'EXECUTE') {
  return {
    spreadId: 'SP_TEST',
    steps: [
      {
        slot_name: 'Action',
        selected_kind: kind,
        card: {
          id: 'C1',
          kind,
          difficulty: 3,
          duration_sec: 30,
          tags: ['micro'],
          action: {
            timer_sec: 20,
          },
        },
      },
      {
        slot_name: 'Next',
        selected_kind: 'EXTERNALIZE',
        card: {
          id: 'C2',
          kind: 'EXTERNALIZE',
          difficulty: 1,
          duration_sec: 10,
          tags: ['clarify'],
          action: { timer_sec: 10 },
        },
      },
    ],
  };
}

describe('adapter rules', () => {
  it('TOO_HARD causes shrink and/or downshift', () => {
    const history = { session: { consecutiveDone: 0, slotTooHardCounts: {} } };
    const result = applyOutcome({
      reading: makeReading('EXECUTE'),
      currentIndex: 0,
      outcome: 'TOO_HARD',
      policy: makePolicy(),
      context: { intensity_band: 'MED' },
      history,
    });

    expect(result.reading.steps[0].card.duration_sec).toBe(15);
    expect(result.reading.steps[0].card.action.timer_sec).toBe(10);
  });

  it('two TOO_HARD in same slot produces a Two-Choice step', () => {
    const history = { session: { consecutiveDone: 0, slotTooHardCounts: {} } };

    applyOutcome({
      reading: makeReading('EXECUTE'),
      currentIndex: 0,
      outcome: 'TOO_HARD',
      policy: makePolicy(),
      context: { intensity_band: 'MED' },
      history,
    });

    const second = applyOutcome({
      reading: makeReading('EXECUTE'),
      currentIndex: 0,
      outcome: 'TOO_HARD',
      policy: makePolicy(),
      context: { intensity_band: 'MED' },
      history,
    });

    expect(second.reading.steps[0].card.name).toBe('Two Choices');
    expect(second.reading.steps[0].card.choices.length).toBe(2);
  });

  it('HIGH intensity never results in EXECUTE as first actionable step after adaptation', () => {
    const history = { session: { consecutiveDone: 1, slotTooHardCounts: {} } };
    const result = applyOutcome({
      reading: makeReading('EXECUTE'),
      currentIndex: 0,
      outcome: 'DONE',
      policy: makePolicy(),
      context: { intensity_band: 'HIGH' },
      history,
    });

    expect(result.reading.steps[0].selected_kind).not.toBe('EXECUTE');
  });
});
