# Lela Chat UI V1.0 merged into Lela Speak Assist

## What was merged
- Base project: Lela-English-Companion (Home screen, all learning pages, side/bottom navigation are unchanged).
- From LELA-CHAT-UI-V1.0-TS2300-Fix: the newer `lela-conversation.service.ts` (Auto/Manual listening, `newConversation(modeId)`, voice fallback fixes) and the full-screen shell in `app.ts`.
- `lela.component.ts` was rebuilt to match the supplied design image (see below).

## Navigation
- Home → **Speak with Lela** (`/lela`) opens the new chat design full screen. The app navigation is hidden there.
- Home → **Chat with Lela** (`/chat`) now redirects to `/lela?mode=text` (the same design, Text mode). The old separate ChatComponent is no longer routed, so there is one chat screen only.
- Hamburger menu inside Lela: Home, Conversation history, Favourites, My Dictionary, Preposition practice, Voice settings, How Lela works.

## Screen (matches the design image)
- Header: hamburger, avatar, "Lela", Online · status, segmented Auto / Manual / Text / Voice.
- Lela bubbles with avatar and Listen / Practise this sentence / Favourite buttons; user bubbles on the right.
- Green **Correct sentence:** box and **தமிழ் விளக்கம்:** Tamil explanation.
- Composer: Chat, Speak, Stop, text box, Send.
- Toolbar: Topic, Tamil → English, Interview, 12 Tenses, Preposition, Daily Practice, My Dictionary, End.
- Phones (≤560px): the mode pill moves to its own row; labels stay on one line down to 360px width.

## No duplicate sentences or words
- Each correction is shown once: the corrected sentence appears in the green box only, unless Lela's own text already contains it (then no second copy is added).
- Tamil → English: the Tamil sentence is shown once (in the question), not repeated in the answer. The separate "Correct!" strip was removed (the verdict is in the bubble).
- Tamil sentences are de-duplicated across topics, asked in a shuffled order, and never repeat until the topic is finished; a reshuffle never starts with the sentence just asked.
- Preposition practice: duplicate example sentences are removed, and any example where the preposition cannot be blanked out is skipped so the answer is never shown in the question.
- Changing the tense/direction while the next question is pending cancels the pending question (no double question).
- Starting Lela is guarded, so tapping Speak/Send while she loads cannot start two conversations (no double greeting).
- Code: no duplicate identifiers (TS2300 scan clean); helpers live at module level, each declared once.

## Behaviour notes
- Lela opens in **Voice** mode with the microphone off (no permission prompt on load). Tap **Auto** for hands-free listening.
- Preposition practice is available from the existing toolbar and hamburger menu; it stays in the same Lela chat.
- Tenses: selecting a tense shows its structure and eight examples with Tamil meanings; Lela asks Yes/No, then checks the learner’s own typed or spoken sentences with the existing rule-based corrector. Prepositions: Lela speaks the examples and the complete answer sentence; the visible prompt has one blank marker (`____`).

## Validation done
- Data tests 10/10; data builder reports 8,019 vocabulary entries and 6,640 sentences.
- Unit tests: 62/64 pass. The 2 failures (`correction.test.ts`, translation-evaluator "close attempt") also fail in the untouched Companion zip.
- TypeScript check of the new component against an Angular type shim: no errors apart from shim limits; no duplicate identifiers.
- Visual check of the screen CSS at 360px and 820px width.
- NOT run: `ng build` (no network here to install Angular). Run `npm install && npm run build` before building the APK.

## Latest practice-flow update

- The existing Lela chat layout is unchanged. The Tenses practice now teaches the selected tense first (structure + eight examples with Tamil), asks whether the learner wants to practise, and then checks the learner’s own sentence instead of asking for translation.
- Preposition practice retains Lela voice, uses a single blank marker, and speaks the complete correct sentence after the answer.
- The sentence library now includes 3,000 additional unique records in `Additional English Practice`.
