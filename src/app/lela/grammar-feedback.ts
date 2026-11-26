// Turns a correction result into the five parts the learner sees, and keeps the original sentence untouched.
// Pure functions, no Angular. Used by normal chat, Speak mode and the Tenses / Prepositions practice.
//
//   What I said          - the sentence exactly as it was typed or recognised (never edited here)
//   Correct sentence     - the corrected sentence (only when something was found)
//   Grammar explanation  - in simple English
//   Tamil explanation    - the same mistakes in simple Tamil
//   Natural spoken English - a more natural, contracted way to say it (only when it differs)

import { expandContractions } from './tense-check';

export interface FeedbackExplanation { english: string; tamil: string }

export interface GrammarFeedback {
  /** Exactly what the learner sent. */
  original: string;
  /** true when the checker found nothing to change. */
  correct: boolean;
  /** The corrected sentence. Equal to `original` when `correct` is true. */
  corrected: string;
  english: string[];
  tamil: string[];
  /** A more natural spoken form, or null when there is nothing better to say. */
  natural: string | null;
}

interface OutcomeLike {
  original: string;
  corrected: string;
  changed: boolean;
  explanations: { found?: string; replacement?: string; english: string; tamil: string }[];
}

const unique = (list: string[]) => [...new Set(list.map((x) => x.trim()).filter(Boolean))];

/** Everyday spoken English uses contractions. Only suggests a change when the sentence really has a long form. */
export function naturalSpoken(sentence: string): string | null {
  const s = sentence.trim();
  if (!s) return null;
  let out = s
    .replace(/\bwill\s+not\b/gi, "won't")
    .replace(/\b(I|you|we|they|he|she|it|that|there|who)\s+(am|is|are)\b/gi, (m, p: string, v: string) => {
      const verb = v.toLowerCase();
      const pronoun = p;
      if (verb === 'am') return /^i$/i.test(pronoun) ? `${pronoun}'m` : m;
      if (verb === 'is') return /^(you|we|they|I)$/i.test(pronoun) ? m : `${pronoun}'s`;
      return /^(you|we|they)$/i.test(pronoun) ? `${pronoun}'re` : m;
    })
    .replace(/\b(I|you|we|they|he|she|it)\s+will\b/gi, "$1'll")
    .replace(/\b(I|you|we|they|he|she|it)\s+would\b/gi, "$1'd")
    .replace(/\b(I|you|we|they)\s+have\s+(\w+)\b/gi, (m, p: string, w: string) => (/(ed|en|ne|wn)$/i.test(w) || /^(been|had|done|gone|seen|made|taken|got|become)$/i.test(w) ? `${p}'ve ${w}` : m))
    .replace(/\b(he|she|it)\s+has\s+(\w+)\b/gi, (m, p: string, w: string) => (/(ed|en|ne|wn)$/i.test(w) || /^(been|had|done|gone|seen|made|taken|got|become)$/i.test(w) ? `${p}'s ${w}` : m))
    .replace(/\bcannot\b/gi, "can't").replace(/\bcan not\b/gi, "can't")
    .replace(/\b(do|does|did|is|are|was|were|have|has|had|would|should|could|must)\s+not\b/gi, "$1n't");
  out = out.replace(/\b(Is|Are|Was|Were|Do|Does|Did|Have|Has|Had)n't\b/g, "$1n't");
  return out === s ? null : out;
}

/** Builds the feedback for one sentence from a corrector result. Never changes `original`. */
export function buildFeedback(original: string, outcome: OutcomeLike | null | undefined): GrammarFeedback {
  const said = original.trim();
  if (!outcome || !outcome.changed) {
    return { original: said, correct: true, corrected: said, english: [], tamil: [], natural: naturalSpoken(said) };
  }
  const english = unique(outcome.explanations.map((e) => e.english));
  const tamil = unique(outcome.explanations.map((e) => e.tamil));
  return {
    original: said,
    correct: false,
    corrected: outcome.corrected,
    english,
    tamil,
    natural: naturalSpoken(outcome.corrected),
  };
}

/** The lines of a feedback card, in the order the learner reads them. `tamil` is for the Tamil explanation block. */
export function feedbackLines(fb: GrammarFeedback): { said: string; sentenceLabel: string; sentence: string; notes: string[]; tamil: string } {
  const notes: string[] = [];
  if (fb.correct) {
    notes.push('Grammar explanation: Your sentence is grammatically correct. Well done!');
  } else {
    notes.push(`Grammar explanation: ${fb.english.join(' ')}`);
  }
  if (fb.natural) notes.push(`Natural spoken English: ${fb.natural}`);
  return {
    said: `What I said: “${fb.original}”`,
    sentenceLabel: fb.correct ? 'Your sentence is correct:' : 'Correct sentence:',
    sentence: fb.corrected,
    notes,
    tamil: fb.correct ? 'உங்கள் வாக்கியம் இலக்கணப்படி சரியாக உள்ளது.' : fb.tamil.join('\n'),
  };
}

/**
 * Is there too little to check? A practice answer with no letters or one word is not a sentence, so Lela asks again
 * instead of inventing a meaning for it.
 */
export function isTooShortToCheck(text: string): boolean {
  const words = text.trim().split(/\s+/).filter((w) => /[a-z]/i.test(w));
  return words.length < 2;
}

/** Text that is mostly Tamil letters is not an English sentence. */
export function looksTamil(text: string): boolean {
  const tamil = (text.match(/[஀-௿]/g) ?? []).length;
  const latin = (text.match(/[a-z]/gi) ?? []).length;
  return tamil > 0 && tamil >= latin;
}

/**
 * Loose meaning check for Tamil → English: does the answer share the first letters of at least half of the key words?
 * It is only used to add a caution ("check the meaning"); it never marks a grammatical sentence as wrong.
 */
export function meaningLooksRight(answer: string, keys: string[]): boolean {
  if (!keys.length) return true;
  const words = expandContractions(answer).split(' ').filter((w) => w.length >= 3);
  const hits = keys.filter((k) => words.some((w) => w.slice(0, 3) === k.slice(0, 3))).length;
  return hits / keys.length >= 0.5;
}
