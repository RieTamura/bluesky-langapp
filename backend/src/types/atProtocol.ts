// AT Protocol and Bluesky integration types

export interface LearningProgressPost {
  id: string;
  userId: string;
  type: 'milestone' | 'daily_summary' | 'achievement' | 'streak' | 'custom';
  content: string;
  metadata: {
    wordsLearned?: number;
    totalWords?: number;
    streak?: number;
    milestone?: string;
    studyTime?: number;
    accuracy?: number;
    newWords?: string[];
    masteredWords?: string[];
  };
  createdAt: string;
  postedAt?: string;
  blueskyUri?: string;
  blueskySuccess?: boolean;
  error?: string;
}

export interface SharedLearningData {
  format: 'bluesky-langapp-v1';
  metadata: {
    sharedAt: string;
    userId: string;
    userName?: string;
    appVersion: string;
    dataVersion: string;
  };
  summary: {
    totalWords: number;
    knownWords: number;
    learningWords: number;
    unknownWords: number;
    studyStreak: number;
    totalStudyDays: number;
    averageAccuracy: number;
    lastStudyDate: string;
  };
  recentProgress: {
    date: string;
    wordsStudied: number;
    newWords: number;
    masteredWords: number;
    accuracy: number;
  }[];
  achievements: {
    type: 'milestone' | 'streak' | 'accuracy' | 'consistency';
    title: string;
    description: string;
    achievedAt: string;
    value: number;
  }[];
  vocabulary?: {
    word: string;
    status: 'learning' | 'known';
    addedAt: string;
    masteredAt?: string;
    reviewCount: number;
    accuracy: number;
  }[];
}

export interface PostTemplate {
  type: LearningProgressPost['type'];
  template: string;
  variables: string[];
  examples: string[];
}

export interface BlueskyProfile {
  did: string;
  handle: string;
  displayName?: string;
  description?: string;
  avatar?: string;
  followersCount?: number;
  followsCount?: number;
  postsCount?: number;
}

export interface BlueskyPostResponse {
  uri: string;
  cid: string;
}

// Request types for AT Protocol endpoints
export interface InitializeATProtocolRequest {
  identifier: string;
  password: string;
}

export interface PostLearningProgressRequest {
  userId: string;
  type: LearningProgressPost['type'];
  metadata?: LearningProgressPost['metadata'];
  customContent?: string;
}

export interface AutoPostMilestoneRequest {
  userId: string;
}

// Future API integration data structures
export interface ATProtocolIntegration {
  version: '1.0.0';
  endpoints: {
    auth: string;
    posts: string;
    profile: string;
    feed: string;
  };
  capabilities: {
    posting: boolean;
    reading: boolean;
    notifications: boolean;
    directMessages: boolean;
  };
  dataFormats: {
    learningProgress: 'bluesky-langapp-v1';
    vocabulary: 'bluesky-langapp-vocab-v1';
    achievements: 'bluesky-langapp-achievements-v1';
  };
}

export interface FutureAPIEndpoint {
  name: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  description: string;
  requestSchema?: object;
  responseSchema?: object;
  authentication: 'required' | 'optional' | 'none';
  rateLimit?: {
    requests: number;
    window: string;
  };
}

export interface APIIntegrationPlan {
  version: string;
  plannedEndpoints: FutureAPIEndpoint[];
  dataStructures: {
    name: string;
    version: string;
    schema: object;
    compatibility: string[];
  }[];
  migrationPaths: {
    from: string;
    to: string;
    steps: string[];
  }[];
}

// Export all types
export * from './data.js';
export * from './bluesky.js';