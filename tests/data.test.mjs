import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';

async function readJson(relativePath) {
  const content = await readFile(new URL(relativePath, import.meta.url), 'utf8');
  return JSON.parse(content);
}

test('charades data contains exactly the five phase-two themes', async () => {
  const data = await readJson('../game-data/charades.json');
  const expectedThemes = ['film_tv', 'sports', 'food', 'celebrities', 'animals'];

  assert.deepEqual(Object.keys(data.categories ?? {}), expectedThemes);
});

test('charades theme sizes match the current phase-two word bank', async () => {
  const data = await readJson('../game-data/charades.json');
  const actualSizes = Object.fromEntries(
    Object.entries(data.categories).map(([theme, words]) => [theme, words.length]),
  );

  assert.deepEqual(actualSizes, {
    film_tv: 134,
    sports: 99,
    food: 99,
    celebrities: 284,
    animals: 100,
  });
});

test('every charades theme has at least 10 unique non-empty words', async () => {
  const data = await readJson('../game-data/charades.json');

  Object.entries(data.categories).forEach(([theme, words]) => {
    assert.ok(words.length >= 10, `${theme} 词语不足 10 个`);
    assert.equal(
      words.every((word) => typeof word === 'string' && word.trim()),
      true,
      `${theme} 包含空词语`,
    );
    assert.equal(new Set(words).size, words.length, `${theme} 包含重复词语`);
  });
});

test('charades words are not duplicated across themes', async () => {
  const data = await readJson('../game-data/charades.json');
  const seen = new Map();
  const duplicates = [];

  Object.entries(data.categories).forEach(([theme, words]) => {
    words.forEach((word) => {
      if (seen.has(word)) {
        duplicates.push(`${word}: ${seen.get(word)} / ${theme}`);
      } else {
        seen.set(word, theme);
      }
    });
  });

  assert.deepEqual(duplicates, []);
});

test('undercover data contains all 60 valid and unique word pairs', async () => {
  const data = await readJson('../game-data/undercover.json');
  const pairs = data.wordPairs ?? [];
  const pairKeys = pairs.map(({ civilian, undercover }) => `${civilian}\0${undercover}`);
  const allWords = pairs.flatMap(({ civilian, undercover }) => [civilian, undercover]);

  assert.equal(pairs.length, 60);
  assert.equal(pairs.every(({ civilian, undercover }) => (
    typeof civilian === 'string'
    && civilian.trim()
    && typeof undercover === 'string'
    && undercover.trim()
    && civilian !== undercover
  )), true);
  assert.equal(new Set(pairKeys).size, pairs.length);
  assert.equal(new Set(allWords).size, allWords.length);
});

test('undercover entries contain only supported fields', async () => {
  const data = await readJson('../game-data/undercover.json');

  data.wordPairs.forEach((pair) => {
    assert.deepEqual(Object.keys(pair).sort(), ['civilian', 'undercover']);
  });
});

test('werewolf data provides complete 6-15 player configurations', async () => {
  const data = await readJson('../game-data/werewolf.json');

  for (let playerCount = 6; playerCount <= 15; playerCount += 1) {
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

test('werewolf standard configurations match the phase-two specification', async () => {
  const data = await readJson('../game-data/werewolf.json');
  const expectedConfigs = {
    6: { 狼人: 2, 预言家: 1, 女巫: 1, 平民: 2 },
    7: { 狼人: 2, 预言家: 1, 女巫: 1, 猎人: 1, 平民: 2 },
    8: { 狼人: 2, 预言家: 1, 女巫: 1, 猎人: 1, 平民: 3 },
    9: { 狼人: 3, 预言家: 1, 女巫: 1, 猎人: 1, 平民: 3 },
    10: { 狼人: 3, 预言家: 1, 女巫: 1, 猎人: 1, 白痴: 1, 平民: 3 },
    11: { 狼人: 3, 预言家: 1, 女巫: 1, 猎人: 1, 守卫: 1, 平民: 4 },
    12: { 狼人: 4, 预言家: 1, 女巫: 1, 猎人: 1, 守卫: 1, 平民: 4 },
    13: { 狼人: 4, 预言家: 1, 女巫: 1, 猎人: 1, 守卫: 1, 丘比特: 1, 平民: 4 },
    14: { 狼人: 4, 预言家: 1, 女巫: 1, 猎人: 1, 守卫: 1, 白痴: 1, 平民: 5 },
    15: { 狼人: 5, 预言家: 1, 女巫: 1, 猎人: 1, 守卫: 1, 白痴: 1, 平民: 5 },
  };

  assert.deepEqual(data.playerConfigs, expectedConfigs);
});

test('werewolf configurations use positive integer role counts', async () => {
  const data = await readJson('../game-data/werewolf.json');

  Object.values(data.playerConfigs).forEach((config) => {
    Object.values(config).forEach((count) => {
      assert.equal(Number.isInteger(count) && count > 0, true);
    });
  });
});

test('werewolf data provides concise descriptions for every configured role', async () => {
  const data = await readJson('../game-data/werewolf.json');
  const configuredRoles = new Set(
    Object.values(data.playerConfigs).flatMap((config) => Object.keys(config)),
  );

  configuredRoles.forEach((role) => {
    const description = data.roleDescriptions?.[role];
    assert.ok(description, `缺少 ${role} 的角色介绍`);

    ['camp', 'gameplay', 'skill'].forEach((field) => {
      const value = description[field];
      assert.equal(
        typeof value === 'string' && value.trim().length > 0,
        true,
        `${role}.${field} 不能为空`,
      );
    });

    assert.ok(description.camp.length <= 10, `${role} 阵营名称过长`);
    assert.ok(description.gameplay.length <= 50, `${role} 玩法说明过长`);
    assert.ok(description.skill.length <= 50, `${role} 技能说明过长`);
  });
});

test('werewolf data includes the supported idiot role description', async () => {
  const data = await readJson('../game-data/werewolf.json');

  assert.ok(data.roleDescriptions?.['白痴']);
});

test('werewolf role descriptions expose only the display contract fields', async () => {
  const data = await readJson('../game-data/werewolf.json');

  Object.values(data.roleDescriptions).forEach((description) => {
    assert.deepEqual(
      Object.keys(description).sort(),
      ['camp', 'gameplay', 'skill'],
    );
  });
});

test('werewolf data includes descriptions for phase-two special roles', async () => {
  const data = await readJson('../game-data/werewolf.json');
  const specialRoles = ['丘比特', '狼王', '白狼王', '隐狼', '狼美人'];

  specialRoles.forEach((role) => {
    const description = data.roleDescriptions?.[role];
    assert.ok(description, `缺少 ${role} 的角色介绍`);
    assert.ok(description.camp);
    assert.ok(description.gameplay);
    assert.ok(description.skill);
  });
});

test('every configured werewolf role image asset is available', async () => {
  const filenames = [
    'werewolf.jpg',
    'seer.jpg',
    'witch.jpg',
    'hunter.jpg',
    'guard.jpg',
    'idiot.jpg',
    'villager.jpg',
    '丘比特.jpg',
  ];

  await Promise.all(filenames.map((filename) => (
    access(new URL(`../wolfcard/${filename}`, import.meta.url))
  )));
});
