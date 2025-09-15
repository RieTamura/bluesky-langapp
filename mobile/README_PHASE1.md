Phase 1: Minimal integration templates

Files added:
- assets/ngsl.json
- src/stores/apiKeys.ts
- src/stores/userLevel.ts
- src/services/ngslService.ts
- src/services/claude.ts
- src/services/openaiTTS.ts
- src/screens/LevelSelectionScreen.tsx
- src/screens/APISetupScreen.tsx

Notes:
- This is a minimal template to get the feature flow working: level selection -> API key setup -> example generation -> TTS playback.
- The service endpoints in `claude.ts` and `openaiTTS.ts` are placeholders and must be adjusted to real provider endpoints and request schemas.
- Dependencies likely needed (install in mobile project):
  - expo-secure-store
  - expo-file-system
  - expo-av

Quick test steps (Expo managed workflow, PowerShell):

1. Open PowerShell and start the Metro server from `mobile`:

```powershell
cd c:\Users\kapa3\bluesky-langapp\mobile
npm install
npm run start
```

2. In the Expo app (simulator or device), follow the flow:
  - Login (use existing app credentials or a test account)
  - You will be taken to `LevelSelection` — choose a level and confirm
  - You will next see `APISetup` — paste your OpenAI and Anthropic keys and tap `Save Keys`
  - Tap `Quick Test: Generate + Play` to request an example sentence and play it via device TTS
   - Tap `Quick Test: Generate + Play` to request an example sentence and play it via device TTS.

  Notes:

  - If you don't provide API keys, the quick test will still run but it will use the device's local TTS for playback. The Claude request will fail without an Anthropic key.

  - After a successful quick test the flow navigates to the main app.

Security note:
- API keys are stored locally in SecureStore per the design; do not commit real keys into the repo.

Attribution:

- This project includes a sample of the NGSL (New General Service List) wordlist. NGSL is provided under the Creative Commons Attribution-ShareAlike 4.0 International License (CC BY-SA 4.0). See `mobile/CREDITS.md` for details and source URL.
