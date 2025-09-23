import { Request, Response } from 'express';
import { LearningProgressPost } from '../services/atProtocolService.js';
import type { ApiResponse } from '../types/data.js';

import { atProtocolService } from '../services/atProtocolService.js';
import { importJWK, generateKeyPair, exportJWK, SignJWT } from 'jose';

/**
 * Initialize AT Protocol service with Bluesky credentials
 */
export async function initializeATProtocol(req: Request, res: Response): Promise<void> {
  try {
    const { identifier, password, oauth } = req.body;

    // Support two modes: credentials or oauth code exchange
    if (oauth && oauth.code) {
      // Exchange OAuth code for token with provider token_endpoint (bsky.social)
      try {
        const tokenEndpoint = 'https://bsky.social/oauth/token';

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
        const jwk = await exportJWK(publicKey) as any;
        // Ensure 'use' and 'alg' are present
        jwk.alg = jwk.alg || 'ES256';
        jwk.use = jwk.use || 'sig';

        // Build DPoP JWT: htu (HTTP URI), htm (HTTP method), iat, jti
        const dpopPayload = {
          htu: tokenEndpoint,
          htm: 'POST',
          iat: Math.floor(Date.now() / 1000),
        } as any;

        const dpopJti = crypto.randomUUID ? crypto.randomUUID() : (Math.random().toString(36).slice(2) + Date.now().toString(36));
        (dpopPayload as any).jti = dpopJti;

        const dpopJwt = await new SignJWT(dpopPayload)
          .setProtectedHeader({ alg: 'ES256', typ: 'dpop+jwt', jwk })
          .sign(privateKey as any);

        let tokenRes = await fetch(tokenEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'DPoP': dpopJwt },
          body: params.toString()
        });

        // If the server requires a nonce in the DPoP proof, extract it from headers and retry
        if (!tokenRes.ok) {
          const text = await tokenRes.text();
          let parsedBody: any = null;
          try { parsedBody = JSON.parse(text); } catch (_) { parsedBody = null; }
          const wantsNonce = parsedBody && parsedBody.error === 'use_dpop_nonce';
          if (wantsNonce) {
            // Try to extract nonce from WWW-Authenticate or DPoP-Nonce header
            const www = tokenRes.headers.get('www-authenticate') || tokenRes.headers.get('WWW-Authenticate') || '';
            let nonceMatch = www.match(/nonce="?([^"]+)"?/i);
            let nonceVal: string | null = null;
            if (nonceMatch && nonceMatch[1]) nonceVal = nonceMatch[1];
            if (!nonceVal) {
              const dpopNonce = tokenRes.headers.get('dpop-nonce') || tokenRes.headers.get('DPoP-Nonce');
              if (dpopNonce) nonceVal = dpopNonce;
            }

            if (nonceVal) {
              // rebuild DPoP JWT including nonce claim
              const dpopPayloadWithNonce = {
                htu: tokenEndpoint,
                htm: 'POST',
                iat: Math.floor(Date.now() / 1000),
                jti: dpopJti,
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
            }
          }
        }

        if (!tokenRes.ok) {
          const bodyText = await tokenRes.text();
          console.error('Token endpoint error:', tokenRes.status, bodyText);
          throw new Error(`Token endpoint responded ${tokenRes.status}`);
        }

        const tokenJson = await tokenRes.json();
        if (!tokenJson) throw new Error('No token returned from provider');
        // Debug: inspect token response for scopes and keys
        try {
          const scopeDebug = tokenJson.scope || tokenJson.scopes || tokenJson.scopeString || '';
          console.log('Token response keys:', Object.keys(tokenJson));
          console.log('Token scopes (raw):', scopeDebug);
        } catch (_) { /* ignore */ }

        // Map common OAuth token fields to the session shape expected by our ATProtocol service
        const sessionForAtp: any = {};
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
          const maybeService: any = await atProtocolService.initializeWithOAuth({ session: sessionForAtp, returnService: true } as any);

          // If the service returned an actual BlueskyService instance, create a server session
          if (maybeService && typeof maybeService === 'object') {
            // Lazy import to avoid circular types
            const { createSessionFromService } = await import('../controllers/authController.js');
            const identifier = sessionForAtp?.handle || sessionForAtp?.did || tokenJson?.handle || tokenJson?.did || 'bluesky_user';
            const sessionId = createSessionFromService(maybeService as any, identifier);
            const response: ApiResponse = { success: true, data: { sessionId } };
            res.json(response);
            return;
          }

          // Fallback: if initializeWithOAuth did not return a service, still respond success
          const response: ApiResponse = { success: true, message: 'Initialized with OAuth' };
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