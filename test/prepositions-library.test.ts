import test from 'node:test';
import assert from 'node:assert/strict';
import { PREPOSITION_LESSONS } from '../src/app/lela/preposition-data';

test('preposition practice has a complete mixed bank with examples and questions', () => {
  assert.ok(PREPOSITION_LESSONS.length >= 40);
  const words = PREPOSITION_LESSONS.map((lesson) => lesson.word.toLowerCase());
  assert.equal(new Set(words).size, words.length, 'preposition words must be unique');
  for (const lesson of PREPOSITION_LESSONS) {
    assert.ok(lesson.tamil.trim(), `${lesson.word} needs a Tamil meaning`);
    assert.ok(lesson.usage.trim(), `${lesson.word} needs an English usage note`);
    assert.ok(lesson.usageTa.trim(), `${lesson.word} needs a Tamil usage note`);
    assert.ok(lesson.examples.length >= 2, `${lesson.word} needs examples`);
    assert.ok(lesson.questions.length >= 2, `${lesson.word} needs practice questions`);
    for (const question of lesson.questions) {
      assert.ok(question.blank.includes('____'), `${lesson.word} question needs a blank`);
      assert.ok(question.full.trim(), `${lesson.word} question needs a complete answer`);
      assert.ok(question.answers.length > 0, `${lesson.word} question needs an accepted answer`);
    }
  }
});
