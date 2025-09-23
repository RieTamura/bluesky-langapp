How to use the test client metadata JSON for local development (AT Protocol / Bluesky)

1) File location
    - `mobile/client-metadata.json` (already added)

2) Goal
    - Provide a minimal client metadata document you can use for local development and for exercising the authorization flow endpoints. This file is a development convenience: real deployments must host a HTTPS-accessible client metadata document and follow the AT Protocol OAuth requirements (PAR, PKCE, DPoP, proper client_id format).

3) Local development workflows (recommended)

Option A — Loopback / localhost client_id (fast, local only)
   - Use the client metadata with a `client_id` that starts with `http://localhost` as in the AT Protocol draft. The AS may accept a derived metadata document for `http://localhost` clients.
   - In our sample, `client_id` is `http://localhost/langapp-client-metadata.json` and `redirect_uris` includes `http://127.0.0.1/callback`. You can run a small local static server in the `mobile` folder to serve the file:

```powershell
cd mobile
npx http-server -p 8000
# or if you prefer serve
npx serve -s . -p 8000
```

   - Use `ngrok` to expose an HTTPS URL if your device or environment requires HTTPS:

```powershell
npx ngrok http 8000
```

   - Paste the resulting URL (or the raw GitHub URL — see Option B) into the app's "手動: client metadata URL を入力 (開発用)" field. If you use ngrok you will get an `https://` URL which Expo can fetch.

Option B — Host on GitHub (quick public HTTPS)
   - Commit `mobile/client-metadata.json` and push to GitHub. Use the raw URL, for example:
      `https://raw.githubusercontent.com/<your-user>/<your-repo>/main/mobile/client-metadata.json`
   - Paste that raw URL into the app's manual client metadata field.

4) Important notes from the AT Protocol spec (what to expect)
   - The AT Protocol OAuth flow expects:
      - PAR (Pushed Authorization Requests) — client should POST to the AS `pushed_authorization_request_endpoint` and receive a `request_uri`.
      - PKCE (S256) for authorization code flow.
      - DPoP for token requests (DPoP-bound access tokens).
   - For local development you can often bypass full PAR/DPOP handling and validate the authorization page flow manually by opening the `authorization_endpoint` URL shown by the app in the debug UI. But for production or full E2E, implement PAR on the backend and perform token exchange on the server (recommended architecture: Backend-for-Frontend).

5) Quick test steps
   1. Start Metro (`npx expo start -c`) and open the app on your device.
 2. Host `mobile/client-metadata.json` (Option A or B above) and paste the HTTPS/raw URL into the app's manual field.
 3. Press "Open auth URL in browser (debug)" to see which URL the app would open.
 4. If you see a PAR-based `request_uri` flow in the AS metadata, the proper flow is: POST to PAR endpoint → receive `request_uri` → redirect user to `authorization_endpoint?request_uri=...`.

6) Security
   - This JSON is for development only. Never store `client_secret` or other secrets in public repos. For production, server-side token exchange with secrets stored in environment variables is recommended.

7) Need help publishing the file?
   - I can push this file to your GitHub repo or create a public gist and return a raw URL you can paste into the app. Tell me which you prefer and the target repo (or say "gist").