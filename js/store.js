const initialState = {
  app: {
    activePage: 'home',
    gestureStatus: 'initializing',
  },
  werewolf: {
    status: 'idle',
    totalPlayers: 6,
    assignedRoles: [],
    currentPlayerIndex: 0,
    revealed: false,
  },
  undercover: {
    status: 'idle',
    totalPlayers: 6,
    undercoverCount: 1,
    assignedWords: [],
    currentPlayerIndex: 0,
    revealed: false,
  },
  charades: {
    status: 'idle',
    duration: 120,
    remainingSeconds: 120,
    deck: [],
    currentIndex: 0,
    score: 0,
    correctWords: [],
    passedWords: [],
  },
};

const listeners = new Set();

export const store = structuredClone(initialState);

export function updateStore(section, patch) {
  if (!Object.hasOwn(store, section)) {
    throw new TypeError(`Unknown store section: ${section}`);
  }

  Object.assign(store[section], patch);
  listeners.forEach((listener) => listener(section, store[section]));
  return store[section];
}

export function resetStoreSection(section) {
  if (!Object.hasOwn(initialState, section)) {
    throw new TypeError(`Unknown store section: ${section}`);
  }

  store[section] = structuredClone(initialState[section]);
  listeners.forEach((listener) => listener(section, store[section]));
  return store[section];
}

export function subscribe(listener) {
  if (typeof listener !== 'function') {
    throw new TypeError('listener must be a function');
  }

  listeners.add(listener);
  return () => listeners.delete(listener);
}
