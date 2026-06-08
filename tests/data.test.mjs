import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function readJson(relativePath) {
  const content = await readFile(new URL(relativePath, import.meta.url), 'utf8');
  return JSON.parse(content);
}

test('charades data contains at least 20 unique non-empty words', async () => {
  const data = await readJson('../game-data/charades.json');
  const words = Object.values(data.categories ?? {}).flat();

  assert.ok(words.length >= 20);
  assert.equal(words.every((word) => typeof word === 'string' && word.trim()), true);
  assert.equal(new Set(words).size, words.length);
});

test('undercover data contains at least 6 valid and unique word pairs', async () => {
  const data = await readJson('../game-data/undercover.json');
  const pairs = data.wordPairs ?? [];
  const pairKeys = pairs.map(({ civilian, undercover }) => `${civilian}\0${undercover}`);

  assert.ok(pairs.length >= 6);
  assert.equal(pairs.every(({ civilian, undercover }) => (
    typeof civilian === 'string'
    && civilian.trim()
    && typeof undercover === 'string'
    && undercover.trim()
    && civilian !== undercover
  )), true);
  assert.equal(new Set(pairKeys).size, pairs.length);
});

test('werewolf data provides complete 6-12 player configurations', async () => {
  const data = await readJson('../game-data/werewolf.json');

  for (let playerCount = 6; playerCount <= 12; playerCount += 1) {
    const config = data.playerConfigs?.[playerCount];
    assert.ok(config, `缺少 ${playerCount} 人配置`);
    assert.equal(
      Object.values(config).reduce((total, count) => total + count, 0),
      playerCount,
    );
    assert.ok((config['狼人'] ?? 0) >= 1);
    assert.ok((config['平民'] ?? 0) >= 1);
  }
});
