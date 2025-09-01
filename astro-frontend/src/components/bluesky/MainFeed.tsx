import React, { useState, useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { postsStore, setFeedType, setLimit, loadPosts as loadPostsAction } from '../../stores/posts';
import { authStore } from '../../stores/auth';
import BlueskyPostItem from './BlueskyPostItem';

export default function MainFeed() {
  const posts = useStore(postsStore);
  const auth = useStore(authStore);
  const [activeTab, setActiveTab] = useState<'following' | 'my'>('following');

  const handleTabChange = (tab: 'following' | 'my') => {
    setActiveTab(tab);
    setFeedType(tab);
  };

  const handleRefresh = () => {
    console.log('Refresh button clicked');
    loadPostsAction();
  };

  useEffect(() => {
    console.log('MainFeed useEffect:', { 
      sessionId: auth.sessionId, 
      feedType: posts.feedType, 
      limit: posts.limit 
    });
    if (auth.sessionId) {
      loadPostsAction();
    }
  }, [posts.feedType, posts.limit, auth.sessionId]);

  return (
    <div className="min-h-screen">
      {/* Feed Header */}
      <div className="sticky top-14 bg-white border-b border-gray-200 z-40">
        <div className="flex">
          <button
            onClick={() => handleTabChange('following')}
            className={`flex-1 py-4 px-6 text-center font-medium transition-colors ${
              activeTab === 'following'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            Following
          </button>
          <button
            onClick={() => handleTabChange('my')}
            className={`flex-1 py-4 px-6 text-center font-medium transition-colors ${
              activeTab === 'my'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            自分の投稿
          </button>
        </div>
      </div>



      {/* Feed Controls */}
      <div className="p-4 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <select
              value={posts.limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={5}>5件</option>
              <option value={10}>10件</option>
              <option value={20}>20件</option>
              <option value={50}>50件</option>
            </select>
            <span className="text-sm text-gray-600">取得件数</span>
          </div>
          
          <button
            onClick={handleRefresh}
            disabled={posts.isLoading}
            className="flex items-center space-x-2 px-3 py-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors disabled:opacity-50"
          >
            <svg className={`w-4 h-4 ${posts.isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
            </svg>
            <span className="text-sm">更新</span>
          </button>
        </div>
      </div>

      {/* Loading State */}
      {posts.isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">投稿を取得中...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {posts.error && (
        <div className="p-6 text-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
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
        </div>
      )}

      {/* Posts Feed */}
      {!posts.isLoading && !posts.error && (
        <div className="divide-y divide-gray-100">
          {posts.posts.length === 0 ? (
            <div className="p-12 text-center">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">投稿がありません</h3>
              <p className="text-gray-600">
                {posts.feedType === 'following' 
                  ? 'フォローしているユーザーの投稿がありません' 
                  : 'まだ投稿がありません'
                }
              </p>
            </div>
          ) : (
            posts.posts.map((post) => (
              <BlueskyPostItem key={post.id} post={post} />
            ))
          )}
        </div>
      )}
    </div>
  );
}