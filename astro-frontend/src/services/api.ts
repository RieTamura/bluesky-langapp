import { authStore } from '../stores/auth';

class ApiService {
  private baseUrl = '/api';

  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    const auth = authStore.get();
    
    console.log('makeRequest called:', { 
      endpoint, 
      hasSessionId: !!auth.sessionId,
      sessionId: auth.sessionId ? auth.sessionId.substring(0, 8) + '...' : null
    });
    
    const defaultOptions: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(auth.sessionId && { 'Authorization': `Bearer ${auth.sessionId}` })
      }
    };

    const mergedOptions = {
      ...defaultOptions,
      ...options,
      headers: {
        ...defaultOptions.headers,
        ...options.headers
      }
    };

    console.log('Request options:', {
      url: `${this.baseUrl}${endpoint}`,
      method: mergedOptions.method || 'GET',
      hasAuth: !!mergedOptions.headers?.['Authorization']
    });

    const response = await fetch(`${this.baseUrl}${endpoint}`, mergedOptions);
    
    if (response.status === 401) {
      // Handle unauthorized - clear auth and redirect only if we're not already on login page
      authStore.set({
        isAuthenticated: false,
        sessionId: null,
        user: null
      });
      localStorage.removeItem('sessionId');
      localStorage.removeItem('userIdentifier');
      
      // Only redirect if we're not already on the login page
      if (window.location.pathname !== '/') {
        window.location.href = '/';
      }
      throw new Error('Session expired');
    }

    return response;
  }

  async login(identifier: string, password: string) {
    const response = await fetch(`${this.baseUrl}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ identifier, password })
    });

    return response.json();
  }

  async logout() {
    return this.makeRequest('/auth/logout', { method: 'POST' });
  }

  async checkAuth() {
    const response = await this.makeRequest('/auth/me');
    return response.json();
  }

  async getPosts(identifier?: string, limit = 10) {
    const params = new URLSearchParams();
    if (identifier) params.append('identifier', identifier);
    params.append('limit', limit.toString());
    
    console.log('API getPosts called:', { identifier, limit, url: `/posts?${params}` });
    const response = await this.makeRequest(`/posts?${params}`);
    const result = await response.json();
    console.log('API getPosts response:', result);
    return result;
  }

  async getFollowingPosts(limit = 10) {
    console.log('API getFollowingPosts called:', { limit, url: `/posts/following?limit=${limit}` });
    const response = await this.makeRequest(`/posts/following?limit=${limit}`);
    const result = await response.json();
    console.log('API getFollowingPosts response:', result);
    return result;
  }

  async getWords() {
    const response = await this.makeRequest('/words');
    return response.json();
  }

  async saveWord(word: string, status = 'learning') {
    const response = await this.makeRequest('/words', {
      method: 'POST',
      body: JSON.stringify({ word, status })
    });
    return response.json();
  }

  async updateWord(id: number, status: string) {
    const response = await this.makeRequest(`/words/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });
    return response.json();
  }

  async deleteWord(id: number) {
    const response = await this.makeRequest(`/words/${id}`, {
      method: 'DELETE'
    });
    return response.json();
  }

  async getWordDefinition(word: string) {
    const response = await this.makeRequest(`/words/${encodeURIComponent(word)}/definition`);
    return response.json();
  }

  async getQuiz(questionCount = 5) {
    const response = await this.makeRequest(`/learning/quiz?count=${questionCount}`);
    return response.json();
  }

  async submitQuizAnswer(questionId: number, answer: string) {
    const response = await this.makeRequest('/learning/quiz/answer', {
      method: 'POST',
      body: JSON.stringify({ questionId, answer })
    });
    return response.json();
  }

  async getLearningStats() {
    const response = await this.makeRequest('/learning/stats');
    return response.json();
  }
}

export const apiService = new ApiService();