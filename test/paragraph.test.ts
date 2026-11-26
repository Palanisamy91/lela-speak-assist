import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sanitiseParagraphs, type ParagraphItem } from '../src/app/lela/paragraph-data';
import { checkParagraph, segmentAnswer, splitUserSentences } from '../src/app/lela/paragraph-checker';
import { checkTranslation } from '../src/app/lela/sentence-checker';

const raw = JSON.parse(readFileSync(new URL('../public/data/practice/tamil-paragraphs.json', import.meta.url), 'utf8'));
const items: ParagraphItem[] = sanitiseParagraphs(raw);

test('data: 100 valid paragraphs, ids para001-para100, all unique', () => {
  assert.equal(raw.length, 100);
  assert.equal(items.length, 100);                                         // none dropped by validation
  assert.deepEqual(items.map((p) => p.id), Array.from({ length: 100 }, (_, i) => `para${String(i + 1).padStart(3, '0')}`));
  assert.equal(new Set(items.map((p) => p.tamil)).size, 100);
  assert.equal(new Set(items.map((p) => p.english)).size, 100);
});

test('data: difficulty distribution and sentence counts', () => {
  const by = (l: string) => items.filter((p) => p.level === l);
  const range: Record<string, [number, number, number]> = { Beginner: [30, 3, 4], Intermediate: [30, 5, 7], Advanced: [25, 8, 12], Interview: [15, 5, 10] };
  for (const [level, [count, lo, hi]] of Object.entries(range)) {
    assert.equal(by(level).length, count, level);
    for (const p of by(level)) assert.ok(p.sentenceCount >= lo && p.sentenceCount <= hi, `${p.id} ${level} has ${p.sentenceCount} sentences`);
  }
});

test('data: every paragraph has Tamil, English, topic and matching sentence lists; no empty or repeated sentences', () => {
  const tamilSeen = new Set<string>(), enSeen = new Set<string>();
  for (const p of items) {
    assert.ok(p.topic.trim().length > 2, p.id);
    assert.equal(p.sentences.length, p.sentenceCount, p.id);
    assert.equal(p.tamil, p.sentences.map((s) => s.tamil).join(' '), p.id);
    assert.equal(p.english, p.sentences.map((s) => s.english).join(' '), p.id);
    for (const s of p.sentences) {
      assert.match(s.tamil, /[\u0B80-\u0BFF]/, `${p.id} Tamil sentence has Tamil letters`);
      assert.match(s.english, /[A-Za-z]{3}/, p.id);
      assert.ok(!tamilSeen.has(s.tamil) && !enSeen.has(s.english), `${p.id} repeats a sentence: ${s.english}`);
      tamilSeen.add(s.tamil); enSeen.add(s.english);
    }
  }
});

test('data: required topics are covered', () => {
  const topics = items.map((p) => p.topic.toLowerCase()).join(' | ');
  for (const t of ['daily routine', 'family', 'friend', 'home', 'cooking', 'shopping', 'travel', 'bus', 'train', 'school', 'college', 'english', 'office', 'technical support',
    'software', 'computer', 'mobile', 'customer', 'problem at work', 'interview', 'future plans', 'hobby', 'festival', 'weather', 'money', 'helping', 'wellness', 'healthy']) {
    assert.ok(topics.includes(t), `topic missing: ${t}`);
  }
});

const p1 = items[0];

test('checker: the reference translation is fully correct, every sentence is reported, none skipped', () => {
  const r = checkParagraph(p1, p1.english);
  assert.equal(r.sentences.length, p1.sentenceCount);
  assert.equal(r.correct, p1.sentenceCount);
  assert.equal(r.score, 100);
  assert.deepEqual(r.sentences.map((s) => s.userText), splitUserSentences(p1.english));
});

test('checker: every reference paragraph is accepted as correct when written exactly', () => {
  for (const p of items) {
    const r = checkParagraph(p, p.english);
    assert.equal(r.correct, p.sentenceCount, `${p.id}: ${r.sentences.filter((s) => !s.ok).map((s) => s.userText + ' -> ' + s.mistakes.map((m) => m.found + '>' + m.replacement)).join(' | ')}`);
  }
});

test('checker: natural alternative translations are accepted', () => {
  const alt = "I wake up at six every morning. After that I wash my face and clean my teeth. I have breakfast at seven. I go to work at eight o'clock.";
  const r = checkParagraph(p1, alt);
  assert.equal(r.sentences.length, 4);
  assert.deepEqual(r.sentences.map((s) => s.ok), [true, true, true, true], JSON.stringify(r.sentences.map((s) => s.mistakes)));
});

test('checker: grammar mistakes are found sentence by sentence with the complete corrected sentence', () => {
  const wrong = "I gets up at six o'clock every morning. Then I wash face and brush my teeth. I am eat breakfast at seven o'clock. I leave for work at eight o'clock.";
  const r = checkParagraph(p1, wrong);
  assert.equal(r.sentences.length, 4);
  assert.equal(r.sentences[0].ok, false); assert.deepEqual(r.sentences[0].mistakes, [{ found: 'gets', replacement: 'get' }]);
  assert.equal(r.sentences[0].corrected, "I get up at six o'clock every morning.");
  assert.equal(r.sentences[1].ok, false); assert.deepEqual(r.sentences[1].mistakes, [{ found: 'wash face', replacement: 'wash my face' }]);
  assert.equal(r.sentences[2].ok, false); assert.deepEqual(r.sentences[2].mistakes, [{ found: 'eat', replacement: 'eating' }]);
  assert.equal(r.sentences[3].ok, true);                                   // a correct sentence is not reported as wrong
  assert.equal(r.correct, 1); assert.equal(r.incorrect, 3); assert.equal(r.mistakeCount, 3); assert.equal(r.score, 25);
  for (const s of r.sentences) assert.ok(s.userText.length > 0);
  assert.equal(r.sentences[0].userText, 'I gets up at six o\'clock every morning.');   // original wording kept
});

test('checker: wrong words that change the meaning are shown as wrong word -> right word', () => {
  const r = checkParagraph(p1, "I get up at six o'clock every morning. Then I wash my face and brush my teeth. I eat breakfast at seven o'clock. I leave for school at nine o'clock.");
  const s = r.sentences[3];
  assert.equal(s.ok, false);
  assert.deepEqual(s.mistakes, [{ found: 'school', replacement: 'work' }, { found: 'nine', replacement: 'eight' }]);
  assert.equal(s.corrected, 'I leave for work at eight o\'clock.');
  assert.equal(s.userText, "I leave for school at nine o'clock.");
  assert.equal(r.sentences.slice(0, 3).every((x) => x.ok), true);
});

test('checker: missing and merged sentences, and speech without punctuation', () => {
  const missing = checkParagraph(p1, "I get up at six o'clock every morning. I eat breakfast at seven o'clock.");
  assert.equal(missing.sentences.length, 4);
  assert.equal(missing.sentences[1].missing, true);
  assert.equal(missing.sentences[3].missing, true);
  assert.equal(missing.sentences[1].ok, false);
  assert.equal(missing.correct, 2);
  const spoken = "I get up at six o'clock every morning then I wash my face and brush my teeth I eat breakfast at seven o'clock I leave for work at eight o'clock";
  const r = checkParagraph(p1, spoken);
  assert.equal(r.sentences.length, 4);
  assert.equal(r.correct, 4);
  assert.equal(segmentAnswer(p1, spoken).join(' '), spoken);               // no word lost, added or reordered by the split
});

test('sentence checker: meaning-aware, not exact matching', () => {
  assert.equal(checkTranslation('He studies in my class.', ['He studies in my class.']).ok, true);
  assert.equal(checkTranslation('He is studying in my class.', ['He studies in my class.']).ok, true);            // other tense/wording, same meaning
  assert.equal(checkTranslation('He studies in my class', ['He studies in my class.']).ok, true);                  // punctuation and capitals do not matter
  assert.equal(checkTranslation('I leave for work at eight.', ['I leave for work at eight o\'clock.']).ok, true);  // shorter but same meaning
  const grammar = checkTranslation('He study in my class.', ['He studies in my class.']);
  assert.equal(grammar.ok, false);
  assert.deepEqual(grammar.mistakes, [{ found: 'study', replacement: 'studies' }]);
  const off = checkTranslation('The train is late today.', ['He studies in my class.']);
  assert.equal(off.ok, false);
  assert.equal(off.corrected, 'He studies in my class.');
});
