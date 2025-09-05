import React from 'react';
import type { Post } from '../../stores/posts';
import PostItem from './PostItem';
import WordLegend from './WordLegend';

interface PostListProps {
  posts: Post[];
}

export default function PostList({ posts }: PostListProps) {
  if (posts.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-semibold text-gray-700 mb-2">投稿が見つかりません</h3>
        <p className="text-gray-500">投稿を取得できませんでした。設定を確認してください。</p>
      </div>
    );
  }

  return (
    <div>
      <div className="space-y-4 mb-6">
        {posts.map((post) => (
          <PostItem key={post.id} post={post} />
        ))}
      </div>
      
      <WordLegend />
    </div>
  );
}