import { create } from 'zustand';

interface FeedState {
  feedTab: 'posts' | 'following' | 'discover';
  setFeedTab: (t: FeedState['feedTab']) => void;
}

export const useFeedStore = create<FeedState>((set) => ({
  feedTab: 'posts',
  setFeedTab: (feedTab) => set({ feedTab })
}));
