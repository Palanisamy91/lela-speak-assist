import type { TenseId } from './tense-data';
import { mainTense } from './tense-check';

/** Conservative pattern classification; unrecognised sentences are not forced into a tense pool. */
export function classifyOnlineTense(sentence: string): TenseId | null {
  const text = sentence.toLocaleLowerCase().replace(/[’']/g, "'").replace(/[^a-z0-9' ]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!text) return null;
  const detected = mainTense(text);
  const patterns: Array<[TenseId, RegExp]> = [
    ['future-perfect-continuous', /\b(will|shall) have been\b[^.?!]*\b\w+ing\b/],
    ['future-perfect', /\b(will|shall) have\b[^.?!]*\b\w+(ed|en|wn|ght|pt|lt|nt|aid|old|ung|unk|one|ade|oke|een|own|ought|ent|ore|ung|ung)\b/],
    ['future-continuous', /\b(will|shall) be\b[^.?!]*\b\w+ing\b/],
    ['future-simple', /\b(will|shall)\s+(not\s+)?[a-z]+\b/],
    ['present-perfect-continuous', /\b(have|has) been\b[^.?!]*\b\w+ing\b/],
    ['present-perfect', /\b(have|has)\b[^.?!]*\b\w+(ed|en|wn|ght|pt|lt|nt|aid|old|ung|unk|one|ade|oke|een|own|ought|ent|ore)\b/],
    ['past-perfect-continuous', /\bhad been\b[^.?!]*\b\w+ing\b/],
    ['past-perfect', /\bhad\b[^.?!]*\b\w+(ed|en|wn|ght|pt|lt|nt|aid|old|ung|unk|one|ade|oke|een|own|ought|ent|ore)\b/],
    ['past-continuous', /\b(was|were)\b[^.?!]*\b\w+ing\b/],
    ['present-continuous', /\b(am|is|are)\b[^.?!]*\b\w+ing\b/],
  ];
  for (const [id, pattern] of patterns) if (detected === id && pattern.test(text)) return id;
  if (detected === 'past-simple') return detected;
  // The remaining uncomplicated clause is treated as present simple. It is still a heuristic, not a parser.
  if (!/\b(was|were|did|had|will|shall|would|could|should|might|must|am|is|are|have|has)\b/.test(text)) return 'present-simple';
  return null;
}

