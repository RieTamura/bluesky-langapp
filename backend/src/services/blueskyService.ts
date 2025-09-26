import { AtpAgent } from '@atproto/api';

// Minimal local interface describing agents that expose a login method.
// Keep the return type permissive (Promise<any>) to remain compatible with
// multiple @atproto/api versions which may return different shapes.
interface AgentWithLogin {
  login(opts: { identifier?: string; password?: string; accessJwt?: string }): Promise<unknown>;
}

// Minimal session shape used by resumeSession / session hydration flows.
// Keep fields conservative: accessJwt is required for resuming auth.
export interface AtpSession {
  accessJwt: string;
  refreshJwt?: string;
  did?: string;
  handle?: string;
  // some AtpAgent session shapes include an 'active' flag
  active?: boolean;
}

// Shared Bluesky API shapes used by local mappings. These are conservative
// and only cover the fields this service reads.
export interface BlueskyPostRecord {
  text?: string;
  createdAt?: string;
}

export interface BlueskyPostAuthor {
  did: string;
  handle: string;
  displayName?: string;
}

export interface BlueskyPostObject {
  uri: string;
  record?: BlueskyPostRecord;
  indexedAt: string;
  author: BlueskyPostAuthor;
}

export interface BlueskyFeedEntry {
  post: BlueskyPostObject;
}

export interface BlueskyTimelineResponse {
  data: { feed: BlueskyFeedEntry[] };
}

// Minimal typed subset of methods we call on the AtpAgent. We assert the
// runtime agent to this shape when making feed/timeline calls to avoid
// repeating `as any` throughout the file.
interface BlueskyApiClient {
  getAuthorFeed(opts: { actor: string; limit?: number }): Promise<BlueskyTimelineResponse>;
  getTimeline(opts: { limit?: number }): Promise<BlueskyTimelineResponse>;
  getProfile(opts: { actor: string }): Promise<{ data: { did: string; handle: string; displayName?: string; description?: string; avatar?: string; followersCount?: number; followsCount?: number; postsCount?: number } }>;
}

// Describe the optional session/resume/login shapes we try to use when present
type ExtendedAtpAgent = AtpAgent & {
  session?: { accessJwt: string; did?: string };
  resumeSession?: (session: AtpSession) => Promise<void>;
  // some SDK versions expose login overload accepting an accessJwt
  login?: (opts: any) => Promise<void>;
};

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
  // Agent is primarily AtpAgent, but may also implement a login method.
  private agent: AtpAgent & Partial<AgentWithLogin>;
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
      // Prefer a runtime check for the login method instead of force-casting.
      // Some @atproto/api versions may not expose credential-based login.
      const maybeLogin = (this.agent as any).login;
      if (typeof maybeLogin === 'function') {
        // Narrow to the AgentWithLogin shape for the call
        const agentWithLogin = this.agent as AgentWithLogin;
        await agentWithLogin.login({
          identifier: credentials.identifier,
          password: credentials.password,
        });
      } else {
        const msg = 'Agent instance does not support credential login (missing login method). Use OAuth token flows or an agent implementation that supports login.';
        console.error('BlueskyService.login failed:', msg);
        this.isAuthenticated = false;
        throw new Error(msg);
      }
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
      // Build a minimal AtpSession from the provided access token. We avoid
      // manual JWT parsing here and rely on agent methods to validate and
      // hydrate the session.
      const session: AtpSession = { accessJwt: token };

      const extended = this.agent as ExtendedAtpAgent;

      // Strategy A: prefer agent.resumeSession(session) when available.
      if (typeof extended.resumeSession === 'function') {
        try {
          await extended.resumeSession(session);
          // Verify that the session works by doing a small authenticated call.
          try {
            await this.verifySession();
            this.isAuthenticated = true;
            console.log('BlueskyService: session restored via resumeSession');
            return;
          } catch (e) {
            console.warn('BlueskyService: verification after resumeSession failed', e);
          }
        } catch (e) {
          console.warn('BlueskyService: resumeSession call failed', e);
        }
      }

      // Strategy B: use agent.login({ accessJwt }) if implemented by the SDK.
      const agentWithLogin = this.agent as AgentWithLogin;
      if (typeof agentWithLogin.login === 'function') {
        try {
          await agentWithLogin.login({ accessJwt: token });
          await this.verifySession();
          this.isAuthenticated = true;
          console.log('BlueskyService: session restored via agent.login(accessJwt)');
          return;
        } catch (e) {
          console.warn('BlueskyService: agent.login(accessJwt) failed', e);
        }
      }

      // Strategy C: as a last resort, assign to agent.session where supported
      // and then verify via an authenticated call.
        try {
          if (extended) {
          // Limited cast: adapt our minimal AtpSession to the runtime agent shape.
          // This avoids using `as any` widely while acknowledging runtime
          // session shape differences across SDK versions.
          extended.session = session as unknown as any;
        }
        try {
          await this.verifySession();
          this.isAuthenticated = true;
          console.log('BlueskyService: session restored via setting agent.session');
          return;
        } catch (e) {
          console.warn('BlueskyService: verification after setting agent.session failed', e);
        }
      } catch (e) {
        console.warn('BlueskyService: failed to set agent.session directly', e);
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
  async resumeWithSession(session: AtpSession): Promise<void> {
    try {
      // Basic runtime sanity check before calling resumeSession.
      if (!session || typeof session.accessJwt !== 'string' || session.accessJwt.length === 0) {
        throw new Error('Invalid session: missing accessJwt');
      }

      // AtpAgent exposes resumeSession(session) which will validate the session
      const agentWithResume = this.agent as ExtendedAtpAgent;
      if (typeof agentWithResume.resumeSession !== 'function') {
        throw new Error('Agent does not support resumeSession');
      }

      await agentWithResume.resumeSession(session);
      this.isAuthenticated = true;
      console.log('BlueskyService: resumed session via agent.resumeSession');
    } catch (e) {
      this.isAuthenticated = false;
      console.error('BlueskyService.resumeWithSession failed:', e);
      throw e;
    }
  }

  /**
   * Verify that the current agent session is usable by performing a small
   * authenticated call. Throws if verification fails.
   */
  private async verifySession(): Promise<void> {
    const extended = this.agent as ExtendedAtpAgent;
    const did = extended.session?.did;
    const client = this.agent as unknown as BlueskyApiClient;
    if (did) {
      await client.getProfile({ actor: did });
    } else {
      await client.getTimeline({ limit: 1 });
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
      const client = this.agent as unknown as BlueskyApiClient;
      const timeline: BlueskyTimelineResponse = await client.getAuthorFeed({ actor: identifier, limit });
      const posts = timeline.data.feed.map((entry: BlueskyFeedEntry): BlueskyPost => {
        const postObj = entry.post;
        const record = postObj.record;
        return {
          id: postObj.uri,
          text: record?.text || '',
          createdAt: record?.createdAt || postObj.indexedAt,
          author: {
            did: postObj.author.did,
            handle: postObj.author.handle,
            displayName: postObj.author.displayName,
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
      const client = this.agent as unknown as BlueskyApiClient;
      const timeline: BlueskyTimelineResponse = await client.getTimeline({ limit });
      const posts = timeline.data.feed.map((entry: BlueskyFeedEntry): BlueskyPost => {
        const postObj = entry.post;
        const record = postObj.record;
        return {
          id: postObj.uri,
          text: record?.text || '',
          createdAt: record?.createdAt || postObj.indexedAt,
          author: {
            did: postObj.author.did,
            handle: postObj.author.handle,
            displayName: postObj.author.displayName,
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
      const extended = this.agent as ExtendedAtpAgent;
      const actor = extended.session?.did;
      if (!actor || typeof actor !== 'string' || actor.length === 0) {
        throw new Error('Cannot fetch profile: no session DID available. Ensure you are authenticated and the agent session contains a valid DID.');
      }
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
      return await this.fetchProfile(actor, /* useAuthenticated */ false);
    } catch (errPublic) {
      lastErr = errPublic;
      // If we are authenticated, try an authenticated call as a fallback
      if (this.isAuthenticated) {
        try {
          return await this.fetchProfile(actor, /* useAuthenticated */ true);
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

  // Private helper to fetch and map a profile response from the agent.
  private async fetchProfile(actor: string, useAuthenticated: boolean = false): Promise<{
    did: string;
    handle: string;
    displayName?: string;
    description?: string;
    avatar?: string;
    followersCount?: number;
    followsCount?: number;
    postsCount?: number;
  }> {
    // When useAuthenticated is true, use the service's agent (which may hold
    // an authenticated session). Otherwise, create a fresh unauthenticated
    // AtpAgent instance for a public fetch to avoid relying on caller state.
    const client = useAuthenticated ? (this.agent as any) : new AtpAgent({ service: 'https://bsky.social' }) as any;
    const profile = await client.getProfile({ actor });
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
  }

  /** Logout and clear authentication */
  logout(): void {
    this.isAuthenticated = false;
    this.agent = new AtpAgent({ service: 'https://bsky.social' });
  }
}

export default BlueskyService;