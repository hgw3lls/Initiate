import type { ReadingSession } from "../types";

const storageKey = "initiate.oracle.v1";

export function loadHistory() {
  try {
    const saved = localStorage.getItem(storageKey);
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? (parsed as ReadingSession[]) : [];
  } catch {
    localStorage.removeItem(storageKey);
    return [];
  }
}

export function saveHistory(history: ReadingSession[]) {
  localStorage.setItem(storageKey, JSON.stringify(history.slice(0, 30)));
}
