import BlueskyService from '../src/services/blueskyService';
import type { BlueskyTimelineResponse, BlueskyFeedEntry, BlueskyPostObject } from '../src/services/blueskyService';

type MockProfileResponse = { data: { did: string; handle: string; displayName?: string; description?: string; avatar?: string; followersCount?: number; followsCount?: number; postsCount?: number } };

interface MockAgent {
  resumeSession?(session: Record<string, unknown>): Promise<void>;
  getAuthorFeed?(opts: { actor: string; limit?: number }): Promise<BlueskyTimelineResponse>;
  getTimeline?(opts: { limit?: number }): Promise<BlueskyTimelineResponse>;
  getProfile?(opts: { actor: string }): Promise<MockProfileResponse>;
}

async function run() {
  console.log('Smoke test: starting');
  const svc = new BlueskyService();

  // Replace private agent with a mock that implements used methods
  const mockAgent: MockAgent = {
    resumeSession: async (session: Record<string, unknown>) => {
      console.log('mockAgent.resumeSession called with', session);
      return Promise.resolve();
    },
    getAuthorFeed: async ({ actor, limit }: { actor: string; limit?: number }) => {
      console.log('mockAgent.getAuthorFeed called', { actor, limit });
      const feedEntry: BlueskyFeedEntry = {
        post: {
          uri: 'uri:1',
          record: { text: 'hello', createdAt: new Date().toISOString() },
          indexedAt: new Date().toISOString(),
          author: { did: actor, handle: 'h', displayName: 'D' }
        }
      } as BlueskyFeedEntry;
      return { data: { feed: [feedEntry] } } as BlueskyTimelineResponse;
    },
    getTimeline: async ({ limit }: { limit?: number }) => {
      console.log('mockAgent.getTimeline called', { limit });
      return { data: { feed: [] } } as BlueskyTimelineResponse;
    },
    getProfile: async ({ actor }: { actor: string }) => {
      console.log('mockAgent.getProfile called', { actor });
      return { data: { did: actor, handle: 'h', displayName: 'D', description: '', avatar: '', followersCount: 0, followsCount: 0, postsCount: 0 } };
    },
  };

  // inject mock (BlueskyService keeps agent private; use a narrow cast for test injection)
  (svc as unknown as { agent?: MockAgent }).agent = mockAgent;

  // call resumeWithSession
  try {
    await svc.resumeWithSession({ accessJwt: 'test-access-jwt' });
    console.log('resumeWithSession OK');
  } catch (e) {
    console.error('resumeWithSession failed', e);
  }

  // set authenticated and call getUserPosts
  (svc as any).isAuthenticated = true;
  try {
    const posts = await svc.getUserPosts('did:example', 1);
    console.log('getUserPosts OK, posts:', posts);
  } catch (e) {
    console.error('getUserPosts failed', e);
  }

  console.log('Smoke test: finished');
}

run().catch((e) => { console.error('Smoke script top-level error', e); process.exit(1); });
