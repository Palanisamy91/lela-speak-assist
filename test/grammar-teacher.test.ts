import test from 'node:test';
import assert from 'node:assert/strict';
import { teachSentence, diffMistakes } from '../src/app/lela/grammar-teacher';
import { cardFromTeacher, cardText } from '../src/app/lela/correction-card';
import { CorrectionService } from '../src/app/services/correction.service';

const base = new (CorrectionService as any)();
const teach = (s: string) => teachSentence(s, base.check(s).corrected);
const lines = (s: string) => teach(s).mistakes.map((m) => `${m.found} → ${m.replacement}`);

test('the three examples from the request', () => {
  let r = teach('She go to school yesterday.');
  assert.equal(r.corrected, 'She went to school yesterday.');
  assert.deepEqual(lines('She go to school yesterday.'), ['go → went']);
  assert.equal(r.tenseName, 'Past Simple');

  r = teach("He don't goes to office every day.");
  assert.equal(r.corrected, "He doesn't go to the office every day.");
  assert.deepEqual(lines("He don't goes to office every day."), ["don't → doesn't", 'goes → go', 'to office → to the office']);
  assert.equal(r.tenseName, 'Present Simple');

  r = teach('I am work in this company for five years.');
  assert.equal(r.corrected, 'I have been working in this company for five years.');
  assert.deepEqual(lines('I am work in this company for five years.'), ['am work → have been working']);
  assert.equal(r.tenseName, 'Present Perfect Continuous');
});

const TENSES: [string, string, string, string][] = [
  // tense, correct sentence, wrong sentence, expected correction
  ['Present Simple', 'She goes to school every day.', 'She go to school every day.', 'She goes to school every day.'],
  ['Present Continuous', 'They are playing cricket now.', 'They are play cricket now.', 'They are playing cricket now.'],
  ['Present Perfect', 'I have finished my homework.', 'I have finish my homework.', 'I have finished my homework.'],
  ['Present Perfect Continuous', 'I have been working here for five years.', 'I have been work here for five years.', 'I have been working here for five years.'],
  ['Past Simple', 'He visited his uncle yesterday.', 'He visit his uncle yesterday.', 'He visited his uncle yesterday.'],
  ['Past Continuous', 'We were watching TV when he came.', 'We were watch TV when he came.', 'We were watching TV when he came.'],
  ['Past Perfect', 'She had left before I arrived.', 'She had went before I arrived.', 'She had gone before I arrived.'],
  ['Past Perfect Continuous', 'They had been waiting for two hours.', 'They had been wait for two hours.', 'They had been waiting for two hours.'],
  ['Future Simple', 'I will call you tomorrow.', 'I will calls you tomorrow.', 'I will call you tomorrow.'],
  ['Future Continuous', 'She will be working at ten.', 'She will be work at ten.', 'She will be working at ten.'],
  ['Future Perfect', 'I will have finished by Monday.', 'I will have finish by Monday.', 'I will have finished by Monday.'],
  ['Future Perfect Continuous', 'By June I will have been working here for a year.', 'By June I will have been work here for a year.', 'By June I will have been working here for a year.'],
];

for (const [tense, ok, wrong, fixed] of TENSES) {
  test(`12 tenses: ${tense}: correct sentence is not flagged, wrong one is corrected`, () => {
    const good = teach(ok);
    assert.equal(good.correct, true, `false alarm on: ${ok} -> ${good.corrected}`);
    assert.equal(good.corrected, ok);              // the learner's sentence is kept as written
    assert.equal(good.tenseName, tense);
    const bad = teach(wrong);
    assert.equal(bad.correct, false, wrong);
    assert.equal(bad.original, wrong);             // original never replaced
    assert.equal(bad.corrected, fixed);
    assert.equal(bad.tenseName, tense);
    assert.ok(bad.mistakes.length >= 1);
  });
}

test('multiple mistakes in one sentence are all listed', () => {
  const r = teach('Yesterday I wake up early and go office.');
  assert.equal(r.corrected, 'Yesterday I woke up early and went to the office.');
  assert.deepEqual(r.mistakes.map((m) => `${m.found} → ${m.replacement}`), ['wake → woke', 'go office → went to the office']);
});

test('missing words, articles, prepositions, plurals, spelling, word order', () => {
  assert.equal(teach('I going to school.').corrected, 'I am going to school.');
  assert.equal(teach('I very happy.').corrected, 'I am very happy.');
  assert.equal(teach('I bought car yesterday.').corrected, 'I bought a car yesterday.');
  assert.equal(teach('She has two child.').corrected, 'She has two children.');
  assert.equal(teach('I have been here since five year.').correct, false);
  assert.equal(teach('I will meet you in Monday.').corrected, 'I will meet you on Monday.');
  assert.equal(teach('I wake up in night.').corrected.includes('at night'), true);
  assert.equal(teach('I recieve your mesage tommorow.').corrected.includes('receive'), true);
  assert.equal(teach('Where you are going?').corrected, 'Where are you going?');
  assert.equal(teach('I go always to temple.').corrected, 'I always go to the temple.');
  assert.equal(teach('I did not went there.').corrected, 'I did not go there.');
  assert.equal(teach('I leave to work at eight.').corrected, 'I leave for work at eight.');
  assert.equal(teach('I wash face every morning.').corrected, 'I wash my face every morning.');
});

test('correct sentences are never reported as wrong', () => {
  const ok = ['Are you going to the market?', 'Do you like tea?', 'Did you go there yesterday?', 'I have a car.', 'She works in an office.', 'He has been working here since 2020.',
    'I will be waiting for you.', 'I had breakfast at eight.', 'What are you doing?', 'I have work to do.', 'She is a doctor.', 'I like to read books.',
    'He has gone to the office.', 'I am studying English.', 'She will have finished by then.', 'The children were playing in the park.', 'I am tired.',
    'My father works at the bank.', 'We went to school together.', 'She wants to buy a phone.', 'I am happy to help you.'];
  for (const s of ok) { const r = teachSentence(s); assert.equal(r.correct, true, `${s} -> ${r.corrected}`); assert.equal(r.corrected, s); }
});

test('the original sentence is preserved in the card and the plain-text format is the short one', () => {
  const t = teach('She go to school yesterday.');
  const card = cardFromTeacher(t, 'said', true);
  assert.equal(card.said, 'She go to school yesterday.');
  assert.equal(card.label, 'said');
  assert.equal(cardText(card), 'You said: She go to school yesterday.\nMistakes: go → went\nCorrect sentence: She went to school yesterday.\nTense: Past Simple');
  const good = cardFromTeacher(teach('I like tea.'), 'wrote', false);
  assert.equal(cardText(good), 'You wrote: I like tea.\nCorrect! Excellent.');
});

test('diffMistakes ignores capital letters and punctuation', () => {
  assert.deepEqual(diffMistakes('yesterday i woke up early', 'Yesterday, I woke up early.'), []);
});
