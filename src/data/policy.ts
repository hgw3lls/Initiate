import type { BlockageId } from "./blockages";

export type CardKind = "REFLECT" | "SOMATIC" | "ENV" | "EXTERNALIZE" | "EXECUTE" | "REWARD" | "SOCIAL" | "IFTHEN";
export type IntensityBand = "LOW" | "MED" | "HIGH" | "Any";
export type StateType = "Frozen" | "Overwhelmed" | "Avoiding" | "Exhausted" | "Blank" | "AnxiousLoop" | "Any";

export type AdaptiveContext = {
  stateType: StateType;
  intensityBand: Exclude<IntensityBand, "Any">;
  stuckLevel: number;
};

export const initiatePolicy = {
  principles: [
    "HIGH paralysis never starts with EXECUTE unless preceded by SOMATIC or ENV.",
    "TOO_HARD must reduce effort and ambiguity before trying again.",
    "No punishment loops. Exiting after regulation is counted as a win.",
  ],
  gentlerKindOrder: ["SOMATIC", "ENV", "EXTERNALIZE", "EXECUTE", "REWARD"] satisfies CardKind[],
  adapter: {
    onDone: {
      rewardCopy: ["Motion detected.", "First step secured.", "You moved. The spell breaks."],
    },
    onTooHard: {
      reduceDurationFactor: 0.5,
      difficultyDecrease: 1,
      switchKindDownshiftPriority: ["SOMATIC", "ENV", "EXTERNALIZE", "EXECUTE"] satisfies CardKind[],
      twoChoiceCopy: "Choose one tiny door: A) soften the body OR B) open the tool.",
    },
  },
  guards: {
    maxTotalMinutesPerReading: 10,
    allowStopHereAlways: true,
    noStreakPunishment: true,
  },
} as const;

export const blockageStateMap: Record<BlockageId, StateType> = {
  fog: "Blank",
  weight: "Overwhelmed",
  friction: "Frozen",
  perfection: "Avoiding",
  overload: "Overwhelmed",
  drift: "Blank",
  dread: "Avoiding",
  exhaustion: "Exhausted",
};

export function intensityFromDifficulty(difficulty: number): Exclude<IntensityBand, "Any"> {
  if (difficulty >= 8) return "HIGH";
  if (difficulty >= 4) return "MED";
  return "LOW";
}
