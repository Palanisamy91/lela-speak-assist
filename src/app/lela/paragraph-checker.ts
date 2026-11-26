// Paragraph Practice correction. Pure functions, no Angular.
// The learner's paragraph is matched to the reference sentences, then every reference sentence is checked one by one.

import type { Mistake } from './grammar-teacher';
import { checkTranslation, coverage } from './sentence-checker';
import type { ParagraphItem } from './paragraph-data';

export interface SentenceResult {
  index: number;
  tamil: string;
  /** Exactly what the learner wrote or said for this sentence ("" when nothing was written for it). */
  userText: string;
  mistakes: Mistake[];
  corrected: string;
  ok: boolean;
  missing: boolean;
}

export interface ParagraphResult {
  id: string;
  sentences: SentenceResult[];
  total: number;
  correct: number;
  incorrect: number;
  mistakeCount: number;
  /** Percentage of sentences that are correct (0-100). */
  score: number;
}

/** Splits learner text into sentences at . ! ? and line breaks. */
export function splitUserSentences(text: string): string[] {
  return text.replace(/\r/g, '\n').split(/\n+/).flatMap((line) => line.match(/[^.!?]+(?:[.!?]+["')\]]*|$)/g) ?? []).map((s) => s.trim()).filter((s) => /[A-Za-z0-9]/.test(s));
}

const DANGLING = new Set(['i', 'we', 'he', 'she', 'they', 'it', 'then', 'and', 'my', 'the', 'a', 'an', 'our', 'his', 'her', 'to', 'at', 'in', 'on', 'of', 'for', 'with', 'so', 'but', 'after', 'when', 'because']);

const sentenceScore = (seg: string, ref: ParagraphItem['sentences'][number]): number => {
  if (!seg.trim()) return 0;
  return Math.max(coverage(seg, ref.english), ...(ref.alternatives ?? []).map((a) => coverage(seg, a)));
};

/**
 * Splits the learner's text into one piece per reference sentence, in order. Pieces use the learner's own words unchanged.
 * Typed text is split at its full stops; text without punctuation (usually from the microphone) is split by word.
 * The split that matches the reference sentences best wins, so merged, split or missing sentences are handled.
 */
export function segmentAnswer(item: ParagraphItem, text: string): string[] {
  const n = item.sentences.length;
  const sentences = splitUserSentences(text);
  let units: string[];
  let joiner = ' ';
  if (sentences.length >= n || sentences.length > 1) units = sentences;
  else units = text.split(/\s+/).filter(Boolean);
  if (sentences.length === n) return sentences;
  const m = units.length;
  if (!m) return Array<string>(n).fill('');
  // best[k][j] = best score for the first k reference sentences using the first j units
  const NEG = -1;
  const best: number[][] = Array.from({ length: n + 1 }, () => Array<number>(m + 1).fill(NEG));
  const from: number[][] = Array.from({ length: n + 1 }, () => Array<number>(m + 1).fill(0));
  best[0][0] = 0;
  const cap = units === sentences ? m : 40;
  for (let k = 1; k <= n; k++) {
    for (let j = 0; j <= m; j++) {
      // reference k takes units i..j-1 (an empty piece is allowed: the sentence was not translated)
      for (let i = Math.max(0, j - cap); i <= j; i++) {
        if (best[k - 1][i] < 0) continue;
        const seg = units.slice(i, j).join(joiner);
        const last = seg.split(/\s+/).pop()?.toLowerCase().replace(/[^a-z']/g, '') ?? '';
        const bad = units !== sentences && i < j && DANGLING.has(last) ? 0.05 : 0;
        const s = best[k - 1][i] + sentenceScore(seg, item.sentences[k - 1]) - bad - (i === j ? 0 : 0.0001 * (j - i));
        if (s > best[k][j]) { best[k][j] = s; from[k][j] = i; }
      }
    }
  }
  const pieces: string[] = [];
  let j = m;
  for (let k = n; k >= 1; k--) { const i = from[k][j]; pieces.unshift(units.slice(i, j).join(joiner)); j = i; }
  return pieces;
}

/**
 * Checks a paragraph answer sentence by sentence.
 * `baseCorrect` gives the app's existing corrector output for a sentence (optional; the checker works without it).
 */
export function evaluateSegments(item: ParagraphItem, segments: string[], baseCorrected: (string | undefined)[] = []): ParagraphResult {
  const sentences: SentenceResult[] = item.sentences.map((ref, i) => {
    const userText = (segments[i] ?? '').trim();
    if (!userText) {
      return { index: i, tamil: ref.tamil, userText: '', mistakes: [{ found: '(not translated)', replacement: ref.english.replace(/[.!?]+$/, '') }], corrected: ref.english, ok: false, missing: true };
    }
    const v = checkTranslation(userText, [ref.english], baseCorrected[i], ref.alternatives ?? []);
    return { index: i, tamil: ref.tamil, userText, mistakes: v.ok ? [] : v.mistakes, corrected: v.ok ? userText : v.corrected, ok: v.ok, missing: false };
  });
  const correct = sentences.filter((s) => s.ok).length;
  return {
    id: item.id,
    sentences,
    total: sentences.length,
    correct,
    incorrect: sentences.length - correct,
    mistakeCount: sentences.reduce((a, s) => a + s.mistakes.length, 0),
    score: sentences.length ? Math.round((correct / sentences.length) * 100) : 0,
  };
}

/** Convenience: segment and check in one step (no existing-corrector help). */
export function checkParagraph(item: ParagraphItem, text: string): ParagraphResult {
  return evaluateSegments(item, segmentAnswer(item, text));
}
