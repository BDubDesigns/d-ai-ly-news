import test from 'node:test';
import assert from 'node:assert/strict';
import { addToQueue, removeFromQueue, toggleQueue, afterFinish } from './queue.js';

test('never adds the same article twice', () => {
  const once = addToQueue([], 'a1');
  assert.deepEqual(addToQueue(once, 'a1'), ['a1']);
  assert.deepEqual(once, ['a1']);
});

test('adds in the order the reader picked them', () => {
  assert.deepEqual(addToQueue(['a1'], 'a2'), ['a1', 'a2']);
});

test('toggling removes an article that is already queued', () => {
  assert.deepEqual(toggleQueue(['a1', 'a2'], 'a1'), ['a2']);
  assert.deepEqual(toggleQueue(['a1'], 'a3'), ['a1', 'a3']);
});

test('a finished article leaves the queue and the next one plays', () => {
  const result = afterFinish(['a1', 'a2', 'a3'], 'a1');
  assert.deepEqual(result, { queue: ['a2', 'a3'], playNext: true, keepPaused: false });
});

test('the last article stays put, paused, instead of vanishing', () => {
  const result = afterFinish(['a3'], 'a3');
  assert.deepEqual(result, { queue: [], playNext: false, keepPaused: true });
});

test('removing an upcoming article keeps the rest in order', () => {
  assert.deepEqual(removeFromQueue(['a1', 'a2', 'a3'], 'a2'), ['a1', 'a3']);
  assert.deepEqual(removeFromQueue(['a1'], 'zzz'), ['a1']);
});
