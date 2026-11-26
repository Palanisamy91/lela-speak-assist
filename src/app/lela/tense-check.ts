// Finds which of the 12 English tenses a sentence is written in. Pure functions, no Angular.
//
// This is a pattern check, not a full parser. It looks at the helping verbs and verb endings, so it is reliable for
// ordinary practice sentences and honest about its limit: it only says which tense the sentence LOOKS like.
// It never rewrites the learner's sentence.

import type { TenseId } from './tense-data';

/** past, past participle for common irregular verbs (base form is only used for the "did + base verb" check). */
const IRREGULAR: Record<string, [past: string, pp: string]> = {
  be: ['was', 'been'], begin: ['began', 'begun'], break: ['broke', 'broken'], bring: ['brought', 'brought'], build: ['built', 'built'],
  buy: ['bought', 'bought'], catch: ['caught', 'caught'], choose: ['chose', 'chosen'], come: ['came', 'come'], cost: ['cost', 'cost'],
  cut: ['cut', 'cut'], do: ['did', 'done'], draw: ['drew', 'drawn'], drink: ['drank', 'drunk'], drive: ['drove', 'driven'],
  eat: ['ate', 'eaten'], fall: ['fell', 'fallen'], feel: ['felt', 'felt'], find: ['found', 'found'], fly: ['flew', 'flown'],
  forget: ['forgot', 'forgotten'], get: ['got', 'got'], give: ['gave', 'given'], go: ['went', 'gone'], grow: ['grew', 'grown'],
  have: ['had', 'had'], hear: ['heard', 'heard'], hide: ['hid', 'hidden'], hold: ['held', 'held'], keep: ['kept', 'kept'],
  know: ['knew', 'known'], leave: ['left', 'left'], lend: ['lent', 'lent'], let: ['let', 'let'], lose: ['lost', 'lost'],
  make: ['made', 'made'], mean: ['meant', 'meant'], meet: ['met', 'met'], pay: ['paid', 'paid'], put: ['put', 'put'],
  read: ['read', 'read'], ride: ['rode', 'ridden'], ring: ['rang', 'rung'], rise: ['rose', 'risen'], run: ['ran', 'run'],
  say: ['said', 'said'], see: ['saw', 'seen'], sell: ['sold', 'sold'], send: ['sent', 'sent'], set: ['set', 'set'],
  shut: ['shut', 'shut'], sing: ['sang', 'sung'], sit: ['sat', 'sat'], sleep: ['slept', 'slept'], speak: ['spoke', 'spoken'],
  spend: ['spent', 'spent'], stand: ['stood', 'stood'], steal: ['stole', 'stolen'], swim: ['swam', 'swum'], take: ['took', 'taken'],
  teach: ['taught', 'taught'], tell: ['told', 'told'], think: ['thought', 'thought'], throw: ['threw', 'thrown'],
  understand: ['understood', 'understood'], wake: ['woke', 'woken'], wear: ['wore', 'worn'], win: ['won', 'won'], write: ['wrote', 'written'],
};

// Same form in the past as in the present ("read", "put"): they cannot show a past tense on their own.
const SAME_FORM = new Set(['cost', 'cut', 'let', 'put', 'read', 'set', 'shut']);
const IRREGULAR_PAST = new Set(Object.values(IRREGULAR).map((v) => v[0]).filter((w) => w !== 'was' && !SAME_FORM.has(w)));
const IRREGULAR_PP = new Set(Object.values(IRREGULAR).map((v) => v[1]));
/** Words that end in "ed" or "ing" but are not verb forms. */
const NOT_ED = new Set(['need', 'feed', 'seed', 'speed', 'weed', 'breed', 'bleed', 'indeed', 'red', 'bed', 'shed', 'sped', 'hundred', 'sacred', 'naked', 'wicked', 'kindred', 'bed']);
const NOT_ING = new Set(['morning', 'evening', 'nothing', 'something', 'anything', 'everything', 'thing', 'king', 'ring', 'spring', 'sing', 'bring', 'string', 'wing', 'swing', 'wedding', 'clothing', 'interesting', 'boring', 'exciting', 'amazing', 'surprising', 'tiring', 'confusing', 'shocking', 'frightening', 'annoying', 'disappointing', 'charming', 'willing', 'pudding', 'ceiling']);
/** Words that may stand between a helping verb and the main verb: "have not already finished". */
const FILLER = new Set(['already', 'just', 'never', 'ever', 'still', 'recently', 'always', 'often', 'really', 'also', 'only', 'not', 'yet', 'finally', 'probably', 'definitely', 'usually', 'slowly', 'quickly', 'completely', 'even', 'all']);
const WH = new Set(['what', 'where', 'when', 'why', 'how', 'who', 'which', 'long', 'many', 'much', 'often', 'far']);

const isEd = (w: string) => (w.length > 3 && w.endsWith('ed') && !NOT_ED.has(w)) || IRREGULAR_PP.has(w);
const isIng = (w: string) => w.length > 4 && w.endsWith('ing') && !NOT_ING.has(w);
const isPast = (w: string) => (w.length > 3 && w.endsWith('ed') && !NOT_ED.has(w)) || IRREGULAR_PAST.has(w);

/** Expands contractions so the patterns only deal with full words. "She's been" becomes "she has been". */
export function expandContractions(input: string): string {
  let s = input.toLowerCase().replace(/[‘’]/g, "'").replace(/[.,!?;:"]/g, ' ').replace(/\s+/g, ' ').trim();
  s = s.replace(/\bwon't\b/g, 'will not').replace(/\bcan't\b/g, 'can not').replace(/\bshan't\b/g, 'shall not').replace(/\bain't\b/g, 'is not')
    .replace(/\bi'm\b/g, 'i am').replace(/\b(\w+)n't\b/g, '$1 not')
    .replace(/\b(\w+)'ll\b/g, '$1 will').replace(/\b(\w+)'ve\b/g, '$1 have').replace(/\b(\w+)'re\b/g, '$1 are')
    .replace(/\b(\w+)'d been\b/g, '$1 had been')
    .replace(/\b(\w+)'d (\w+)\b/g, (_m, a: string, b: string) => (isEd(b) ? `${a} had ${b}` : `${a} would ${b}`))
    .replace(/\b(\w+)'s been\b/g, '$1 has been')
    .replace(/\b(\w+)'s (\w+)\b/g, (_m, a: string, b: string) => (isEd(b) ? `${a} has ${b}` : `${a} is ${b}`));
  return s.replace(/\s+/g, ' ').trim();
}

const eq = (word: string) => (w: string) => w === word;

/**
 * Looks for a chain of words: the first predicate somewhere after `from`, then the next predicate right after it, and so on.
 * In a question ("Have you finished?") the subject sits between the helping verb and the verb, so up to 3 words may be skipped.
 * In a statement only filler words such as "not" or "already" may be skipped.
 */
function chain(t: string[], from: number, preds: Array<(w: string) => boolean>, inverted: boolean): boolean {
  if (!preds.length) return true;
  const last = Math.min(t.length - 1, from + (inverted ? 3 : 2));
  for (let j = from; j <= last; j++) {
    if (preds[0](t[j]) && chain(t, j + 1, preds.slice(1), false)) return true;
    if (!inverted && !FILLER.has(t[j])) break;
  }
  return false;
}

function after(t: string[], helpers: string[], preds: Array<(w: string) => boolean>): boolean {
  let start = 0;
  while (start < t.length && WH.has(t[start])) start++;
  return t.some((w, i) => helpers.includes(w) && chain(t, i + 1, preds, i === start));
}

const notBeen = (w: string) => w !== 'been' && isEd(w);

interface Detector { id: TenseId; test: (t: string[]) => boolean }

/** Most specific tense first. */
const DETECTORS: Detector[] = [
  { id: 'future-perfect-continuous', test: (t) => after(t, ['will', 'shall'], [eq('have'), eq('been'), isIng]) },
  { id: 'future-perfect', test: (t) => after(t, ['will', 'shall'], [eq('have'), notBeen]) },
  { id: 'future-continuous', test: (t) => after(t, ['will', 'shall'], [eq('be'), isIng]) },
  {
    id: 'future-simple',
    test: (t) => t.includes('will') || t.includes('shall')
      || t.some((w, i) => w === 'going' && t[i + 1] === 'to' && ['am', 'is', 'are'].includes(t[i - 1] === 'not' ? t[i - 2] : t[i - 1])
        && t[i + 2] !== undefined && !/^(the|a|an|my|your|his|her|our|their|school|work|college|church|temple|bed|town|chennai|delhi|\w+ing)$/.test(t[i + 2])),
  },
  { id: 'present-perfect-continuous', test: (t) => after(t, ['have', 'has'], [eq('been'), isIng]) },
  { id: 'present-perfect', test: (t) => after(t, ['have', 'has'], [isEd]) },
  { id: 'past-perfect-continuous', test: (t) => after(t, ['had'], [eq('been'), isIng]) },
  { id: 'past-perfect', test: (t) => after(t, ['had'], [isEd]) },
  { id: 'past-continuous', test: (t) => after(t, ['was', 'were'], [isIng]) },
  { id: 'past-simple', test: (t) => t.includes('did') || t.includes('was') || t.includes('were') || t.slice(1).some(isPast) || t[0] === 'had' || t.includes('had') },
  { id: 'present-continuous', test: (t) => after(t, ['am', 'is', 'are'], [isIng]) },
  { id: 'present-simple', test: () => true },
];

/** Every tense the sentence matches, most specific first. The first one is the main tense of the sentence. */
export function detectTenses(sentence: string): TenseId[] {
  const t = expandContractions(sentence).split(' ').filter(Boolean);
  if (!t.length) return [];
  return DETECTORS.filter((d) => d.test(t)).map((d) => d.id);
}

/** The main tense. */
export function mainTense(sentence: string): TenseId | null {
  return detectTenses(sentence)[0] ?? null;
}

export interface TenseVerdict {
  matches: boolean;
  detected: TenseId | null;
}

/**
 * Does the sentence use the tense that is being practised?
 * "Going to" is accepted for the future simple. A sentence that is mainly in another tense does not match.
 */
export function usesTense(sentence: string, target: TenseId): TenseVerdict {
  const detected = mainTense(sentence);
  return { matches: detected === target, detected };
}

export const TENSE_NAMES: Record<TenseId, string> = {
  'present-simple': 'Present Simple', 'present-continuous': 'Present Continuous', 'present-perfect': 'Present Perfect',
  'present-perfect-continuous': 'Present Perfect Continuous', 'past-simple': 'Past Simple', 'past-continuous': 'Past Continuous',
  'past-perfect': 'Past Perfect', 'past-perfect-continuous': 'Past Perfect Continuous', 'future-simple': 'Future Simple',
  'future-continuous': 'Future Continuous', 'future-perfect': 'Future Perfect', 'future-perfect-continuous': 'Future Perfect Continuous',
};
