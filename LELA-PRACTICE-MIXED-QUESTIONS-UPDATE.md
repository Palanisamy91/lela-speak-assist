# Lela practice pool update

## Tense practice
- Removed the shared 2,000-item cap from the 12 tense-specific practice pools. All matching, unique Tamil-English pairs from the existing sentence library are retained.
- English Practice now includes the original lesson prompts plus one guided writing prompt for every existing sentence classified under the selected tense.
- Tamil-to-English Practice uses the full selected-tense pool.
- No new example sentences are fabricated. Rare tenses remain limited when the source library contains only a few correctly classified examples.

## Preposition practice
- Selecting a preposition still shows its Tamil meaning, usage and examples first.
- The practice questions now come from the combined question bank for all available preposition lessons, not only the selected word.
- Each mixed question retains its source lesson so the explanation after answering matches the question.
- The standalone Prepositions screen also keeps its quiz mixed when a word is selected for lesson details.

## Validation
- Existing sentence data check: passed (6,640 sentence records).
- Existing database check: passed.
- Pure TypeScript practice modules compiled successfully.
- Source-library check found 5,279 unique tense practice pairs across the 12 tenses; counts vary by tense.
- Mixed preposition bank: 282 questions across all 47 built-in lessons.
- TypeScript syntax transpilation passed for all modified source and test files.
- Full `npm test` and Angular production build were not run because dependency installation could not complete in this environment.
