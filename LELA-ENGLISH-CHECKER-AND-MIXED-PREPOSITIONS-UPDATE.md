# Lela sentence checking and mixed preposition practice update

## Implemented changes

- Daily lesson > Practice now includes a free-text sentence checker. The learner can type any English sentence and receive the original sentence, a corrected version, individual word/phrase changes, and a detected tense when available.
- The daily checker runs the existing `CorrectionService` first and then the existing `teachSentence` grammar/tense checker. It reuses the project's offline correction rules and does not claim to be a full AI grammar checker.
- Tamil-to-English practice now also runs the same grammar/tense checker on the learner's submitted translation and displays grammar changes alongside the existing translation feedback.
- Prepositions now load from the built-in `PREPOSITION_LESSONS` bank first, so the section works offline even when `data/prepositions-500.json` is absent. The optional external list is merged when available.
- The Prepositions screen now includes examples and Tamil explanations when a word is selected. Leaving the search empty gives mixed practice across the complete preposition bank; a visible action returns from a selected-word lesson to all-preposition practice.
- Existing Lela chat translation and 12-tense practice flows remain in place and continue using their existing sentence checking logic.

## Existing preposition bank

- 47 preposition/phrase lessons
- 141 English/Tamil example entries
- 141 fill-in practice questions

## Validation performed

- `npm run data:check` — passed (6,640 sentence records validated).
- `npm run db:check` — passed.
- `node --test test/data.test.mjs` — passed (10 tests).
- TypeScript syntax transpilation — passed for the three modified Angular component files.
- The grammar teacher was compiled independently and manually checked on sample correct/incorrect sentences.

## Not verified in this environment

The project ZIP does not contain `node_modules`, so the complete Angular template compiler/build and the full TypeScript test suite were not run. Run `npm ci`, `npm test`, and `npm run build` before publishing the Android app.

## Checker limitation

The checker is offline and rule-based. It can detect many common tense, agreement, spelling, article, preposition and word-order errors, but it cannot guarantee that every possible sentence is correct or identify every valid natural alternative. It shows this limitation in the UI rather than pretending to provide perfect AI-level checking.
