# Cloudflare Workers Phase 0 Guide

This document describes how to stand up the minimal Cloudflare Workers backend for Bluesky LangApp (Phase 0). It provides health and basic auth endpoints and prepares for Phase 1 (PKCE/DPoP OAuth).

Scope of Phase 0:
- GET /health
- POST /api/atprotocol/init (build authorization URL and store state)
- GET /api/auth/me (session check)
- POST /api/auth/logout (session deletion)

The code lives under: workers/

What you’ll get:
- A running Worker (wrangler dev)
- Basic KV-backed state/session placeholders
- A deployable artifact (wrangler deploy)

Prerequisites
- Cloudflare account (Workers + KV enabled)
- Node.js 18+ and npm
- Wrangler CLI v3+ installed globally or via npx
- DNS/Route setup for production (optional at this phase)

Folder layout (Phase 0)
- workers/
  - wrangler.toml         Cloudflare Worker config (Vars, KV binding)
  - tsconfig.json         TypeScript config for Worker
  - package.json          Worker scripts and dependencies
  - src/index.ts          Hono app with Phase 0 endpoints

Configuring wrangler.toml
- Ensure workers/wrangler.toml has these variables (adjust as needed):
  - BSKY_ISSUER = https://bsky.social
  - CLIENT_ID = https://rietamura.github.io/bluelang-oauth/.well-known/atproto_client_metadata.json
  - REDIRECT_URI = blueskylearning://auth
  - SCOPE = atproto
- KV namespace binding:
  - binding = "SESSIONS"
  - id, preview_id will be filled with actual IDs created by Wrangler (see below)

Example snippet (for reference only; your wrangler.toml should already exist in the repo):
```
name = "bluelangapp"
main = "src/index.ts"
compatibility_date = "2025-10-01"
workers_dev = true

[vars]
BSKY_ISSUER = "https://bsky.social"
CLIENT_ID = "https://rietamura.github.io/bluelang-oauth/.well-known/atproto_client_metadata.json"
REDIRECT_URI = "blueskylearning://auth"
SCOPE = "atproto"

[[kv_namespaces]]
binding = "SESSIONS"
id = "REPLACE_WITH_PRODUCTION_KV_NAMESPACE_ID"
preview_id = "REPLACE_WITH_DEV_KV_NAMESPACE_ID"
```

Install dependencies
- From repository root:
  - cd workers
  - npm install

Create KV namespaces
- Run the following and note the returned IDs:

Option A: Single environment (workers_dev)
- npx wrangler kv namespace create SESSIONS
  - Output example:
    - id = abc123... (use for id in wrangler.toml)
    - preview_id = def456... (use for preview_id in wrangler.toml)

Option B: Per-environment (if you want separate dev/prod)
- npx wrangler kv namespace create SESSIONS --env production
- npx wrangler kv namespace create SESSIONS --env development
- Then set the corresponding ids in wrangler.toml (or in [env] sections if you prefer that pattern).

After creation, update workers/wrangler.toml:
- Replace REPLACE_WITH_PRODUCTION_KV_NAMESPACE_ID and REPLACE_WITH_DEV_KV_NAMESPACE_ID with actual IDs.

Local development
- Start the local dev server:
  - cd workers
  - npm run dev
  - Default URL: http://127.0.0.1:8787
- Optional: Test against Cloudflare edge in dev mode:
  - npm run dev:remote

Endpoints to verify
1) Health
- curl http://127.0.0.1:8787/health
- Expected: {"ok":true}

2) Init OAuth (Phase 0: returns authorize URL and state)
- curl -X POST http://127.0.0.1:8787/api/atprotocol/init -H "Content-Type: application/json" -d "{}"
- Expected: JSON with authorize_url and state
  - Also writes state:<uuid> into KV (TTL ~10 minutes)

3) Auth status
- curl http://127.0.0.1:8787/api/auth/me
- Expected: {"authenticated":false}
- With a fake token that has no session:
  - curl -H "Authorization: Bearer test" http://127.0.0.1:8787/api/auth/me
  - Expected: {"authenticated":false}

4) Logout
- curl -X POST http://127.0.0.1:8787/api/auth/logout -H "Authorization: Bearer test"
- Expected: {"ok":true}

CORS and mobile integration
- Phase 0 sets permissive CORS (origin "*") for ease of integration.
- For production, restrict CORS to known origins:
  - Expo web preview domain, your production frontend, or mobile app custom schemes where applicable.
- Set EXPO_PUBLIC_API_URL in your mobile app to the Worker’s public URL once deployed (e.g., https://api.example.com).

Deploy to Cloudflare
- Basic deployment:
  - cd workers
  - npm run deploy
- If you want to serve on a custom domain:
  - In workers/wrangler.toml, add routes and zone_name:
    ```
    routes = [
      { pattern = "api.example.com/*", zone_name = "example.com" }
    ]
    ```
  - Ensure the DNS record for api.example.com exists (proxied by Cloudflare).
  - Re-run npm run deploy
- After deploy, update your mobile EXPO_PUBLIC_API_URL to the new HTTPS endpoint.

Notes and constraints
- Do not add Node-only packages (dotenv, node-fetch, fs, etc.) to the Worker. Workers has fetch and Web Crypto globally.
- If you absolutely need limited Node compatibility, you can explore node compatibility flags, but Phase 0 is designed without them.
- State and sessions are placeholder-level in Phase 0. Phase 1 will add PKCE/DPoP and secure session handling with short TTL.

Troubleshooting
- KV namespace errors (binding missing):
  - Ensure SESSIONS is created and IDs are correctly pasted into wrangler.toml
  - Confirm wrangler uses the expected account (npx wrangler whoami)
- 404 Not Found:
  - Confirm you’re calling the correct path (/health, /api/atprotocol/init, etc.)
- CORS errors in browser:
  - During Phase 0, origin "*" is allowed. If you customized it, ensure the request origin is whitelisted.
- Route not matched in production:
  - Check that routes and zone_name are set and that DNS is proxied (orange cloud) in Cloudflare.
- Mixed content in mobile/web:
  - Always use HTTPS for production; update EXPO_PUBLIC_API_URL accordingly.
- State lookup failures:
  - Remember Phase 0 only stores state with a short TTL (10 minutes). If you refresh too late, it expires.

Phase 1 (coming next)
- Add PKCE: generate code_verifier/challenge via Web Crypto; persist short-lived state in KV
- Add DPoP: generate EC P-256 keypair, sign DPoP JWT via jose for token/authorized requests
- Implement token exchange and persist short-lived session material in KV
- Tighten CORS, add rate limits, structured logs and error metrics

Checklist before moving to Phase 1
- [ ] wrangler dev works locally; /health returns ok
- [ ] /api/atprotocol/init responds with authorize_url and state, and KV writes are visible in dashboard
- [ ] /api/auth/me and /api/auth/logout respond as expected
- [ ] A first deploy to Cloudflare succeeds
- [ ] EXPO_PUBLIC_API_URL in the mobile app can point to your dev/prod Worker and get a valid response

References
- Cloudflare Workers docs: https://developers.cloudflare.com/workers/
- Wrangler CLI docs: https://developers.cloudflare.com/workers/wrangler/
- Hono docs: https://hono.dev/