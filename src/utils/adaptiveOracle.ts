import { cards, type OracleCard } from "../data/cards";
import { blockages, type BlockageId } from "../data/blockages";
import {
  blockageStateMap,
  initiatePolicy,
  intensityFromDifficulty,
  type AdaptiveContext,
  type CardKind,
  type IntensityBand,
  type StateType,
} from "../data/policy";
import type { ReadingSession } from "../types";

type CardProfile = {
  kind: CardKind;
  difficulty: number;
  stateAffinity: StateType[];
  intensityAffinity: IntensityBand[];
  tags: string[];
};

export type AdaptiveCardOptions = {
  estimatedDifficulty?: number;
  history?: ReadingSession[];
};

export type StuckInterventionDraft = {
  card: OracleCard;
  adapterTrace: string[];
  choices?: string[];
};

const fallbackProfiles: Record<string, CardProfile> = {
  "name-the-thing": profile("EXTERNALIZE", 1, ["Blank", "Overwhelmed"]),
  "two-minute-door": profile("EXECUTE", 2, ["Frozen", "Avoiding", "Exhausted"]),
  "remove-one-obstacle": profile("ENV", 1, ["Frozen", "Overwhelmed"]),
  "cut-the-task-in-half": profile("EXTERNALIZE", 1, ["Overwhelmed"]),
  "first-physical-move": profile("SOMATIC", 0, ["Frozen", "Blank"]),
  "one-clean-line": profile("EXTERNALIZE", 1, ["Blank", "Overwhelmed"]),
  "timer-as-shield": profile("EXECUTE", 2, ["Overwhelmed", "Avoiding"]),
  "make-it-ugly": profile("EXECUTE", 2, ["Avoiding"]),
  "false-urgency-detector": profile("EXTERNALIZE", 1, ["Overwhelmed", "AnxiousLoop"]),
  "friendlier-form": profile("EXTERNALIZE", 1, ["Frozen", "Exhausted"]),
  "file-that-exists": profile("ENV", 1, ["Blank", "Avoiding"]),
  "clear-the-runway": profile("ENV", 1, ["Overwhelmed", "Frozen"]),
  "micro-reward": profile("REWARD", 0, ["Exhausted", "Avoiding"]),
  "ask-for-a-handle": profile("SOCIAL", 1, ["Avoiding", "Frozen"]),
  "lower-the-bar": profile("EXTERNALIZE", 1, ["Overwhelmed", "Exhausted"]),
  "move-the-body": profile("SOMATIC", 0, ["Frozen", "Blank"]),
  "write-the-fear": profile("EXTERNALIZE", 1, ["Avoiding"]),
  "change-the-surface": profile("ENV", 1, ["Frozen", "Blank"]),
  "the-first-five": profile("EXECUTE", 2, ["Overwhelmed", "Blank"]),
  "stop-condition": profile("EXTERNALIZE", 1, ["Avoiding", "Overwhelmed"]),
};

function profile(kind: CardKind, difficulty: number, stateAffinity: StateType[], intensityAffinity: IntensityBand[] = ["Any"]) {
  return { kind, difficulty, stateAffinity, intensityAffinity, tags: [] };
}

function uniq<T>(items: T[]) {
  return Array.from(new Set(items));
}

function includesAffinity<T extends string>(affinity: T[], target: T) {
  return affinity.includes(target) || affinity.includes("Any" as T);
}

function getProfile(card: OracleCard): CardProfile {
  const fallback = fallbackProfiles[card.id] ?? profile("EXECUTE", 2, ["Any"]);

  return {
    kind: card.kind ?? fallback.kind,
    difficulty: card.difficulty ?? fallback.difficulty,
    stateAffinity: card.stateAffinity ?? fallback.stateAffinity,
    intensityAffinity: card.intensityAffinity ?? fallback.intensityAffinity,
    tags: card.tags ?? fallback.tags,
  };
}

function contextFor(blockageId: BlockageId, estimatedDifficulty = 5): AdaptiveContext {
  return {
    stateType: blockageStateMap[blockageId],
    intensityBand: intensityFromDifficulty(estimatedDifficulty),
    stuckLevel: Math.min(100, Math.max(0, estimatedDifficulty * 10)),
  };
}

function recentCardScore(card: OracleCard, history: ReadingSession[] = []) {
  return history.slice(0, 8).reduce((score, session) => {
    const used = session.cards.some((drawnCard) => drawnCard.card.id === card.id) || session.stuckIntervention?.card.id === card.id;
    if (!used) return score;
    if (session.status === "stuck") return score - 2;
    if (session.status === "started" || session.status === "done-for-now") return score + 0.75;
    return score - 0.5;
  }, 0);
}

function scoreCard(card: OracleCard, context: AdaptiveContext, options: AdaptiveCardOptions = {}, preferredIds = new Set<string>()) {
  const cardProfile = getProfile(card);
  let score = 1;

  if (preferredIds.has(card.id)) score += 5;
  if (includesAffinity(cardProfile.stateAffinity, context.stateType)) score += 3;
  if (includesAffinity(cardProfile.intensityAffinity, context.intensityBand)) score += 2;

  const maxDifficulty = context.intensityBand === "HIGH" ? 1 : context.intensityBand === "MED" ? 3 : 5;
  if (cardProfile.difficulty <= maxDifficulty) score += 1.5;
  else score -= 3;

  if (context.intensityBand === "HIGH" && cardProfile.kind === "EXECUTE") {
    score -= 8;
  }

  score += recentCardScore(card, options.history);
  return score;
}

function pickHighestScoredCard(pool: OracleCard[], context: AdaptiveContext, options: AdaptiveCardOptions, preferredIds: Set<string>) {
  return [...pool]
    .map((card) => ({ card, score: scoreCard(card, context, options, preferredIds) }))
    .sort((a, b) => b.score - a.score || a.card.number - b.card.number || a.card.id.localeCompare(b.card.id))[0]?.card;
}

export function selectAdaptiveCardForBlockage(
  blockageId: BlockageId,
  focusedCards: OracleCard[],
  options: AdaptiveCardOptions = {},
) {
  const context = contextFor(blockageId, options.estimatedDifficulty);
  const preferredIds = new Set(focusedCards.map((card) => card.id));
  const focused = pickHighestScoredCard(focusedCards, context, options, preferredIds);
  const focusedProfile = focused ? getProfile(focused) : null;

  if (focused && !(context.intensityBand === "HIGH" && focusedProfile?.kind === "EXECUTE")) {
    return focused;
  }

  const guardPool = cards.filter((card) => {
    const cardProfile = getProfile(card);
    return cardProfile.kind === "SOMATIC" || cardProfile.kind === "ENV" || cardProfile.kind === "EXTERNALIZE";
  });

  return pickHighestScoredCard(guardPool, context, options, preferredIds) ?? focused;
}

function reducedCard(card: OracleCard): OracleCard {
  const cardProfile = getProfile(card);
  const nextDifficulty = Math.max(0, cardProfile.difficulty - initiatePolicy.adapter.onTooHard.difficultyDecrease);
  const nextTimer = Math.max(10, Math.round(card.timerSeconds * initiatePolicy.adapter.onTooHard.reduceDurationFactor));

  return {
    ...card,
    id: `${card.id}-half-size`,
    title: `Half-Size ${card.title}`,
    shortText: "The adapter cut duration, difficulty, and expectation.",
    action: "Do the same instruction at half-size.",
    microAction: `Only the smallest visible piece of this counts: ${card.microAction}`,
    timerSeconds: nextTimer,
    difficulty: nextDifficulty,
    tags: uniq([...(card.tags ?? []), "adapter", "reduced"]),
  };
}

function makeTwoChoiceCard(session: ReadingSession): OracleCard {
  const task = session.userTask || "the task";

  return {
    id: `two-choice-door-${session.id}`,
    number: 24,
    title: "Two Tiny Doors",
    shortText: "The task stays closed because there are too many possible entrances.",
    keywords: ["adapter", "choice", "downshift"],
    prompt: "Which tiny door is easier?",
    action: "Choose one tiny door. Do not add a third option.",
    microAction: `Choose one: A) stand up and exhale once OR B) open the exact place for "${task}".`,
    timerSeconds: 20,
    reading:
      "The first two attempts were still too large. This is the old adapter rule: remove ambiguity before trying again.",
    message: "Two choices. One motion. No punishment loop.",
    symbol: "A/B",
    kind: "EXTERNALIZE",
    difficulty: 0,
    stateAffinity: ["Any"],
    intensityAffinity: ["Any"],
    completionCheck: "CHECKLIST",
    tags: ["legacy", "adapter", "two-choice"],
    source: "legacy",
  };
}

function pickDownshiftCard(session: ReadingSession, context: AdaptiveContext, usedIds: Set<string>) {
  const priority: readonly CardKind[] = initiatePolicy.adapter.onTooHard.switchKindDownshiftPriority;
  const candidates = cards.filter((card) => {
    const cardProfile = getProfile(card);
    return !usedIds.has(card.id) && priority.includes(cardProfile.kind);
  });

  return candidates
    .map((card) => {
      const cardProfile = getProfile(card);
      return {
        card,
        priority: priority.indexOf(cardProfile.kind),
        score: scoreCard(card, context, {}, new Set(blockages[session.blockageId ?? "fog"].cardIds)),
      };
    })
    .sort((a, b) => a.priority - b.priority || b.score - a.score || a.card.number - b.card.number)[0]?.card;
}

export function buildStuckIntervention(session: ReadingSession): StuckInterventionDraft {
  const stuckCount = (session.stuckCount ?? 0) + 1;
  const blockageId = session.blockageId ?? "fog";
  const estimatedDifficulty = session.prediction?.estimatedDifficulty ?? 5;
  const context = contextFor(blockageId, estimatedDifficulty);
  const activeCard = session.stuckIntervention?.card ?? session.cards[0]?.card;
  const usedIds = new Set([
    ...session.cards.map((drawnCard) => drawnCard.card.id),
    ...(session.stuckIntervention ? [session.stuckIntervention.card.id] : []),
  ]);

  if (!activeCard) {
    return {
      card: makeTwoChoiceCard(session),
      adapterTrace: ["Fallback: offered two tiny doors because no active card was available."],
      choices: ["Soften the body.", "Open the tool."],
    };
  }

  if (stuckCount === 1) {
    return {
      card: reducedCard(activeCard),
      adapterTrace: [
        "TOO_HARD: reduced duration by 50%.",
        "TOO_HARD: reduced difficulty by 1.",
      ],
    };
  }

  if (stuckCount === 2) {
    const downshifted = pickDownshiftCard(session, context, usedIds);
    if (downshifted) {
      return {
        card: downshifted,
        adapterTrace: [`TOO_HARD: downshifted to ${getProfile(downshifted).kind}.`],
      };
    }
  }

  return {
    card: makeTwoChoiceCard(session),
    adapterTrace: ["TOO_HARD twice: offered two choices instead of pushing harder."],
    choices: ["Soften the body.", "Open the tool."],
  };
}
