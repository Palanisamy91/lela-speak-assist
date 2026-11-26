// Decides whether a piece of recognised text is real speech or just noise the engine "heard".
// Pure functions (no Angular, no browser), unit-tested in test/speech-guard.test.ts.
//
// Why this exists: speech engines (Chrome's online service and Android's SpeechRecognizer) often return a
// short junk result for fan noise, traffic, a TV or breathing: "the", "uh", "hmm", "[Music]", a lone "I".
// Nothing in the old pipeline rejected those, so they reached the chat as if the learner had spoken.
//
// What it does NOT do: it never rewrites, completes or "improves" words. It only says "keep" or "ignore".
// Whole sentences are never rejected here. Only results that cannot be a real answer are.

/** Sounds and one-word fragments that engines produce for noise. A real answer is never just one of these. */
const FILLER_ONLY = new Set([
  'um', 'umm', 'uh', 'uhh', 'er', 'erm', 'eh', 'ah', 'aah', 'oh', 'ooh', 'hm', 'hmm', 'hmmm', 'mm', 'mmm', 'mhm',
  'huh', 'ha', 'haha', 'ho', 'ugh', 'shh', 'sh', 'psst', 'tsk', 'whoa', 'wow',
]);

/** One-word results made only of a function word. Typical for noise ("the", "a", "and"), never a full answer. */
const LONE_FUNCTION_WORD = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'so', 'to', 'of', 'in', 'on', 'at', 'is', 'it', 'its', 'i', 'he', 'she', 'we',
  'they', 'that', 'this', 'with', 'for', 'as', 'be', 'if', 'by', 'than', 'then',
]);

/** Engines write non-speech sounds in brackets or with music symbols: "[Music]", "(noise)", "♪". */
const SOUND_TAG = /^[\s\[\(\{*♪♫#_-]*(music|noise|applause|laughter|laughs|silence|inaudible|unintelligible|background|static|cough|coughing|breathing|sigh|sighs|beep|blank_audio)\b.*$/i;

const normaliseWord = (w: string) => w.toLowerCase().replace(/[^a-z0-9']/g, '');

/** The words of a text, lower-case, without punctuation. */
export function wordsOf(text: string): string[] {
  return text.split(/\s+/).map(normaliseWord).filter(Boolean);
}

export type NoiseReason = 'empty' | 'no-letters' | 'sound-tag' | 'filler' | 'lone-function-word' | 'repeated-filler';

/**
 * Returns why `text` should be ignored, or null when it may be real speech.
 * `confidence` is the engine's own score (0..1). 0 or undefined means "the engine gave none" (Android's plugin never does),
 * in which case only the text itself is judged.
 */
export function noiseReason(text: string, confidence?: number): NoiseReason | null {
  const clean = (text ?? '').trim();
  if (!clean) return 'empty';
  if (!/[a-z]/i.test(clean)) return 'no-letters'; // only digits, punctuation or symbols
  if (SOUND_TAG.test(clean)) return 'sound-tag';
  const words = wordsOf(clean);
  if (words.length === 0) return 'no-letters';
  if (words.every((w) => FILLER_ONLY.has(w))) return words.length === 1 ? 'filler' : 'repeated-filler';
  if (words.length === 1) {
    const only = words[0];
    // "I" or "a" alone is junk. A single real word such as "yes", "no", "hello", "tomorrow" is a legitimate answer.
    if (LONE_FUNCTION_WORD.has(only)) return 'lone-function-word';
    if (only.length === 1 && only !== 'i') return 'lone-function-word'; // any other single letter
    // A one-word result from an engine that is clearly unsure is treated as noise. 0 = no score given, so it is kept.
    if (typeof confidence === 'number' && confidence > 0 && confidence < 0.5 && only.length <= 3) return 'lone-function-word';
  }
  return null;
}

/** true when the text is only noise and must not be shown, merged or submitted. */
export function isNoiseText(text: string, confidence?: number): boolean {
  return noiseReason(text, confidence) !== null;
}

/**
 * Lowest number of letters a result needs before it may be submitted automatically
 * (Auto mode / silence timeout). Shorter text is still shown for review but never sent on its own.
 */
export const MIN_AUTO_SUBMIT_LETTERS = 2;

export function hasEnoughToSubmit(text: string): boolean {
  return (text.match(/[a-z]/gi)?.length ?? 0) >= MIN_AUTO_SUBMIT_LETTERS && !isNoiseText(text);
}
