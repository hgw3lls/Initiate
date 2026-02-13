function computeTTFA(events) {
  const start = events.find((event) => event.name === 'SESSION_START');
  const firstDone = events.find(
    (event) => event.name === 'STEP_OUTCOME' && event.fields && event.fields.outcome === 'DONE',
  );

  if (!start || !firstDone) return null;
  const startAt = Date.parse(start.timestamp_iso);
  const doneAt = Date.parse(firstDone.timestamp_iso);
  if (!Number.isFinite(startAt) || !Number.isFinite(doneAt)) return null;
  return Math.max(0, Math.round((doneAt - startAt) / 1000));
}

function computeStepCompletionRate(events) {
  const outcomes = events.filter((event) => event.name === 'STEP_OUTCOME');
  const stepsAttempted = outcomes.length;
  if (stepsAttempted === 0) return 0;

  const stepsDone = outcomes.filter(
    (event) => event.fields && event.fields.outcome === 'DONE',
  ).length;

  return stepsDone / stepsAttempted;
}

module.exports = {
  computeTTFA,
  computeStepCompletionRate,
};
