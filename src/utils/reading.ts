import type { OracleCard } from "../data/cards";
import { blockages, resistanceReframes, type BlockageId, type ResistanceId } from "../data/blockages";
import type { Spread } from "../data/spreads";
import type { DrawnCard, ReadingSession } from "../types";

function sentenceForPosition(drawnCard: DrawnCard) {
  return `${drawnCard.positionLabel}: ${drawnCard.card.title}. ${drawnCard.card.shortText} ${drawnCard.card.message}`;
}

function taskLine(task: string) {
  return `You asked about: ${task}`;
}

export function buildReading(task: string, spread: Spread, drawnCards: DrawnCard[]) {
  if (spread.id === "activate") {
    const card = drawnCards[0].card;
    return [
      taskLine(task),
      "",
      `You pulled: ${card.title}`,
      "",
      card.reading,
      "",
      "Instruction:",
      card.action,
      "",
      "Do this now:",
      card.microAction,
      "",
      "Message:",
      card.message,
    ].join("\n");
  }

  if (spread.id === "spark") {
    const [friction, handle, ignition] = drawnCards;
    return [
      taskLine(task),
      "",
      `Your friction is ${friction.card.title}: ${friction.card.shortText}`,
      `Your handle is ${handle.card.title}: ${handle.card.message}`,
      `Your ignition is ${ignition.card.title}: ${ignition.card.action}`,
      "",
      "Pattern:",
      `${friction.card.keywords[0]} is blocking motion. ${handle.card.keywords[0]} gives you a grip. ${ignition.card.keywords[0]} starts movement today.`,
      "",
      "Do this now:",
      ignition.card.microAction,
      "",
      "Message:",
      "Do not finish the task. Initiate the smallest real motion.",
    ].join("\n");
  }

  const lines = [taskLine(task), "", "The shape of the reading:"];
  drawnCards.forEach((drawnCard) => lines.push(sentenceForPosition(drawnCard)));

  lines.push("");
  lines.push("Do this now:");

  if (spread.id === "ramp") {
    const firstStep = drawnCards.find((drawnCard) => drawnCard.positionLabel === "First Step") ?? drawnCards[0];
    lines.push(firstStep.card.microAction);
    lines.push("");
    lines.push("Message:");
    lines.push("Build the ramp. Take the first physical step. Leave the rest outside the circle.");
    return lines.join("\n");
  }

  const urgent = drawnCards.find((drawnCard) => drawnCard.positionLabel === "Urgent") ?? drawnCards[0];
  const exit = drawnCards.find((drawnCard) => drawnCard.positionLabel === "Exit");
  lines.push(urgent.card.microAction);
  if (exit) lines.push(`Then define the exit: ${exit.card.microAction}`);
  lines.push("");
  lines.push("Message:");
  lines.push("Triage is not failure. Triage is how overwhelmed systems survive.");

  return lines.join("\n");
}

export function buildDiagnosticReading(task: string, blockageId: BlockageId, card: OracleCard) {
  const blockage = blockages[blockageId];

  return [
    `You asked about: ${task}`,
    "",
    "YOU ARE EXPERIENCING:",
    blockage.label.toUpperCase(),
    "",
    blockage.signal,
    "",
    "Today's objective:",
    blockage.objective,
    "",
    `Oracle card: ${card.title}`,
    "",
    "Reading:",
    card.reading,
    "",
    "Reframe:",
    card.message,
    "",
    "Activation:",
    card.action,
    "",
    "Micro Action:",
    card.microAction,
  ].join("\n");
}

export function buildResistanceReframe(blockageId: BlockageId, resistanceId: ResistanceId) {
  return resistanceReframes[resistanceId][blockageId];
}

export function buildReadingForCopy(session: ReadingSession, statusMessage?: string) {
  const stuckText = session.stuckIntervention
    ? [
        "Second intervention:",
        session.stuckIntervention.card.title,
        session.stuckIntervention.card.microAction,
      ].join("\n")
    : "";

  return [
    "INITIATE",
    session.generatedReadingText,
    session.resistance ? `Resistance: ${session.resistance.reframe}` : "",
    statusMessage ? `Status: ${statusMessage}` : "",
    stuckText,
    session.logNote ? `Log: ${session.logNote}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function cardToDrawnAction(card: OracleCard) {
  return {
    title: card.title,
    microAction: card.microAction,
    timerSeconds: card.timerSeconds,
  };
}
