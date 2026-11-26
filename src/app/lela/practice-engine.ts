// The learning flows for Prepositions and Tenses, as pure functions. They return "message specs" (plain objects) that the
// Lela chat component draws with its existing bubbles, so no new screen or design is needed. No Angular here.

import type { PrepLesson, PrepQuestion } from './preposition-data';
import { isPrepAnswerAccepted, normPrep } from './preposition-data';
import type { TenseLesson, TenseTamilItem } from './tense-data';
import { TENSE_NAMES, usesTense } from './tense-check';
import { isTooShortToCheck, looksTamil, meaningLooksRight } from './grammar-feedback';
import { teachSentence } from './grammar-teacher';
import { cardFromTeacher, type CorrectionCard } from './correction-card';
import type { TenseId } from './tense-data';

/** One chat bubble. Same fields as the component's PracticeMessage, without the id. */
export interface MessageSpec {
  from: 'lela' | 'user';
  text: string;
  tamil?: string;
  boxLabel?: string;
  box?: string;
  boxOk?: boolean;
  notes?: string[];
  tamilExplain?: string;
  speak?: string;
  /** The short correction card: You wrote/said, Mistakes, Correct sentence, Tense. */
  fix?: CorrectionCard;
}

/** What the checker needs from a corrector (matches CorrectionOutcome). */
export interface OutcomeLike {
  original: string;
  corrected: string;
  changed: boolean;
  explanations: { found?: string; replacement?: string; english: string; tamil: string }[];
}

// ------------------------------------------------------------------------------------------------------------------
// Prepositions
// ------------------------------------------------------------------------------------------------------------------

/** Fill-in-the-blank questions for one preposition: the lesson's own questions first, then its examples with the word blanked. */
export function prepositionQuestions(lesson: PrepLesson): PrepQuestion[] {
  const out: PrepQuestion[] = [...lesson.questions];
  const esc = lesson.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`\\b${esc}\\b`, 'i');
  for (const e of lesson.examples) {
    if (!re.test(e.en)) continue;
    if (out.some((q) => normPrep(q.full) === normPrep(e.en))) continue;
    out.push({ blank: e.en.replace(re, '____'), full: e.en, ta: e.ta, answers: [lesson.word] });
  }
  return out;
}

/** One mixed practice bank containing questions from every available preposition lesson. */
export function allPrepositionQuestions(lessons: PrepLesson[]): PrepQuestion[] {
  const seen = new Set<string>();
  const questions: PrepQuestion[] = [];
  for (const lesson of lessons) {
    for (const question of prepositionQuestions(lesson)) {
      const id = normPrep(question.full);
      if (seen.has(id)) continue;
      seen.add(id);
      questions.push({ ...question, lessonWord: lesson.word });
    }
  }
  return questions;
}

/** Steps 1-6: the selected preposition, Tamil meaning, usage, Tamil explanation, examples with reasons. Practice starts after. */
export function prepositionLessonMessages(lesson: PrepLesson): MessageSpec[] {
  const upper = lesson.word.toUpperCase();
  const msgs: MessageSpec[] = [
    { from: 'lela', text: `Preposition: ${upper}`, tamil: lesson.tamil ? `தமிழ் பொருள்: ${lesson.tamil}` : undefined, speak: `Let's learn the preposition ${lesson.word}.` },
    { from: 'lela', text: `How to use “${lesson.word}”: ${lesson.usage}`, tamilExplain: lesson.usageTa, speak: lesson.usage },
  ];
  lesson.examples.forEach((e, i) => {
    msgs.push({ from: 'lela', text: `Example ${i + 1}: ${e.en}`, tamil: e.ta, notes: [`Why “${lesson.word}”? ${e.why}`], speak: e.en });
  });
  msgs.push({ from: 'lela', text: `Mixed preposition practice\n\nThe next questions include all prepositions, not only “${lesson.word}”. Choose or type the correct word.`, speak: 'Now let us practise with all prepositions. Choose or type the correct word.' });
  return msgs;
}

type MixedPracticeQuestion = PrepQuestion & {
  category?: string;
  explain?: string;
  explainTa?: string;
};

export function prepositionQuestionMessage(q: MixedPracticeQuestion): MessageSpec {
  return {
    from: 'lela',
    text: `Choose the correct preposition:\n\n${q.blank}`,
    tamil: q.ta,
    speak: `Choose the correct preposition. ${q.blank.replace('____', '...')}`,
  };
}

export interface PrepCheck { ok: boolean; messages: MessageSpec[] }

/** Checks one answer. Any answer in `q.answers` is accepted, and so is the whole sentence typed out correctly. */
export function checkPrepositionAnswer(typed: string, q: MixedPracticeQuestion, lesson: PrepLesson): PrepCheck {
  const said = typed.trim();
  const ok = isPrepAnswerAccepted(said, q) || normPrep(said) === normPrep(q.full);
  const main = q.answers[0] ?? '';
  const others = q.answers.slice(1);
  const category = q.category ?? 'prepositions';
  const explanation = q.explain?.trim() || lesson.usage;
  const explanationTa = q.explainTa?.trim() || lesson.usageTa;
  const notes = [
    `Question type: ${category}`,
    `Your answer: ${said}`,
    `Correct answer: ${main}${others.length ? ` (also accepted: ${others.join(', ')})` : ''}`,
    `Why: ${explanation}`,
  ];
  return {
    ok,
    messages: [{
      from: 'lela',
      text: ok ? 'Correct! அருமை!' : 'Incorrect.',
      boxLabel: 'Correct sentence:',
      box: q.full,
      boxOk: ok,
      notes,
      tamilExplain: `${explanationTa}\n${q.ta}`,
      speak: q.full,
    }],
  };
}

// ------------------------------------------------------------------------------------------------------------------
// Tenses
// ------------------------------------------------------------------------------------------------------------------

/** The lesson: name, structure, positive / negative / question, when to use it, then the starter examples with Tamil. */
export function tenseLessonMessages(lesson: TenseLesson): MessageSpec[] {
  const examples = lesson.examples.map((e, i) => `${i + 1}. ${e.en}\n    ${e.ta}`).join('\n');
  return [
    {
      from: 'lela',
      text: `${lesson.name}\n\nStructure: ${lesson.structure}\n\n+ Positive: ${lesson.positive}\n− Negative: ${lesson.negative}\n? Question: ${lesson.question}`,
      speak: `${lesson.name}. Structure: ${lesson.structure}.`,
    },
    { from: 'lela', text: `When and why to use it: ${lesson.usage}`, tamilExplain: lesson.usageTa, speak: lesson.usage },
    { from: 'lela', text: `Starter examples of ${lesson.name}:\n\n${examples}`, speak: lesson.examples.map((e, i) => `Example ${i + 1}. ${e.en}`).join(' ') },
    { from: 'lela', text: 'How would you like to practise?\n\n1. English Practice\n2. Tamil to English Practice\n3. Fill in the Blank\n\nChoose a button below, or type 1, 2 or 3.', speak: 'How would you like to practise? English practice, Tamil to English practice, or fill in the blank?' },
  ];
}

/** Parse one of the three practice choices shown after a tense lesson. */
export function parseTenseModeChoice(text: string): 'english' | 'tamil' | 'fillBlank' | null {
  const t = text.toLocaleLowerCase().replace(/[^a-z0-9஀-௿ ]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!t) return null;
  if (/^(1|one|a|option a|english|english practice)$/.test(t)) return 'english';
  if (/^(2|two|b|option b|tamil|tamil to english|tamil to english practice|tamil english|தமிழ்)$/.test(t)) return 'tamil';
  if (/^(3|three|c|option c|fill|fill blank|fill in the blank)$/.test(t)) return 'fillBlank';
  return null;
}

export function tenseEnglishPromptMessage(lesson: TenseLesson, prompt: string): MessageSpec {
  return { from: 'lela', text: `${prompt}\n\n(Tense: ${lesson.name})`, speak: prompt };
}

export function tenseTamilPromptMessage(item: TenseTamilItem): MessageSpec {
  return { from: 'lela', text: `Translate this Tamil sentence into English:\n\n${item.ta}${item.note ? `\n\n${item.note}` : ''}`, speak: 'Translate this Tamil sentence into English.' };
}

export interface TenseCheck { messages: MessageSpec[]; grammarOk: boolean; tenseOk: boolean; clarify: boolean; mistakeCount: number }

/**
 * The Tense Practice result: the whole sentence is checked (tense, verbs, agreement, articles, prepositions, plurals, spelling,
 * missing words, word order) and shown in the same short format as the other practice sessions. The learner's own sentence is
 * never replaced. `label` is "said" when the answer came from the microphone.
 */
function tenseResult(answer: string, outcome: OutcomeLike | null, lesson: TenseLesson, extraNotes: string[], tamilExtra: string[], label: 'wrote' | 'said'): TenseCheck {
  const teacher = teachSentence(answer, outcome?.corrected);
  const check = usesTense(teacher.corrected, lesson.id);
  const detectedName = check.detected ? TENSE_NAMES[check.detected] : 'another tense';
  const notes: string[] = [];
  const tamil: string[] = [];
  if (check.matches) {
    if (teacher.correct) tamil.push('உங்கள் வாக்கியம் இலக்கணப்படி சரியாக உள்ளது.');
  } else {
    notes.push(`You are practising ${lesson.name}, but this sentence is ${detectedName}. Structure: ${lesson.structure}`);
    notes.push(`Example: ${lesson.examples[0].en}`);
    tamil.push(`உங்கள் வாக்கியம் ${detectedName} போல் உள்ளது. இப்போது நாம் பயிற்சி செய்வது ${lesson.name}. அமைப்பு: ${lesson.structure}`);
  }
  notes.push(...extraNotes);
  tamil.push(...tamilExtra);
  const fix = cardFromTeacher(teacher, label, true);
  return {
    messages: [{ from: 'lela', text: `Practising: ${lesson.name}`, fix, notes, tamilExplain: tamil.filter(Boolean).join('\n'), speak: teacher.corrected }],
    grammarOk: teacher.correct,
    tenseOk: check.matches,
    clarify: false,
    mistakeCount: teacher.mistakes.length,
  };
}

function clarify(text: string, kind: 'english' | 'tamil'): TenseCheck {
  const msg = looksTamil(text)
    ? 'Please answer in English. ஆங்கிலத்தில் ஒரு வாக்கியம் எழுதுங்கள்.'
    : kind === 'english'
      ? 'I need a full English sentence to check. Please write one complete sentence. (முழு ஆங்கில வாக்கியம் எழுதுங்கள்.)'
      : 'Please write your English translation as a full sentence. (முழு ஆங்கில வாக்கியமாக மொழிபெயர்க்கவும்.)';
  return { messages: [{ from: 'lela', text: msg }], grammarOk: false, tenseOk: false, clarify: true, mistakeCount: 0 };
}

/** English Practice: the learner writes an English sentence. It is checked for grammar and for the selected tense. */
export function checkTenseEnglish(answer: string, lesson: TenseLesson, outcome: OutcomeLike | null, label: 'wrote' | 'said' = 'wrote'): TenseCheck {
  if (isTooShortToCheck(answer) || looksTamil(answer)) return clarify(answer, 'english');
  return tenseResult(answer, outcome, lesson, [], [], label);
}

/** Tamil to English Practice: any correct translation is accepted; the model translation is only shown as one possibility. */
export function checkTenseTamil(answer: string, lesson: TenseLesson, item: TenseTamilItem, outcome: OutcomeLike | null, label: 'wrote' | 'said' = 'wrote'): TenseCheck {
  if (isTooShortToCheck(answer) || looksTamil(answer)) return clarify(answer, 'tamil');
  const corrected = teachSentence(answer, outcome?.corrected).corrected;
  const extra: string[] = [];
  const tamilExtra: string[] = [];
  if (!meaningLooksRight(corrected, item.keys)) {
    extra.push('I cannot be sure your sentence has the same meaning as the Tamil sentence. Please compare it with the example below.');
    tamilExtra.push('உங்கள் வாக்கியத்தின் பொருள் தமிழ் வாக்கியத்தோடு ஒத்துப்போகிறதா என்று கீழே உள்ள எடுத்துக்காட்டுடன் ஒப்பிட்டுப் பாருங்கள்.');
  }
  extra.push(`One possible translation: ${item.model}`);
  return tenseResult(answer, outcome, lesson, extra, tamilExtra, label);
}

export const TENSE_IDS: TenseId[] = [
  'present-simple', 'present-continuous', 'present-perfect', 'present-perfect-continuous',
  'past-simple', 'past-continuous', 'past-perfect', 'past-perfect-continuous',
  'future-simple', 'future-continuous', 'future-perfect', 'future-perfect-continuous',
];
