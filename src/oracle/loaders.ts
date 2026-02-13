import { ZodSchema } from 'zod';

import {
  deckSchema,
  eventsSchema,
  policySchema,
  spreadsSchema,
} from './schema';
import type { Deck, EventsSchema, PolicyConfig, SpreadsConfig } from './types';

type OracleSpecName = 'deck' | 'spreads' | 'policy' | 'events';
type SourceMode = 'public';

type SpecConfig = {
  displayPath: string;
  mode: SourceMode;
  loadRaw: () => Promise<string>;
};

const SPECS: Record<OracleSpecName, SpecConfig> = {
  deck: {
    displayPath: 'deck.json',
    mode: 'public',
    loadRaw: async () => await (await fetch(`${import.meta.env.BASE_URL}deck.json`)).text(),
  },
  spreads: {
    displayPath: 'spreads.json',
    mode: 'public',
    loadRaw: async () => await (await fetch(`${import.meta.env.BASE_URL}spreads.json`)).text(),
  },
  policy: {
    displayPath: 'policy.json',
    mode: 'public',
    loadRaw: async () => await (await fetch(`${import.meta.env.BASE_URL}policy.json`)).text(),
  },
  events: {
    displayPath: 'events.json',
    mode: 'public',
    loadRaw: async () => await (await fetch(`${import.meta.env.BASE_URL}events.json`)).text(),
  },
};

function stripJsonCommentsAndTrailingCommas(input: string): string {
  const withoutComments = input
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|\s)\/\/.*$/gm, '$1');

  return withoutComments.replace(/,\s*([}\]])/g, '$1');
}

function formatZodIssuePath(path: (string | number)[]): string {
  return path.length ? path.join('.') : '(root)';
}

function toReadableValidationError(
  filePath: string,
  issues: { path: (string | number)[]; message: string }[],
): Error {
  const details = issues
    .map((issue) => `${formatZodIssuePath(issue.path)}: ${issue.message}`)
    .join('; ');
  return new Error(`Oracle spec validation failed for ${filePath}: ${details}`);
}

async function loadAndValidate<T>(
  specName: OracleSpecName,
  schema: ZodSchema<T>,
): Promise<T> {
  const spec = SPECS[specName];

  let raw: string;
  try {
    raw = await spec.loadRaw();
  } catch (error) {
    throw new Error(
      `Unable to load oracle spec ${spec.displayPath} using ${spec.mode} strategy: ${String(
        error,
      )}`,
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(stripJsonCommentsAndTrailingCommas(raw));
  } catch (error) {
    throw new Error(
      `Unable to parse oracle spec ${spec.displayPath} as JSON: ${String(error)}`,
    );
  }

  const result = schema.safeParse(parsed);
  if (!result.success) {
    throw toReadableValidationError(spec.displayPath, result.error.issues);
  }

  return result.data;
}

export async function loadDeck(): Promise<Deck> {
  return loadAndValidate('deck', deckSchema);
}

export async function loadSpreads(): Promise<SpreadsConfig> {
  return loadAndValidate('spreads', spreadsSchema);
}

export async function loadPolicy(): Promise<PolicyConfig> {
  return loadAndValidate('policy', policySchema);
}

export async function loadEventsSchema(): Promise<EventsSchema> {
  return loadAndValidate('events', eventsSchema);
}
