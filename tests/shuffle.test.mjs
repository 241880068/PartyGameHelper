import assert from 'node:assert/strict';
import test from 'node:test';

import { randomItem, shuffle } from '../js/utils/shuffle.js';

test('shuffle returns a new array without changing the source', () => {
  const source = ['a', 'b', 'c', 'd'];
  const result = shuffle(source, () => 0);

  assert.deepEqual(source, ['a', 'b', 'c', 'd']);
  assert.notStrictEqual(result, source);
  assert.deepEqual([...result].sort(), [...source].sort());
});

test('shuffle handles empty and single-item arrays', () => {
  assert.deepEqual(shuffle([]), []);
  assert.deepEqual(shuffle(['only']), ['only']);
});

test('shuffle rejects non-array input', () => {
  assert.throws(() => shuffle('abc'), TypeError);
});

test('randomItem returns a deterministic item with an injected random source', () => {
  assert.equal(randomItem(['a', 'b', 'c'], () => 0), 'a');
  assert.equal(randomItem(['a', 'b', 'c'], () => 0.99), 'c');
  assert.equal(randomItem([], () => 0), undefined);
});
