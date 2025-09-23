import { Request, Response } from 'express';
import BlueskyService from '../services/blueskyService.js';
import crypto from 'crypto';

// Simple in-memory session store (for production, use Redis or database)
interface SessionData {
  userId: string;
  blueskyIdentifier: string;
  blueskyService: BlueskyService;
  createdAt: Date;
  lastAccessed: Date;
}

const sessions = new Map<string, SessionData>();

// Clean up expired sessions every hour
setInterval(() => {
  const now = new Date();
  const oneDay = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  
  for (const [sessionId, session] of sessions.entries()) {
    if (now.getTime() - session.lastAccessed.getTime() > oneDay) {
      sessions.delete(sessionId);
    }
  }
}, 60 * 60 * 1000); // Run every hour

export class AuthController {
  /**
   * Login with Bluesky credentials
   */
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { identifier, password } = req.body;

      if (!identifier || !password) {
        res.status(400).json({
          error: 'Missing credentials',
          message: 'Both identifier and password are required'
        });
        return;
      }

      const blueskyService = new BlueskyService();
      await blueskyService.login({ identifier, password });

      // Generate secure session ID
      const sessionId = crypto.randomBytes(32).toString('hex');
      
      // Store session data
      sessions.set(sessionId, {
        userId: identifier,
        blueskyIdentifier: identifier,
        blueskyService: blueskyService,
        createdAt: new Date(),
        lastAccessed: new Date()
      });

      res.json({
        success: true,
        message: 'Authentication successful',
        sessionId: sessionId,
        user: {
          identifier: identifier
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(401).json({
        error: 'Authentication failed',
        message: error instanceof Error ? error.message : 'Invalid credentials'
      });
    }
  }

  /**
   * Logout and clear session
   */
  static async logout(req: Request, res: Response): Promise<void> {
    try {
      const sessionId = req.headers.authorization?.replace('Bearer ', '');

      if (sessionId && sessions.has(sessionId)) {
        const session = sessions.get(sessionId);
        if (session?.blueskyService) {
          session.blueskyService.logout();
        }
        sessions.delete(sessionId);
      }

      res.json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({
        error: 'Logout failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get current user information
   */
  static async me(req: Request, res: Response): Promise<void> {
    try {
      const sessionId = req.headers.authorization?.replace('Bearer ', '');

      if (!sessionId || !sessions.has(sessionId)) {
        res.status(401).json({
          error: 'Not authenticated',
          message: 'Valid session required'
        });
        return;
      }

      const session = sessions.get(sessionId)!;
      
      // Update last accessed time
      session.lastAccessed = new Date();

      if (!session.blueskyService.isLoggedIn()) {
        res.status(401).json({
          error: 'Session expired',
          message: 'Please login again'
        });
        return;
      }

      // Attempt to include richer Bluesky profile info (displayName, avatar, description)
      let profileData: any = { identifier: session.blueskyIdentifier };
      try {
        const profile = await session.blueskyService.getProfile();
        if (profile) {
          profileData = {
            identifier: session.blueskyIdentifier,
            handle: profile.handle,
            displayName: profile.displayName,
            description: profile.description,
            avatar: profile.avatar
          };
        }
      } catch (err) {
        // If profile fetch fails, fall back to minimal response but don't error the endpoint
        console.warn('auth.me: failed to fetch Bluesky profile for session user', session.blueskyIdentifier, err instanceof Error ? err.message : err);
      }

      res.json({
        authenticated: true,
        user: profileData,
        message: 'User is authenticated'
      });
    } catch (error) {
      console.error('Me endpoint error:', error);
      res.status(500).json({
        error: 'Failed to get user info',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get Bluesky service for authenticated user
   */
  static getBlueskyService(req: Request): BlueskyService | null {
    const sessionId = req.headers.authorization?.replace('Bearer ', '');
    console.log('getBlueskyService called with sessionId:', sessionId ? 'present' : 'missing');
    console.log('Active sessions count:', sessions.size);
    
    if (!sessionId || !sessions.has(sessionId)) {
      console.log('Session not found or invalid');
      return null;
    }
    
    const session = sessions.get(sessionId)!;
    session.lastAccessed = new Date();
    console.log('Session found, service logged in:', session.blueskyService.isLoggedIn());
    return session.blueskyService;
  }

  /**
   * Check if user is authenticated (for middleware)
   */
  static isAuthenticated(req: Request): boolean {
    const sessionId = req.headers.authorization?.replace('Bearer ', '');
    if (!sessionId || !sessions.has(sessionId)) {
      return false;
    }
    
    const session = sessions.get(sessionId)!;
    session.lastAccessed = new Date();
    return session.blueskyService.isLoggedIn();
  }

  /**
   * Get user ID from authenticated session
   */
  static getUserId(req: Request): string | null {
    const sessionId = req.headers.authorization?.replace('Bearer ', '');
    if (!sessionId || !sessions.has(sessionId)) {
      return null;
    }
    
    const session = sessions.get(sessionId)!;
    session.lastAccessed = new Date();
    return session.userId;
  }
}

export default AuthController;

/**
 * Create a server session from an existing BlueskyService instance.
 * Returns the generated sessionId.
 */
export function createSessionFromService(blueskyService: BlueskyService, identifier: string): string {
  const sessionId = crypto.randomBytes(32).toString('hex');
  sessions.set(sessionId, {
    userId: identifier,
    blueskyIdentifier: identifier,
    blueskyService: blueskyService,
    createdAt: new Date(),
    lastAccessed: new Date()
  });
  return sessionId;
}