import React, { useEffect, useMemo, useState } from 'react';
import { loadDeck, loadEventsSchema, loadPolicy, loadSpreads } from '../loaders.ts';
import { buildReading, selectSpreadId } from '../engine/select.ts';
import { applyOutcome } from '../engine/adapter.ts';
import { startSession, logEvent, endSession } from '../telemetry/logger.ts';
import { computeTTFA } from '../telemetry/metrics.ts';
import { ReturnToCenter } from './screens/ReturnToCenter.jsx';
import { StepReveal } from './screens/StepReveal.jsx';
import { BeginGate } from './screens/BeginGate.jsx';
import { ExecuteStep } from './screens/ExecuteStep.jsx';
import { Transmitted } from './screens/Transmitted.jsx';
import { DebugPanel } from './DebugPanel.jsx';

const SCREEN = {
  RETURN: 0,
  REVEAL: 1,
  GATE: 2,
  EXECUTE: 3,
  TRANSMITTED: 4,
};

function firstStepIndex(reading) {
  return reading?.steps?.findIndex((step) => step.selected_kind !== 'REFLECT') ?? 0;
}

export function Flow() {
  const [bootError, setBootError] = useState('');
  const [loading, setLoading] = useState(true);
  const [screen, setScreen] = useState(SCREEN.RETURN);
  const [reading, setReading] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sessionId, setSessionId] = useState('');
  const [history, setHistory] = useState({ session: { consecutiveDone: 0, slotTooHardCounts: {} } });
  const [policy, setPolicy] = useState(null);
  const [context, setContext] = useState({ state_type: 'Frozen', intensity_band: 'MED', stuck_level: 70, app_version: '0.1.0' });
  const [timerLeft, setTimerLeft] = useState(null);
  const [rewardPayload, setRewardPayload] = useState(null);
  const [events, setEvents] = useState([]);

  const step = useMemo(() => reading?.steps?.[currentIndex] || null, [reading, currentIndex]);
  const ttfaSeconds = useMemo(() => computeTTFA(events), [events]);
  const recentOutcomes = useMemo(() => events
    .filter((event) => event.name === 'STEP_OUTCOME')
    .map((event) => ({ outcome: event.fields?.outcome, card_id: event.fields?.card_id }))
    .slice(-5), [events]);

  const appendEvent = (name, fields = {}) => {
    setEvents((prev) => [
      ...prev,
      {
        name,
        fields,
        timestamp_iso: new Date().toISOString(),
      },
    ]);
  };

  useEffect(() => {
    let isMounted = true;
    async function boot() {
      try {
        const [deck, spreads, loadedPolicy] = await Promise.all([
          loadDeck(),
          loadSpreads(),
          loadPolicy(),
          loadEventsSchema(),
        ]);
        if (!isMounted) return;

        const spreadId = selectSpreadId(context.state_type, loadedPolicy);
        const nextReading = buildReading(spreadId, deck, spreads, loadedPolicy, context, history);
        const sid = startSession({ ...context, entry_mode: 'SPREAD', goal_text_present: false });
        appendEvent('SESSION_START', { entry_mode: 'SPREAD', goal_text_present: false });

        setPolicy(loadedPolicy);
        setReading(nextReading);
        setSessionId(sid);

        const initialIndex = context.intensity_band === 'LOW' ? firstStepIndex(nextReading) : 0;
        setCurrentIndex(Math.max(initialIndex, 0));
      } catch (error) {
        if (isMounted) setBootError(String(error));
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    boot();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!step || !sessionId) return;
    if (screen === SCREEN.REVEAL) {
      const fields = {
          spread_id: reading.spreadId,
          slot_name: step.slot_name,
          card_id: step.card?.id,
          kind: step.selected_kind,
          difficulty: step.card?.difficulty,
          duration_sec: step.card?.duration_sec,
        };
      logEvent(sessionId, {
        name: 'CARD_DRAWN',
        fields,
      });
      appendEvent('CARD_DRAWN', fields);
    }
    if (screen === SCREEN.EXECUTE) {
      const fields = { card_id: step.card?.id, kind: step.selected_kind };
      logEvent(sessionId, {
        name: 'STEP_STARTED',
        fields,
      });
      appendEvent('STEP_STARTED', fields);
      const timer = Number(step.card?.action?.timer_sec || 0);
      if (timer > 0) setTimerLeft(timer);
      else setTimerLeft(null);
    }
  }, [screen, step, sessionId, reading]);

  useEffect(() => {
    if (timerLeft === null) return;
    if (timerLeft <= 0) return;
    const id = setTimeout(() => setTimerLeft((t) => (t === null ? null : t - 1)), 1000);
    return () => clearTimeout(id);
  }, [timerLeft]);

  if (loading) return <div className="oracle-card">Loading…</div>;
  if (bootError) return <div className="oracle-card">{bootError}</div>;

  const handleDefer = () => {
    endSession(sessionId, { abandoned: false, pre_stuck: context.stuck_level, post_stuck: context.stuck_level });
    appendEvent('SESSION_END', { abandoned: false });
    setScreen(SCREEN.TRANSMITTED);
    setRewardPayload({ copy_pool: ['Deferred safely. Return when ready.'] });
  };

  const apply = (outcome) => {
    const fields = {
        card_id: step.card?.id,
        kind: step.selected_kind,
        outcome,
        time_to_done_sec: outcome === 'DONE' ? Number(step.card?.action?.timer_sec || 0) : 0,
      };
    logEvent(sessionId, {
      name: 'STEP_OUTCOME',
      fields,
    });
    appendEvent('STEP_OUTCOME', fields);

    const result = applyOutcome({
      reading,
      currentIndex,
      outcome,
      policy,
      context,
      history,
    });

    setReading(result.reading);
    setRewardPayload(result.rewardPayload);
    setHistory((prev) => ({ ...prev }));

    if (result.endSession || result.nextIndex >= result.reading.steps.length) {
      endSession(sessionId, {
        abandoned: outcome !== 'DONE',
        pre_stuck: context.stuck_level,
        post_stuck: Math.max(0, context.stuck_level - 20),
      });
      appendEvent('SESSION_END', { abandoned: outcome !== 'DONE' });
      setScreen(SCREEN.TRANSMITTED);
      return;
    }

    setCurrentIndex(result.nextIndex);
    setScreen(SCREEN.TRANSMITTED);
  };

  let screenNode;
  if (screen === SCREEN.RETURN) {
    screenNode = <ReturnToCenter currentStep={step} onInitiate={() => setScreen(SCREEN.REVEAL)} />;
  } else if (screen === SCREEN.REVEAL) {
    screenNode = <StepReveal step={step} onInitiate={() => setScreen(SCREEN.GATE)} onDefer={handleDefer} />;
  } else if (screen === SCREEN.GATE) {
    screenNode = <BeginGate onStart={() => setScreen(SCREEN.EXECUTE)} />;
  } else if (screen === SCREEN.EXECUTE) {
    screenNode = (
      <ExecuteStep
        step={step}
        timerLeft={timerLeft}
        onComplete={() => apply('DONE')}
        onBreakState={() => apply('TOO_HARD')}
      />
    );
  } else {
    screenNode = (
      <Transmitted
        rewardPayload={rewardPayload}
        onContinue={() => setScreen(SCREEN.REVEAL)}
        onReturn={() => {
          endSession(sessionId, { abandoned: false, pre_stuck: context.stuck_level, post_stuck: context.stuck_level - 10 });
          appendEvent('SESSION_END', { abandoned: false });
          setScreen(SCREEN.RETURN);
        }}
      />
    );
  }

  return (
    <>
      {screenNode}
      {import.meta.env.DEV ? (
        <DebugPanel
          context={context}
          spreadId={reading?.spreadId}
          steps={reading?.steps || []}
          currentIndex={currentIndex}
          recentOutcomes={recentOutcomes}
          ttfaSeconds={ttfaSeconds}
        />
      ) : null}
    </>
  );
}
