const { computeTTFA, computeStepCompletionRate } = require('./metrics.ts');
const { readSessions, upsertSession } = require('./storage.ts');

function nowIso() {
  return new Date().toISOString();
}

function makeSessionId() {
  return `session_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
}

function withCommon(event, baseContext) {
  return {
    ...event,
    timestamp_iso: event.timestamp_iso || nowIso(),
    state_type: event.state_type || baseContext.state_type || 'Unknown',
    stuck_level:
      typeof event.stuck_level === 'number'
        ? event.stuck_level
        : typeof baseContext.stuck_level === 'number'
          ? baseContext.stuck_level
          : 0,
    intensity_band: event.intensity_band || baseContext.intensity_band || 'LOW',
    app_version: event.app_version || baseContext.app_version || '0.0.0',
  };
}

function startSession(context) {
  const sessionId = makeSessionId();

  upsertSession(sessionId, () => {
    const startEvent = withCommon(
      {
        name: 'SESSION_START',
        session_id: sessionId,
        timestamp_iso: context.timestamp_iso,
        fields: {
          entry_mode: context.entry_mode || 'SPREAD',
          goal_text_present: Boolean(context.goal_text_present),
        },
      },
      context,
    );

    return {
      context,
      events: [startEvent],
    };
  });

  return sessionId;
}

function logEvent(sessionId, event) {
  return upsertSession(sessionId, (session) => {
    const baseContext = session.context || {};
    const normalized = withCommon(
      {
        ...event,
        session_id: sessionId,
      },
      baseContext,
    );

    return {
      ...session,
      events: [...(session.events || []), normalized],
    };
  });
}

function endSession(sessionId, summary) {
  const sessions = readSessions();
  const session = sessions[sessionId];
  if (!session) {
    throw new Error(`No telemetry session found for ${sessionId}`);
  }

  const events = session.events || [];
  const ttfaSeconds = computeTTFA(events);
  const stepCompletionRate = computeStepCompletionRate(events);

  const stepOutcomes = events.filter((event) => event.name === 'STEP_OUTCOME');
  const stepsAttempted = stepOutcomes.length;
  const stepsDone = stepOutcomes.filter(
    (event) => event.fields && event.fields.outcome === 'DONE',
  ).length;

  const sessionEndEvent = withCommon(
    {
      name: 'SESSION_END',
      session_id: sessionId,
      fields: {
        ttfa_seconds: ttfaSeconds,
        step_completion_rate: stepCompletionRate,
        steps_done: stepsDone,
        steps_attempted: stepsAttempted,
        abandoned: Boolean(summary && summary.abandoned),
        pre_stuck: summary && typeof summary.pre_stuck === 'number' ? summary.pre_stuck : 0,
        post_stuck: summary && typeof summary.post_stuck === 'number' ? summary.post_stuck : 0,
      },
    },
    session.context || {},
  );

  return logEvent(sessionId, sessionEndEvent);
}

module.exports = {
  startSession,
  logEvent,
  endSession,
};
