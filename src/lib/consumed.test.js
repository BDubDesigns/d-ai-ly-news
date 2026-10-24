import test from 'node:test';
import assert from 'node:assert/strict';
import { isConsumed, markConsumed, unmarkConsumed, reachedThreshold, tally } from './consumed.js';

test('marking is idempotent and reversible', () => {
  const once = markConsumed([], 'a1');
  assert.deepEqual(once, ['a1']);
  assert.deepEqual(markConsumed(once, 'a1'), ['a1']);
  assert.deepEqual(unmarkConsumed(once, 'a1'), []);
  assert.equal(isConsumed(once, 'a1'), true);
});

test('auto consume fires only after three quarters of the article', () => {
  assert.equal(reachedThreshold(1, 4), false);
  assert.equal(reachedThreshold(2, 4), false);
  assert.equal(reachedThreshold(3, 4), true);
  assert.equal(reachedThreshold(4, 4), true);
});

test('a single chunk counts once it finishes, not when it starts', () => {
  assert.equal(reachedThreshold(0, 1), false);
  assert.equal(reachedThreshold(1, 1), true);
});

test('missing data never marks anything consumed', () => {
  assert.equal(reachedThreshold(0, 0), false);
  assert.equal(reachedThreshold(5, 0), false);
});

test('tally never goes negative', () => {
  assert.deepEqual(tally(['a1', 'a2'], 4), { consumed: 2, total: 4, remaining: 2 });
  assert.deepEqual(tally(['a1', 'a2', 'a3'], 2), { consumed: 3, total: 2, remaining: 0 });
});
