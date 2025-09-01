import React, { useState, useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { postsStore, setFeedType, setLimit, loadPosts as loadPostsAction } from '../../stores/posts';
import { authStore } from '../../stores/auth';
import { apiService } from '../../services/api';
import PostList from './PostList';
import FeedTabs from './FeedTabs';
import PostsControls from './PostsControls';

export default function PostsContainer() {
  const posts = useStore(postsStore);
  const auth = useStore(authStore);

  const handleFeedTypeChange = (feedType: 'my' | 'following') => {
    setFeedType(feedType);
  };

  const handleLimitChange = (limit: number) => {
    setLimit(limit);
  };

  const handleRefresh = () => {
    loadPostsAction();
  };

  useEffect(() => {
    if (auth.sessionId) {
      loadPostsAction();
    }
  }, [posts.feedType, posts.limit, auth.sessionId]);

  // Set up refresh button listener
  useEffect(() => {
    const refreshBtn = document.getElementById('refreshPostsBtn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', handleRefresh);
      return () => refreshBtn.removeEventListener('click', handleRefresh);
    }
  }, []);

  return (
    <div>
      <FeedTabs 
        currentFeedType={posts.feedType}
        onFeedTypeChange={handleFeedTypeChange}
      />
      
      <PostsControls
        currentLimit={posts.limit}
        onLimitChange={handleLimitChange}
      />

      {posts.isLoading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">投稿を取得中...</p>
        </div>
      )}

      {posts.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h3 className="text-lg font-semibold text-red-800 mb-2">
            {posts.feedType === 'following' ? 'フォロー中の投稿' : '自分の投稿'}の読み込みに失敗しました
          </h3>
          <p className="text-red-700 mb-4">{posts.error}</p>
          <button 
            onClick={handleRefresh}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md transition-colors"
          >
            再試行
          </button>
        </div>
      )}

      {!posts.isLoading && !posts.error && (
        <PostList posts={posts.posts} />
      )}
    </div>
  );
}