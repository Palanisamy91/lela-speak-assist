// Tamil → English Paragraph Practice data types. The 100 paragraphs live in public/data/practice/tamil-paragraphs.json.

export type ParagraphLevel = 'Beginner' | 'Intermediate' | 'Advanced' | 'Interview';
export const PARAGRAPH_LEVELS: ParagraphLevel[] = ['Beginner', 'Intermediate', 'Advanced', 'Interview'];

export interface ParagraphSentence {
  tamil: string;
  english: string;
  /** Other natural translations that are also correct (optional). */
  alternatives?: string[];
}

export interface ParagraphItem {
  id: string;            // para001 ... para100
  level: ParagraphLevel;
  topic: string;
  sentenceCount: number;
  tamil: string;
  english: string;       // the English reference; never shown before the learner submits
  sentences: ParagraphSentence[];
}

export const PARAGRAPH_DATA_URL = 'data/practice/tamil-paragraphs.json';

export function isParagraphItem(x: unknown): x is ParagraphItem {
  const p = x as ParagraphItem;
  return !!p && typeof p.id === 'string' && /^para\d{3}$/.test(p.id) && PARAGRAPH_LEVELS.includes(p.level) && typeof p.topic === 'string'
    && Array.isArray(p.sentences) && p.sentences.length > 0 && p.sentences.every((s) => typeof s.tamil === 'string' && typeof s.english === 'string')
    && p.sentenceCount === p.sentences.length;
}

/** Keeps only valid, unique paragraphs. */
export function sanitiseParagraphs(raw: unknown): ParagraphItem[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: ParagraphItem[] = [];
  for (const x of raw) {
    if (!isParagraphItem(x) || seen.has(x.id)) continue;
    seen.add(x.id);
    out.push(x);
  }
  return out;
}
