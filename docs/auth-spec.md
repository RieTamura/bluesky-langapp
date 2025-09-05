# Auth & Session Specification
Version: 2025-09-05
Status: Confirmed Phase 1 (In-Memory Sessions)

## Current Backend Behavior (Baseline)
- Endpoint: POST /api/auth/login { identifier, password }
- On success returns { success, sessionId, user: { identifier } }
- sessionId = 64 hex chars stored server memory map
- Authorization: Bearer <sessionId>
- Expiry: Idle > 24h cleanup job removes
- Logout: POST /api/auth/logout (clears session)
- Me: GET /api/auth/me -> { authenticated: bool, user }

## Limitations
| Area | Issue | Impact |
|------|-------|--------|
| Persistence | Memory only | Process restart logs out all |
| Scaling | No shared store | Multi-instance不可 |
| Rotation | No TTL refresh | Predictable idle expiry |
| Hijack Risk | Long-lived opaque token | Need reuse detection |

## Phase Roadmap
| Phase | Storage | Expiry | Extras |
|-------|---------|--------|--------|
| 1 | Memory (current) | 24h idle | Basic login |
| 2 | Redis | 24h idle + 7d absolute | Refresh endpoint |
| 3 | Redis + Signed JWT (short) | Access 15m / Refresh 14d | Device binding |

## Mobile Client Flow (Phase 1)
1. User enters Bluesky credentials
2. POST /api/auth/login
3. Store sessionId in SecureStore key: auth.sessionId
4. All API calls inject Authorization header
5. On 401 AUTH_REQUIRED -> purge sessionId & navigate Login
6. On app resume: call /api/auth/me (warm validation)

## Secure Storage Policy
| Data | Store | Rationale |
|------|-------|-----------|
| sessionId | SecureStore | Prevent plain AsyncStorage leak |
| lastAuthCheck | AsyncStorage | Non-sensitive |

## Error Mapping
| HTTP | Client Code | Handling |
|------|-------------|----------|
| 401 | AUTH_REQUIRED | forceLogout() |
| 403 | ACCESS_DENIED | toast + back |

## Force Logout Triggers
- Explicit logout
- 401 from protected endpoint
- Session idle detection (optional periodic /me)

## Helper Pseudocode (Client)
```ts
async function apiFetch(path: string, init: RequestInit = {}) {
  const token = await SecureStore.getItemAsync('auth.sessionId');
  const headers = { ...(init.headers||{}), Authorization: token ? `Bearer ${token}` : '' };
  const res = await fetch(BASE_URL + path, { ...init, headers });
  if (res.status === 401) { await forceLogout(); throw new Error('AUTH_REQUIRED'); }
  return res.json();
}
```

## Future (Phase 2+) Additions
- Refresh: POST /api/auth/refresh (rotate)
- Revoke list (compromised)
- Device metadata: userAgent / platform / createdAt
- Rate limiting: failed login attempts lock (5 in 15m)

## Open Questions
- Should we map Bluesky DID separately now? (Defer)
- Need MFA for production? (Low priority early stage)
