# Lela update: Prepositions, Tenses, Grammar feedback

## Root cause of the empty Prepositions dropdown
The chat loaded `data/prepositions-500.json`. That file is **not in the project ZIP** (not in `public/data`, `data-src` or anywhere else), so the request failed and the dropdown stayed empty. 47 prepositions are now built into the app (`src/app/lela/preposition-data.ts`). If you restore `public/data/prepositions-500.json`, any extra words in it are merged in; built-in lessons are never replaced or removed.

## Modified files
- `src/app/lela/lela.component.ts` (menu label, Tenses and Prepositions flows, correction display, "could not hear you" message)
- `src/app/services/correction.service.ts` (+11 narrow grammar rules, 61 in total)
- `test/correction.test.ts` (new cases)

## New files
- `src/app/lela/preposition-data.ts`, `tense-data.ts`, `tense-check.ts`, `grammar-feedback.ts`, `practice-engine.ts`
- `test/practice.test.ts`, `test/tense.test.ts`

## Not changed
Voice settings, speech services, Auto voice default, styles (CSS), routes, data JSON. The only template changes: the menu text "12 Tenses" → "Tenses", two practice buttons that reuse the existing `prep-choice` button style, and the removal of the old Yes/No panel for prepositions.

## Run
```
npm install
npm test            # tsx --test test/*.test.ts
npm run build       # Angular production build
npx cap sync android && cd android && ./gradlew assembleDebug
```
