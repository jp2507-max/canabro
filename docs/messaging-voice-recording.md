# Messaging Voice Recording Status

Status: Not Implemented (Mock Removed)

Decision: Voice recording is currently out of scope. The prior mock has been removed to avoid misleading UX, and no recording implementation will be shipped at this time.

Current behavior
- components/messaging/MessageComposer.tsx shows a disabled microphone placeholder when voice messages are enabled but no message can be sent.
- Text input, emoji picker, and attachment flows remain fully functional.
- No timers, fake URIs, or simulated recordings exist in production code.

Rationale
- Avoids deceptive/non-functional UX in production flows, consistent with project guidelines in .cursor/rules.
- Defers platform-specific complexity (permissions, audio modes, uploads) until a full product requirement is defined.

Re-enable in the future
If/when voice recording is prioritized, see commit history and the following high-level steps:
1) Dependencies: add expo-av compatible with the app’s Expo SDK.
2) Permissions: iOS NSMicrophoneUsageDescription; Android runtime permission validation.
3) Recording lifecycle: Audio.setAudioModeAsync, Audio.Recording.createAsync, stopAndUnloadAsync, getURI.
4) Data model: reuse VoiceMessage { uri: string; duration: number; waveform?: number[] }.
5) Storage: upload to Supabase Storage prior to send (mirror existing image upload utility).
6) UI/Accessibility: mic idle state, recording state with elapsed time, stop/cancel; accessible labels and roles.
7) Cleanup: unmount cleanup for timers/animations; handle permission denial and rapid taps.

References
- Expo SDK docs (Audio/Recording) can be consulted when re-enabling the feature.
- Follow project conventions (NativeWind styling, haptics, Reanimated practices, strict TS).

Status QA checklist (now)
- Placeholder mic is disabled and non-interactive.
- No background timers or recording state is present.
- Send button availability is unchanged except for normal text/attachments logic.
