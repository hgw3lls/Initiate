const { getHistoryStats } = require('./history.ts');

function scoreCard(card, context, weights, history) {
  const safeWeights = {
    state_match: 0,
    intensity_match: 0,
    recently_failed_penalty: 0,
    recently_succeeded_bonus: 0,
    ...(weights || {}),
  };

  let score = 1;

  if (Array.isArray(card.state_affinity) && card.state_affinity.includes(context.state_type)) {
    score += safeWeights.state_match;
  }

  if (
    Array.isArray(card.intensity_affinity) &&
    (card.intensity_affinity.includes(context.intensity_band) || card.intensity_affinity.includes('Any'))
  ) {
    score += safeWeights.intensity_match;
  }

  const historyStats = getHistoryStats(card.id, history);
  if (historyStats.failedRecently) {
    score += safeWeights.recently_failed_penalty;
  }
  if (historyStats.succeededRecently) {
    score += safeWeights.recently_succeeded_bonus;
  }

  return Math.max(score, 0);
}

function weightedSelect(cards, context, weights, history) {
  if (!cards || cards.length === 0) return null;

  const weighted = cards.map((card) => ({
    card,
    score: scoreCard(card, context, weights, history),
  }));

  weighted.sort((a, b) => b.score - a.score || String(a.card.id).localeCompare(String(b.card.id)));
  return weighted[0].card;
}

module.exports = {
  scoreCard,
  weightedSelect,
};
