export type SpreadPosition = {
  label: string;
  meaning: string;
};

export type Spread = {
  id: "activate" | "spark" | "ramp" | "triage";
  name: string;
  shortName: string;
  description: string;
  buttonLabel: string;
  actionIndex: number;
  positions: SpreadPosition[];
};

export const spreads: Spread[] = [
  {
    id: "activate",
    name: "One Card: Activate",
    shortName: "Activate",
    description: "The simplest possible intervention.",
    buttonLabel: "Draw Card",
    actionIndex: 0,
    positions: [{ label: "Activate", meaning: "What is the next move?" }],
  },
  {
    id: "spark",
    name: "Three Card: Friction / Handle / Ignition",
    shortName: "Spark",
    description: "Find the block, grip point, and first ignition.",
    buttonLabel: "Draw Reading",
    actionIndex: 2,
    positions: [
      { label: "Friction", meaning: "What is blocking motion?" },
      { label: "Handle", meaning: "What is the smallest grip point?" },
      { label: "Ignition", meaning: "What starts movement today?" },
    ],
  },
  {
    id: "ramp",
    name: "Four Card: Weight / Ramp / First Step / Reward",
    shortName: "Ramp",
    description: "Lower the task onto a usable slope.",
    buttonLabel: "Draw Reading",
    actionIndex: 2,
    positions: [
      { label: "Weight", meaning: "What feels heavy or unclear?" },
      { label: "Ramp", meaning: "What makes it easier?" },
      { label: "First Step", meaning: "What is the first physical action?" },
      { label: "Reward", meaning: "What immediate payoff can you give yourself?" },
    ],
  },
  {
    id: "triage",
    name: "Five Card: Urgent / Important / Avoidance / Support / Exit",
    shortName: "Triage",
    description: "Sort an overloaded day without moral drama.",
    buttonLabel: "Draw Reading",
    actionIndex: 0,
    positions: [
      { label: "Urgent", meaning: "What must move today?" },
      { label: "Important", meaning: "What matters but can be tiny?" },
      { label: "Avoidance", meaning: "What are you dodging?" },
      { label: "Support", meaning: "What help, tool, or person is allowed?" },
      { label: "Exit", meaning: "What is your stop condition?" },
    ],
  },
];
