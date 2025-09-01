import React from 'react';
import { Post } from '../../stores/posts';
import WordHighlighter from '../posts/WordHighlighter';

interface BlueskyPostItemProps {
  post: Post;
}

export default function BlueskyPostItem({ post }: BlueskyPostItemProps) {
  const createdAt = new Date(post.createdAt);
  const timeAgo = getTimeAgo(createdAt);

  return (
    <article className="p-4 hover:bg-gray-50 transition-colors cursor-pointer">
      <div className="flex space-x-3">
        {/* Avatar */}
        <div className="flex-shrink-0">
          <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center">
            <span className="text-gray-600 text-sm">👤</span>
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center space-x-2 mb-1">
            <span className="font-semibold text-gray-900 truncate">
              {post.author?.displayName || 'Unknown'}
            </span>
            <span className="text-gray-500 text-sm truncate">
              @{post.author?.handle || 'unknown'}
            </span>
            <span className="text-gray-400 text-sm">·</span>
            <span className="text-gray-400 text-sm whitespace-nowrap">
              {timeAgo}
            </span>
          </div>
          
          {/* Post Text with Word Highlighting */}
          <div className="text-gray-900 leading-relaxed mb-3">
            <WordHighlighter 
              text={post.text} 
              extractedWords={post.extractedWords || []} 
            />
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center justify-between max-w-md">
            {/* Reply */}
            <button className="flex items-center space-x-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full p-2 transition-colors group">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
              </svg>
              <span className="text-sm group-hover:text-blue-600">0</span>
            </button>
            
            {/* Repost */}
            <button className="flex items-center space-x-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-full p-2 transition-colors group">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
              </svg>
              <span className="text-sm group-hover:text-green-600">0</span>
            </button>
            
            {/* Like */}
            <button className="flex items-center space-x-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full p-2 transition-colors group">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
              </svg>
              <span className="text-sm group-hover:text-red-600">0</span>
            </button>
            
            {/* Share */}
            <button className="flex items-center space-x-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full p-2 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"></path>
              </svg>
            </button>
          </div>
          
          {/* Word Count Badge */}
          {post.extractedWords && post.extractedWords.length > 0 && (
            <div className="mt-2">
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                📚 {post.extractedWords.length} 個の単語
              </span>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) {
    return `${diffInSeconds}秒前`;
  }
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes}分前`;
  }
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours}時間前`;
  }
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays}日前`;
  }
  
  return date.toLocaleDateString('ja-JP', {
    month: 'short',
    day: 'numeric'
  });
}