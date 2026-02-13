function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function ensureHistory(history) {
  if (!history || typeof history !== 'object') {
    return { session: { consecutiveDone: 0, slotTooHardCounts: {} } };
  }
  if (!history.session) history.session = { consecutiveDone: 0, slotTooHardCounts: {} };
  if (typeof history.session.consecutiveDone !== 'number') history.session.consecutiveDone = 0;
  if (!history.session.slotTooHardCounts) history.session.slotTooHardCounts = {};
  return history;
}

function makeRewardPayload(policy) {
  return policy?.adapter?.on_done?.reward || null;
}

function makeTwoChoiceStep(currentStep, template) {
  const optionAKind = template?.option_a_kind || 'SOMATIC';
  const optionBKind = template?.option_b_kind || 'ENV';
  const copy = template?.copy || 'Choose one tiny door.';

  return {
    slot_name: currentStep.slot_name,
    selected_kind: optionAKind,
    card: {
      id: `${currentStep.card?.id || 'STEP'}_TWO_CHOICE`,
      name: 'Two Choices',
      kind: optionAKind,
      difficulty: Math.max(0, Number(currentStep.card?.difficulty || 0)),
      duration_sec: Math.max(5, Number(currentStep.card?.duration_sec || 10)),
      tags: ['two-choice', 'adapter'],
      oracle_text: {
        title: 'Choose One Tiny Door',
        reflection: copy,
        guidance: copy,
      },
      action: {
        label: 'Choose',
        instruction: copy,
        timer_sec: Math.max(5, Number(currentStep.card?.action?.timer_sec || 10)),
        completion_check: 'CHECKLIST',
      },
      choices: [
        { kind: optionAKind, label: `A) ${optionAKind}` },
        { kind: optionBKind, label: `B) ${optionBKind}` },
      ],
    },
  };
}

function enforceHighFirstAction(reading, context) {
  if (context?.intensity_band !== 'HIGH') return;

  const firstActionIndex = reading.steps.findIndex(
    (step) => step?.selected_kind && step.selected_kind !== 'REFLECT',
  );

  if (firstActionIndex < 0) return;
  const firstAction = reading.steps[firstActionIndex];
  if (firstAction.selected_kind !== 'EXECUTE') return;

  firstAction.selected_kind = 'SOMATIC';
  if (firstAction.card) {
    firstAction.card.kind = 'SOMATIC';
    firstAction.card.tags = Array.from(new Set([...(firstAction.card.tags || []), 'adapter-downshift']));
  }
}

function applyDone(state) {
  const { reading, currentIndex, policy, history } = state;
  history.session.consecutiveDone += 1;

  const threshold = policy?.adapter?.on_done?.escalate_rule?.after_consecutive_dones ?? Infinity;
  const maxIncrease = policy?.adapter?.on_done?.escalate_rule?.max_difficulty_increase ?? 0;

  if (history.session.consecutiveDone >= threshold) {
    const nextStep = reading.steps[currentIndex + 1];
    if (nextStep) {
      nextStep.selected_kind = 'EXECUTE';
      if (nextStep.card) {
        nextStep.card.kind = 'EXECUTE';
        const currentDifficulty = Number(nextStep.card.difficulty || 0);
        nextStep.card.difficulty = currentDifficulty + Math.max(0, maxIncrease);
      }
    }
  }

  return {
    reading,
    nextIndex: Math.min(currentIndex + 1, reading.steps.length - 1),
    endSession: false,
    rewardPayload: makeRewardPayload(policy),
  };
}

function applyTooHard(state) {
  const { reading, currentIndex, policy, history } = state;
  const step = reading.steps[currentIndex];
  const tooHardCfg = policy?.adapter?.on_too_hard || {};
  const slot = step.slot_name || `slot-${currentIndex}`;
  history.session.slotTooHardCounts[slot] = (history.session.slotTooHardCounts[slot] || 0) + 1;

  if (history.session.slotTooHardCounts[slot] >= 2) {
    reading.steps[currentIndex] = makeTwoChoiceStep(step, tooHardCfg.two_choice_template);
    return { reading, nextIndex: currentIndex, endSession: false, rewardPayload: null };
  }

  const order = tooHardCfg.rule_order || [];

  for (const rule of order) {
    if (rule === 'reduce_duration') {
      const factor = Number(tooHardCfg.reduce_duration_factor ?? 1);
      const prevDuration = Number(step.card?.duration_sec);
      const prevTimer = Number(step.card?.action?.timer_sec);
      let changed = false;
      if (Number.isFinite(prevDuration) && prevDuration > 0) {
        step.card.duration_sec = Math.max(1, Math.round(prevDuration * factor));
        changed = changed || step.card.duration_sec !== prevDuration;
      }
      if (Number.isFinite(prevTimer) && prevTimer > 0) {
        step.card.action.timer_sec = Math.max(1, Math.round(prevTimer * factor));
        changed = changed || step.card.action.timer_sec !== prevTimer;
      }
      if (changed) break;
    }

    if (rule === 'reduce_difficulty') {
      const prevDifficulty = Number(step.card?.difficulty);
      const decrease = Number(tooHardCfg.difficulty_decrease ?? 1);
      if (Number.isFinite(prevDifficulty) && prevDifficulty > 0) {
        step.card.difficulty = Math.max(0, prevDifficulty - decrease);
        if (step.card.difficulty !== prevDifficulty) break;
      }
    }

    if (rule === 'switch_kind_downshift') {
      const priority = tooHardCfg.switch_kind_downshift_priority || [];
      const currentKind = step.selected_kind;
      const nextKind = priority.find((kind) => kind !== currentKind);
      if (nextKind) {
        step.selected_kind = nextKind;
        if (step.card) step.card.kind = nextKind;
        break;
      }
    }
  }

  return { reading, nextIndex: currentIndex, endSession: false, rewardPayload: null };
}

function applySkip(state) {
  const { reading, currentIndex, policy, history } = state;
  history.session.consecutiveDone = 0;
  const step = reading.steps[currentIndex];
  const priorities = policy?.adapter?.on_skip?.switch_kind_priority || [];
  const nextKind = priorities.find((kind) => kind !== step.selected_kind);
  if (nextKind) {
    step.selected_kind = nextKind;
    if (step.card) step.card.kind = nextKind;
  }

  return {
    reading,
    nextIndex: Math.min(currentIndex + 1, reading.steps.length - 1),
    endSession: false,
    rewardPayload: null,
  };
}

function applyStopHere(state) {
  const { reading, history } = state;
  const hadRegulatingStep = reading.steps.some(
    (step) => step.selected_kind === 'SOMATIC' || step.selected_kind === 'REWARD',
  );
  history.session.stoppedAsSuccess = hadRegulatingStep;
  history.session.consecutiveDone = 0;
  return { reading, nextIndex: state.currentIndex, endSession: true, rewardPayload: null };
}

function applyOutcome({ reading, currentIndex, outcome, policy, context, history }) {
  const mutableReading = clone(reading);
  const mutableHistory = ensureHistory(history || {});

  const state = {
    reading: mutableReading,
    currentIndex,
    outcome,
    policy,
    context,
    history: mutableHistory,
  };

  let result;
  if (outcome === 'DONE') result = applyDone(state);
  else if (outcome === 'TOO_HARD') {
    mutableHistory.session.consecutiveDone = 0;
    result = applyTooHard(state);
  } else if (outcome === 'SKIP') result = applySkip(state);
  else result = applyStopHere(state);

  enforceHighFirstAction(result.reading, context);

  return result;
}

// ESM exports for Vite/Rollup (and to match Flow.jsx imports).
export { applyOutcome };

// Optional default export for any callers that prefer object-style imports.
export default {
  applyOutcome,
};
