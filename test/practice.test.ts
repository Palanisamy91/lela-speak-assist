import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CorrectionService } from '../src/app/services/correction.service';
import { PREPOSITION_LESSONS, mergeExtraPrepositions } from '../src/app/lela/preposition-data';
import { TENSE_LESSONS } from '../src/app/lela/tense-data';
import {
  allPrepositionQuestions, checkPrepositionAnswer, checkTenseEnglish, checkTenseTamil, parseTenseModeChoice, prepositionLessonMessages,
  prepositionQuestions, tenseLessonMessages, type OutcomeLike,
} from '../src/app/lela/practice-engine';
import { buildFeedback, feedbackLines, isTooShortToCheck, naturalSpoken } from '../src/app/lela/grammar-feedback';

const rules = new CorrectionService();
const outcome = (text: string): OutcomeLike => {
  const r = rules.check(text);
  return { original: text.trim(), corrected: r.corrected, changed: r.hasMistakes, explanations: r.issues.flatMap((i) => i.changes.map(() => ({ english: i.english, tamil: i.tamil }))) };
};
const lesson = (w: string) => PREPOSITION_LESSONS.find((l) => l.word === w)!;
const tense = (id: string) => TENSE_LESSONS.find((l) => l.id === id)!;

const REQUIRED = 'in, on, at, under, over, above, below, between, among, beside, behind, before, after, during, since, for, from, to, with, without, by, about, across, through, into, onto, against, towards, within, beyond, near, inside, outside, around, along, despite, except, instead of, because of, in front of, next to, according to'.split(', ');

test('prepositions: every requested single-word and multi-word preposition is in the list', () => {
  const words = PREPOSITION_LESSONS.map((l) => l.word);
  assert.deepEqual(REQUIRED.filter((w) => !words.includes(w)), []);
  assert.ok(words.includes('instead of') && words.includes('in front of'));
  for (const l of PREPOSITION_LESSONS) {
    assert.ok(l.examples.length >= 3, l.word);
    assert.ok(prepositionQuestions(l).length >= 6, l.word);
    assert.ok(/[஀-௿]/.test(l.tamil + l.usageTa), l.word);
    for (const e of l.examples) assert.ok(e.why && /[஀-௿]/.test(e.ta), `${l.word}: ${e.en}`);
  }
});

test('prepositions: selecting ON gives meaning, usage, 3+ examples with reasons, then practice', () => {
  const m = prepositionLessonMessages(lesson('on'));
  assert.match(m[0].text, /ON/);
  assert.ok(m[0].tamil);
  assert.match(m[1].text, /surface/);
  assert.ok(m[1].tamilExplain);
  const examples = m.filter((x) => x.text.startsWith('Example'));
  assert.ok(examples.length >= 3);
  for (const e of examples) { assert.ok(e.tamil); assert.ok(e.notes?.[0].startsWith('Why')); }
  assert.match(m[m.length - 1].text, /^Mixed preposition practice/);
});


test('prepositions: selecting one lesson still provides mixed questions from all lessons', () => {
  const mixed = allPrepositionQuestions(PREPOSITION_LESSONS);
  const words = new Set(mixed.map(question => question.answers[0]));
  assert.ok(words.has('in'));
  assert.ok(words.has('on'));
  assert.ok(words.has('at'));
  assert.ok(words.size > 20);
  assert.ok(mixed.some(question => question.lessonWord === 'at'));
  assert.ok(mixed.length > prepositionQuestions(lesson('at')).length);
});

test('prepositions: answers are checked, valid alternatives are accepted', () => {
  const q = lesson('on').questions[0];
  const good = checkPrepositionAnswer('on', q, lesson('on'));
  assert.equal(good.ok, true);
  assert.equal(good.messages[0].box, q.full);
  assert.ok(good.messages[0].tamilExplain);
  const bad = checkPrepositionAnswer('in', q, lesson('on'));
  assert.equal(bad.ok, false);
  assert.match(bad.messages[0].text, /Incorrect/);
  assert.ok(bad.messages[0].notes?.includes('Your answer: in'));
  assert.ok(bad.messages[0].notes?.some((n) => n.startsWith('Correct answer: on')));
  // alternatives
  const beside = lesson('beside').questions[0];
  assert.equal(checkPrepositionAnswer('next to', beside, lesson('beside')).ok, true);
  assert.equal(checkPrepositionAnswer('By', beside, lesson('beside')).ok, true);
  assert.equal(checkPrepositionAnswer('NEXT TO.', beside, lesson('beside')).ok, true);
  assert.equal(checkPrepositionAnswer('under', beside, lesson('beside')).ok, false);
  assert.equal(checkPrepositionAnswer(beside.full, beside, lesson('beside')).ok, true);
  const desp = lesson('despite').questions[0];
  assert.equal(checkPrepositionAnswer('in spite of', desp, lesson('despite')).ok, true);
});

test('prepositions: extra words from an optional file are added, built-ins are never replaced', () => {
  const merged = mergeExtraPrepositions(PREPOSITION_LESSONS, [
    { word: 'amid', tamil: 'நடுவே', example: 'He stood amid the crowd.', exampleTamil: 'அவன் கூட்டத்தின் நடுவே நின்றான்.' },
    { word: 'on', tamil: 'x', example: 'It is on the desk.' },
  ]);
  assert.equal(merged.length, PREPOSITION_LESSONS.length + 1);
  assert.equal(merged.find((l) => l.word === 'on')!.usage, lesson('on').usage);
  assert.equal(mergeExtraPrepositions(PREPOSITION_LESSONS, null).length, PREPOSITION_LESSONS.length);
  assert.equal(mergeExtraPrepositions(PREPOSITION_LESSONS, 'bad' as never).length, PREPOSITION_LESSONS.length);
});

test('tenses: lesson shows structure, positive, negative, question, usage and six examples with Tamil, then the practice choice', () => {
  for (const l of TENSE_LESSONS) {
    const m = tenseLessonMessages(l);
    assert.match(m[0].text, new RegExp(l.name));
    assert.match(m[0].text, /Positive/); assert.match(m[0].text, /Negative/); assert.match(m[0].text, /Question/);
    assert.ok(m[1].tamilExplain);
    const six = m[2].text.split('\n').filter((x) => /^\d\. /.test(x));
    assert.equal(six.length, 6, l.id);
    assert.match(m[2].text, /[஀-௿]/);
    assert.match(m[3].text, /English Practice/); assert.match(m[3].text, /Tamil to English Practice/);
  }
});

test('tenses: practice choice parsing', () => {
  assert.equal(parseTenseModeChoice('1'), 'english');
  assert.equal(parseTenseModeChoice('English Practice'), 'english');
  assert.equal(parseTenseModeChoice('2'), 'tamil');
  assert.equal(parseTenseModeChoice('Tamil to English Practice'), 'tamil');
  assert.equal(parseTenseModeChoice('maybe'), null);
});

test('tenses English practice: original kept, correction separate, explanations, tense check', () => {
  const l = tense('present-simple');
  const wrong = checkTenseEnglish('She dont like tea', l, outcome('She dont like tea'));
  const m = wrong.messages[0];
  assert.equal(m.fix?.said, 'She dont like tea');      // the learner's own words, unchanged
  assert.equal(m.fix?.label, 'wrote');
  assert.equal(m.fix?.corrected, "She doesn't like tea.");
  assert.ok(m.fix?.mistakes.some((x) => /dont → doesn't/.test(x)));
  assert.equal(m.fix?.tense, 'Present Simple');
  assert.equal(wrong.tenseOk, true);
  assert.equal(wrong.grammarOk, false);

  const right = checkTenseEnglish('I drink tea every morning.', l, outcome('I drink tea every morning.'));
  assert.equal(right.grammarOk, true); assert.equal(right.tenseOk, true);
  assert.equal(right.messages[0].fix?.ok, true);
  assert.deepEqual(right.messages[0].fix?.mistakes, []);
  assert.equal(right.messages[0].fix?.corrected, 'I drink tea every morning.');

  const other = checkTenseEnglish('I visited my friend yesterday.', l, outcome('I visited my friend yesterday.'));
  assert.equal(other.tenseOk, false);
  assert.equal(other.grammarOk, true);
  assert.ok(other.messages[0].notes?.some((n) => /Past Simple/.test(n) && /Present Simple/.test(n)));
  assert.equal(other.messages[0].fix?.said, 'I visited my friend yesterday.');   // the learner's sentence is NOT rewritten
  assert.equal(other.messages[0].fix?.corrected, 'I visited my friend yesterday.');

  const tooShort = checkTenseEnglish('tea', l, outcome('tea'));
  assert.equal(tooShort.clarify, true);
  const tamilOnly = checkTenseEnglish('நான் தேநீர் குடிக்கிறேன்', l, outcome('x'));
  assert.equal(tamilOnly.clarify, true);
});

test('tenses Tamil to English practice: different correct translations are accepted', () => {
  const l = tense('present-simple');
  const item = l.tamil[0]; // நான் தினமும் காலையில் தேநீர் குடிக்கிறேன். model: I drink tea every morning.
  for (const answer of ['I drink tea every morning.', 'Every morning I drink tea.', 'I have tea every morning.']) {
    const r = checkTenseTamil(answer, l, item, outcome(answer));
    assert.equal(r.grammarOk, true, answer);
    assert.equal(r.tenseOk, true, answer);
    assert.equal(r.messages[0].fix?.ok, true, answer);
    assert.ok(r.messages[0].notes?.some((n) => n.startsWith('One possible translation')));
  }
  const wrong = checkTenseTamil('I drinks tea every morning', l, item, outcome('I drinks tea every morning'));
  assert.equal(wrong.grammarOk, false);
  assert.equal(wrong.messages[0].fix?.said, 'I drinks tea every morning');
  assert.equal(wrong.messages[0].fix?.corrected, 'I drink tea every morning.');
  assert.ok(wrong.messages[0].fix?.mistakes.includes('drinks → drink'));
  const wrongTense = checkTenseTamil('I drank tea every morning.', l, item, outcome('I drank tea every morning.'));
  assert.equal(wrongTense.tenseOk, false);
});

test('every tense: its own English prompt and Tamil sentence are answered correctly by the model translation', () => {
  for (const l of TENSE_LESSONS) {
    for (const item of l.tamil) {
      const r = checkTenseTamil(item.model, l, item, outcome(item.model));
      assert.equal(r.tenseOk, true, `${l.id}: ${item.model}`);
      assert.equal(r.grammarOk, true, `${l.id}: ${item.model} -> ${r.messages[0].fix?.corrected}`);
      assert.ok(!r.messages[0].notes?.some((n) => /cannot be sure/.test(n)), `${l.id}: meaning key for ${item.model}`);
    }
    for (const e of l.examples) {
      const r = checkTenseEnglish(e.en, l, outcome(e.en));
      assert.equal(r.tenseOk, true, `${l.id}: ${e.en}`);
      assert.equal(r.grammarOk, true, `${l.id}: ${e.en} -> ${r.messages[0].fix?.corrected}`);
    }
  }
});

test('grammar feedback: original kept, correct sentences stay correct, natural spoken English', () => {
  const fb = buildFeedback('  He go to school  ', outcome('He go to school'));
  assert.equal(fb.original, 'He go to school');
  assert.equal(fb.correct, false);
  assert.equal(fb.corrected, 'He goes to school');
  const lines = feedbackLines(fb);
  assert.equal(lines.said, 'What I said: “He go to school”');
  assert.equal(lines.sentenceLabel, 'Correct sentence:');
  const ok = feedbackLines(buildFeedback('She is my sister.', outcome('She is my sister.')));
  assert.equal(ok.sentenceLabel, 'Your sentence is correct:');
  assert.match(ok.notes[0], /correct/);
  assert.equal(naturalSpoken('I am going to the market and I will not be late.'), "I'm going to the market and I won't be late.");
  assert.equal(naturalSpoken('I have a car'), null);
  assert.equal(naturalSpoken('I have finished it.'), "I've finished it.");
  assert.equal(naturalSpoken("I'm fine."), null);
  assert.equal(isTooShortToCheck('yes'), true);
  assert.equal(isTooShortToCheck('I agree'), false);
});
