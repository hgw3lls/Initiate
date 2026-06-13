import { cards, type OracleCard } from "../data/cards";
import { blockages, shadowCards, type BlockageId } from "../data/blockages";
import type { ReadingSession } from "../types";
import { buildStuckIntervention, selectAdaptiveCardForBlockage, type AdaptiveCardOptions } from "./adaptiveOracle";

const stuckDeckIds = [
  "lower-the-bar",
  "two-minute-door",
  "first-physical-move",
  "make-it-ugly",
  "one-clean-line",
  "remove-one-obstacle",
  "move-the-body",
  "the-first-five",
];

function shuffle<T>(items: T[]) {
  const nextItems = [...items];
  for (let index = nextItems.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [nextItems[index], nextItems[randomIndex]] = [nextItems[randomIndex], nextItems[index]];
  }

  return nextItems;
}

export function drawCards(count: number, deck: OracleCard[] = cards) {
  return shuffle(deck).slice(0, count);
}

export function getDominantBlockage(answers: Record<string, BlockageId>) {
  const counts = Object.values(answers).reduce<Record<BlockageId, number>>((nextCounts, blockageId) => {
    nextCounts[blockageId] += 1;
    return nextCounts;
  }, {
    fog: 0,
    weight: 0,
    friction: 0,
    perfection: 0,
    overload: 0,
    drift: 0,
    dread: 0,
    exhaustion: 0,
  });
  const sorted = Object.entries(counts).sort(([, countA], [, countB]) => countB - countA);

  return sorted[0][1] > 0 ? (sorted[0][0] as BlockageId) : null;
}

export function drawCardForBlockage(blockageId: BlockageId, options?: AdaptiveCardOptions) {
  const focusedCards = blockages[blockageId].cardIds
    .map((cardId) => cards.find((card) => card.id === cardId))
    .filter((card): card is OracleCard => Boolean(card));

  if (options) {
    return selectAdaptiveCardForBlockage(blockageId, focusedCards.length ? focusedCards : cards, options);
  }

  return drawCards(1, focusedCards.length ? focusedCards : cards)[0];
}

export function chooseStuckIntervention(session: ReadingSession) {
  const adaptiveIntervention = buildStuckIntervention(session);
  if (adaptiveIntervention.card) return adaptiveIntervention;

  const usedIds = new Set([...session.cards.map((drawnCard) => drawnCard.card.id), session.stuckIntervention?.card.id]);
  const priorityCards = stuckDeckIds
    .map((cardId) => cards.find((card) => card.id === cardId))
    .filter((card): card is OracleCard => Boolean(card))
    .filter((card) => !usedIds.has(card.id));

  return {
    card: drawCards(1, priorityCards.length ? priorityCards : cards)[0],
    adapterTrace: ["Fallback: drew from the stuck deck."],
  };
}

export function getUnlockedShadowCard(history: ReadingSession[]) {
  const blockageCounts = history.reduce<Record<string, number>>((counts, session) => {
    if (!session.blockageId) return counts;
    counts[session.blockageId] = (counts[session.blockageId] ?? 0) + 1;
    return counts;
  }, {});
  const [blockageId, count = 0] = Object.entries(blockageCounts).sort(([, countA], [, countB]) => countB - countA)[0] ?? [];

  if (!blockageId || count < 3) return null;
  return shadowCards.find((shadowCard) => shadowCard.trigger === blockageId) ?? null;
}
