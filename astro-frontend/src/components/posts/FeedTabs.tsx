import React from 'react';
import { Button } from '../ui';

interface FeedTabsProps {
  currentFeedType: 'my' | 'following';
  onFeedTypeChange: (feedType: 'my' | 'following') => void;
}

export default function FeedTabs({ currentFeedType, onFeedTypeChange }: FeedTabsProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-2 mb-4 md:mb-6">
      <Button
        variant={currentFeedType === 'my' ? 'primary' : 'secondary'}
        onClick={() => onFeedTypeChange('my')}
        className="flex-1 sm:flex-none"
      >
        📝 自分の投稿
      </Button>
      <Button
        variant={currentFeedType === 'following' ? 'primary' : 'secondary'}
        onClick={() => onFeedTypeChange('following')}
        className="flex-1 sm:flex-none"
      >
        👥 Following
      </Button>
    </div>
  );
}