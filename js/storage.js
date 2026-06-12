const STORAGE_PREFIX = 'party-game-helper';

function createStorageKey(gameType) {
  if (typeof gameType !== 'string' || gameType.trim() === '') {
    throw new TypeError('gameType must be a non-empty string');
  }

  return `${STORAGE_PREFIX}:${gameType}`;
}

function getDefaultStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export function saveGameState(gameType, state, storage = getDefaultStorage()) {
  const key = createStorageKey(gameType);

  if (!storage) {
    return false;
  }

  try {
    storage.setItem(key, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function loadGameState(gameType, storage = getDefaultStorage()) {
  const key = createStorageKey(gameType);

  if (!storage) {
    return null;
  }

  try {
    const savedState = storage.getItem(key);
    return savedState === null ? null : JSON.parse(savedState);
  } catch {
    return null;
  }
}

export function clearGameState(gameType, storage = getDefaultStorage()) {
  const key = createStorageKey(gameType);

  if (!storage) {
    return false;
  }

  try {
    storage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}
