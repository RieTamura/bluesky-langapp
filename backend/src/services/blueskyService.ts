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