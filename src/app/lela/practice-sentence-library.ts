import type { Sentence } from '../models/learning.models';
import type { TenseId, TenseTamilItem } from './tense-data';
import { mainTense } from './tense-check';

export interface TranslationPracticeItem {
  ta: string;
  answers: string[];
  note: string;
}

export type TranslationPracticePools = Record<string, TranslationPracticeItem[]>;
export type TensePracticePools = Record<TenseId, TenseTamilItem[]>;
export interface SentenceCategorySource { id: string; sentences: Sentence[] }

export const PRACTICE_LIBRARY_LIMIT = 2000;

/** Keep the topic choices already shown by Lela; group the 40 source categories under them. */
const TOPIC_BY_CATEGORY: Record<string, string> = {
  'daily-conversation': 'Daily life', 'daily-talk': 'Daily life', 'daily-routines': 'Daily life',
  'everyday-questions': 'Daily life', 'natural-conversations': 'Daily life', 'questions-answers': 'Daily life',
  'asking-questions': 'Daily life', 'common-mistakes': 'Daily life', 'grammar-in-use': 'Daily life',
  'feelings-emotions': 'Friends & Family', 'social-situations': 'Friends & Family',
  'opinions-and-agreeing': 'Friends & Family', 'friends-relationships': 'Friends & Family', 'home-family': 'Friends & Family',
  'plans-and-invitations': 'Friends & Family', 'storytelling-past': 'Daily life', 'education-and-study-talk': 'Daily life',
  'giving-answers': 'Daily life', 'advanced-communication': 'Daily life', 'problems-and-solutions': 'Daily life',
  'polite-requests': 'Daily life', 'requesting-help': 'Daily life', 'health-and-doctor': 'Daily life',
  'office-communication': 'Workplace', workplace: 'Workplace', 'workplace-discussions': 'Workplace',
  'professional-communication': 'Workplace', 'technical-issues': 'Workplace', 'technology-talk': 'Workplace',
  'interview-answers': 'Job Interview', 'job-interviews': 'Job Interview',
  'travel-transport': 'Travel', 'travel-situations': 'Travel',
  shopping: 'Shopping', 'shopping-situations': 'Shopping', 'money-and-banking': 'Shopping',
  'restaurants-food': 'Restaurant', 'phone-calls': 'Telephone',
  'additional-practice': 'Everyday Practice – Extra',
};

const TENSE_IDS: TenseId[] = [
  'present-simple', 'present-continuous', 'present-perfect', 'present-perfect-continuous',
  'past-simple', 'past-continuous', 'past-perfect', 'past-perfect-continuous',
  'future-simple', 'future-continuous', 'future-perfect', 'future-perfect-continuous',
];

function key(value: string): string {
  return value.toLocaleLowerCase().normalize('NFKC').replace(/[^\p{L}\p{N}\p{M}]/gu, '');
}

function takeRoundRobin<T>(pools: Record<string, T[]>, limit: number): Record<string, T[]> {
  const keys = Object.keys(pools);
  const result: Record<string, T[]> = Object.fromEntries(keys.map(k => [k, []]));
  let added = 0;
  for (let index = 0; added < limit; index++) {
    let found = false;
    for (const name of keys) {
      const item = pools[name][index];
      if (item !== undefined) {
        result[name].push(item);
        added++;
        found = true;
        if (added >= limit) break;
      }
    }
    if (!found) break;
  }
  return result;
}

export function buildTranslationPracticePools(
  categories: SentenceCategorySource[],
  starter: TranslationPracticePools,
  limit = PRACTICE_LIBRARY_LIMIT,
): TranslationPracticePools {
  const topicNames = Object.keys(starter);
  const grouped: TranslationPracticePools = Object.fromEntries(topicNames.map(name => [name, []]));
  const seen = new Set<string>();

  // Preserve the existing starter questions first, including the Hotel topic that has no source category.
  for (const topic of topicNames) {
    for (const item of starter[topic] ?? []) {
      const id = key(item.ta);
      if (!id || seen.has(id)) continue;
      seen.add(id);
      grouped[topic].push(item);
    }
  }

  const libraryPools: TranslationPracticePools = Object.fromEntries(topicNames.map(name => [name, []]));
  for (const category of categories) {
    const topic = TOPIC_BY_CATEGORY[category.id] ?? 'Everyday Practice – Extra';
    for (const sentence of category.sentences) {
      const tamilKey = key(sentence.tamil);
      if (!tamilKey || seen.has(tamilKey) || !sentence.en.trim() || !sentence.tamil.trim()) continue;
      seen.add(tamilKey);
      libraryPools[topic].push({
        ta: sentence.tamil,
        answers: [sentence.en, ...(sentence.alt?.en ? [sentence.alt.en] : [])],
        note: sentence.explain || sentence.context || 'Read the English sentence and notice its grammar and word order.',
      });
    }
  }

  // The cap is shared by all topics, not 2,000 per topic. Round-robin keeps the existing choices represented.
  const selected = takeRoundRobin(libraryPools, Math.max(0, limit - topicNames.reduce((n, name) => n + grouped[name].length, 0)));
  for (const topic of topicNames) grouped[topic].push(...selected[topic]);
  return grouped;
}

/** Build the 12 tense-specific pools using the existing English/Tamil sentence pairs. */
export function buildTensePracticePools(categories: SentenceCategorySource[], starter: TensePracticePools): TensePracticePools {
  const grouped = Object.fromEntries(TENSE_IDS.map(id => [id, [...starter[id]]])) as TensePracticePools;
  const seen = new Set<string>();
  for (const id of TENSE_IDS) for (const item of grouped[id]) seen.add(key(item.ta));

  for (const category of categories) for (const sentence of category.sentences) {
    if (!sentence.en.trim() || !sentence.tamil.trim()) continue;
    const tamilKey = key(sentence.tamil);
    if (!tamilKey || seen.has(tamilKey)) continue;
    const onlineTense = sentence.practiceTense as TenseId | undefined;
    const detected = onlineTense && TENSE_IDS.includes(onlineTense) ? onlineTense : mainTense(sentence.en);
    let tense: TenseId | null = detected;
    // The source dataset's broad tags provide a safe fallback where the detector sees an unmarked base form.
    if (detected === 'present-simple') {
      if (sentence.tense === 'past') tense = 'past-simple';
      else if (sentence.tense === 'future') tense = 'future-simple';
      else if (sentence.tense === 'present-perfect') tense = 'present-perfect';
      else if (sentence.tense === 'present-continuous') tense = 'present-continuous';
      else if (sentence.tense !== 'present') tense = null;
    }
    if (!tense || sentence.tense === 'modal' || sentence.tense === 'imperative') continue;
    const words = sentence.en.toLocaleLowerCase().replace(/[^a-z' ]/g, ' ').split(/\s+/).filter(w => w.length > 2);
    const keys = [...new Set(words.map(w => w.slice(0, 4)))].slice(0, 8);
    const item: TenseTamilItem = {
      ta: sentence.tamil, model: sentence.en, keys,
      ...(sentence.sourceAttribution ? { note: `Source: ${sentence.sourceAttribution.source} · Licence: ${sentence.sourceAttribution.license} · Licence details: ${sentence.sourceAttribution.licenseUrl} · ${sentence.sourceAttribution.url}` } : {}),
    };
    grouped[tense].push(item);
    seen.add(tamilKey);
  }

  // Keep every matching source sentence. A shared 2,000-item cap left some tense pools too small.
  return grouped;
}
