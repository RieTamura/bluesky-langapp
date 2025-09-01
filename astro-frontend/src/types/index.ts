// Auth types
export interface User {
  identifier: string;
  displayName?: string;
  avatarUrl?: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  sessionId: string | null;
  user: User | null;
}

// Posts types
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

// Words types
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

export interface WordDefinition {
  word: string;
  pronunciation?: string;
  audioUrl?: string;
  definitions: Array<{
    partOfSpeech: string;
    definition: string;
    example?: string;
  }>;
}

// Learning types
export interface QuizQuestion {
  id: number;
  word: string;
  questionType: 'meaning' | 'usage' | 'pronunciation';
  question: string;
  options?: string[];
  correctAnswer: string;
}

export interface QuizState {
  isActive: boolean;
  questions: QuizQuestion[];
  currentQuestionIndex: number;
  answers: Array<{
    questionId: number;
    userAnswer: string;
    isCorrect: boolean;
  }>;
  isLoading: boolean;
  error: string | null;
}

export interface LearningStats {
  totalWords: number;
  knownWords: number;
  learningWords: number;
  unknownWords: number;
  totalQuizzes: number;
  averageAccuracy: number;
}

// Shared types
export interface Notification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  timestamp: number;
}

export interface SharedState {
  selectedWord: string | null;
  showWordModal: boolean;
  notifications: Notification[];
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}