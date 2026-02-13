const { TELEMETRY_STORAGE_KEY } = require('./types.ts');

function createMemoryStorage() {
  const data = {};
  return {
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null;
    },
    setItem(key, value) {
      data[key] = String(value);
    },
    removeItem(key) {
      delete data[key];
    },
    clear() {
      for (const key of Object.keys(data)) delete data[key];
    },
  };
}

function getStorage() {
  if (typeof globalThis.localStorage !== 'undefined') {
    return globalThis.localStorage;
  }

  if (!globalThis.__oracleMemoryStorage) {
    globalThis.__oracleMemoryStorage = createMemoryStorage();
  }

  return globalThis.__oracleMemoryStorage;
}

function readSessions() {
  const storage = getStorage();
  const raw = storage.getItem(TELEMETRY_STORAGE_KEY);
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (_error) {
    return {};
  }
}

function writeSessions(sessions) {
  const storage = getStorage();
  storage.setItem(TELEMETRY_STORAGE_KEY, JSON.stringify(sessions));
}

function upsertSession(sessionId, updater) {
  const sessions = readSessions();
  const current = sessions[sessionId] || { context: {}, events: [] };
  sessions[sessionId] = updater(current);
  writeSessions(sessions);
  return sessions[sessionId];
}

module.exports = {
  getStorage,
  readSessions,
  writeSessions,
  upsertSession,
};
