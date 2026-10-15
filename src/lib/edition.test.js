import test from 'node:test';
import assert from 'node:assert/strict';
import { articleSpeechText, flattenArticles, sortEditions } from './edition.js';

const edition = {
  title: 'Sample paper',
  sections: [
    { id: 'ai', title: 'AI', articles: [
      { id: 'a1', title: 'First story', dek: 'A short deck.', summary: 'The first summary.' },
      { id: 'a2', title: 'Second story', summary: 'The second summary.' }
    ] },
    { id: 'politics', title: 'Politics', articles: [
      { id: 'p1', title: 'Third story', summary: 'The third summary.' }
    ] }
  ]
};

test('flattens articles in newspaper reading order with their section labels', () => {
  assert.deepEqual(flattenArticles(edition).map(({ id, sectionTitle }) => [id, sectionTitle]), [
    ['a1', 'AI'], ['a2', 'AI'], ['p1', 'Politics']
  ]);
});

test('prepares a spoken article without empty fields or source URLs', () => {
  assert.equal(articleSpeechText(edition.sections[0].articles[0]),
    'First story. A short deck. The first summary.');
});


test('keeps archived editions newest-first without mutating the source list', () => {
  const source = [
    { date: '2026-10-13', label: 'Yesterday' },
    { date: '2026-10-14', label: 'Today' },
  ];
  const sorted = sortEditions(source);
  assert.deepEqual(sorted.map(({ date }) => date), ['2026-10-14', '2026-10-13']);
  assert.equal(source[0].date, '2026-10-13');
});
