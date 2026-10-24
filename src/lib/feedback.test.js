import test from 'node:test';
import assert from 'node:assert/strict';
import { upsertFeedback, summarize, feedbackBrief } from './feedback.js';

test('one verdict per article per day, latest wins', () => {
  let entries = upsertFeedback([], { date: '2026-10-24', articleId: 'a1', verdict: 'like' });
  entries = upsertFeedback(entries, { date: '2026-10-24', articleId: 'a1', verdict: 'dislike' });
  assert.equal(entries.length, 1);
  assert.equal(entries[0].verdict, 'dislike');
});

test('different days keep their own history', () => {
  let entries = upsertFeedback([], { date: '2026-10-23', articleId: 'a1', verdict: 'like' });
  entries = upsertFeedback(entries, { date: '2026-10-24', articleId: 'a1', verdict: 'dislike' });
  assert.equal(entries.length, 2);
});

test('summarizes verdicts and keeps only real comments', () => {
  const entries = [
    { date: 'd1', articleId: 'a1', verdict: 'like', comment: 'More local stuff like this.' },
    { date: 'd1', articleId: 'a2', verdict: 'dislike', comment: '   ' },
  ];
  const result = summarize(entries);
  assert.deepEqual(result.liked, ['a1']);
  assert.deepEqual(result.disliked, ['a2']);
  assert.deepEqual(result.comments, ['More local stuff like this.']);
});

test('feedback brief is readable by a daily writing prompt', () => {
  const brief = feedbackBrief([
    { date: '2026-10-24', verdict: 'like', title: 'A story', sectionId: 'ai', comment: 'Great pick' },
  ]);
  assert.match(brief, /liked "A story" \(ai\) - "Great pick"/);
  assert.equal(feedbackBrief([]), 'No feedback yet.');
});
