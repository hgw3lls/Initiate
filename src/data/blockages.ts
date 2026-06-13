export type BlockageId =
  | "fog"
  | "weight"
  | "friction"
  | "perfection"
  | "overload"
  | "drift"
  | "dread"
  | "exhaustion";

export type ResistanceId =
  | "no-start"
  | "too-tired"
  | "wont-matter"
  | "not-good"
  | "later";

type DiagnosticOption = {
  label: string;
  blockageId: BlockageId;
};

export type DiagnosticQuestion = {
  id: string;
  prompt: string;
  options: DiagnosticOption[];
};

export type Blockage = {
  id: BlockageId;
  label: string;
  signal: string;
  objective: string;
  graveCause: string;
  protocol: string[];
  cardIds: string[];
};

export const blockages: Record<BlockageId, Blockage> = {
  fog: {
    id: "fog",
    label: "Fog",
    signal: "The task has no edge. The mind cannot grip what has not been named.",
    objective: "Name the output before asking for effort.",
    graveCause: "No Clear Next Step",
    protocol: ["Name task.", "Name output.", "Create file."],
    cardIds: ["name-the-thing", "one-clean-line", "file-that-exists", "friendlier-form"],
  },
  weight: {
    id: "weight",
    label: "Weight",
    signal: "The task appears larger than the task actually is.",
    objective: "Reduction. Not completion.",
    graveCause: "Impossible Scope",
    protocol: ["Cut task in half.", "Cut in half again.", "Do smallest version."],
    cardIds: ["cut-the-task-in-half", "lower-the-bar", "the-first-five", "timer-as-shield"],
  },
  friction: {
    id: "friction",
    label: "Friction",
    signal: "Too many setup requirements are standing between you and contact.",
    objective: "Remove one obstacle from the path.",
    graveCause: "Setup Friction",
    protocol: ["Find one obstacle.", "Remove only that.", "Touch the task."],
    cardIds: ["remove-one-obstacle", "clear-the-runway", "change-the-surface", "first-physical-move"],
  },
  perfection: {
    id: "perfection",
    label: "Perfection",
    signal: "The first version is being judged by the standards of the final version.",
    objective: "Permit a bad beginning.",
    graveCause: "Perfectionism",
    protocol: ["Make the bad version.", "Do not fix it.", "Stop while it exists."],
    cardIds: ["make-it-ugly", "lower-the-bar", "one-clean-line", "file-that-exists"],
  },
  overload: {
    id: "overload",
    label: "Overload",
    signal: "The system is reading many signals as one emergency.",
    objective: "Choose one signal and ignore the swarm.",
    graveCause: "Competing Priorities",
    protocol: ["Write three tasks.", "Choose one.", "Define done-for-now."],
    cardIds: ["false-urgency-detector", "stop-condition", "one-clean-line", "clear-the-runway"],
  },
  drift: {
    id: "drift",
    label: "Drift",
    signal: "Attention is unstable. The task cannot hold the room alone.",
    objective: "Create a short container and a physical anchor.",
    graveCause: "Attention Drift",
    protocol: ["Move body.", "Set short timer.", "Make one visible mark."],
    cardIds: ["move-the-body", "timer-as-shield", "the-first-five", "first-physical-move"],
  },
  dread: {
    id: "dread",
    label: "Dread",
    signal: "The task is carrying emotional voltage.",
    objective: "Name the avoided thing without solving it.",
    graveCause: "Avoided Consequence",
    protocol: ["Write fear.", "Set timer.", "Begin badly."],
    cardIds: ["write-the-fear", "ask-for-a-handle", "make-it-ugly", "two-minute-door"],
  },
  exhaustion: {
    id: "exhaustion",
    label: "Exhaustion",
    signal: "The system is low-energy. Force will create more resistance.",
    objective: "Find the smallest contact that does not require a full battery.",
    graveCause: "Low Energy State",
    protocol: ["Lower the bar.", "Use two minutes.", "Stop cleanly."],
    cardIds: ["two-minute-door", "lower-the-bar", "micro-reward", "stop-condition"],
  },
};

export const diagnosticQuestions: DiagnosticQuestion[] = [
  {
    id: "shape",
    prompt: "What is the task doing in your head?",
    options: [
      { label: "It has no edges", blockageId: "fog" },
      { label: "It is too big", blockageId: "weight" },
      { label: "The setup is annoying", blockageId: "friction" },
      { label: "It has to be good", blockageId: "perfection" },
    ],
  },
  {
    id: "block",
    prompt: "What stops the first move?",
    options: [
      { label: "Too many priorities", blockageId: "overload" },
      { label: "Attention keeps sliding", blockageId: "drift" },
      { label: "I do not want to touch it", blockageId: "dread" },
      { label: "My battery is empty", blockageId: "exhaustion" },
    ],
  },
  {
    id: "need",
    prompt: "What would make beginning possible?",
    options: [
      { label: "Define the output", blockageId: "fog" },
      { label: "Cut the scope", blockageId: "weight" },
      { label: "Remove one obstacle", blockageId: "friction" },
      { label: "Permission to be bad", blockageId: "perfection" },
      { label: "Choose one signal", blockageId: "overload" },
      { label: "A short container", blockageId: "drift" },
      { label: "Name the fear", blockageId: "dread" },
      { label: "A smaller battery-sized start", blockageId: "exhaustion" },
    ],
  },
];

export const resistanceOptions: Array<{ id: ResistanceId; label: string }> = [
  { id: "no-start", label: "I don't know where to start." },
  { id: "too-tired", label: "I'm too tired." },
  { id: "wont-matter", label: "It won't matter." },
  { id: "not-good", label: "It won't be good enough." },
  { id: "later", label: "I'll do it later." },
];

export const resistanceReframes: Record<ResistanceId, Record<BlockageId, string>> = {
  "no-start": {
    fog: "Correct. That is why the first action is naming, not doing.",
    weight: "Start where scale collapses. Cut the task until the door appears.",
    friction: "Start before setup is complete. Remove one obstacle, not all of them.",
    perfection: "Start with the version that is allowed to be bad.",
    overload: "Start by choosing one signal from the swarm.",
    drift: "Start with a body cue and a short container.",
    dread: "Start by naming what the task is threatening.",
    exhaustion: "Start with a motion small enough for the battery you actually have.",
  },
  "too-tired": {
    fog: "Tired systems need edges. Define the output; do not carry the whole task.",
    weight: "Tired means half-size is still too large. Cut again.",
    friction: "Spend the energy on removing friction, not performing competence.",
    perfection: "Tired is incompatible with perfect. Good. Make it rough.",
    overload: "Tired systems cannot triage everything. Choose one object.",
    drift: "Tired attention needs a container shorter than ambition.",
    dread: "Tired dread gets louder. Write the fear; do not argue with it.",
    exhaustion: "Then honor the signal. Two minutes is a full-sized start today.",
  },
  "wont-matter": {
    fog: "It matters if it gives the task an edge.",
    weight: "A reduced version matters because it breaks scale.",
    friction: "Removing one obstacle matters because motion prefers low resistance.",
    perfection: "A bad draft matters because it exists.",
    overload: "One chosen signal matters because the swarm cannot be obeyed.",
    drift: "Five minutes matters because contact is real.",
    dread: "Naming the avoided thing matters because fog becomes object.",
    exhaustion: "A tiny start matters because the system learns it can begin without force.",
  },
  "not-good": {
    fog: "Good is not the assignment. Named is the assignment.",
    weight: "Good belongs to later. Small belongs to now.",
    friction: "Good cannot happen before contact. Clear the path.",
    perfection: "Exactly. Make the first version bad on purpose.",
    overload: "Good is not available while everything is urgent. Choose one.",
    drift: "Good is not the metric. Contact is the metric.",
    dread: "Good is armor. Put it down for two minutes.",
    exhaustion: "Good requires energy. Today asks for a trace.",
  },
  later: {
    fog: "Later needs a named object. Give future-you an edge.",
    weight: "Later will inherit the same monster unless you shrink it now.",
    friction: "Later improves only if you remove one obstacle now.",
    perfection: "Later is perfection wearing a calendar.",
    overload: "Later is allowed after triage. Choose what today means.",
    drift: "Later is not a plan. A two-minute container is a plan.",
    dread: "Later keeps the dread alive. Name the fear now.",
    exhaustion: "Later can be real. Define the stop condition first.",
  },
};

export const interruptActions = [
  "Touch the nearest wall.",
  "Stand up.",
  "Open a window.",
  "Walk to another room.",
  "Write one sentence with your non-dominant hand.",
  "Close your eyes for 10 seconds.",
  "Put both feet on the floor and exhale twice.",
  "Move one object out of your path.",
];

export const shadowCards = [
  {
    id: "impossible-standard",
    title: "The Impossible Standard",
    trigger: "perfection",
    message: "The finish line has been replaced with a mirror. Make the worse version and leave it visible.",
  },
  {
    id: "task-is-disguise",
    title: "The Task Is a Disguise",
    trigger: "dread",
    message: "This may not be about the task. It may be about consequence. Name the consequence.",
  },
  {
    id: "waiting-for-permission",
    title: "Waiting for Permission",
    trigger: "fog",
    message: "No external signal is coming. Create the file. That is the permission.",
  },
  {
    id: "moving-finish-line",
    title: "The Moving Finish Line",
    trigger: "weight",
    message: "You keep redefining done after you begin. Define done-for-now before contact.",
  },
];
