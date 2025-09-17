import { create } from 'zustand';

interface FeedState {
  feedTab: 'posts' | 'following' | 'discover';
  setFeedTab: (t: FeedState['feedTab']) => void;
  // show/hide feed filters (toggled from AppHeader)
  showFeedFilters: boolean;
  setShowFeedFilters: (v: boolean) => void;
}

export const useFeedStore = create<FeedState>((set) => ({
  feedTab: 'posts',
  setFeedTab: (feedTab) => set({ feedTab })
  ,
  showFeedFilters: false,
  setShowFeedFilters: (showFeedFilters) => set({ showFeedFilters }),
}));
