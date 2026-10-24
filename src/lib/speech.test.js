import test from 'node:test';
import assert from 'node:assert/strict';
import { chunkText } from './speech.js';
import { buildSilentWav } from './silence.js';

test('splits long copy into short sentence chunks so Chrome never hits its utterance cutoff', () => {
  const text = 'One sentence here. Two sentence here! Three sentence here? Four.';
  const chunks = chunkText(text, 20);
  assert.deepEqual(chunks, ['One sentence here.', 'Two sentence here!', 'Three sentence here?', 'Four.']);
  assert.ok(chunks.every((chunk) => chunk.length <= 20));
});

test('keeps short copy in a single chunk and drops empty input', () => {
  assert.deepEqual(chunkText('A short line.', 180), ['A short line.']);
  assert.deepEqual(chunkText('   ', 180), []);
  assert.deepEqual(chunkText(undefined, 180), []);
});

test('hard-wraps a runaway sentence at word boundaries', () => {
  const chunks = chunkText('word '.repeat(40).trim(), 40);
  assert.ok(chunks.length > 1);
  assert.ok(chunks.every((chunk) => chunk.length <= 40));
});

test('builds a looping silent WAV long enough for Chrome to keep audio focus', () => {
  const wav = buildSilentWav(6, 8000);
  const header = new TextDecoder().decode(wav.slice(0, 4));
  assert.equal(header, 'RIFF');
  assert.equal(wav.length, 44 + 6 * 8000);
  assert.equal(new DataView(wav.buffer).getUint32(24, true), 8000);
});

test('a long article stays one utterance when the engine can take it', () => {
  const article = 'This is a sentence about a model release. '.repeat(20).trim();
  const chunks = chunkText(article, 3200);
  assert.equal(chunks.length, 1);
  assert.ok(chunks[0].length > 500);
});
