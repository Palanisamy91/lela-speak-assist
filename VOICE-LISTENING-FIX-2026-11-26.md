# Voice listening fix — 2026-11-26

- Preserve a sufficiently long interim transcript when Android/Chrome ends recognition before converting it to a final result.
- If a final phrase and an unfinished interim tail are both present, merge them without duplicating their shared boundary words.
- Improve transcript merging between restarted recognition sessions by removing suffix/prefix overlap.
- Increase Voice Session's silence-to-finish window from 2.2 seconds to 6.5 seconds so learners can pause naturally while forming longer sentences.
- Keep Auto/Voice sessions listening after no-speech and unclear prompts until the learner stops the session. Manual and Text modes remain manual by design.
- Add transcript overlap regression tests.

The UI and navigation were not changed.
