# Lela – voice listening fix (item 15): changes and test report

Scope: speech *recognition* only. Speech synthesis, voice choice (Automatic), Auto settings, UI and the Speak/Stop controls are untouched.

## Root causes found
1. **No noise gate.** Engines return junk for fan/TV/traffic noise ("the", "uh", "[Music]", a lone "I"). Nothing rejected it, so it reached the chat. (Browser and Android.)
2. **Low-confidence text leaked.** `[Unclear]` text was stripped in the Speak box but *not* in Lela's main conversation (`listenOnce`), which merged it as real speech.
3. **Interim text promoted to final.** If a browser session ended with only interim text, it was submitted as a final message.
4. **Stale Android sessions.** A new native session could start while the previous one was still stopping; the old session's late partial results / "stopped" event then hit the new session (old words, or a session that ended instantly).
5. **Stale handlers.** A cancelled recogniser's late events were not detached.
6. **No interruption handling** on Android when the app goes to the background.

## What changed
- `core/speech-guard.ts` (new): noise detection. Whole sentences are never rejected; one-word fillers/function words, sound tags, symbol-only results are. It never rewrites or completes words.
- `core/transcript.ts`: noise results dropped (interim and final); new `finalReliable` (excludes `[Unclear]`).
- `services/speech.service.ts`: clean state at every session start; handlers detached on cancel and ignored when stale; the same final text is emitted once; unreliable-only speech and unfinished interim text are **not** submitted (new error `unclear`: "I couldn't hear that clearly. Please say it again"); interim text is kept only when the session was ended on purpose (Stop / end of turn) and is flagged uncertain; Android: listening stops when the app is backgrounded (new error `interrupted`).
- `core/native-speech.ts`: sessions are serialised (next start waits for the previous native stop); results before "listening" and early "stopped" events are ignored; one retry with en-US if en-IN is not installed.
- Consumers (`voice-input`, `lela-conversation.service`): handle `unclear` (Lela asks to repeat) and `interrupted` (no auto-restart).
- Checked, no change needed: mic is **not** started when the app opens (default mode is Voice with mic off); original sentence and corrected sentence are already shown separately.

## Test report

### Desktop / automated (run here, Node, `npm test`)
| # | Case | Result |
|---|------|--------|
| 2,3 | Silence / noise results (empty, "uh", "the", "[Music]", symbols) produce no text | PASS (unit) |
| 8,9 | Short and long real sentences kept | PASS (unit) |
| 5,6,7 | Slow speech in several pieces keeps order, no loss | PASS (unit, on recogniser output) |
| 10,11 | Interim→final and repeated finals not duplicated | PASS (unit) |
| 15 | Only-unclear speech yields nothing to submit | PASS (unit) |
| – | Android permission/error mapping incl. language fallback | PASS (unit) |
Suite: 72 pass, 2 fail. The 2 failures (`correction.test.ts`, translation-evaluator "close") fail identically in the original zip and are unrelated.

### NOT tested (could not be, in this environment)
No browser microphone, no Android device/SDK, and `node_modules` could not be installed (no network), so the Angular build was **not** run, and nothing below was exercised against a real engine:
- Cases 1, 4, 12, 13, 14, 16, 18 on desktop Chrome; **all 18 cases on a real Android APK**.
- The Angular service/adapter changes were only type-checked (no new errors in the edited files) – not executed.
**Please run the checklist below on your phone before relying on this.** Do not treat Android speech as verified.

### Device checklist (desktop Chrome, then real APK)
Start mic · 10 s silence → nothing appears · fan/TV noise → nothing appears · normal / slow-with-pauses / fast sentences · short & long sentences · Stop ends listening · Speak again starts clean (no old words) · mumbled speech → "please say it again" · deny mic permission → clear message (Android: "Open app settings") · switch app and return → listening stopped, tap Speak works · Lela's voice replies still work.

## Android: what is and isn't possible
- The APK does **not** rely on the WebView's Web Speech API (which Android WebView doesn't provide reliably). It already uses Android's native `SpeechRecognizer` through `@capacitor-community/speech-recognition`. No new plugin was added.
- That plugin returns **no confidence scores**, so on Android noise filtering is text-based only; a noise phrase that looks like a real sentence cannot be detected. It also does not expose silence-length settings, so Android's engine may end a session at ~1–2 s pauses; the app restarts it (existing behaviour), and a few words spoken in the restart gap (~0.3–0.5 s) can still be missed. A beep on restart is system behaviour on some phones.
- Fully fixing those two needs a small custom native plugin (Java, `RecognizerIntent` extras + `EXTRA_CONFIDENCE_SCORES`). I did not write it untested; I can do it if you can build and test on a device.
- Accuracy ultimately depends on the phone's speech service (Google Speech Services), internet and accent.
