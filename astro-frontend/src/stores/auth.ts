import { atom } from 'nanostores';
import type { AuthState } from '../types';

export const authStore = atom<AuthState>({
  isAuthenticated: false,
  sessionId: null,
  user: null
});

// Initialize auth state from localStorage
if (typeof window !== 'undefined') {
  const sessionId = localStorage.getItem('sessionId');
  const userIdentifier = localStorage.getItem('userIdentifier');
  
  console.log('Auth initialization:', { 
    hasSessionId: !!sessionId, 
    hasUserIdentifier: !!userIdentifier 
  });
  
  if (sessionId && userIdentifier) {
    // Set auth state immediately from localStorage
    authStore.set({
      isAuthenticated: true,
      sessionId,
      user: { identifier: userIdentifier }
    });
    
    console.log('Auth state set from localStorage, will verify on first API call');
  } else {
    console.log('No session found in localStorage');
  }
}

export const verifySession = async () => {
  const currentAuth = authStore.get();
  
  if (!currentAuth.sessionId) {
    return false;
  }
  
  try {
    const response = await fetch('/api/auth/me', {
      headers: {
        'Authorization': `Bearer ${currentAuth.sessionId}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.authenticated;
    } else {
      // Clear invalid session
      logout();
      return false;
    }
  } catch (error) {
    console.error('Session verification error:', error);
    logout();
    return false;
  }
};

export const logout = () => {
  const currentAuth = authStore.get();
  
  if (currentAuth.sessionId) {
    fetch('/api/auth/logout', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${currentAuth.sessionId}`,
        'Content-Type': 'application/json'
      }
    }).catch(console.error);
  }
  
  // Clear local state
  authStore.set({
    isAuthenticated: false,
    sessionId: null,
    user: null
  });
  
  // Clear localStorage
  localStorage.removeItem('sessionId');
  localStorage.removeItem('userIdentifier');
  
  // Redirect to login only if not already there
  if (window.location.pathname !== '/') {
    window.location.href = '/';
  }
};