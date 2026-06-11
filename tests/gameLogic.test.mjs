import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  createCharadesDeck,
  createCharadesGameState,
  createCharadesSummary,
  createCharadesThemeDeck,
  createUndercoverRound,
  createWerewolfDeck,
  getCharadesRecord,
  getCharadesThemes,
  getUndercoverCount,
  getWerewolfRoleDescription,
  loadGameData,
  recordCharadesResult,
} from '../js/gameLogic.js';

async function readJson(relativePath) {
  const content = await readFile(new URL(relativePath, import.meta.url), 'utf8');
  return JSON.parse(content);
}

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

test('createWerewolfDeck supports the 15-player standard configuration', () => {
  const config = {
    狼人: 5,
    预言家: 1,
    女巫: 1,
    猎人: 1,
    守卫: 1,
    白痴: 1,
    平民: 5,
  };
  const deck = createWerewolfDeck(config, () => 0);

  assert.equal(deck.length, 15);
  assert.equal(deck.filter((role) => role === '狼人').length, 5);
  assert.equal(deck.filter((role) => role === '平民').length, 5);
});

test('createWerewolfDeck supports every current 6-15 player config', async () => {
  const data = await readJson('../game-data/werewolf.json');

  Object.entries(data.playerConfigs).forEach(([playerCount, config]) => {
    const deck = createWerewolfDeck(config, () => 0.5);
    const actualCounts = {};

    deck.forEach((role) => {
      actualCounts[role] = (actualCounts[role] ?? 0) + 1;
    });

    assert.equal(deck.length, Number(playerCount));
    assert.deepEqual(actualCounts, config);
  });
});

test('getWerewolfRoleDescription returns display data without exposing the source object', () => {
  const data = {
    roleDescriptions: {
      预言家: {
        camp: '好人阵营',
        gameplay: '根据查验结果寻找狼人。',
        skill: '每晚查验一名玩家。',
      },
    },
  };
  const description = getWerewolfRoleDescription(data, '预言家');

  assert.deepEqual(description, data.roleDescriptions['预言家']);
  assert.notStrictEqual(description, data.roleDescriptions['预言家']);
  assert.equal(getWerewolfRoleDescription(data, '未知角色'), null);
});

test('createUndercoverRound assigns the requested number of undercover words', () => {
  const pairs = [{ civilian: '苹果', undercover: '梨' }];
  const round = createUndercoverRound(pairs, 7, 2, () => 0);

  assert.equal(round.assignedWords.length, 7);
  assert.equal(round.assignedWords.filter((word) => word === '梨').length, 2);
  assert.equal(round.assignedWords.filter((word) => word === '苹果').length, 5);
});

test('getUndercoverCount maps every supported player count proportionally', () => {
  const expectedCounts = {
    6: 1,
    7: 1,
    8: 2,
    9: 2,
    10: 2,
    11: 3,
    12: 3,
    13: 3,
    14: 4,
    15: 4,
  };

  Object.entries(expectedCounts).forEach(([playerCount, undercoverCount]) => {
    assert.equal(getUndercoverCount(Number(playerCount)), undercoverCount);
  });
  assert.throws(() => getUndercoverCount(5), RangeError);
  assert.throws(() => getUndercoverCount(16), RangeError);
});

test('createUndercoverRound uses the mapped undercover count by default', () => {
  const pairs = [{ civilian: '苹果', undercover: '梨' }];
  const round = createUndercoverRound(pairs, 12, undefined, () => 0);

  assert.equal(round.assignedWords.length, 12);
  assert.equal(round.assignedWords.filter((word) => word === '梨').length, 3);
  assert.equal(round.assignedWords.filter((word) => word === '苹果').length, 9);
});

test('createUndercoverRound supports the current word bank for all player counts', async () => {
  const data = await readJson('../game-data/undercover.json');
  const originalPairs = structuredClone(data.wordPairs);

  for (let playerCount = 6; playerCount <= 15; playerCount += 1) {
    const round = createUndercoverRound(
      data.wordPairs,
      playerCount,
      undefined,
      () => 0.5,
    );
    const expectedUndercoverCount = getUndercoverCount(playerCount);

    assert.equal(round.assignedWords.length, playerCount);
    assert.equal(
      round.assignedWords.filter((word) => word === round.pair.undercover).length,
      expectedUndercoverCount,
    );
    assert.equal(
      round.assignedWords.filter((word) => word === round.pair.civilian).length,
      playerCount - expectedUndercoverCount,
    );
  }

  assert.deepEqual(data.wordPairs, originalPairs);
});

test('createUndercoverRound rejects unsupported player counts and empty data', () => {
  const pairs = [{ civilian: 'A', undercover: 'B' }];

  assert.throws(() => createUndercoverRound(pairs, 5), RangeError);
  assert.throws(() => createUndercoverRound(pairs, 16), RangeError);
  assert.throws(() => createUndercoverRound([], 6), TypeError);
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

test('getCharadesThemes returns theme ids and word counts', () => {
  const themes = getCharadesThemes({
    film_tv: ['功夫', '甄嬛传'],
    animals: ['熊猫'],
  });

  assert.deepEqual(themes, [
    { id: 'film_tv', wordCount: 2 },
    { id: 'animals', wordCount: 1 },
  ]);
});

test('createCharadesThemeDeck includes only the selected theme', () => {
  const categories = {
    film_tv: ['功夫', '甄嬛传'],
    animals: ['熊猫', '企鹅'],
  };
  const deck = createCharadesThemeDeck(categories, 'animals', () => 0);

  assert.equal(deck.length, 2);
  assert.equal(deck.every(({ category }) => category === 'animals'), true);
  assert.deepEqual(
    new Set(deck.map(({ word }) => word)),
    new Set(['熊猫', '企鹅']),
  );
  assert.throws(
    () => createCharadesThemeDeck(categories, 'unknown'),
    RangeError,
  );
});

test('createCharadesThemeDeck builds every current theme without mutation', async () => {
  const data = await readJson('../game-data/charades.json');
  const originalCategories = structuredClone(data.categories);

  Object.entries(data.categories).forEach(([theme, words]) => {
    const deck = createCharadesThemeDeck(data.categories, theme, () => 0.5);

    assert.equal(deck.length, words.length);
    assert.equal(deck.every(({ category }) => category === theme), true);
    assert.deepEqual(
      new Set(deck.map(({ word }) => word)),
      new Set(words),
    );
  });

  assert.deepEqual(data.categories, originalCategories);
});

test('createCharadesGameState resets score and answer history for a theme', () => {
  const state = createCharadesGameState(
    { food: ['火锅', '烤鸭'] },
    'food',
    { duration: 180, random: () => 0 },
  );

  assert.equal(state.selectedTheme, 'food');
  assert.equal(state.duration, 180);
  assert.equal(state.remainingSeconds, 180);
  assert.equal(state.currentIndex, 0);
  assert.equal(state.score, 0);
  assert.deepEqual(state.correctWords, []);
  assert.deepEqual(state.passedWords, []);
  assert.equal(state.deck.length, 2);
});

test('createCharadesSummary reports correct and incorrect counts with words', () => {
  const summary = createCharadesSummary({
    selectedTheme: 'animals',
    score: 99,
    correctWords: ['熊猫', '企鹅'],
    passedWords: ['长颈鹿', '袋鼠', '海豚'],
  });

  assert.deepEqual(summary, {
    selectedTheme: 'animals',
    score: 2,
    correctCount: 2,
    incorrectCount: 3,
    totalAnswered: 5,
    correctWords: ['熊猫', '企鹅'],
    incorrectWords: ['长颈鹿', '袋鼠', '海豚'],
  });
});

test('createCharadesSummary supports the explicit incorrectWords field', () => {
  const summary = createCharadesSummary({
    selectedTheme: 'sports',
    correctWords: ['basketball'],
    incorrectWords: ['football', 'badminton'],
  });

  assert.deepEqual(summary, {
    selectedTheme: 'sports',
    score: 1,
    correctCount: 1,
    incorrectCount: 2,
    totalAnswered: 3,
    correctWords: ['basketball'],
    incorrectWords: ['football', 'badminton'],
  });
});

test('charades state and summary reject invalid inputs', () => {
  const categories = { food: ['hotpot'] };

  assert.throws(
    () => createCharadesGameState(categories, 'unknown'),
    RangeError,
  );
  assert.throws(
    () => createCharadesGameState(categories, 'food', { duration: 0 }),
    RangeError,
  );
  assert.throws(
    () => createCharadesSummary({ correctWords: 'hotpot', passedWords: [] }),
    TypeError,
  );
});

test('createCharadesSummary returns independent word arrays', () => {
  const state = {
    correctWords: ['篮球'],
    passedWords: ['足球'],
  };
  const summary = createCharadesSummary(state);

  summary.correctWords.push('排球');
  summary.incorrectWords.push('网球');

  assert.deepEqual(state.correctWords, ['篮球']);
  assert.deepEqual(state.passedWords, ['足球']);
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
