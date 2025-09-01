import { atom } from 'nanostores';
import { apiService } from '../services/api';

export interface Word {
  id: number;
  word: string;
  status: 'unknown' | 'learning' | 'known';
  definition?: string;
  exampleSentence?: string;
  pronunciation?: string;
  createdAt: string;
  reviewCount: number;
  correctCount: number;
}

export interface WordsState {
  words: Word[];
  isLoading: boolean;
  error: string | null;
  filter: 'all' | 'unknown' | 'learning' | 'known';
  sortBy: 'date-desc' | 'date-asc' | 'alphabetical';
}

export const wordsStore = atom<WordsState>({
  words: [],
  isLoading: false,
  error: null,
  filter: 'all',
  sortBy: 'date-desc'
});

export const setWordsFilter = (filter: WordsState['filter']) => {
  wordsStore.set({
    ...wordsStore.get(),
    filter
  });
};

export const setWordsSortBy = (sortBy: WordsState['sortBy']) => {
  wordsStore.set({
    ...wordsStore.get(),
    sortBy
  });
};

export const loadWords = async () => {
  const currentState = wordsStore.get();
  
  wordsStore.set({
    ...currentState,
    isLoading: true,
    error: null
  });

  try {
    const data = await apiService.getWords();

    if (data.success && data.data) {
      wordsStore.set({
        ...currentState,
        words: data.data,
        isLoading: false,
        error: null
      });
    } else {
      throw new Error(data.message || 'Failed to load words');
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    wordsStore.set({
      ...currentState,
      words: [],
      isLoading: false,
      error: errorMessage
    });
  }
};

export const saveWord = async (word: string, status: 'unknown' | 'learning' | 'known' = 'learning') => {
  try {
    const data = await apiService.saveWord(word, status);
    
    if (data.success) {
      // Reload words to get updated list
      await loadWords();
      return true;
    } else {
      throw new Error(data.message || 'Failed to save word');
    }
  } catch (error) {
    console.error('Failed to save word:', error);
    return false;
  }
};

export const updateWordStatus = async (id: number, status: 'unknown' | 'learning' | 'known') => {
  try {
    const data = await apiService.updateWord(id, status);
    
    if (data.success) {
      // Update local state
      const currentState = wordsStore.get();
      const updatedWords = currentState.words.map(word => 
        word.id === id ? { ...word, status } : word
      );
      
      wordsStore.set({
        ...currentState,
        words: updatedWords
      });
      
      return true;
    } else {
      throw new Error(data.message || 'Failed to update word');
    }
  } catch (error) {
    console.error('Failed to update word:', error);
    return false;
  }
};

export const deleteWord = async (id: number) => {
  try {
    const data = await apiService.deleteWord(id);
    
    if (data.success) {
      // Remove from local state
      const currentState = wordsStore.get();
      const updatedWords = currentState.words.filter(word => word.id !== id);
      
      wordsStore.set({
        ...currentState,
        words: updatedWords
      });
      
      return true;
    } else {
      throw new Error(data.message || 'Failed to delete word');
    }
  } catch (error) {
    console.error('Failed to delete word:', error);
    return false;
  }
};

// Computed values
export const getFilteredWords = () => {
  const state = wordsStore.get();
  let filtered = state.words;

  // Apply filter
  if (state.filter !== 'all') {
    filtered = filtered.filter(word => word.status === state.filter);
  }

  // Apply sorting
  switch (state.sortBy) {
    case 'date-desc':
      filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      break;
    case 'date-asc':
      filtered.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      break;
    case 'alphabetical':
      filtered.sort((a, b) => a.word.localeCompare(b.word));
      break;
  }

  return filtered;
};

export const getWordStats = () => {
  const words = wordsStore.get().words;
  
  return {
    total: words.length,
    unknown: words.filter(w => w.status === 'unknown').length,
    learning: words.filter(w => w.status === 'learning').length,
    known: words.filter(w => w.status === 'known').length
  };
};