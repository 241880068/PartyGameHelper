import assert from 'node:assert/strict';
import test from 'node:test';

import {
  clearGameState,
  loadGameState,
  saveGameState,
} from '../js/storage.js';

function createMemoryStorage() {
  const values = new Map();

  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    removeItem(key) {
      values.delete(key);
    },
  };
}

test('saveGameState stores serializable state', () => {
  const storage = createMemoryStorage();

  assert.equal(saveGameState('charades', { score: 2 }, storage), true);
  assert.deepEqual(loadGameState('charades', storage), { score: 2 });
});

test('different games use different storage keys', () => {
  const storage = createMemoryStorage();

  saveGameState('charades', { score: 3 }, storage);
  saveGameState('undercover', { totalPlayers: 6 }, storage);

  assert.deepEqual(loadGameState('charades', storage), { score: 3 });
  assert.deepEqual(loadGameState('undercover', storage), { totalPlayers: 6 });
});

test('loadGameState handles damaged JSON', () => {
  const storage = createMemoryStorage();
  storage.setItem('party-game-helper:charades', '{broken');

  assert.equal(loadGameState('charades', storage), null);
});

test('clearGameState removes one game state', () => {
  const storage = createMemoryStorage();
  saveGameState('charades', { score: 1 }, storage);

  assert.equal(clearGameState('charades', storage), true);
  assert.equal(loadGameState('charades', storage), null);
});

test('storage operations fail safely when storage is unavailable', () => {
  assert.equal(saveGameState('charades', {}, null), false);
  assert.equal(loadGameState('charades', null), null);
  assert.equal(clearGameState('charades', null), false);
});
