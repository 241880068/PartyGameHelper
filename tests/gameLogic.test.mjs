import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createCharadesDeck,
  createUndercoverRound,
  createWerewolfDeck,
  getCharadesRecord,
  loadGameData,
  recordCharadesResult,
} from '../js/gameLogic.js';

function createMemoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
}

test('createWerewolfDeck expands every configured role without mutation', () => {
  const config = { 狼人: 2, 预言家: 1, 平民: 3 };
  const deck = createWerewolfDeck(config, () => 0);

  assert.equal(deck.length, 6);
  assert.equal(deck.filter((role) => role === '狼人').length, 2);
  assert.deepEqual(config, { 狼人: 2, 预言家: 1, 平民: 3 });
});

test('createUndercoverRound assigns the requested number of undercover words', () => {
  const pairs = [{ civilian: '苹果', undercover: '梨' }];
  const round = createUndercoverRound(pairs, 7, 2, () => 0);

  assert.equal(round.assignedWords.length, 7);
  assert.equal(round.assignedWords.filter((word) => word === '梨').length, 2);
  assert.equal(round.assignedWords.filter((word) => word === '苹果').length, 5);
});

test('createCharadesDeck keeps category metadata and all words', () => {
  const deck = createCharadesDeck({
    animals: ['大象', '企鹅'],
    actions: ['游泳'],
  }, () => 0);

  assert.equal(deck.length, 3);
  assert.deepEqual(
    new Set(deck.map(({ category }) => category)),
    new Set(['animals', 'actions']),
  );
});

test('recordCharadesResult preserves the best score across rounds', () => {
  const storage = createMemoryStorage();

  recordCharadesResult({ score: 5 }, storage);
  const record = recordCharadesResult({ score: 3 }, storage);

  assert.equal(record.bestScore, 5);
  assert.equal(record.gamesPlayed, 2);
  assert.equal(getCharadesRecord(storage).lastScore, 3);
});

test('loadGameData validates game types and reads a successful response', async () => {
  const data = await loadGameData('undercover', async () => ({
    ok: true,
    json: async () => ({ wordPairs: [{ civilian: 'A', undercover: 'B' }] }),
  }));

  assert.equal(data.wordPairs.length, 1);
  await assert.rejects(() => loadGameData('unknown'), TypeError);
});
