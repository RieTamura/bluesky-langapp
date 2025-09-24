# Bluesky OAuth client config (mobile)

This file explains how to configure the mobile app for OAuth with Bluesky.

1. Create a client metadata JSON and host it at a public HTTPS URL.

Example metadata:

```json
{
  "client_id": "https://<YOUR_HOST>/client-metadata.json",
  "client_name": "Bluesky LangApp (dev)",
  "client_uri": "https://<YOUR_HOST>",
  "redirect_uris": ["<YOUR_REDIRECT_URI>"],
  "scope": "atproto",
  "grant_types": ["authorization_code", "refresh_token"],
  "response_types": ["code"],
  "token_endpoint_auth_method": "none",
  "application_type": "native",
  "dpop_bound_access_tokens": true
}
```

1. Set the `blueskyClientId` value in `app.json` (`expo.extra.blueskyClientId`) to the exact URL used for the `client_id` above.

  This value must match exactly. Do not omit the scheme or host.

  Example: `https://example.org/client-metadata.json`

1. Ensure the redirect URI you use is allowed in the client metadata.

  For mobile (native) apps, set `application_type` to `native`.

  Register platform-appropriate redirect URIs.

- Use custom URI schemes (for example `myapp://auth`) for many native flows.
- Use platform-claimed HTTPS redirects such as Android App Links or iOS Universal Links.

1. For Expo development, you may use the proxy redirect URI.

  Use `AuthSession.makeRedirectUri({ useProxy: true })` to generate the proxy redirect URI.

1. For TestFlight and production builds, switch to the exact registered redirects.

1. For hosting metadata and other production steps, follow the OAuth Client Quickstart.

1. See `node_modules/@atproto/api/OAUTH.md` for details.

1. The guide also describes recommended secret-management practices.

1. Security notes

- Keep client metadata accurate. The `client_id` URL, `redirect_uris`, and related fields must match the hosted and registered values.
- Do not embed confidential client secrets or other sensitive credentials inside mobile app binaries. Mobile apps are public clients and secrets can be extracted.
- Prefer DPoP or other token-binding mechanisms instead of hard client secrets when possible. The example metadata enables `dpop_bound_access_tokens`.
- Follow platform guidance for App Links / Universal Links to reduce interception and phishing risk.
