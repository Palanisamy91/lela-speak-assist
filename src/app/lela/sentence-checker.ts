// Meaning-aware comparison of a learner's English sentence with one or more reference translations. Pure functions, no Angular.
//
// A sentence is accepted when it has no grammar mistakes and carries the key content words of a reference translation
// (or of one of its accepted alternatives). Exact string matching is only the quickest way to be correct, never the only one.
//
// Honest limit: this compares content words (with word-form and small synonym tolerance). It cannot understand a very different
// paraphrase, so a completely re-worded but valid translation may be shown as "meaning differs".

import { analyse } from './verb-forms';
import { diffMistakes, teachSentence, type Mistake, type TeacherResult } from './grammar-teacher';

const STOP = new Set(`a an the and or but if so as of to in on at by for with from into onto over under about than then that this these those there here it its is am are was were be been being do does did have has had will would shall should can could may might must not no nor i me my mine you your yours he him his she her hers we us our ours they them their theirs who whom which what when where while also very too just some any each every all both more most much many own same such only up down out off again once o'clock`.split(/\s+/));

const SYNONYMS: string[][] = [
  ['buy', 'purchase', 'bought'], ['begin', 'start', 'commence'], ['big', 'large', 'huge'], ['small', 'little', 'tiny'], ['house', 'home'], ['child', 'kid', 'children', 'kids'],
  ['happy', 'glad', 'pleased', 'joyful'], ['sad', 'unhappy', 'sorrowful'], ['quick', 'fast', 'rapid', 'quickly', 'fast'], ['talk', 'speak', 'chat', 'converse'], ['look', 'watch', 'see'],
  ['help', 'assist', 'aid'], ['finish', 'complete', 'end'], ['car', 'vehicle'], ['father', 'dad', 'daddy'], ['mother', 'mom', 'mum', 'mummy'], ['photo', 'photograph', 'picture'],
  ['ask', 'enquire', 'inquire'], ['smart', 'clever', 'intelligent'], ['tired', 'exhausted'], ['job', 'work', 'employment'], ['shop', 'store'], ['phone', 'mobile', 'cellphone'],
  ['tell', 'say'], ['get', 'receive', 'obtain'], ['need', 'require'], ['want', 'wish', 'desire'], ['like', 'enjoy'], ['town', 'city'], ['money', 'cash'], ['road', 'street'],
  ['meal', 'food'], ['reach', 'arrive'], ['leave', 'depart'], ['sleep', 'slept'], ['hard', 'difficult', 'tough'], ['easy', 'simple'], ['nice', 'good', 'great', 'fine'],
  ['proud', 'pride'], ['wake', 'get'], ['morning', 'dawn'], ['evening', 'dusk'], ['elder', 'older'], ['younger', 'junior'], ['colleague', 'coworker'], ['colleagues', 'coworkers'],
  ['mum', 'mother'], ['smile', 'grin'], ['trip', 'journey', 'tour', 'travel'], ['festival', 'celebration'], ['cook', 'prepare'], ['teach', 'educate'],
];
const SYN = new Map<string, string>();
for (const g of SYNONYMS) for (const w of g) if (!SYN.has(w)) SYN.set(w, g[0]);

const NUM_WORDS: Record<string, string> = { one: '1', two: '2', three: '3', four: '4', five: '5', six: '6', seven: '7', eight: '8', nine: '9', ten: '10' };

/** Word -> a comparable stem: verb forms collapse to the base verb, plurals lose "s", synonyms collapse to one word. */
export function stemOf(word: string): string {
  let w = word.toLowerCase().replace(/[^a-z0-9']/g, '').replace(/'s$/, '');
  if (NUM_WORDS[w]) w = NUM_WORDS[w];
  const forms = analyse(w);
  if (forms.length) w = forms[0].base;
  else if (/ies$/.test(w) && w.length > 4) w = `${w.slice(0, -3)}y`;
  else if (/(ches|shes|xes|sses)$/.test(w)) w = w.slice(0, -2);
  else if (/s$/.test(w) && !/ss$/.test(w) && w.length > 3) w = w.slice(0, -1);
  return SYN.get(w) ?? w;
}

export interface ContentWord { raw: string; stem: string }

const PHRASES: [RegExp, string][] = [
  [/\b(get|gets|got|getting|wake|wakes|woke|waking|woken) up\b/gi, 'wakeup'],
  [/\b(brush|brushes|brushed|brushing|clean|cleans|cleaned|cleaning) (my|his|her|our|their|your) teeth\b/gi, 'brushteeth'],
  [/\b(have|has|had|having|eat|eats|ate|eating) (breakfast|lunch|dinner)\b/gi, '$2'],
];

export function contentWords(text: string): ContentWord[] {
  const out: ContentWord[] = [];
  let t = text.replace(/[‘’]/g, "'");
  for (const [re, to] of PHRASES) t = t.replace(re, to);
  for (const raw of t.split(/[^A-Za-z0-9']+/)) {
    const w = raw.toLowerCase();
    if (!w || STOP.has(w) || (w.length < 2 && !/\d/.test(w))) continue;
    out.push({ raw, stem: stemOf(w) });
  }
  return out;
}

/** Share of the reference's content words that the learner's sentence also has (0 to 1). */
export function coverage(user: string, reference: string): number {
  const ref = contentWords(reference);
  if (!ref.length) return 1;
  const have = new Set(contentWords(user).map((c) => c.stem));
  return ref.filter((c) => have.has(c.stem)).length / ref.length;
}

/** At least this share of the reference's key words must be in the learner's sentence. Below it the meaning is treated as different. */
export const MEANING_OK = 0.6;

export interface SentenceVerdict {
  ok: boolean;
  /** Complete corrected sentence. Equals the learner's own sentence when it is correct. */
  corrected: string;
  mistakes: Mistake[];
  /** Best matching reference or alternative. */
  reference: string;
  coverage: number;
  teacher: TeacherResult;
}

const norm = (s: string) => s.toLowerCase().replace(/[‘’]/g, "'").replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim();

/** Words that differ in meaning: pairs of "your word -> reference word", plus missing reference words. */
function meaningMistakes(user: string, reference: string): Mistake[] {
  const u = contentWords(user);
  const r = contentWords(reference);
  const uStems = new Set(u.map((c) => c.stem));
  const rStems = new Set(r.map((c) => c.stem));
  const wrong = u.filter((c) => !rStems.has(c.stem));
  const missing = r.filter((c) => !uStems.has(c.stem));
  if (!missing.length) return [];
  if (missing.length > 3 || wrong.length > 3) return [{ found: '(meaning differs)', replacement: reference.replace(/[.!?]+$/, '') }];
  const out: Mistake[] = [];
  const n = Math.min(wrong.length, missing.length);
  for (let i = 0; i < n; i++) out.push({ found: wrong[i].raw, replacement: missing[i].raw });
  for (let i = n; i < missing.length; i++) out.push({ found: '(missing)', replacement: missing[i].raw });
  return out;
}

/**
 * Checks one learner sentence against its reference translation(s).
 * `base` is the app's existing corrector output for the same sentence (optional).
 */
export function checkTranslation(user: string, references: string[], base?: string, alternatives: string[] = []): SentenceVerdict {
  const said = user.trim();
  const teacher = teachSentence(said, base);
  const all = [...references, ...alternatives].filter(Boolean);
  if (all.some((r) => norm(r) === norm(said)) && teacher.correct) {
    return { ok: true, corrected: said, mistakes: [], reference: all.find((r) => norm(r) === norm(said)) ?? all[0], coverage: 1, teacher };
  }
  let best = all[0] ?? '';
  let bestCov = -1;
  for (const r of all) { const c = Math.max(coverage(teacher.corrected, r), coverage(said, r)); if (c > bestCov) { bestCov = c; best = r; } }
  if (bestCov < 0) bestCov = 1;
  if (bestCov >= MEANING_OK) {
    return { ok: teacher.correct, corrected: teacher.corrected, mistakes: teacher.mistakes, reference: best, coverage: bestCov, teacher };
  }
  // The meaning is not the reference's: show the reference as the correct sentence, plus the words that differ.
  const mm = meaningMistakes(teacher.corrected, best);
  const grammar = teacher.mistakes.filter((m) => !mm.some((x) => x.found.toLowerCase() === m.found.toLowerCase()));
  const mistakes = [...grammar, ...mm];
  return { ok: false, corrected: best, mistakes: mistakes.length ? mistakes : diffMistakes(said, best), reference: best, coverage: bestCov, teacher };
}
