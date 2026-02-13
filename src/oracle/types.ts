export type StateType =
  | 'Frozen'
  | 'Overwhelmed'
  | 'Avoiding'
  | 'Exhausted'
  | 'Blank'
  | 'AnxiousLoop'
  | 'Any'
  | 'Unknown';

export type IntensityBand = 'LOW' | 'MED' | 'HIGH' | 'Any';

export interface OracleText {
  title: string;
  reflection: string;
  guidance: string;
}

export interface CardAction {
  label: string;
  instruction: string;
  timer_sec: number;
  completion_check: 'TAP_DONE' | 'TIMER_DONE' | 'CHECKLIST';
}

export interface CardFallback {
  when: 'TOO_HARD' | 'SKIP';
  next_kind: string;
  instruction_override: string;
}

export interface DeckCard {
  id: string;
  name: string;
  kind: string;
  state_affinity: StateType[];
  intensity_affinity: IntensityBand[];
  difficulty: number;
  duration_sec: number;
  oracle_text: OracleText;
  action: CardAction;
  fallbacks: CardFallback[];
  escalate_to: string[];
  tags: string[];
  [key: string]: unknown;
}

export interface Deck {
  version: string;
  language: string;
  card_schema: Record<string, unknown>;
  cards: DeckCard[];
  [key: string]: unknown;
}

export interface SpreadSlot {
  id: string;
  name: string;
  slot: Record<string, unknown>;
  [key: string]: unknown;
}

export interface Spread {
  id: string;
  name: string;
  for_state: StateType;
  intensity_gate: IntensityBand;
  slots: SpreadSlot[];
  [key: string]: unknown;
}

export interface SpreadsConfig {
  version: string;
  spread_schema: Record<string, unknown>;
  spreads: Spread[];
  [key: string]: unknown;
}

export interface PolicyConfig {
  version: string;
  principles: string[];
  intensity_bands: Record<string, { stuck_min: number; stuck_max: number }>;
  spread_selection: Record<string, unknown>;
  adapter: Record<string, unknown>;
  guards: Record<string, unknown>;
  [key: string]: unknown;
}

export interface EventsSchema {
  version: string;
  goals: Record<string, string[]>;
  event_schema: Record<string, unknown>;
  derived_metrics: Record<string, string>;
  ethics: Record<string, unknown>;
  [key: string]: unknown;
}


declare module "*.json?raw" {
  const content: string;
  export default content;
}
