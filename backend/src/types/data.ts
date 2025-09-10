// Core data types for the application

export interface WordData {
  id: string;
  word: string;
  normalizedWord?: string;
  status: 'unknown' | 'learning' | 'known';
  date: string;
  userId?: string;
  languageCode?: string; // ISO language code (e.g., 'en', 'ja')
  definition?: string;
  exampleSentence?: string;
  pronunciation?: string;
  reviewCount?: number;
  correctCount?: number;
  lastReviewedAt?: string;
  difficultyLevel?: number;
  firstEncounteredAt?: string;
  // SRS-related fields (stored as encoded data for now)
  srsInterval?: number;
  srsRepetition?: number;
  srsEaseFactor?: number;
  srsNextReviewDate?: string;
}

export interface UserData {
  id: string;
  blueskyId: string;
  displayName?: string;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PostData {
  id: string;
  userId: string;
  blueskyPostId: string;
  content: string;
  postedAt: string;
  processedAt: string;
  words?: ProcessedWord[];
}

export interface ProcessedWord {
  text: string;
  status: 'unknown' | 'learning' | 'known';
  startIndex: number;
  endIndex: number;
}

export interface LearningSessionData {
  id: string;
  userId: string;
  sessionType: 'quiz' | 'review';
  startedAt: string;
  completedAt?: string;
  totalQuestions: number;
  correctAnswers: number;
}

export interface AppData {
  users: UserData[];
  words: WordData[];
  posts?: PostData[];
  learningSessions?: LearningSessionData[];
  version: string;
  lastBackup?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface BackupMetadata {
  fileName: string;
  createdAt: string;
  size: number;
  recordCounts: {
    users: number;
    words: number;
    posts: number;
    sessions: number;
  };
}

export interface DataStats {
  users: number;
  words: number;
  posts: number;
  sessions: number;
  backups: number;
  lastBackup?: string;
  dataSize: number;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Request types
export interface CreateWordRequest {
  word: string;
  status?: 'unknown' | 'learning' | 'known';
  userId?: string;
  languageCode?: string;
  definition?: string;
  exampleSentence?: string;
}

export interface UpdateWordRequest {
  status?: 'unknown' | 'learning' | 'known';
  languageCode?: string;
  definition?: string;
  exampleSentence?: string;
  reviewCount?: number;
  correctCount?: number;
  lastReviewedAt?: string;
}

export interface CreateUserRequest {
  blueskyId: string;
  displayName?: string;
  avatarUrl?: string;
}

export interface UpdateUserRequest {
  displayName?: string;
  avatarUrl?: string;
}