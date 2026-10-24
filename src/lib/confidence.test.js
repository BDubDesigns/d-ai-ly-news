import test from 'node:test';
import assert from 'node:assert/strict';
import { describeConfidence } from './confidence.js';

test('known levels carry their own label and note', () => {
  const high = describeConfidence({ confidence: { level: 'high', note: 'Two outlets and the filing.' } });
  assert.equal(high.short, 'High');
  assert.equal(high.note, 'Two outlets and the filing.');
});

test('missing confidence falls back to the medium default instead of breaking', () => {
  const fallback = describeConfidence({});
  assert.equal(fallback.level, 'medium');
  assert.match(fallback.note, /secondary reporting/);
});

test('unknown levels do not leak through', () => {
  assert.equal(describeConfidence({ confidence: { level: 'certain' } }).level, 'medium');
});
