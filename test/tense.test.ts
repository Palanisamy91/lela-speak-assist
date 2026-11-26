import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TENSE_LESSONS } from '../src/app/lela/tense-data';
import { detectTenses, mainTense, usesTense } from '../src/app/lela/tense-check';

test('12 tenses, each with six examples, structures and Tamil', () => {
  assert.equal(TENSE_LESSONS.length, 12);
  assert.equal(new Set(TENSE_LESSONS.map((l) => l.id)).size, 12);
  for (const l of TENSE_LESSONS) {
    assert.equal(l.examples.length, 6, l.id);
    assert.ok(l.structure && l.positive && l.negative && l.question && l.usage && l.usageTa, l.id);
    for (const e of l.examples) assert.ok(/[஀-௿]/.test(e.ta), `${l.id} Tamil: ${e.en}`);
    assert.ok(l.prompts.length >= 6 && l.tamil.length >= 6, l.id);
  }
});

test('every example, model translation is detected as its own tense', () => {
  const bad: string[] = [];
  for (const l of TENSE_LESSONS) {
    const sentences = [...l.examples.map((e) => e.en), ...l.tamil.map((t) => t.model)];
    for (const s of sentences) if (mainTense(s) !== l.id) bad.push(`${l.id}: "${s}" -> ${mainTense(s)}`);
  }
  assert.deepEqual(bad, []);
});

test('other tenses are not accepted', () => {
  assert.equal(usesTense('I visited my friend yesterday.', 'present-perfect').matches, false);
  assert.equal(usesTense('I visited my friend yesterday.', 'past-simple').matches, true);
  assert.equal(usesTense('I have visited Chennai.', 'past-simple').detected, 'present-perfect');
  assert.equal(usesTense("I'll call you tomorrow", 'future-simple').matches, true);
  assert.equal(usesTense('I am going to call him', 'future-simple').matches, true);
  assert.equal(usesTense('She is going to school', 'present-continuous').matches, true);
  assert.equal(usesTense('The film is interesting', 'present-simple').matches, true);
  assert.equal(usesTense('I have red hair', 'present-simple').matches, true);
  assert.equal(usesTense('I read every day', 'present-simple').matches, true);
  assert.equal(usesTense('I had breakfast', 'past-simple').matches, true);
  assert.equal(usesTense("She's been working here", 'present-perfect-continuous').matches, true);
  assert.equal(usesTense("I'd eaten before he came", 'past-perfect').matches, true);
  assert.equal(usesTense('Have you finished your work?', 'present-perfect').matches, true);
  assert.equal(usesTense('How long have you been learning English?', 'present-perfect-continuous').matches, true);
  assert.equal(usesTense('Will you have finished by Friday?', 'future-perfect').matches, true);
  assert.equal(usesTense('Did you call her?', 'past-simple').matches, true);
  assert.equal(usesTense('Does she drink tea?', 'present-simple').matches, true);
  assert.equal(usesTense('Were you watching TV?', 'past-continuous').matches, true);
  assert.ok(detectTenses('').length === 0);
});
