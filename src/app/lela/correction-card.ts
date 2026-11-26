// The one short correction format used by Tamil → English Sentence Practice, Paragraph Practice and Tense Practice.
//
//   You wrote/said:  the learner's own words, never replaced by the corrected version
//   Mistakes:        incorrect word or phrase → correct word or phrase
//   Correct sentence: the complete corrected sentence
//   Tense:           shown in Tense Practice
//   "Correct! Excellent." when there is nothing to fix

import type { Mistake, TeacherResult } from './grammar-teacher';

export interface CorrectionCard {
  /** "wrote" for typed answers, "said" for answers that came from the microphone. */
  label: 'wrote' | 'said';
  said: string;
  mistakes: string[];
  corrected: string;
  tense?: string;
  ok: boolean;
}

export const CORRECT_EXCELLENT = 'Correct! Excellent.';

export function lineFor(m: Mistake): string {
  return `${m.found} → ${m.replacement}`;
}

export function cardFromTeacher(t: TeacherResult, label: 'wrote' | 'said', showTense: boolean): CorrectionCard {
  return {
    label,
    said: t.original,
    mistakes: t.mistakes.map(lineFor),
    corrected: t.corrected,
    tense: showTense && t.tenseName ? t.tenseName : undefined,
    ok: t.correct,
  };
}

/** Plain text of a card (used for tests and for the screen-reader label). */
export function cardText(c: CorrectionCard): string {
  const head = `You ${c.label}: ${c.said}`;
  if (c.ok) return `${head}\n${CORRECT_EXCELLENT}${c.tense ? `\nTense: ${c.tense}` : ''}`;
  return `${head}\nMistakes: ${c.mistakes.join('; ')}\nCorrect sentence: ${c.corrected}${c.tense ? `\nTense: ${c.tense}` : ''}`;
}
