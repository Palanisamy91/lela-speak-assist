import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hasEnoughToSubmit, isNoiseText, noiseReason } from '../src/app/core/speech-guard';
import { buildTranscript, type RawResult } from '../src/app/core/transcript';
import { nativeErrorCode } from '../src/app/core/native-mic';

const fin = (text: string, confidence = 0): RawResult => ({ isFinal: true, alternatives: [{ transcript: text, confidence }] });
const interim = (text: string): RawResult => ({ isFinal: false, alternatives: [{ transcript: text, confidence: 0 }] });

test('empty, symbol-only and sound-tag results are noise', () => {
  for (const t of ['', '   ', '...', '123', '[Music]', '(noise)', '♪ ♪', '[BLANK_AUDIO]', '*applause*']) assert.ok(isNoiseText(t), t);
});

test('fillers and lone function words are noise', () => {
  for (const t of ['uh', 'Hmm', 'um um', 'the', 'a', 'and', 'I', 'k']) assert.ok(isNoiseText(t), t);
});

test('real short answers and sentences are kept', () => {
  for (const t of ['yes', 'No', 'hello', 'tomorrow', 'I am fine', 'how are you', 'the cat', 'I went home yesterday']) assert.equal(noiseReason(t), null, t);
});

test('a one-word, very unsure short result is noise, but the same word with no score is kept', () => {
  assert.ok(isNoiseText('yes', 0.2));
  assert.ok(!isNoiseText('yes', 0)); // Android gives no score: judge text only
  assert.ok(!isNoiseText('tomorrow', 0.2));
});

test('hasEnoughToSubmit', () => {
  assert.ok(hasEnoughToSubmit('good morning'));
  assert.ok(!hasEnoughToSubmit('uh'));
  assert.ok(!hasEnoughToSubmit(''));
});

test('noise results never reach the transcript, interim or final', () => {
  assert.equal(buildTranscript([fin('the')]).finalClean, '');
  assert.equal(buildTranscript([interim('uh')]).live, '');
  const t = buildTranscript([fin('I am fine'), fin('hmm'), interim('[Music]')]);
  assert.equal(t.finalClean, 'I am fine');
  assert.equal(t.interim, '');
});

test('finalReliable leaves out [Unclear] segments and never invents words', () => {
  const t = buildTranscript([fin('I am a teacher', 0.9), fin('mumble grumble', 0.1)]);
  assert.equal(t.finalReliable, 'I am a teacher');
  assert.equal(t.finalMarked, 'I am a teacher [Unclear]');
  assert.equal(buildTranscript([fin('mumble grumble', 0.1)]).finalReliable, '');
});

test('slow speech: several final pieces keep their order, with no duplicates', () => {
  const t = buildTranscript([fin('I want'), fin('to go'), fin('to the market'), fin('to the market')]);
  assert.equal(t.finalClean, 'I want to go to the market');
});

test('interim growing into final is not duplicated', () => {
  const growing = buildTranscript([interim('I am going')]);
  assert.equal(growing.live, 'I am going');
  const done = buildTranscript([fin('I am going home')]);
  assert.equal(done.live, 'I am going home');
});

test('language errors map to a code the adapter can retry', () => {
  assert.equal(nativeErrorCode(new Error('Language not supported')), 'language-not-supported');
  assert.equal(nativeErrorCode(new Error('Network error')), 'network');
});
