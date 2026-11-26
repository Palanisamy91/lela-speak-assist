# Paragraph Practice, Full Tense Grammar Teacher, Voice Session microphone control

## What changed (existing project, nothing removed)

| Area | Files |
|---|---|
| Paragraph Practice inside Tamil → English | `lela.component.ts` (toggle, difficulty, panel), `paragraph-data.ts`, `paragraph-checker.ts`, `public/data/practice/tamil-paragraphs.json` (para001–para100) |
| Meaning-aware checking | `sentence-checker.ts` |
| Full grammar teacher (all 12 tenses) | `grammar-teacher.ts`, `verb-forms.ts`, `practice-engine.ts` (Tense Practice now uses it) |
| One short correction format | `correction-card.ts`, drawn by the existing chat bubble in `lela.component.ts` |
| Results line (total / correct / incorrect / mistakes / score) | `lela.component.ts` |
| Voice Session microphone control | `lela-conversation.service.ts`, `lela.component.ts` |
| Tests | `test/grammar-teacher.test.ts`, `test/paragraph.test.ts`, `test/voice-session.test.ts`, `test/practice.test.ts` (old tense assertions updated to the new format) |

## Decisions you should check

1. **"Voice Session" = the Voice and Auto header buttons.** The app has four header modes. Voice (the default) had a manual microphone; Auto was the only hands-free one and kept the microphone open while Lela spoke (barge-in). Both now run the same strict Voice Session. Manual and Text are normal chat with no automatic listening. Daily Practice, Interview and every practice session close the Voice Session first. Barge-in while Lela speaks is switched off because it contradicts "microphone never active while Lela speaks". If you meant only one of the two buttons, change `isVoiceSession()` at the top of `lela.component.ts`.
2. **Tamil → English Sentence Practice** previously accepted only exact matches. It now checks the whole sentence and accepts natural alternatives.
3. After the user stops talking in a Voice Session, listening ends after about 2.2 s of quiet (it was 10 s) so the microphone is turned OFF promptly.

## Voice Session behaviour (as implemented)

Start: microphone OFF → Lela speaks → the real end of speech turns the microphone ON → user speaks → recognition stops → Lela processes and speaks with the microphone OFF → the real end of speech turns it ON again.

- No fixed timer decides that Lela finished. The 300 ms pause in the service runs only after the real end of speech.
- Recognition is stopped before any speech starts. Overlapping recognition sessions are prevented.
- If Lela's speech fails, the microphone does not start; the status says so.
- Stop: speech and microphone stop at once, no submit, no restart, microphone stays OFF. Leaving or re-entering: pending restarts are cancelled; re-entering starts a fresh conversation with Lela speaking first.
- Status pill: "Microphone ON · Listening…" only while recognition is running; "Microphone OFF · Lela is speaking / thinking" otherwise.

Note: at the start the app still asks for the microphone *permission* (not recognition) so the permission prompt appears when the user opens the session.

## Known limits (please read)

- The grammar teacher is rule-based, not AI. It covers the common mistakes listed above and can miss others. It has no general spell-checker (a list of ~100 common misspellings).
- Meaning comparison uses key words, a small synonym list and tense/word-form tolerance. A sentence with one wrong word among several correct ones may be accepted; a valid but completely re-worded translation may be shown as "meaning differs".
- Spoken answers without punctuation are split to match the reference sentences; the learner's own words are never changed.

## Verification actually done

- `tsc` and the Angular compiler (`ngc`, strict templates) pass with no errors.
- `npm test`: 124 tests, 122 pass. The 2 failures (`prepositions: selecting ON…` and `translation evaluator marks a close attempt as close…`) fail identically on the original upload; they are unrelated to this work.
- Data: 100 paragraphs, unique ids para001–para100, Beginner 30 (3–4 sentences), Intermediate 30 (5–7), Advanced 25 (8–12), Interview 15 (5–10), no repeated sentences; all 551 reference sentences are accepted by the grammar teacher (0 false alarms).
- Voice Session: tested on the real service with a fake speech engine that flags any overlap of microphone and speech (first greeting, 3 full cycles, Stop while speaking, Stop while listening, speech failure, exit, re-entry, non-session modes).

## NOT verified

- `ng build` could not run here (the uploaded `node_modules` holds Windows-only esbuild binaries). Run `npm ci && npm run build` on your machine.
- Real microphone, real speech synthesis, Android permissions and the APK were not tested. Please test on a phone: open Voice, confirm Lela speaks first and the pill reads OFF, then ON only after she finishes.
- The Tamil text of the 100 paragraphs was written by me and should be read by a Tamil speaker before release.
