# Lela online sentence sync implementation report

## Preservation

- Work was performed on a separate extracted copy of `lela-english-companion-practice-pool-fix.zip`.
- The original ZIP and its source files were not overwritten.
- Existing routes, component layout, sentence JSON files, preposition lessons, Capacitor configuration, and package dependencies were retained.
- No new npm package was added.

## Implemented changes

1. Added `src/app/core/online-sentence-library.service.ts`.
   - Uses the public Tatoeba v1 read-only API over HTTPS.
   - Requests English sentences with direct Tamil translations.
   - Filters unapproved/orphan records and accepts only `CC BY 2.0 FR` and `CC0 1.0` sentence/translation licences.
   - Saves source sentence ID, translation ID, author names when available, sentence URL, licence names, and licence URLs.
   - Downloads text/JSON only; it does not download or execute files.
   - Checks normalised English and Tamil text against all bundled sentence categories and the online cache before saving.
   - Syncs at most once every 24 hours, uses a 30-minute retry backoff after network errors, stores a cursor, and keeps an offline cache capped at 3,000 pairs.
   - Provides up to three unseen online pairs to the daily lesson and persists that day's selected IDs.
   - Fetches additional candidates when a learner selects a tense, with a per-tense daily request limit.

2. Added `src/app/lela/online-tense-classifier.ts`.
   - Classifies clear examples into the 12 tense groups.
   - Uses the existing tense detector as a guard and leaves uncertain clauses out of the tense pools instead of guessing.

3. Updated `src/app/lela/lela.component.ts`.
   - Merges cached/fetched pairs into Tamil-to-English topic practice and tense practice.
   - Adds targeted tense results to the Tamil-to-English Daily life pool too.
   - Keeps existing practice messages and navigation; the online results are appended to pools.

4. Updated `src/app/core/lesson.service.ts`.
   - Adds up to three new, previously unserved online pairs to today's existing daily sentences.
   - The bundled daily lesson remains the offline fallback.

5. Updated `src/app/models/learning.models.ts`, `src/app/lela/tense-data.ts`, `src/app/lela/practice-sentence-library.ts`, and `src/app/lela/practice-engine.ts` for optional source attribution and online tense metadata.

6. Added `test/online-sentence-library.test.ts` for tense-classification checks.

7. Existing preposition behavior was already present in the input ZIP and was preserved: selecting a word displays its lesson, while the quiz uses the mixed question bank across all preposition lessons.

## Verified project data

- Bundled sentence dataset: 6,640 records across 40 categories.
- Current classified Tamil-to-English tense pool: 5,279 entries total.
- Tense pool counts from the bundled data:
  - Present Simple: 1,350
  - Present Continuous: 755
  - Present Perfect: 807
  - Present Perfect Continuous: 40
  - Past Simple: 1,287
  - Past Continuous: 45
  - Past Perfect: 10
  - Past Perfect Continuous: 6
  - Future Simple: 953
  - Future Continuous: 13
  - Future Perfect: 7
  - Future Perfect Continuous: 6
- Preposition bank: 47 lessons, 141 bilingual examples, and 141 fill-in questions.

The small counts for some perfect/continuous tenses are caused by the lack of enough confidently classifiable sentences in the bundled source data. The online source may add examples when it has suitable Tamil translations; it cannot guarantee a fixed count for every tense.

## Checks completed

- `node scripts/build-data.mjs --check` — passed; 6,640 sentence records validated.
- `node scripts/sync-db.mjs --check` — passed.
- `node --test test/data.test.mjs` — passed, 10 tests.
- Pure tense-classifier check — passed, 12 tense examples plus 2 uncertain-sentence safeguards.
- Strict TypeScript check for the new online service and its direct dependencies using temporary Angular/RxJS type stubs — passed.
- TypeScript syntax transpilation for all modified TypeScript files — passed.

## Not verified in this environment

- `npm test` and the full Angular production build were not run because `node_modules` is not present in the supplied project.
- A live request to the Tatoeba API could not be completed because this environment could not resolve the API host. The integration follows the published v1 API contract, but the first online sync must still be verified on a network-connected browser/Android device.
- Online availability depends on Tatoeba having direct Tamil translations for the requested English sentences. The bundled and cached content continues to work offline.

## Manual free-sentence option (25 Nov 2026)

- Added a **Get free new sentences** action to the Tamil-to-English Sentence Practice controls.
- The action forces a Tatoeba refresh instead of waiting for the normal 24-hour automatic sync window.
- Newly discovered, deduplicated Tamil-English pairs are appended to the **Daily life** topic; the learner can select that topic and practise them immediately.
- The button is disabled while fetching and when the device is offline. It displays a status message if no new pairs are available or the source cannot be reached.
- Existing automatic sync, offline cache, daily lesson and tense-specific sync remain in place.

## Manual free-sentence option expanded to all practice areas (25 Nov 2026)

- Tamil-to-English: retained **Get free new sentences**, which adds deduplicated Tamil-English pairs to the Daily life topic.
- Tense Practice: added **Get free tense examples** for the currently selected tense. It performs a forced free-source refresh, then only adds examples that the 12-tense classifier confidently assigns to that selected tense. The additions also enter the Daily life translation pool and the selected tense's English prompt examples.
- Today's Daily Practice: added **Get free daily sentences** on the sentence step and **Add free sentences to daily practice** on the practice step. New unseen pairs are appended to today's lesson; if the learner is already on the practice step, the exercise set is rebuilt to include the expanded lesson.
- All three options use the existing Tatoeba integration, attribution/licence metadata, duplicate checks and offline cache. No paid API or new npm dependency was added.
- A no-results/network message is shown instead of fabricating content. Tatoeba may not have enough direct Tamil translations or confidently classifiable examples for every tense.
