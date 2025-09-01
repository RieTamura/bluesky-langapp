export interface BlueskyCredentials {
  identifier: string;
  password: string;
}

export interface BlueskyPost {
  id: string;
  text: string;
  createdAt: string;
  author: {
    did: string;
    handle: string;
    displayName?: string;
  };
  extractedWords?: string[];
}

export interface BlueskyUser {
  did: string;
  handle: string;
  displayName?: string;
  avatar?: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  sessionId?: string;
  user?: {
    identifier: string;
  };
}

export interface PostsResponse {
  success: boolean;
  data: BlueskyPost[];
  meta: {
    count: number;
    limit: number;
    identifier: string;
  };
}

export interface ApiError {
  error: string;
  message: string;
}