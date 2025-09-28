import { Request, Response } from 'express';
import { LearningProgressPost } from '../services/atProtocolService.js';
import type { ApiResponse } from '../types/data.js';

import { atProtocolService, type OAuthSession } from '../services/atProtocolService.js';
import { importJWK, generateKeyPair, exportJWK, SignJWT } from 'jose';
import * as crypto from 'crypto';
import { URL } from 'url';

// Minimal JWK shape used for exported public keys from jose.exportJWK
type PublicJWK = {
  kty?: string;
  crv?: string;
  x?: string;
  y?: string;
  alg?: string;
  use?: string;
  [k: string]: unknown;
};

// Environment-driven token endpoint configuration.
// - In production we require an explicit AT_PROTOCOL_TOKEN_ENDPOINT to be set to avoid unexpected
//   provider changes. In other environments we default to the canonical provider used in dev.
const rawTokenEndpoint = process.env.AT_PROTOCOL_TOKEN_ENDPOINT;
const defaultTokenEndpoint = 'https://bsky.social/oauth/token';

if (process.env.NODE_ENV === 'production' && (!rawTokenEndpoint || rawTokenEndpoint.trim() === '')) {
  console.error('Missing AT_PROTOCOL_TOKEN_ENDPOINT in production environment. Set AT_PROTOCOL_TOKEN_ENDPOINT to the provider token endpoint URL.');
  throw new Error('AT_PROTOCOL_TOKEN_ENDPOINT is required in production. Set the environment variable to the token endpoint URL.');
}

const AT_PROTOCOL_TOKEN_ENDPOINT = (rawTokenEndpoint && rawTokenEndpoint.trim()) ? rawTokenEndpoint.trim() : defaultTokenEndpoint;

// Validate the configured token endpoint early.
try {
  // This will throw if the value is not a valid URL
  // Validate by constructing a URL; use `void` to avoid creating an unused binding
  void new URL(AT_PROTOCOL_TOKEN_ENDPOINT);
} catch (err) {
  // Fail fast during startup rather than at runtime when attempting an OAuth flow
  console.error('Invalid AT_PROTOCOL_TOKEN_ENDPOINT configuration:', AT_PROTOCOL_TOKEN_ENDPOINT, err);
  throw new Error('Invalid AT_PROTOCOL_TOKEN_ENDPOINT; please set a valid URL in environment variables');
}

/**
 * Return the first candidate that can be turned into a non-empty string.
 * If none are found, returns the default fallback 'bluesky_user'.
 */
function pickFirstNonEmpty(...candidates: Array<unknown>): string {
  for (const c of candidates) {
    if (c === null || c === undefined) continue;
    try {
      const s = String(c).trim();
      if (s.length > 0) return s;
    } catch (_) {
      // ignore and try next
    }
  }
  return 'bluesky_user';
}

/**
 * Initialize AT Protocol service with Bluesky credentials
 */
export async function initializeATProtocol(req: Request, res: Response): Promise<void> {
  try {
    const { identifier, password, oauth } = req.body;

    // Debug: log that the initialize endpoint was called and inspect body shape (mask sensitive parts)
    try {
      const keys = Object.keys(req.body || {});
      let oauthInfo: any = null;
      if (oauth && typeof oauth === 'object') {
        oauthInfo = { ...oauth };
        if (typeof oauthInfo.code === 'string') oauthInfo.code = `${oauthInfo.code.slice(0,6)}...${oauthInfo.code.slice(-6)}`;
        if (typeof oauthInfo.code_verifier === 'string') oauthInfo.code_verifier = '<<masked>>';
      }
      console.log('[atProtocol] initializeATProtocol called, bodyKeys=', keys, 'oauth=', oauthInfo);
    } catch (logErr) {
      console.warn('[atProtocol] Failed to log initializeATProtocol entry', logErr);
    }

    // Support two modes: credentials or oauth code exchange
    if (oauth && oauth.code) {
      // Exchange OAuth code for token with provider token_endpoint (bsky.social)
      try {
  const tokenEndpoint = AT_PROTOCOL_TOKEN_ENDPOINT;

        // Build form data per OAuth2 spec (authorization_code grant with PKCE)
        const params = new URLSearchParams();
        params.append('grant_type', 'authorization_code');
        params.append('code', oauth.code);
        if (oauth.code_verifier) params.append('code_verifier', oauth.code_verifier);
        if (oauth.redirect_uri) params.append('redirect_uri', oauth.redirect_uri);
        // Optionally include client_id if provided by client (e.g., public client metadata URL)
        if (oauth.client_id) params.append('client_id', oauth.client_id);

        // Create a DPoP proof header (provider requires DPoP for dpop_bound_access_tokens)
        // Generate ephemeral ES256 key pair and include the public JWK in the DPoP JWT header
        const { publicKey, privateKey } = await generateKeyPair('ES256');
        const rawJwk = await exportJWK(publicKey) as PublicJWK;
        // Validate exported JWK parameters for ES256 (expected: kty=EC, crv=P-256)
        const expectedKty = 'EC';
        const expectedCrv = 'P-256';
        if (rawJwk.kty && rawJwk.kty !== expectedKty) {
          throw new Error(`Exported JWK has incompatible kty: ${String(rawJwk.kty)} (expected ${expectedKty})`);
        }
        if (rawJwk.crv && rawJwk.crv !== expectedCrv) {
          throw new Error(`Exported JWK has incompatible crv: ${String(rawJwk.crv)} (expected ${expectedCrv})`);
        }

        // Create a new, properly-typed copy and set required fields explicitly.
        const jwk: PublicJWK = {
          ...rawJwk,
          alg: 'ES256',
          use: 'sig'
        };

        // Build DPoP JWT: htu (HTTP URI), htm (HTTP method), iat, jti
        const dpopPayload = {
          htu: tokenEndpoint,
          htm: 'POST',
          iat: Math.floor(Date.now() / 1000),
        } as any;

        // Helper to generate a strong unique identifier for DPoP (prefer crypto.randomUUID)
        const generateDpopJti = (): string => {
          // Prefer crypto.randomUUID if available (Node 14.17+/v15+)
          if (crypto && typeof (crypto as any).randomUUID === 'function') {
            return (crypto as any).randomUUID();
          }

          // Otherwise use crypto.randomBytes to produce a v4 UUID-style value.
          if (crypto && typeof (crypto as any).randomBytes === 'function') {
            try {
              const buf = (crypto as any).randomBytes(16);
              buf[6] = (buf[6] & 0x0f) | 0x40; // version 4
              buf[8] = (buf[8] & 0x3f) | 0x80; // variant
              const hex = Buffer.from(buf).toString('hex');
              return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
            } catch (err) {
              // Rethrow so callers get an explicit failure rather than silently
              // receiving a weak identifier.
              throw new Error(`Failed to generate secure random bytes for DPoP jti: ${err instanceof Error ? err.message : String(err)}`);
            }
          }

          // If no secure random source is available, fail explicitly.
          throw new Error('Secure random generation not available: neither crypto.randomUUID nor crypto.randomBytes are supported in this environment. Provide Node crypto or a secure polyfill.');
        };

        const dpopJti = generateDpopJti();
        (dpopPayload as any).jti = dpopJti;

        const dpopJwt = await new SignJWT(dpopPayload)
          .setProtectedHeader({ alg: 'ES256', typ: 'dpop+jwt', jwk })
          .sign(privateKey as any);

        // Debug: log outgoing token exchange details (mask sensitive values like code and code_verifier)
        try {
          const maskedParams = new URLSearchParams();
          for (const [k, v] of params.entries()) {
            if (k === 'code' || k === 'code_verifier' || k === 'refresh_token') {
              // show only prefix to avoid leaking secrets while keeping some context
              const s = String(v || '');
              maskedParams.append(k, s.length > 8 ? `${s.slice(0,6)}...${s.slice(-2)}` : '<<masked>>');
            } else {
              maskedParams.append(k, String(v));
            }
          }
          console.log('[atProtocol] Token exchange: endpoint=', tokenEndpoint);
          console.log('[atProtocol] Token exchange: params(masked)=', maskedParams.toString());
        } catch (logErr) {
          console.warn('[atProtocol] Failed to log token exchange params', logErr);
        }

        let tokenRes = await fetch(tokenEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'DPoP': dpopJwt },
          body: params.toString()
        });

        // Log response headers for additional debugging (DPoP nonce may be provided in headers)
        try {
          const hdrs: Record<string, string> = {};
          tokenRes.headers.forEach((v: string, k: string) => { hdrs[k] = v; });
          console.log('[atProtocol] Token endpoint response status=', tokenRes.status, 'headers=', hdrs);
        } catch (hdrErr) {
          console.warn('[atProtocol] Failed to log token response headers', hdrErr);
        }

        // If the server requires a nonce in the DPoP proof, extract it from headers and retry.
        // Some providers return the nonce via a header (DPoP-Nonce) without setting
        // parsedBody.error === 'use_dpop_nonce'. Check headers too.
        // Cache any read body text so we don't attempt to read the same body twice (undici error)
        let lastBodyText: string | null = null;
        if (!tokenRes.ok) {
          lastBodyText = await tokenRes.text();
          let parsedBody: any = null;
          try {
            parsedBody = JSON.parse(lastBodyText as string);
          } catch (e: any) {
            // Log parse error with context so we can debug provider responses that are not valid JSON
            console.error('Failed to parse token endpoint response as JSON for nonce detection', {
              tokenEndpoint,
              status: tokenRes.status,
              body: lastBodyText,
              parseError: e && (e.message || String(e))
            });
            parsedBody = null;
          }

          // Determine whether to attempt a DPoP-with-nonce retry.
          const headerNonce = tokenRes.headers.get('dpop-nonce') || tokenRes.headers.get('DPoP-Nonce');
          const wantsNonceFromBody = parsedBody && parsedBody.error === 'use_dpop_nonce';
          const wantsNonce = wantsNonceFromBody || !!headerNonce;

          if (wantsNonce) {
            // Try to extract nonce from WWW-Authenticate header first, then DPoP-Nonce header
            const www = tokenRes.headers.get('www-authenticate') || tokenRes.headers.get('WWW-Authenticate') || '';
            let nonceMatch = www.match(/nonce="?([^"]+)"?/i);
            let nonceVal: string | null = null;
            if (nonceMatch && nonceMatch[1]) nonceVal = nonceMatch[1];
            if (!nonceVal && headerNonce) nonceVal = headerNonce;

            if (nonceVal) {
              // For each DPoP proof attempt, generate a fresh jti so each proof is unique
              const dpopJtiForNonce = generateDpopJti();
              // rebuild DPoP JWT including nonce claim and fresh jti
              const dpopPayloadWithNonce = {
                htu: tokenEndpoint,
                htm: 'POST',
                iat: Math.floor(Date.now() / 1000),
                jti: dpopJtiForNonce,
                nonce: nonceVal
              } as any;

              const dpopJwtWithNonce = await new SignJWT(dpopPayloadWithNonce)
                .setProtectedHeader({ alg: 'ES256', typ: 'dpop+jwt', jwk })
                .sign(privateKey as any);

              tokenRes = await fetch(tokenEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'DPoP': dpopJwtWithNonce },
                body: params.toString()
              });
              // We fetched a fresh response; reset cached body so downstream readers will read the new one
              lastBodyText = null;
            }
          }
        }

        if (!tokenRes.ok) {
          // Reuse cached body text if we previously read it, otherwise read now
          const bodyText = lastBodyText ?? await tokenRes.text();
          // Emit full response body to aid diagnosis (may contain provider error details). Mask any long tokens if incidentally present.
          let maskedBody = bodyText;
          try {
            const parsed = JSON.parse(bodyText);
            // If the provider accidentally echoes back the code or verifier, mask them
            if (parsed && typeof parsed === 'object') {
              const clone: any = { ...parsed };
              const maskIfLong = (val: any) => {
                if (!val || typeof val !== 'string') return val;
                return val.length > 12 ? `${val.slice(0,6)}...${val.slice(-4)}` : '<<masked>>';
              };
              if (clone.code) clone.code = maskIfLong(clone.code);
              if (clone.access_token) clone.access_token = maskIfLong(clone.access_token);
              if (clone.refresh_token) clone.refresh_token = maskIfLong(clone.refresh_token);
              maskedBody = JSON.stringify(clone);
            }
          } catch (e) {
            // Not JSON, leave raw text but truncate long strings for safety
            if (typeof maskedBody === 'string' && maskedBody.length > 2000) maskedBody = maskedBody.slice(0,2000) + '...';
          }
          console.error('Token endpoint error:', tokenRes.status, maskedBody);
          throw new Error(`Token endpoint responded ${tokenRes.status}`);
        }

        const tokenJson = await tokenRes.json();
        if (!tokenJson) throw new Error('No token returned from provider');
        // Debug: inspect token response for scopes and keys
        try {
          const scopeDebug = tokenJson.scope || tokenJson.scopes || tokenJson.scopeString || '';
          console.log('Token response keys:', Object.keys(tokenJson));
          console.log('Token scopes (raw):', scopeDebug);
        } catch (err) {
          // Non-fatal: emit debug-level information for diagnostics.
          // Use module logger if present, otherwise fallback to console.debug.
          try {
            const globalLogger = (globalThis as any).logger;
            if (typeof globalLogger !== 'undefined' && typeof globalLogger.debug === 'function') {
              globalLogger.debug('Failed to read token response debug fields', err);
            } else {
              console.debug('Failed to read token response debug fields', err);
            }
          } catch (logErr) {
            // If logging itself fails, avoid throwing from this non-critical path.
            console.debug('Logging failed while handling token response debug parse error', { logErr, originalError: err });
          }
        }

  // Map common OAuth token fields to the session shape expected by our ATProtocol service
  const sessionForAtp: OAuthSession = {} as OAuthSession;
        // Access token: provider may return 'access_token' or 'accessJwt'
        sessionForAtp.accessJwt = tokenJson.accessJwt || tokenJson.access_token || tokenJson.accessToken;
        // Refresh token mapping
        sessionForAtp.refreshJwt = tokenJson.refreshJwt || tokenJson.refresh_token || tokenJson.refreshToken;
        // DID / handle if provided by provider
        if (tokenJson.did) sessionForAtp.did = tokenJson.did;
        if (tokenJson.handle) sessionForAtp.handle = tokenJson.handle;
        // Also include raw tokenJson for debugging/compatibility if needed
        sessionForAtp.raw = tokenJson;
        // If the returned token does not include the required atproto scope, fail fast with a clear error
        const returnedScopes = (tokenJson.scope || tokenJson.scopes || tokenJson.scopeString || '').toString();
        if (!/\batproto\b/.test(returnedScopes)) {
          console.error('Received token does not include required "atproto" scope:', returnedScopes);
          const response: ApiResponse = { success: false, error: 'Token missing required scope: atproto', data: { scopes: returnedScopes } };
          res.status(400).json(response);
          return;
        }
        // Debug: log that we received a token (do not log secrets in production)
        console.log('Received token from provider, mapping to session:', {
          hasAccess: !!sessionForAtp.accessJwt,
          hasRefresh: !!sessionForAtp.refreshJwt,
          hasDid: !!sessionForAtp.did,
          hasHandle: !!sessionForAtp.handle
        });

        // Pass the session object to the ATProtocol service to initialize
        // If the service supports resuming with a session object, pass it through.
        try {
          // Allow initializeWithOAuth to optionally return the internal BlueskyService
          // initializeWithOAuth now returns the BlueskyService instance when returnService=true
          const service = await atProtocolService.initializeWithOAuth({ session: sessionForAtp, returnService: true });
          // Lazy import to avoid circular types
          const { createSessionFromService } = await import('../controllers/authController.js');
          const identifier = pickFirstNonEmpty(sessionForAtp?.handle, sessionForAtp?.did, tokenJson?.handle, tokenJson?.did);
          const sessionId = createSessionFromService(service, identifier);
          const response: ApiResponse = { success: true, data: { sessionId } };
          res.json(response);
          return;
        } catch (innerErr) {
          console.error('Failed to initialize ATProtocol service with OAuth session:', innerErr);
          const response: ApiResponse = { success: false, error: 'Failed to initialize session after token exchange' };
          res.status(500).json(response);
          return;
        }
      } catch (e) {
        console.error('OAuth code exchange failed:', e);
        const response: ApiResponse = { success: false, error: 'OAuth code exchange failed' };
        res.status(500).json(response);
        return;
      }
    } else {
      if (!identifier || !password) {
        const response: ApiResponse = {
          success: false,
          error: 'Bluesky identifier and password are required'
        };
        res.status(400).json(response);
        return;
      }

      await atProtocolService.initialize({ identifier, password });
    }
    
    const response: ApiResponse = {
      success: true,
      message: 'AT Protocol service initialized successfully'
    };
    
    res.json(response);
  } catch (error) {
    console.error('Failed to initialize AT Protocol service:', error);
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to initialize AT Protocol service'
    };
    res.status(500).json(response);
  }
}

/**
 * Post learning progress to Bluesky
 */
export async function postLearningProgress(req: Request, res: Response): Promise<void> {
  try {
    const { userId, type, metadata, customContent } = req.body;
    
    if (!userId || !type) {
      const response: ApiResponse = {
        success: false,
        error: 'User ID and post type are required'
      };
      res.status(400).json(response);
      return;
    }

    if (!atProtocolService.isAuthenticated()) {
      const response: ApiResponse = {
        success: false,
        error: 'AT Protocol service not authenticated. Please initialize first.'
      };
      res.status(401).json(response);
      return;
    }

    const post = await atProtocolService.postLearningProgress(
      userId,
      type,
      metadata || {},
      customContent
    );
    
    const response: ApiResponse = {
      success: true,
      data: post,
      message: post.blueskySuccess 
        ? 'Learning progress posted successfully'
        : 'Post created but failed to publish to Bluesky'
    };
    
    res.json(response);
  } catch (error) {
    console.error('Failed to post learning progress:', error);
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to post learning progress'
    };
    res.status(500).json(response);
  }
}

/**
 * Generate shared learning data
 */
export async function generateSharedData(req: Request, res: Response): Promise<void> {
  try {
    const { userId } = req.params;
    const { includeVocabulary } = req.query;
    
    if (!userId) {
      const response: ApiResponse = {
        success: false,
        error: 'User ID is required'
      };
      res.status(400).json(response);
      return;
    }

    const sharedData = await atProtocolService.generateSharedLearningData(
      userId,
      includeVocabulary === 'true'
    );
    
    const response: ApiResponse = {
      success: true,
      data: sharedData,
      message: 'Shared learning data generated successfully'
    };
    
    res.json(response);
  } catch (error) {
    console.error('Failed to generate shared learning data:', error);
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate shared learning data'
    };
    res.status(500).json(response);
  }
}

/**
 * Get post history
 */
export async function getPostHistory(req: Request, res: Response): Promise<void> {
  try {
    const { userId } = req.query;
    
    const history = atProtocolService.getPostHistory(userId as string);
    
    const response: ApiResponse = {
      success: true,
      data: history
    };
    
    res.json(response);
  } catch (error) {
    console.error('Failed to get post history:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to retrieve post history'
    };
    res.status(500).json(response);
  }
}

/**
 * Get available post templates
 */
export async function getPostTemplates(req: Request, res: Response): Promise<void> {
  try {
    const templates = atProtocolService.getAvailableTemplates();
    
    const response: ApiResponse = {
      success: true,
      data: templates
    };
    
    res.json(response);
  } catch (error) {
    console.error('Failed to get post templates:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to retrieve post templates'
    };
    res.status(500).json(response);
  }
}

/**
 * Get authentication status
 */
export async function getAuthStatus(req: Request, res: Response): Promise<void> {
  try {
    const isAuthenticated = atProtocolService.isAuthenticated();
    
    const response: ApiResponse = {
      success: true,
      data: { isAuthenticated }
    };
    
    res.json(response);
  } catch (error) {
    console.error('Failed to get auth status:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to get authentication status'
    };
    res.status(500).json(response);
  }
}

/**
 * Logout from AT Protocol service
 */
export async function logout(req: Request, res: Response): Promise<void> {
  try {
    atProtocolService.logout();
    
    const response: ApiResponse = {
      success: true,
      message: 'Logged out successfully'
    };
    
    res.json(response);
  } catch (error) {
    console.error('Failed to logout:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to logout'
    };
    res.status(500).json(response);
  }
}

/**
 * Auto-generate and post milestone achievements
 */
export async function autoPostMilestone(req: Request, res: Response): Promise<void> {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      const response: ApiResponse = {
        success: false,
        error: 'User ID is required'
      };
      res.status(400).json(response);
      return;
    }

    if (!atProtocolService.isAuthenticated()) {
      const response: ApiResponse = {
        success: false,
        error: 'AT Protocol service not authenticated'
      };
      res.status(401).json(response);
      return;
    }

    // Generate shared data to get current statistics
    const sharedData = await atProtocolService.generateSharedLearningData(userId);
    const { totalWords, studyStreak } = sharedData.summary;

    // Check for milestone achievements
    const milestones = [10, 25, 50, 100, 250, 500, 1000];
    const streakMilestones = [7, 14, 30, 60, 100];
    
    let post: LearningProgressPost | null = null;

    // Check word count milestones
    for (const milestone of milestones.reverse()) {
      if (totalWords >= milestone) {
        post = await atProtocolService.postLearningProgress(
          userId,
          'milestone',
          {
            wordsLearned: totalWords,
            milestone: `${milestone} words milestone reached!`
          }
        );
        break;
      }
    }

    // Check streak milestones if no word milestone was posted
    if (!post) {
      for (const streakMilestone of streakMilestones.reverse()) {
        if (studyStreak >= streakMilestone) {
          post = await atProtocolService.postLearningProgress(
            userId,
            'streak',
            {
              streak: studyStreak
            }
          );
          break;
        }
      }
    }

    if (post) {
      const response: ApiResponse = {
        success: true,
        data: post,
        message: 'Milestone achievement posted successfully'
      };
      res.json(response);
    } else {
      const response: ApiResponse = {
        success: true,
        message: 'No milestone achievements to post at this time'
      };
      res.json(response);
    }
  } catch (error) {
    console.error('Failed to auto-post milestone:', error);
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to auto-post milestone'
    };
    res.status(500).json(response);
  }
}

/**
 * Get Bluesky profile (authenticated user or arbitrary actor)
 */
export async function getProfile(req: Request, res: Response): Promise<void> {
  try {
    const actor = (req.query.actor as string) || undefined;

    const profile = await atProtocolService.getProfile(actor);

    const response: ApiResponse = {
      success: true,
      data: profile
    };

    res.json(response);
  } catch (error) {
    console.error('Failed to get profile:', error);
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get profile'
    };
    res.status(500).json(response);
  }
}

/**
 * Debug-only endpoint to attempt a token exchange from a redirect URL or direct oauth object.
 * Accepts JSON:
 * - { redirectUrl: string }
 * - { oauth: { code, code_verifier, redirect_uri, client_id } }
 *
 * This endpoint is disabled in production unless ENABLE_DEBUG_EXCHANGE=true is set.
 */
export async function debugExchange(req: Request, res: Response): Promise<void> {
  if (process.env.NODE_ENV === 'production' && process.env.ENABLE_DEBUG_EXCHANGE !== 'true') {
    res.status(403).json({ success: false, error: 'Debug exchange disabled in production' });
    return;
  }

  try {
    const { redirectUrl, oauth } = req.body || {};
    let bodyOauth = oauth;
    if (!bodyOauth && redirectUrl && typeof redirectUrl === 'string') {
      try {
        const u = new URL(redirectUrl);
        const params: Record<string,string> = {};
        u.searchParams.forEach((v,k) => { params[k] = v; });
        bodyOauth = {
          code: params.code,
          code_verifier: params.code_verifier,
          redirect_uri: params.redirect_uri || (u.origin + u.pathname),
          client_id: params.client_id
        };
      } catch (e) {
        res.status(400).json({ success: false, error: 'Invalid redirectUrl' });
        return;
      }
    }

    if (!bodyOauth || !bodyOauth.code) {
      res.status(400).json({ success: false, error: 'Missing oauth.code' });
      return;
    }

    // Delegate to the same exchange logic by crafting a fake request object.
    const fakeReq: any = { body: { oauth: bodyOauth } };
    const fakeRes: any = {
      status: (code: number) => ({ json: (obj: any) => ({ code, obj }) }),
      json: (obj: any) => obj
    };

    // Call the internal exchange logic path
    await initializeATProtocol(fakeReq as Request, fakeRes as Response);
    // If initializeATProtocol returns without throwing, respond success
    res.json({ success: true, message: 'Debug exchange completed (see server logs)' });
  } catch (err) {
    console.error('Debug exchange failed:', err);
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
  }
}