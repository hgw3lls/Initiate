function getHistoryStats(cardId, history) {
  const failedCardIds = new Set((history && history.failedCardIds) || []);
  const succeededCardIds = new Set((history && history.succeededCardIds) || []);

  return {
    failedRecently: failedCardIds.has(cardId),
    succeededRecently: succeededCardIds.has(cardId),
  };
}

export { getHistoryStats };
