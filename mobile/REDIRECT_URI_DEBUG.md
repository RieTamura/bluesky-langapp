# Redirect URI Debugging Guide

## Problem

Authentication fails with a redirect_uri_mismatch error because the app is using `blueskylearning:/auth` (single slash) instead of `blueskylearning://auth` (double slash).

## Root Cause

The `makeRedirectUri` function from Expo's `AuthSession` can sometimes return URIs with inconsistent formatting:
- `blueskylearning:/auth` (single slash) - INVALID
- `blueskylearning://` (no path) - INVALID
- `blueskylearning://auth` (double slash with path) - VALID

The registered redirect URIs in the client metadata are:
1. `https://auth.expo.io/@rietamura/bluesky-langapp` (for development with Expo proxy)
2. `blueskylearning://auth` (for standalone/TestFlight builds)

## Solution

### 1. Code Changes (LoginScreen.tsx)

The `resolveLoginConfig` function now:

1. **Defaults to native scheme**: Starts with `redirectUri = "blueskylearning://auth"`
2. **Validates proxy configuration**: Checks if `authProxyUrl` is valid before using proxy mode
3. **Forces native redirect in standalone**: Always uses `blueskylearning://auth` for TestFlight/production builds
4. **Normalizes redirect URIs**: Fixes single slash issues and adds `/auth` path if missing
5. **Provides detailed logging**: Logs all decisions for debugging

### 2. Configuration Changes (app.json)

Set `useAuthProxy: false` to ensure the app always uses the native redirect URI:

```json
{
  "extra": {
    "useAuthProxy": false,
    "blueskyClientId": "https://rietamura.github.io/bluelang-oauth/.well-known/atproto_client_metadata.json"
  }
}
```

## Verification Steps

### 1. Check the Authorization URL

When you initiate login, check the console logs for:

```
[LoginScreen] FINAL resolveLoginConfig result: redirectUri= blueskylearning://auth
[LoginScreen DEBUG] buildAuthUrl - redirectUriVal (raw)= blueskylearning://auth
[LoginScreen DEBUG] buildAuthUrl - redirectUriVal (encoded)= blueskylearning%3A%2F%2Fauth
```

The encoded value should be `blueskylearning%3A%2F%2Fauth` (double slash encoded as `%2F%2F`).

### 2. Verify the Full Authorization URL

The URL should look like:
```
https://bsky.social/oauth/authorize?response_type=code&client_id=https%3A%2F%2Frietamura.github.io%2Fbluelang-oauth%2F.well-known%2Fatproto_client_metadata.json&redirect_uri=blueskylearning%3A%2F%2Fauth&scope=atproto%20transition%3Ageneric%20transition%3Achat.bsky&state=...&code_challenge=...&code_challenge_method=S256
```

Note: `redirect_uri=blueskylearning%3A%2F%2Fauth` is correct (`%2F%2F` = `//`)

### 3. Test in Different Environments

- **Development (Expo Go)**: Should use `blueskylearning://auth`
- **Development (Dev Client)**: Should use `blueskylearning://auth`
- **TestFlight**: Should use `blueskylearning://auth`
- **Production**: Should use `blueskylearning://auth`

## Common Issues

### Issue 1: Old Build Cache

**Symptom**: Changes don't take effect
**Solution**: 
```bash
cd mobile
rm -rf node_modules
npm install
npx expo start -c
```

### Issue 2: EAS Build Uses Different Config

**Symptom**: Works locally but fails in TestFlight
**Solution**: The code now detects standalone mode automatically via `Constants.appOwnership === "standalone"` and forces the correct redirect URI.

### Issue 3: Single Slash in URL

**Symptom**: `redirect_uri=blueskylearning%3A%2Fauth` (only `%2F` not `%2F%2F`)
**Solution**: The normalization code now handles this:

```typescript
if (
  normalized.startsWith("blueskylearning:/") &&
  !normalized.startsWith("blueskylearning://")
) {
  normalized = normalized.replace(
    "blueskylearning:/",
    "blueskylearning://",
  );
}
```

## Testing Checklist

- [ ] Check console logs show correct redirect URI
- [ ] Verify authorization URL contains `%2F%2F` (double slash encoded)
- [ ] Test login flow completes successfully
- [ ] Verify redirect back to app works
- [ ] Check backend receives correct redirect_uri in token exchange
- [ ] Test in TestFlight build

## Debug Commands

### View current configuration:
```bash
cd mobile
npx expo config --type public | grep -A5 extra
```

### Check client metadata:
```bash
curl https://rietamura.github.io/bluelang-oauth/.well-known/atproto_client_metadata.json | jq .redirect_uris
```

### Decode URL parameter:
```javascript
// In browser console or Node:
decodeURIComponent("blueskylearning%3A%2F%2Fauth")
// Should output: "blueskylearning://auth"
```

## Additional Resources

- [ATProto OAuth Spec](https://atproto.com/specs/oauth)
- [Expo AuthSession Documentation](https://docs.expo.dev/versions/latest/sdk/auth-session/)
- Client Metadata: https://rietamura.github.io/bluelang-oauth/.well-known/atproto_client_metadata.json