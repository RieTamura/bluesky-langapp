import { AtpAgent } from '@atproto/api';

export interface BlueskyCredentials {
  identifier: string;
  password: string;
}

export interface BlueskyPost {
  id: string;
  text: string;
  createdAt: string;
  author: {
    did: string;
    handle: string;
    displayName?: string;
  };
}

export class BlueskyService {
  private agent: AtpAgent;
  private isAuthenticated: boolean = false;

  constructor() {
    this.agent = new AtpAgent({ service: 'https://bsky.social' });
  }

  /**
   * Authenticate with Bluesky using identifier and app password
   */
  async login(credentials: BlueskyCredentials): Promise<void> {
    try {
      console.log('BlueskyService.login called for:', credentials.identifier);
      await (this.agent as any).login({
        identifier: credentials.identifier,
        password: credentials.password,
      });
      this.isAuthenticated = true;
      console.log('BlueskyService authentication successful');
    } catch (error) {
      console.error('BlueskyService authentication failed:', error);
      this.isAuthenticated = false;
      throw new Error(`Bluesky authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Initialize agent session using an OAuth-issued access token (accessJwt).
   * This method is best-effort because different @atproto/api versions expose
   * different session shapes. We attempt a few strategies and verify by
   * performing a small authenticated call.
   */
  async loginWithOAuthToken(token: string): Promise<void> {
    try {
      // Attempt to extract a DID from the token payload (if present)
      let did: string | undefined;
      try {
        const parts = token.split('.');
        if (parts.length >= 2) {
          const payload = parts[1];
          const b64 = payload.replace(/-/g, '+').replace(/_/g, '/');
          const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
          const decoded = Buffer.from(padded, 'base64').toString('utf8');
          const obj = JSON.parse(decoded);
          did = obj?.did || obj?.sub || obj?.identity;
        }
      } catch (e) {
        // ignore parsing errors
      }

      // Strategy 1: set agent.session directly (works on some SDK versions)
      try {
        // @ts-ignore
        (this.agent as any).session = { accessJwt: token, did };
        try {
          if (did) {
            await (this.agent as any).getProfile({ actor: did });
          } else {
            await (this.agent as any).getTimeline({ limit: 1 });
          }
          this.isAuthenticated = true;
          console.log('BlueskyService: session restored via setting agent.session');
          return;
        } catch (e) {
          console.warn('BlueskyService: verification after setting agent.session failed', e);
        }
      } catch (e) {
        console.warn('BlueskyService: failed to set agent.session directly', e);
      }

      // Strategy 2: use agent.login({ accessJwt }) if exposed
      try {
        // @ts-ignore
        await (this.agent as any).login({ accessJwt: token });
        if (did) await (this.agent as any).getProfile({ actor: did });
        this.isAuthenticated = true;
        console.log('BlueskyService: session restored via agent.login(accessJwt)');
        return;
      } catch (e) {
        console.warn('BlueskyService: agent.login(accessJwt) failed', e);
      }

      throw new Error('Unable to initialize Bluesky session from OAuth token');
    } catch (error) {
      console.error('BlueskyService.loginWithOAuthToken failed:', error);
      this.isAuthenticated = false;
      throw error instanceof Error ? error : new Error(String(error));
    }
  }

  /**
   * Resume a full AtpAgent session object produced by the provider or AtpAgent
   * session management APIs. This will call the underlying agent.resumeSession
   * to validate and hydrate the agent.
   */
  async resumeWithSession(session: any): Promise<void> {
    try {
      // AtpAgent exposes resumeSession(session) which will validate the session
      await (this.agent as any).resumeSession(session);
      this.isAuthenticated = true;
      console.log('BlueskyService: resumed session via agent.resumeSession');
    } catch (e) {
      this.isAuthenticated = false;
      console.error('BlueskyService.resumeWithSession failed:', e);
      throw e;
    }
  }

  /** Check if the service is authenticated */
  isLoggedIn(): boolean {
    return this.isAuthenticated;
  }

  /** Get user's own posts from their author feed */
  async getUserPosts(identifier: string, limit: number = 10): Promise<BlueskyPost[]> {
    console.log('BlueskyService.getUserPosts called:', { identifier, limit, isAuthenticated: this.isAuthenticated });
    if (!this.isAuthenticated) throw new Error('Not authenticated. Please login first.');

    try {
      const timeline = await (this.agent as any).getAuthorFeed({ actor: identifier, limit });
      const posts = timeline.data.feed.map((item: any) => {
        const record = item.post.record as any;
        return {
          id: item.post.uri,
          text: record?.text || '',
          createdAt: record?.createdAt || item.post.indexedAt,
          author: {
            did: item.post.author.did,
            handle: item.post.author.handle,
            displayName: item.post.author.displayName,
          },
        };
      });
      return posts;
    } catch (error) {
      console.error('BlueskyService.getUserPosts error:', error);
      throw new Error(`Failed to fetch posts: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /** Get posts from the user's following timeline (home feed) */
  async getFollowingFeed(limit: number = 10): Promise<BlueskyPost[]> {
    console.log('BlueskyService.getFollowingFeed called:', { limit, isAuthenticated: this.isAuthenticated });
    if (!this.isAuthenticated) throw new Error('Not authenticated. Please login first.');

    try {
      const timeline = await (this.agent as any).getTimeline({ limit });
      const posts = timeline.data.feed.map((item: any) => {
        const record = item.post.record as any;
        return {
          id: item.post.uri,
          text: record?.text || '',
          createdAt: record?.createdAt || item.post.indexedAt,
          author: {
            did: item.post.author.did,
            handle: item.post.author.handle,
            displayName: item.post.author.displayName,
          },
        };
      });
      return posts;
    } catch (error) {
      console.error('BlueskyService.getFollowingFeed error:', error);
      throw new Error(`Failed to fetch following feed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /** Get "discover" (popular) feed posts */
  async getDiscoverFeed(limit: number = 10): Promise<BlueskyPost[]> {
    console.log('BlueskyService.getDiscoverFeed called:', { limit, isAuthenticated: this.isAuthenticated });
    if (!this.isAuthenticated) throw new Error('Not authenticated. Please login first.');

    try {
      const response = await (this.agent as any).app.bsky.feed.getPopular({ limit });
      const posts: BlueskyPost[] = response.data.feed.map((item: any) => {
        const record = item.post.record as any;
        return {
          id: item.post.uri,
          text: record?.text || '',
          createdAt: record?.createdAt || item.post.indexedAt,
          author: {
            did: item.post.author.did,
            handle: item.post.author.handle,
            displayName: item.post.author.displayName,
          },
        };
      });
      return posts;
    } catch (error) {
      console.error('BlueskyService.getDiscoverFeed error:', error);
      throw new Error(`Failed to fetch discover feed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /** Create a new post on Bluesky */
  async createPost(text: string): Promise<{ uri: string; cid: string }> {
    if (!this.isAuthenticated) throw new Error('Not authenticated. Please login first.');

    try {
      const response = await (this.agent as any).post({ text, createdAt: new Date().toISOString() });
      return { uri: response.uri, cid: response.cid };
    } catch (error) {
      console.error('Failed to create post:', error);
      throw new Error(`Failed to create post: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /** Get current user profile */
  async getProfile(): Promise<{
    did: string;
    handle: string;
    displayName?: string;
    description?: string;
    avatar?: string;
    followersCount?: number;
    followsCount?: number;
    postsCount?: number;
  }> {
    if (!this.isAuthenticated) throw new Error('Not authenticated. Please login first.');

    try {
      const actor = (this.agent as any).session?.did || '';
      const profile = await (this.agent as any).getProfile({ actor });
      return {
        did: profile.data.did,
        handle: profile.data.handle,
        displayName: profile.data.displayName,
        description: profile.data.description,
        avatar: profile.data.avatar,
        followersCount: profile.data.followersCount,
        followsCount: profile.data.followsCount,
        postsCount: profile.data.postsCount,
      };
    } catch (error) {
      console.error('Failed to get profile:', error);
      throw new Error(`Failed to get profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /** Get profile for an arbitrary actor (handle or DID). This can be public. */
  async getProfileByActor(actor: string): Promise<{
    did: string;
    handle: string;
    displayName?: string;
    description?: string;
    avatar?: string;
    followersCount?: number;
    followsCount?: number;
    postsCount?: number;
  }> {
    let lastErr: unknown = null;
    // First attempt: public unauthenticated fetch
    try {
      const profile = await (this.agent as any).getProfile({ actor });
      return {
        did: profile.data.did,
        handle: profile.data.handle,
        displayName: profile.data.displayName,
        description: profile.data.description,
        avatar: profile.data.avatar,
        followersCount: profile.data.followersCount,
        followsCount: profile.data.followsCount,
        postsCount: profile.data.postsCount,
      };
    } catch (errPublic) {
      lastErr = errPublic;
      // If we are authenticated, try an authenticated call as a fallback
      if (this.isAuthenticated) {
        try {
          const profile = await (this.agent as any).getProfile({ actor });
          return {
            did: profile.data.did,
            handle: profile.data.handle,
            displayName: profile.data.displayName,
            description: profile.data.description,
            avatar: profile.data.avatar,
            followersCount: profile.data.followersCount,
            followsCount: profile.data.followsCount,
            postsCount: profile.data.postsCount,
          };
        } catch (errAuth) {
          lastErr = errAuth;
          console.warn('BlueskyService.getProfileByActor authenticated attempt failed for', actor, errAuth instanceof Error ? errAuth.message : errAuth);
        }
      } else {
        console.log('BlueskyService.getProfileByActor: public attempt failed and no authenticated fallback available for', actor);
      }
    }

    console.error('Failed to get profile by actor (all attempts):', { actor, lastError: lastErr });
    throw new Error(`Failed to get profile for ${actor}: ${lastErr instanceof Error ? lastErr.message : String(lastErr)}`);
  }

  /** Logout and clear authentication */
  logout(): void {
    this.isAuthenticated = false;
    this.agent = new AtpAgent({ service: 'https://bsky.social' });
  }
}

export default BlueskyService;