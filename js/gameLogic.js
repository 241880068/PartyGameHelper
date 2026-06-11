import { loadGameState, saveGameState } from './storage.js';
import { randomItem, shuffle } from './utils/shuffle.js';

const DATA_FILES = {
  werewolf: '../game-data/werewolf.json',
  undercover: '../game-data/undercover.json',
  charades: '../game-data/charades.json',
};

const dataCache = new Map();

export async function loadGameData(gameType, fetcher = globalThis.fetch) {
  if (!Object.prototype.hasOwnProperty.call(DATA_FILES, gameType)) {
    throw new TypeError(`Unsupported game type: ${gameType}`);
  }
  if (dataCache.has(gameType)) {
    return dataCache.get(gameType);
  }
  if (typeof fetcher !== 'function') {
    throw new Error('This game requires a browser with fetch support');
  }

  const response = await fetcher(new URL(DATA_FILES[gameType], import.meta.url));
  if (!response.ok) {
    throw new Error(`Unable to load ${gameType} data (${response.status})`);
  }

  const data = await response.json();
  dataCache.set(gameType, data);
  return data;
}

export function createWerewolfDeck(config, random = Math.random) {
  if (!config || typeof config !== 'object') {
    throw new TypeError('A role configuration is required');
  }

  const roles = Object.entries(config).flatMap(([role, count]) => {
    if (!Number.isInteger(count) || count < 0) {
      throw new TypeError(`Invalid role count for ${role}`);
    }
    return Array(count).fill(role);
  });

  return shuffle(roles, random);
}

export function getWerewolfRoleDescription(data, role) {
  if (!data || typeof data !== 'object') {
    throw new TypeError('Werewolf data is required');
  }
  if (typeof role !== 'string' || role.trim() === '') {
    throw new TypeError('A werewolf role is required');
  }

  const description = data.roleDescriptions?.[role];
  if (!description) {
    return null;
  }

  return {
    camp: description.camp,
    gameplay: description.gameplay,
    skill: description.skill,
  };
}

export function getUndercoverCount(playerCount) {
  if (!Number.isInteger(playerCount) || playerCount < 6 || playerCount > 15) {
    throw new RangeError('playerCount must be an integer between 6 and 15');
  }

  return Math.round((playerCount - 3) / 3);
}

export function createUndercoverRound(
  wordPairs,
  playerCount,
  undercoverCount = getUndercoverCount(playerCount),
  random = Math.random,
) {
  if (!Array.isArray(wordPairs) || wordPairs.length === 0) {
    throw new TypeError('At least one word pair is required');
  }
  if (!Number.isInteger(playerCount) || playerCount < 6 || playerCount > 15) {
    throw new RangeError('playerCount must be an integer between 6 and 15');
  }
  if (
    !Number.isInteger(undercoverCount)
    || undercoverCount < 1
    || undercoverCount >= playerCount
  ) {
    throw new RangeError('undercoverCount must be between 1 and playerCount - 1');
  }

  const pair = randomItem(wordPairs, random);
  const assignedWords = [
    ...Array(playerCount - undercoverCount).fill(pair.civilian),
    ...Array(undercoverCount).fill(pair.undercover),
  ];

  return {
    pair: { ...pair },
    assignedWords: shuffle(assignedWords, random),
  };
}

export function createCharadesDeck(categories, random = Math.random) {
  if (!categories || typeof categories !== 'object') {
    throw new TypeError('Charades categories are required');
  }

  const deck = Object.entries(categories).flatMap(([category, words]) => {
    validateCharadesWords(category, words);
    return words.map((word) => ({ category, word }));
  });
  return shuffle(deck, random);
}

export function getCharadesThemes(categories) {
  if (!categories || typeof categories !== 'object') {
    throw new TypeError('Charades categories are required');
  }

  return Object.entries(categories).map(([id, words]) => {
    validateCharadesWords(id, words);
    return {
      id,
      wordCount: words.length,
    };
  });
}

export function createCharadesThemeDeck(categories, selectedTheme, random = Math.random) {
  if (!categories || typeof categories !== 'object') {
    throw new TypeError('Charades categories are required');
  }
  if (typeof selectedTheme !== 'string' || selectedTheme.trim() === '') {
    throw new TypeError('A charades theme must be selected');
  }

  const words = categories[selectedTheme];
  if (!words) {
    throw new RangeError(`Unknown charades theme: ${selectedTheme}`);
  }
  validateCharadesWords(selectedTheme, words);

  return shuffle(
    words.map((word) => ({ category: selectedTheme, word })),
    random,
  );
}

export function createCharadesGameState(
  categories,
  selectedTheme,
  { duration = 120, random = Math.random } = {},
) {
  if (!Number.isInteger(duration) || duration <= 0) {
    throw new RangeError('Charades duration must be a positive integer');
  }

  return {
    status: 'idle',
    selectedTheme,
    duration,
    remainingSeconds: duration,
    deck: createCharadesThemeDeck(categories, selectedTheme, random),
    currentIndex: 0,
    score: 0,
    correctWords: [],
    passedWords: [],
  };
}

export function createCharadesSummary(state) {
  if (!state || typeof state !== 'object') {
    throw new TypeError('Charades state is required');
  }

  const correctWords = validateSummaryWords('correctWords', state.correctWords);
  const incorrectSource = state.incorrectWords ?? state.passedWords;
  const incorrectWords = validateSummaryWords('incorrectWords', incorrectSource);

  return {
    selectedTheme: state.selectedTheme ?? null,
    score: correctWords.length,
    correctCount: correctWords.length,
    incorrectCount: incorrectWords.length,
    totalAnswered: correctWords.length + incorrectWords.length,
    correctWords: [...correctWords],
    incorrectWords: [...incorrectWords],
  };
}

export function recordCharadesResult(result, storage) {
  const previous = loadGameState('charades-record', storage) ?? { bestScore: 0, gamesPlayed: 0 };
  const record = {
    bestScore: Math.max(previous.bestScore ?? 0, result.score),
    gamesPlayed: (previous.gamesPlayed ?? 0) + 1,
    lastScore: result.score,
    lastPlayedAt: new Date().toISOString(),
  };
  saveGameState('charades-record', record, storage);
  return record;
}

export function getCharadesRecord(storage) {
  return loadGameState('charades-record', storage) ?? { bestScore: 0, gamesPlayed: 0 };
}

export function saveProgress(gameType, state, storage) {
  return saveGameState(`${gameType}-progress`, state, storage);
}

function validateCharadesWords(category, words) {
  if (!Array.isArray(words) || words.length === 0) {
    throw new TypeError(`Charades theme ${category} must contain words`);
  }
  if (words.some((word) => typeof word !== 'string' || word.trim() === '')) {
    throw new TypeError(`Charades theme ${category} contains an invalid word`);
  }
}

function validateSummaryWords(fieldName, words) {
  if (!Array.isArray(words)) {
    throw new TypeError(`${fieldName} must be an array`);
  }
  if (words.some((word) => typeof word !== 'string' || word.trim() === '')) {
    throw new TypeError(`${fieldName} contains an invalid word`);
  }
  return words;
}
