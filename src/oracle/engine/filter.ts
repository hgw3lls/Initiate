function matchesAnyOrAny(haystack, needles) {
  if (!needles || needles.length === 0) return true;
  if (!Array.isArray(haystack)) return false;
  const needleSet = new Set(needles);
  return haystack.some((value) => needleSet.has(value)) || needleSet.has('Any') || haystack.includes('Any');
}

function cardMatchesFilter(card, poolFilter) {
  if (!poolFilter) return true;

  if (!matchesAnyOrAny(card.state_affinity || [], poolFilter.state_affinity_any_of)) {
    return false;
  }

  if (!matchesAnyOrAny(card.intensity_affinity || [], poolFilter.intensity_any_of)) {
    return false;
  }

  if (
    typeof poolFilter.max_difficulty === 'number' &&
    typeof card.difficulty === 'number' &&
    card.difficulty > poolFilter.max_difficulty
  ) {
    return false;
  }

  if (poolFilter.tags_any_of && poolFilter.tags_any_of.length > 0) {
    const cardTags = Array.isArray(card.tags) ? card.tags : [];
    const required = new Set(poolFilter.tags_any_of);
    if (!cardTags.some((tag) => required.has(tag))) {
      return false;
    }
  }

  return true;
}

function filterCards(cards, requiredKind, poolFilter) {
  return cards.filter((card) => card.kind === requiredKind && cardMatchesFilter(card, poolFilter));
}

module.exports = {
  cardMatchesFilter,
  filterCards,
};
