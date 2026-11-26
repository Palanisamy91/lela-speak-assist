import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyOnlineTense } from '../src/app/lela/online-tense-classifier';

test('classifies clear online examples into the 12 tense pools', () => {
  const cases: Array<[string, string]> = [
    ['I work every day.', 'present-simple'],
    ['I am working now.', 'present-continuous'],
    ['I have finished my work.', 'present-perfect'],
    ['I have been working for two hours.', 'present-perfect-continuous'],
    ['I worked yesterday.', 'past-simple'],
    ['I was working at eight.', 'past-continuous'],
    ['I had finished before he arrived.', 'past-perfect'],
    ['I had been working for two hours before lunch.', 'past-perfect-continuous'],
    ['I will call you tomorrow.', 'future-simple'],
    ['I will be working at ten.', 'future-continuous'],
    ['I will have finished by Monday.', 'future-perfect'],
    ['I will have been working here for a year by June.', 'future-perfect-continuous'],
  ];
  for (const [sentence, expected] of cases) assert.equal(classifyOnlineTense(sentence), expected, sentence);
});

test('does not force unclear clauses into a tense pool', () => {
  assert.equal(classifyOnlineTense('I am happy.'), null);
  assert.equal(classifyOnlineTense('I have a new phone.'), null);
});
