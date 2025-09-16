# AI implementation archive

This directory contains the original AI-related implementation files that were removed
from `mobile/src/` when AI usage was temporarily disabled. Files are preserved here so
they can be restored later if you decide to re-enable AI features.

Contents:
- `apiKeys.ts` - original SecureStore-backed API key helpers
- `claude.ts` - original Anthropic/Claude request implementation
- `openaiTTS.ts` - original OpenAI TTS/request implementation
- `APISetupScreen.tsx` - original API setup UI

How to restore a file

1. Copy the desired file back to `mobile/src/...` (for example):

```powershell
copy .\mobile\ai-archive\apiKeys.ts .\mobile\src\stores\apiKeys.ts
```

2. Run lint/typecheck and tests from `mobile` to ensure everything compiles:

```powershell
cd c:\Users\kapa3\bluesky-langapp\mobile
npm install
npm run typecheck
npm test
```

3. Revert any placeholder files introduced when AI was disabled (if necessary).

Security note: Do not commit real API keys back into the repo. Use SecureStore or CI secrets as appropriate.
