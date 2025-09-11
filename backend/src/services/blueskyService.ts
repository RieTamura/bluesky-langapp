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
      await this.agent.login({
        identifier: credentials.identifier,
        password: credentials.password
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
   * Check if the service is authenticated
   */
  isLoggedIn(): boolean {
    return this.isAuthenticated;
  }

  /**
   * Get user's own posts from their timeline
   */
  async getUserPosts(identifier: string, limit: number = 10): Promise<BlueskyPost[]> {
    console.log('BlueskyService.getUserPosts called:', { identifier, limit, isAuthenticated: this.isAuthenticated });
    
    if (!this.isAuthenticated) {
      throw new Error('Not authenticated. Please login first.');
    }

    try {
      console.log('Calling agent.getAuthorFeed...');
      const timeline = await this.agent.getAuthorFeed({
        actor: identifier,
        limit: limit
      });

      console.log('Raw timeline response:', {
        feedLength: timeline.data.feed.length,
        cursor: timeline.data.cursor
      });

      const posts = timeline.data.feed.map(item => {
        const record = item.post.record as any;
        return {
          id: item.post.uri,
          text: record.text || '',
          createdAt: record.createdAt || item.post.indexedAt,
          author: {
            did: item.post.author.did,
            handle: item.post.author.handle,
            displayName: item.post.author.displayName
          }
        };
      });

      console.log('Processed posts:', posts.length);
      return posts;
    } catch (error) {
      console.error('BlueskyService.getUserPosts error:', error);
      throw new Error(`Failed to fetch posts: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get posts from the user's following timeline (home feed)
   */
  async getFollowingFeed(limit: number = 10): Promise<BlueskyPost[]> {
    console.log('BlueskyService.getFollowingFeed called:', { limit, isAuthenticated: this.isAuthenticated });
    
    if (!this.isAuthenticated) {
      throw new Error('Not authenticated. Please login first.');
    }

    try {
      console.log('Calling agent.getTimeline...');
      const timeline = await this.agent.getTimeline({
        limit: limit
      });

      console.log('Raw timeline response:', {
        feedLength: timeline.data.feed.length,
        cursor: timeline.data.cursor
      });

      const posts = timeline.data.feed.map(item => {
        const record = item.post.record as any;
        return {
          id: item.post.uri,
          text: record.text || '',
          createdAt: record.createdAt || item.post.indexedAt,
          author: {
            did: item.post.author.did,
            handle: item.post.author.handle,
            displayName: item.post.author.displayName
          }
        };
      });

      console.log('Processed following posts:', posts.length);
      return posts;
    } catch (error) {
      console.error('BlueskyService.getFollowingFeed error:', error);
      throw new Error(`Failed to fetch following feed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get "discover" (popular) feed posts
   * Bluesky currently exposes a popular feed endpoint. We map it into the same
   * simplified BlueskyPost shape used elsewhere.
   */
  async getDiscoverFeed(limit: number = 10): Promise<BlueskyPost[]> {
    console.log('BlueskyService.getDiscoverFeed called:', { limit, isAuthenticated: this.isAuthenticated });
    if (!this.isAuthenticated) {
      throw new Error('Not authenticated. Please login first.');
    }
    try {
      // The SDK exposes nested namespace access for less common endpoints
      // Using (this.agent as any) to avoid adding types for experimental endpoints
      const response = await (this.agent as any).app.bsky.feed.getPopular({ limit });
      console.log('Raw discover(popular) response:', {
        feedLength: response.data.feed.length,
        cursor: response.data.cursor
      });
      const posts: BlueskyPost[] = response.data.feed.map((item: any) => {
        const record = item.post.record as any;
        return {
          id: item.post.uri,
            text: record?.text || '',
            createdAt: record?.createdAt || item.post.indexedAt,
            author: {
              did: item.post.author.did,
              handle: item.post.author.handle,
              displayName: item.post.author.displayName
            }
        };
      });
      console.log('Processed discover posts:', posts.length);
      return posts;
    } catch (error) {
      console.error('BlueskyService.getDiscoverFeed error:', error);
      throw new Error(`Failed to fetch discover feed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create a new post on Bluesky
   */
  async createPost(text: string): Promise<{ uri: string; cid: string }> {
    if (!this.isAuthenticated) {
      throw new Error('Not authenticated. Please login first.');
    }

    try {
      console.log('Creating Bluesky post:', text.substring(0, 50) + '...');
      
      const response = await this.agent.post({
        text: text,
        createdAt: new Date().toISOString()
      });

      console.log('Post created successfully:', response.uri);
      return {
        uri: response.uri,
        cid: response.cid
      };
    } catch (error) {
      console.error('Failed to create post:', error);
      throw new Error(`Failed to create post: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get current user profile
   */
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
    if (!this.isAuthenticated) {
      throw new Error('Not authenticated. Please login first.');
    }

    try {
      const profile = await this.agent.getProfile({
        actor: this.agent.session?.did || ''
      });

      return {
        did: profile.data.did,
        handle: profile.data.handle,
        displayName: profile.data.displayName,
        description: profile.data.description,
        avatar: profile.data.avatar,
        followersCount: profile.data.followersCount,
        followsCount: profile.data.followsCount,
        postsCount: profile.data.postsCount
      };
    } catch (error) {
      console.error('Failed to get profile:', error);
      throw new Error(`Failed to get profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get profile for an arbitrary actor (handle or DID).
   * This does not require the service to be authenticated and can be used
   * to look up public profiles.
   */
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
    // Normalize actor: strip leading @ if present
    const normalize = (a: string) => a.startsWith('@') ? a.slice(1) : a;
    let tryActors = [normalize(actor)];

    // If actor looks like a short handle without a dot, try appending the common host
    if (!actor.includes('.') && !actor.startsWith('did:')) {
      tryActors.push(`${normalize(actor)}.bsky.social`);
    }

    // Create a public (unauthenticated) agent to prefer public lookups first
    const serviceUrl = process.env.BLUESKY_SERVICE_URL || 'https://bsky.social';
    const publicAgent = new AtpAgent({ service: serviceUrl });

    let lastErr: any = null;

    for (const a of tryActors) {
      // 1) Try public, unauthenticated lookup first
      try {
        console.log('BlueskyService.getProfileByActor (public) trying actor=', a);
        const profile = await publicAgent.getProfile({ actor: a });
        return {
          did: profile.data.did,
          handle: profile.data.handle,
          displayName: profile.data.displayName,
          description: profile.data.description,
          avatar: profile.data.avatar,
          followersCount: profile.data.followersCount,
          followsCount: profile.data.followsCount,
          postsCount: profile.data.postsCount
        };
      } catch (errPublic) {
        // Dump full error object for debugging (include non-enumerable props)
        try {
          const errDump = JSON.stringify(errPublic, Object.getOwnPropertyNames(errPublic), 2);
          console.warn('BlueskyService.getProfileByActor public attempt failed for', a, 'errorDump=', errDump);
        } catch (dumpErr) {
          console.warn('BlueskyService.getProfileByActor public attempt failed for', a, 'errorMessage=', errPublic instanceof Error ? errPublic.message : String(errPublic));
        }

        lastErr = errPublic;

        // Try to detect authentication-required by inspecting known shapes
        let errMsg = '';
        try { errMsg = errPublic instanceof Error ? errPublic.message : String(errPublic); } catch { errMsg = '' }

        // If the agent provided a response object, try to inspect status and body
        let statusCode: number | undefined = undefined;
        try {
          const anyErr: any = errPublic;
          if (anyErr && anyErr.response && typeof anyErr.response.status === 'number') {
            statusCode = anyErr.response.status;
            console.warn('Public attempt response status:', anyErr.response.status);
            if (anyErr.response.data) {
              try {
                console.warn('Public attempt response data:', JSON.stringify(anyErr.response.data));
              } catch (jsonErr) {
                console.warn('Public attempt response data (string):', String(anyErr.response.data));
              }
            }
          }
        } catch (inspectErr) {
          console.warn('Failed to inspect public attempt error response:', inspectErr instanceof Error ? inspectErr.message : inspectErr);
        }

        // Strictly check for 401 status code first, fallback to message inspection only if no status
        const indicatesAuthRequired = statusCode === 401 || 
          (statusCode === undefined && /\b(auth|authentication)\s+(required|needed)/i.test(errMsg));        // to a conservative message-based test that looks for phrases like
        // "authentication required" or "auth required" to avoid false positives.
        const indicatesAuthRequired = statusCode === 401 ||
          (statusCode === undefined && /\b(?:auth|authentication)\s+(?:required|needed)\b/i.test(errMsg));

        if (indicatesAuthRequired && this.isAuthenticated) {
          try {
            console.log('BlueskyService.getProfileByActor falling back to authenticated agent for', a);
            const profile = await this.agent.getProfile({ actor: a });
            return {
              did: profile.data.did,
              handle: profile.data.handle,
              displayName: profile.data.displayName,
              description: profile.data.description,
              avatar: profile.data.avatar,
              followersCount: profile.data.followersCount,
              followsCount: profile.data.followsCount,
              postsCount: profile.data.postsCount
            };
          } catch (errAuth) {
            console.warn('BlueskyService.getProfileByActor authenticated attempt failed for', a, errAuth instanceof Error ? errAuth.message : errAuth);
            lastErr = errAuth;
          }
        } else {
          console.log('BlueskyService.getProfileByActor: public attempt failed and no authenticated fallback available for', a);
        }
      }
    }

    console.error('Failed to get profile by actor (all attempts):', { actor, lastError: lastErr });
    throw new Error(`Failed to get profile for ${actor}: ${lastErr instanceof Error ? lastErr.message : String(lastErr)}`);
  }

  /**
   * Logout and clear authentication
   */
  logout(): void {
    this.isAuthenticated = false;
    // Note: AtpAgent doesn't have explicit logout method, 
    // but we can create a new instance to clear session
    this.agent = new AtpAgent({ service: 'https://bsky.social' });
  }
}

export default BlueskyService;