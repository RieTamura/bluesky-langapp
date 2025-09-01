// Basic type definitions for the application

export interface User {
  id: number;
  blueskyId: string;
  displayName?: string;
  avatarUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Word {
  id: number;
  userId: number;
  word: string;
  status: 'unknown' | 'learning' | 'known';
  definition?: string;
  exampleSentence?: string;
  pronunciation?: string;
  difficultyLevel: number;
  firstEncounteredAt: Date;
  lastReviewedAt?: Date;
  reviewCount: number;
  correctCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Post {
  id: number;
  userId: number;
  blueskyPostId: string;
  content: string;
  postedAt: Date;
  processedAt: Date;
  words?: ProcessedWord[];
}

export interface ProcessedWord {
  text: string;
  status: 'unknown' | 'learning' | 'known';
  startIndex: number;
  endIndex: number;
}

export interface LearningSession {
  id: number;
  userId: number;
  sessionType: 'quiz' | 'review';
  startedAt: Date;
  completedAt?: Date;
  totalQuestions: number;
  correctAnswers: number;
}

export interface QuizQuestion {
  id: number;
  word: Word;
  questionType: 'meaning' | 'usage' | 'pronunciation';
  question: string;
  options?: string[];
  correctAnswer: string;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface AuthRequest extends Express.Request {
  user?: User;
}

// Re-export Bluesky types
export * from './bluesky.js';