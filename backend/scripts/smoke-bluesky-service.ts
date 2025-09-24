import BlueskyService from '../src/services/blueskyService';

async function run() {
  console.log('Smoke test: starting');
  const svc = new BlueskyService();

  // Replace private agent with a mock that implements used methods
  const mockAgent: any = {
    resumeSession: async (session: any) => {
      console.log('mockAgent.resumeSession called with', session);
      return Promise.resolve();
    },
    getAuthorFeed: async ({ actor, limit }: any) => {
      console.log('mockAgent.getAuthorFeed called', { actor, limit });
      return {
        data: {
          feed: [
            { post: { uri: 'uri:1', record: { text: 'hello', createdAt: new Date().toISOString() }, indexedAt: new Date().toISOString(), author: { did: actor, handle: 'h', displayName: 'D' } } },
          ],
        },
      };
    },
    getTimeline: async ({ limit }: any) => {
      console.log('mockAgent.getTimeline called', { limit });
      return { data: { feed: [] } };
    },
    getProfile: async ({ actor }: any) => {
      console.log('mockAgent.getProfile called', { actor });
      return { data: { did: actor, handle: 'h', displayName: 'D', description: '', avatar: '', followersCount: 0, followsCount: 0, postsCount: 0 } };
    },
  };

  // inject mock
  (svc as any).agent = mockAgent;

  // call resumeWithSession
  try {
    await svc.resumeWithSession({ some: 'session' });
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
