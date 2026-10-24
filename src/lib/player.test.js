import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlayer } from './player.js';

const articles = [
  { id: 'a1', title: 'First story', summary: 'Alpha beta gamma delta.' },
  { id: 'a2', title: 'Second story', summary: 'Epsilon zeta.' },
];

function harness({ auto = false } = {}) {
  const spoken = [];
  const changes = [];
  const keepAlive = { starts: 0, stops: 0, start() { this.starts += 1; }, stop() { this.stops += 1; } };
  const synth = {
    cancelled: 0,
    pausedWithApi: 0,
    resumedWithApi: 0,
    last: null,
    cancel() { this.cancelled += 1; this.last = null; },
    speak(utterance) { this.last = utterance; spoken.push(utterance.text); if (auto) utterance.onend(); },
    pause() { this.pausedWithApi += 1; },
    resume() { this.resumedWithApi += 1; },
  };
  class FakeUtterance { constructor(text) { this.text = text; } }
  const player = createPlayer({
    speech: synth,
    Utterance: FakeUtterance,
    keepAlive,
    schedule: (run) => run(),
    onChange: (snapshot) => changes.push(snapshot),
  });
  return { player, spoken, changes, synth, keepAlive };
}

test('speaks every chunk and finishes the edition', () => {
  const { player, spoken, changes } = harness({ auto: true });
  player.play(articles, 'edition');
  assert.equal(player.getStatus(), 'finished');
  assert.equal(changes.at(-1).status, 'finished');
  assert.ok(spoken.length >= 2);
  assert.ok(spoken[0].startsWith('First story'));
  assert.ok(spoken.some((line) => line.includes('Epsilon') || line.includes('Second')));
});

test('pause stops speech and resume continues from the last spoken word', () => {
  const { player, spoken, synth } = harness();
  player.play(articles, 'edition');
  const first = synth.last;
  first.onboundary({ charIndex: 12 });

  assert.equal(player.pause(), true);
  assert.equal(player.getStatus(), 'paused');
  assert.ok(synth.cancelled >= 1);

  const before = spoken.length;
  assert.equal(player.resume(), true);
  assert.equal(player.getStatus(), 'speaking');
  assert.equal(spoken.length, before + 1);
  const rest = synth.last.text;
  assert.ok(rest.length > 0 && rest.length < first.text.length, 'resumed mid-chunk, not from the start');
});

test('never calls the browser pause() API that Chrome for Android implements as cancel', () => {
  const { player, synth } = harness();
  player.play(articles, 'edition');
  player.pause();
  player.resume();
  assert.equal(synth.pausedWithApi, 0);
  assert.equal(synth.resumedWithApi, 0);
});

test('holds a keep-alive media session only while audio should be running', () => {
  const { player, keepAlive } = harness();
  player.play(articles, 'edition');
  assert.equal(keepAlive.starts, 1);
  player.pause();
  assert.equal(keepAlive.stops, 1);
  player.resume();
  assert.equal(keepAlive.starts, 2);
  player.stop();
  assert.equal(keepAlive.stops, 2);
  assert.equal(player.getStatus(), 'idle');
});

test('a dropped background session can be resumed instead of freezing the controls', () => {
  const { player, changes } = harness();
  player.play(articles, 'edition');
  player.interrupt('Playback paused in the background.');
  assert.equal(player.getStatus(), 'paused');
  assert.equal(changes.at(-1).message, 'Playback paused in the background.');
  assert.equal(player.resume(), true);
  assert.equal(player.getStatus(), 'speaking');
});

test('skip moves to another story and stop clears everything', () => {
  const { player, synth } = harness();
  player.play(articles, 'edition');
  assert.equal(player.skip(1), true);
  assert.ok(synth.last.text.startsWith('Second story'));
  player.stop();
  assert.equal(player.getStatus(), 'idle');
  assert.equal(player.skip(1), false);
});
