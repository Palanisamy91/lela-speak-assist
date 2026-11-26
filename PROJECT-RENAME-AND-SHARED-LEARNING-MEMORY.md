# Lela Speak Assist — Shared Learning Memory

Project display name: **Lela Speak Assist**. The Android application ID remains `com.palanisamy.myenglishbuddy` so an APK signed with the same key can update the existing installation.

## Shared learning memory
- Speak with Lela and Chat with Lela now use one combined conversation history on this device.
- Existing voice and text history keys are migrated and retained for compatibility.
- Chat can answer recall requests about previous vocabulary, corrected sentences, and recent practice topics.
- Conversation vocabulary continues to be collected into the existing Vocabulary → From my conversations list.
- History is stored locally on the device; it is not synced to a cloud account.

## Build
Run `npm install`, `npm run build`, then `npx cap sync android`. Build the APK using the existing GitHub Actions workflow.
