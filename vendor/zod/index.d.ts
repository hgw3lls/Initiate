export type ZodIssue = { path: (string | number)[]; message: string };
export class ZodError extends Error {
  issues: ZodIssue[];
}

export interface ZodSchema<T = unknown> {
  safeParse(value: unknown): { success: true; data: T } | { success: false; error: ZodError };
}

declare class AnySchema<T = unknown> implements ZodSchema<T> {
  safeParse(value: unknown): { success: true; data: T } | { success: false; error: ZodError };
  passthrough(): this;
}

export const z: {
  string(): AnySchema<string>;
  number(): AnySchema<number>;
  unknown(): AnySchema<unknown>;
  enum<T extends string>(values: readonly T[]): AnySchema<T>;
  array<T>(schema: ZodSchema<T>): AnySchema<T[]>;
  record<K extends string, V>(key: ZodSchema<K>, value: ZodSchema<V>): AnySchema<Record<string, V>>;
  object<T extends Record<string, unknown>>(shape: Record<string, ZodSchema>): AnySchema<T>;
};
