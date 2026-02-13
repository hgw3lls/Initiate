import { describe, it, expect } from 'vitest';
import { TELEMETRY_STORAGE_KEY } from './types.ts';
import { getStorage, readSessions } from './storage.ts';
import { startSession, logEvent, endSession } from './logger.ts';

describe('local telemetry logger', () => {
  it('stores coherent event sequence with computed ttfa_seconds and no network calls', () => {
    const storage = getStorage();
    storage.removeItem(TELEMETRY_STORAGE_KEY);

    let fetchCalls = 0;
    const originalFetch = globalThis.fetch;
    globalThis.fetch = () => {
      fetchCalls += 1;
      throw new Error('network should not be called');
    };

    const baseTime = Date.parse('2026-01-01T00:00:00.000Z');

    const sessionId = startSession({
      state_type: 'Frozen',
      intensity_band: 'HIGH',
      app_version: '1.2.3',
      entry_mode: 'SPREAD',
      goal_text_present: true,
      stuck_level: 80,
      timestamp_iso: new Date(baseTime).toISOString(),
    });

    logEvent(sessionId, {
      name: 'STEP_OUTCOME',
      timestamp_iso: new Date(baseTime + 5_000).toISOString(),
      fields: { outcome: 'TOO_HARD' },
    });

    logEvent(sessionId, {
      name: 'STEP_OUTCOME',
      timestamp_iso: new Date(baseTime + 12_000).toISOString(),
      fields: { outcome: 'DONE' },
    });

    endSession(sessionId, { abandoned: false, pre_stuck: 80, post_stuck: 45 });

    const sessions = readSessions();
    const session = sessions[sessionId];
    const names = session.events.map((event) => event.name);

    expect(names[0]).toBe('SESSION_START');
    expect(names[1]).toBe('STEP_OUTCOME');
    expect(names[2]).toBe('STEP_OUTCOME');
    expect(names[3]).toBe('SESSION_END');

    const endFields = session.events[3].fields;
    expect(endFields.ttfa_seconds).toBe(12);
    expect(endFields.steps_done).toBe(1);
    expect(endFields.steps_attempted).toBe(2);

    expect(fetchCalls).toBe(0);
    globalThis.fetch = originalFetch;
  });
});
