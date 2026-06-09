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

export function createUndercoverRound(wordPairs, playerCount, undercoverCount = 1, random = Math.random) {
  if (!Array.isArray(wordPairs) || wordPairs.length === 0) {
    throw new TypeError('At least one word pair is required');
  }
  if (!Number.isInteger(playerCount) || playerCount < 4) {
    throw new RangeError('playerCount must be at least 4');
  }
  if (!Number.isInteger(undercoverCount) || undercoverCount < 1 || undercoverCount >= playerCount) {
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

  const deck = Object.entries(categories).flatMap(([category, words]) => (
    words.map((word) => ({ category, word }))
  ));
  return shuffle(deck, random);
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
