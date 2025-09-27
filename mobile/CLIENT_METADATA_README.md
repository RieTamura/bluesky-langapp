# How to use the test client metadata JSON for local development (AT Protocol / Bluesky)

## File location

- `mobile/client-metadata.json` (already added)

## Goal

- Provide a minimal client metadata document for local development.
- Use it to exercise the authorization flow endpoints.
- This file is a development convenience. Real deployments must host an HTTPS-accessible client metadata document.
- Real deployments must also follow AT Protocol OAuth requirements. Examples: PAR, PKCE, DPoP.

## Local development workflows (recommended)

Option A — Loopback / localhost client_id (fast, local only)

- Use a `client_id` that starts with `http://localhost` for local testing.
- The AS may accept a derived metadata document for `http://localhost` clients.
- Run a local static server in the `mobile` folder to serve the metadata.

```bash
cd mobile
npx http-server -p 8000
# or
npx serve -s . -p 8000
```

- When running on port 8000, use this client_id example:

  `http://localhost:8000/langapp-client-metadata.json`

- Include the port in redirect URIs. Example:

  `http://127.0.0.1:8000/callback`

- If you need HTTPS for a device, use a tunnel service such as ngrok.

```bash
npx ngrok http 8000
```

- Paste the resulting URL (or the GitHub raw URL from Option B) into the app's manual field.

Security note about tunnels

- Exposing a local server makes it reachable from the public internet.
- This can expose sensitive data if your host serves more than the client metadata file.
- Treat any tunnel URL as sensitive.

Actionable security precautions

- Never commit secrets. Do not commit `client_secret` or private keys.
- Remove secrets before committing and add those files to `.gitignore`.
- If a secret was committed, rotate or revoke it immediately.
- Purge secrets from git history when feasible.
- Use environment variables or a secrets manager.
  - Examples: Vault, AWS Secrets Manager, GCP Secret Manager, GitHub Actions secrets.
- Prefer server-side token exchange. Do not embed client secrets in mobile apps.
- For native apps, use Authorization Code with PKCE instead of a client secret.
- Store tokens in platform secure storage (Keychain or Keystore).
- Restrict credentials to least-privilege scopes and specific redirect URIs.
- Use short-lived tokens. Rotate and revoke credentials regularly.
- Avoid logging secrets. Scrub tokens from logs and telemetry.

Checklist for safe local development and deployment

- Add dev-only secret files to `.gitignore`.
- Verify `mobile/client-metadata.json` has only development values.
- When using ngrok, configure an auth token or reserved subdomain.
- Restrict access and enable basic auth if needed.
- After testing, stop tunnels and inspect server logs.
- Use HTTPS in production. For dev, use short-lived tunnels.
- Audit scopes and redirect URIs in the authorization server.
- If a secret is leaked, rotate it and search commit history.

Option B — Host on GitHub (quick public HTTPS)

- Commit `mobile/client-metadata.json` and push to GitHub.
- Use the raw URL, for example:

  `https://raw.githubusercontent.com/<your-user>/<your-repo>/main/mobile/client-metadata.json`

- Paste that raw URL into the app's manual client metadata field.

Notes about `app.json` and the `extra` section

- The `extra` section in `mobile/app.json` holds runtime configuration.
- Example keys: `apiUrl`, `blueskyClientId`, `useAuthProxy`, `authProxyUrl`.
- Keep secrets out of `extra`. Load secrets from env vars or a secure endpoint.

How to verify deep links / intentFilters (quick guide)

1. Confirm `intentFilters` exists in `mobile/app.json` under `android`.
   It should look like:

   ```json
   "intentFilters": [
     {
       "action": "VIEW",
       "category": ["DEFAULT", "BROWSABLE"],
       "data": { "scheme": "blueskylearning" }
     }
   ]
   ```

2. On Android emulator or device

   - Build and install the app (Expo or EAS). For local dev with expo-cli:

     ```bash
     expo prebuild
     expo run:android
     ```

   - From the device or emulator shell, send an intent:

     ```bash
     adb shell am start -a android.intent.action.VIEW -d "blueskylearning://auth" com.rietamura.bluelang
     ```

   - The app should open and handle the URL. Check `adb logcat` if it does not.

3. On iOS simulator or device

   - For custom URL schemes, open the URL from Safari or use simctl:

     ```bash
     xcrun simctl openurl booted "blueskylearning://auth"
     ```

   - The app should open and handle the URL.

4. Verify the app receives the incoming URL in your code.
   - Check the deep link handler or auth callback processing.
   - Add debug logging while testing.

Important notes from the AT Protocol spec (what to expect)

- The AT Protocol OAuth flow expects PAR, PKCE, and DPoP.
- PAR: client POSTs to `pushed_authorization_request_endpoint` and receives `request_uri`.
- PKCE: use S256 for authorization code flow.
- DPoP: use for token requests where required.

- For local development you can often bypass full PAR/DPoP handling.
- Manually inspect the `authorization_endpoint` URL shown by the app for quick checks.
- For production or full E2E, implement PAR on the backend and perform server-side token exchange.

Quick test steps

1. Start Metro: `npx expo start -c` and open the app.
2. Host `mobile/client-metadata.json` (Option A or B) and paste the URL into the app.
3. Press "Open auth URL in browser (debug)" to see the URL the app would open.
4. If AS metadata indicates a PAR-based `request_uri` flow, follow this sequence:

   - POST to the PAR endpoint.
   - Receive the `request_uri`.
   - Redirect the user to `authorization_endpoint?request_uri=...`.

Security

- This JSON is for development only. Never store `client_secret` or other secrets in public repos.
- For production, perform token exchange server-side and store secrets in env vars.

Need help publishing the file?

- I can push this file to your GitHub repo or create a public gist and return a raw URL.
- Tell me which you prefer and the target repo, or say "gist".

Source of truth and automation

- Source of truth: `docs/.well-known/atproto_client_metadata.json`.
  - Keep that file updated with production values.
  - The `client-metadata.json` files (root and `mobile/`) are convenience copies. Generate them from the canonical docs file.

- Generating/updating local copies (recommended):
  - From the repository root you can run the provided generator scripts. Two scripts are available:
    - `npm run gen:client-metadata` — generates the root `client-metadata.json` from `scripts/generate-client-metadata.js`.
    - `npm run gen:mobile-client-metadata` — generates `mobile/client-metadata.json` from `mobile/scripts/generate-client-metadata.js`.
    - `npm run gen:all-client-metadata` — runs both generators in sequence.
  - CI recommendation: run `npm run gen:all-client-metadata` in CI before build/deploy. This keeps local copies in sync.

Example (local):

```powershell
# from repo root
npm run gen:all-client-metadata

# or only mobile
npm run gen:mobile-client-metadata
```

Keeping a single canonical source and generating local copies avoids accidental divergences.

