import { atom } from 'nanostores';
import { apiService } from '../services/api';

export interface ProcessedWord {
  text: string;
  status: 'unknown' | 'learning' | 'known';
  startIndex: number;
  endIndex: number;
}

export interface Post {
  id: string;
  author: {
    displayName?: string;
    handle: string;
  };
  text: string;
  createdAt: string;
  extractedWords?: string[];
}

export interface PostsState {
  posts: Post[];
  isLoading: boolean;
  error: string | null;
  feedType: 'my' | 'following';
  limit: number;
}

export const postsStore = atom<PostsState>({
  posts: [],
  isLoading: false,
  error: null,
  feedType: 'following',
  limit: 10
});

export const setFeedType = (feedType: 'my' | 'following') => {
  postsStore.set({
    ...postsStore.get(),
    feedType
  });
};

export const setLimit = (limit: number) => {
  postsStore.set({
    ...postsStore.get(),
    limit
  });
};

export const loadPosts = async () => {
  const currentState = postsStore.get();
  
  console.log('loadPosts called:', { feedType: currentState.feedType, limit: currentState.limit });
  
  postsStore.set({
    ...currentState,
    isLoading: true,
    error: null
  });

  try {
    // まずテストデータで表示機能を確認
    const testPosts: Post[] = [
      {
        id: 'test-1',
        author: {
          displayName: 'Test User',
          handle: 'test.bsky.social'
        },
        text: 'これはテスト投稿です。Bluesky APIからの投稿取得をテストしています。',
        createdAt: new Date().toISOString(),
        extractedWords: ['テスト', '投稿', 'Bluesky', 'API']
      },
      {
        id: 'test-2',
        author: {
          displayName: 'Another User',
          handle: 'another.bsky.social'
        },
        text: 'Hello world! This is a test post in English.',
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        extractedWords: ['Hello', 'world', 'test', 'post', 'English']
      }
    ];

    // テストデータを表示
    console.log('Displaying test posts:', testPosts.length);
    postsStore.set({
      ...currentState,
      posts: testPosts,
      isLoading: false,
      error: null
    });

    // 実際のAPIも試行
    try {
      let data;
      
      if (currentState.feedType === 'following') {
        console.log('Fetching following posts...');
        data = await apiService.getFollowingPosts(currentState.limit);
      } else {
        const userIdentifier = localStorage.getItem('userIdentifier');
        console.log('Fetching user posts for:', userIdentifier);
        if (!userIdentifier) {
          throw new Error('User identifier not found');
        }
        data = await apiService.getPosts(userIdentifier, currentState.limit);
      }

      console.log('API response:', data);

      if (data.success && data.data && data.data.length > 0) {
        console.log('Real posts loaded successfully:', data.data.length, 'posts');
        postsStore.set({
          ...currentState,
          posts: data.data,
          isLoading: false,
          error: null
        });
      } else {
        console.log('No real posts found, keeping test posts');
      }
    } catch (apiError) {
      console.error('API error (keeping test posts):', apiError);
    }

  } catch (error) {
    console.error('loadPosts error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    postsStore.set({
      ...currentState,
      posts: [],
      isLoading: false,
      error: errorMessage
    });
  }
};