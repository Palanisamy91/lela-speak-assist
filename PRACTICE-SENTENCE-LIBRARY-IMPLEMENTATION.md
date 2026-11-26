# Practice sentence library integration

## What changed

- Kept Lela's existing practice screens, topic selector, tense selector, chat bubbles, answer checking, previous/next navigation, and saved progress flow.
- Added `src/app/lela/practice-sentence-library.ts` to group existing `public/data/sentences/*.json` records into the existing Tamil-to-English topic choices and the 12 tense pools.
- The sentence library loads lazily when Tamil-to-English or Tense practice is opened. `DataService` caches fetched category files.
- Duplicate Tamil prompts are removed within each practice section. Existing built-in questions remain as starters; the Hotel topic retains its existing built-in questions because there is no Hotel category in the sentence manifest.
- The existing English-writing prompts and grammar lessons for each tense remain unchanged.

## Data totals from this project

The Tamil-to-English pool is capped at 2,000 unique existing pairs. Using the current built-in starter questions and the 6,640-record sentence library, the topic counts are:

| Existing topic | Sentences |
|---|---:|
| Daily life | 213 |
| Shopping | 213 |
| Friends & Family | 211 |
| Workplace | 211 |
| Travel | 144 |
| Restaurant | 44 |
| Job Interview | 210 |
| Telephone | 44 |
| Hotel | 2 |
| Everyday Practice – Extra | 708 |
| **Total** | **2,000** |

The Tense Tamil-to-English pool is capped at 2,000 unique existing pairs. The actual detected distribution is:

| Tense | Sentences |
|---|---:|
| Present Simple | 375 |
| Present Continuous | 375 |
| Present Perfect | 375 |
| Present Perfect Continuous | 40 |
| Past Simple | 374 |
| Past Continuous | 45 |
| Past Perfect | 10 |
| Past Perfect Continuous | 6 |
| Future Simple | 374 |
| Future Continuous | 13 |
| Future Perfect | 7 |
| Future Perfect Continuous | 6 |
| **Total** | **2,000** |

The uneven tense counts are intentional: the existing source data does not contain enough clearly classifiable examples for every tense. The implementation does not fabricate sentences or assign unrelated examples just to make the counts equal.

## Validation

- `node scripts/build-data.mjs --check`: passed; 6,640 sentence records validated.
- `node scripts/sync-db.mjs --check`: passed.
- TypeScript syntax transpilation for the changed component, pool module, and new test file: passed.
- The pool module was independently type-checked and exercised against all 40 sentence categories; both pools returned 2,000 entries.
- Full Angular build and `npm test` could not be completed in this environment because dependency installation timed out; the local install did not provide the `ng` or `tsx` executables. Please run `npm ci`, `npm test`, and `npm run build` in a normal development environment before release.


## Free online sentence sync (2026-11-25)

- Added `src/app/core/online-sentence-library.service.ts` using the public, read-only Tatoeba API over HTTPS. No API key, paid subscription, executable download, or extra npm package is required.
- The sync requests English sentences with direct Tamil translations, filters unapproved/orphan content, and accepts only CC BY 2.0 FR or CC0 1.0 records.
- Each imported pair stores the Tatoeba sentence ID, Tamil translation ID, contributor names when available, source URL, and both licences. The attribution is shown with the practice item.
- New pairs are checked against the complete bundled sentence library and the online cache using normalised English and Tamil text before they are saved.
- Up to 100 records are requested per daily sync; the local cache is capped at 3,000 records. The cursor is retained for later syncs. Online sync failure leaves all bundled and cached practice available.
- Daily practice can add up to three previously unserved online pairs. Tamil-to-English topic practice includes online pairs, and selected-tense practice requests additional examples using tense-specific search terms. Tense classification is heuristic; uncertain sentences are not forced into a tense pool.
- Preposition selection remains a lesson filter only. Its quiz continues to draw from the mixed bank across all preposition lessons.

## Validation note

The Tatoeba API integration is implemented against its published v1 OpenAPI contract. This environment could not reach the live API host during implementation, so a live network fetch and Android-device sync still need verification on a network-connected device.
