import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import type { Manifest, Sentence } from '../src/app/models/learning.models';
import { buildTensePracticePools, buildTranslationPracticePools } from '../src/app/lela/practice-sentence-library';
import { TENSE_LESSONS } from '../src/app/lela/tense-data';

const topicNames = [
  'Daily life', 'Shopping', 'Friends & Family', 'Workplace', 'Travel', 'Restaurant',
  'Job Interview', 'Telephone', 'Hotel', 'Everyday Practice – Extra',
];

async function loadCategories(): Promise<{ id: string; sentences: Sentence[] }[]> {
  const manifest = JSON.parse(await readFile('public/data/manifest.json', 'utf8')) as Manifest;
  return Promise.all(manifest.sentenceCategories.map(async category => ({
    id: category.id,
    sentences: JSON.parse(await readFile(`public/data/${category.file}`, 'utf8')) as Sentence[],
  })));
}

test('Tamil-to-English library uses 2,000 unique existing pairs across the current topics', async () => {
  const categories = await loadCategories();
  const starter = Object.fromEntries(topicNames.map(topic => [topic, []]));
  const pools = buildTranslationPracticePools(categories, starter);
  const items = Object.values(pools).flat();
  assert.equal(items.length, 2000);
  assert.equal(new Set(items.map(item => item.ta.normalize('NFKC').replace(/[^\p{L}\p{N}\p{M}]/gu, '').toLowerCase())).size, items.length);
  assert.ok(items.every(item => item.ta.trim() && item.answers.some(answer => answer.trim())));
});

test('tense library uses all available unique existing pairs and retains all 12 tense choices', async () => {
  const categories = await loadCategories();
  const starter = Object.fromEntries(TENSE_LESSONS.map(lesson => [lesson.id, lesson.tamil]));
  const pools = buildTensePracticePools(categories, starter);
  const items = Object.values(pools).flat();
  assert.equal(Object.keys(pools).length, 12);
  assert.ok(items.length >= 2000);
  assert.equal(new Set(items.map(item => item.ta.normalize('NFKC').replace(/[^\p{L}\p{N}\p{M}]/gu, '').toLowerCase())).size, items.length);
  assert.ok(items.every(item => item.ta.trim() && item.model.trim()));
});
