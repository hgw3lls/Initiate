import type { OracleCard } from "./data/cards";
import type { Spread } from "./data/spreads";
import type { BlockageId, ResistanceId } from "./data/blockages";

export type SessionStatus = "started" | "stuck" | "done-for-now";

export type DrawnCard = {
  positionLabel: string;
  positionMeaning: string;
  card: OracleCard;
};

export type ReadingSession = {
  id: string;
  createdAt: string;
  userTask: string;
  blockageId?: BlockageId;
  diagnosticAnswers?: Record<string, BlockageId>;
  spreadId: Spread["id"];
  spreadName: string;
  cards: DrawnCard[];
  generatedReadingText: string;
  actionCardId: string;
  prediction?: {
    estimatedDifficulty?: number;
    estimatedMinutes?: number;
    actualDifficulty?: number;
    actualMinutes?: number;
  };
  resistance?: {
    id: ResistanceId;
    reframe: string;
  };
  stuckIntervention?: {
    card: OracleCard;
    createdAt: string;
    adapterTrace?: string[];
    choices?: string[];
  };
  stuckCount?: number;
  buriedAt?: string;
  graveCause?: string;
  status?: SessionStatus;
  logNote?: string;
};
