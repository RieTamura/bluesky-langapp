import React from 'react';
import type { Post } from '../../stores/posts';
import WordHighlighter from './WordHighlighter';
import { Card } from '../ui';

interface PostItemProps {
  post: Post;
}

export default function PostItem({ post }: PostItemProps) {
  const createdAt = new Date(post.createdAt).toLocaleString('ja-JP');

  return (
    <Card hover className="transition-shadow">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 mb-4 border-b border-gray-100 space-y-2 sm:space-y-0">
        <div className="flex items-center space-x-2 min-w-0">
          <span className="font-semibold text-gray-900 truncate">
            {post.author?.displayName || 'Unknown'}
          </span>
          <span className="text-gray-500 text-sm truncate">
            @{post.author?.handle || 'unknown'}
          </span>
        </div>
        <span className="text-gray-400 text-xs sm:text-sm whitespace-nowrap">
          {createdAt}
        </span>
      </div>
      
      <div className="text-gray-800 leading-relaxed text-sm md:text-base">
        <WordHighlighter 
          text={post.text} 
          extractedWords={post.extractedWords || []} 
        />
      </div>
    </Card>
  );
}