import { GENTLER_KIND_ORDER } from './engineTypes.ts';
import { filterCards } from './filter.ts';
import { weightedSelect } from './weights.ts';

function selectSpreadId(state_type, policy) {
  return policy && policy.spread_selection && policy.spread_selection.by_state
    ? policy.spread_selection.by_state[state_type]
    : undefined;
}

function findSpread(spreadId, spreadsConfig) {
  return (spreadsConfig.spreads || []).find((spread) => spread.id === spreadId);
}

function violatesHighFirstActionConstraint(kind, context, currentSteps) {
  if (context.intensity_band !== 'HIGH') return false;
  if (kind !== 'EXECUTE') return false;

  const hasRegulationEarlier = currentSteps.some(
    (step) => step.selected_kind === 'SOMATIC' || step.selected_kind === 'ENV',
  );

  return !hasRegulationEarlier;
}

function selectCardForSlot(slot, deckCards, context, history, currentSteps) {
  const tryKinds = [slot.required_kind, ...GENTLER_KIND_ORDER.filter((k) => k !== slot.required_kind)];

  for (const kind of tryKinds) {
    if (violatesHighFirstActionConstraint(kind, context, currentSteps)) {
      continue;
    }

    const pool = filterCards(deckCards, kind, slot.pool_filter || {});
    const card = weightedSelect(pool, context, slot.selection && slot.selection.weights, history);
    if (card) {
      return {
        slot_name: slot.slot_name,
        selected_kind: kind,
        card,
      };
    }
  }

  return null;
}

function buildReading(spreadId, deck, spreadsConfig, policy, context, history) {
  const spread = findSpread(spreadId, spreadsConfig);
  if (!spread) {
    throw new Error(`Spread not found: ${spreadId}`);
  }

  const steps = [];
  const deckCards = deck.cards || [];

  for (const slot of spread.slots || []) {
    const selected = selectCardForSlot(slot, deckCards, context, history, steps);
    if (!selected) {
      throw new Error(`Unable to fill slot '${slot.slot_name}' in spread '${spreadId}'`);
    }
    steps.push(selected);
  }

  return {
    spreadId: spread.id,
    steps,
  };
}

export { selectSpreadId, buildReading };
