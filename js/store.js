const initialState = {
  app: {
    activePage: 'home',
    gestureStatus: 'initializing',
    isMuted: false,
    isPaused: false,
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
    selectedTheme: 'film_tv',
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

function cloneState(value) {
  return JSON.parse(JSON.stringify(value));
}

function hasOwn(target, property) {
  return Object.prototype.hasOwnProperty.call(target, property);
}

export const store = cloneState(initialState);

export function updateStore(section, patch) {
  if (!hasOwn(store, section)) {
    throw new TypeError(`Unknown store section: ${section}`);
  }

  Object.assign(store[section], patch);
  listeners.forEach((listener) => listener(section, store[section]));
  return store[section];
}

export function resetStoreSection(section) {
  if (!hasOwn(initialState, section)) {
    throw new TypeError(`Unknown store section: ${section}`);
  }

  store[section] = cloneState(initialState[section]);
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

export function isGamePaused() {
  return store.app.isPaused;
}
