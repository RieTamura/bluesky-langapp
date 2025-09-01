import { WordData, UserData, AppData } from '../types/data.js';

/**
 * Validate word data
 */
export function validateWordData(data: any): data is Partial<WordData> {
  if (!data || typeof data !== 'object') {
    return false;
  }

  // Required fields
  if (typeof data.word !== 'string' || data.word.trim().length === 0) {
    return false;
  }

  // Status validation
  if (data.status && !['unknown', 'learning', 'known'].includes(data.status)) {
    return false;
  }

  // Optional numeric fields
  if (data.reviewCount !== undefined && (typeof data.reviewCount !== 'number' || data.reviewCount < 0)) {
    return false;
  }

  if (data.correctCount !== undefined && (typeof data.correctCount !== 'number' || data.correctCount < 0)) {
    return false;
  }

  if (data.difficultyLevel !== undefined && (typeof data.difficultyLevel !== 'number' || data.difficultyLevel < 1 || data.difficultyLevel > 10)) {
    return false;
  }

  return true;
}

/**
 * Validate user data
 */
export function validateUserData(data: any): data is Partial<UserData> {
  if (!data || typeof data !== 'object') {
    return false;
  }

  // Required fields
  if (typeof data.blueskyId !== 'string' || data.blueskyId.trim().length === 0) {
    return false;
  }

  // Optional string fields
  if (data.displayName !== undefined && typeof data.displayName !== 'string') {
    return false;
  }

  if (data.avatarUrl !== undefined && typeof data.avatarUrl !== 'string') {
    return false;
  }

  return true;
}

/**
 * Sanitize word data
 */
export function sanitizeWordData(data: any): Partial<WordData> {
  const sanitized: Partial<WordData> = {};

  if (typeof data.word === 'string') {
    sanitized.word = data.word.trim().toLowerCase();
  }

  if (['unknown', 'learning', 'known'].includes(data.status)) {
    sanitized.status = data.status;
  }

  if (typeof data.userId === 'string') {
    sanitized.userId = data.userId.trim();
  }

  if (typeof data.definition === 'string') {
    sanitized.definition = data.definition.trim();
  }

  if (typeof data.exampleSentence === 'string') {
    sanitized.exampleSentence = data.exampleSentence.trim();
  }

  if (typeof data.pronunciation === 'string') {
    sanitized.pronunciation = data.pronunciation.trim();
  }

  if (typeof data.reviewCount === 'number' && data.reviewCount >= 0) {
    sanitized.reviewCount = Math.floor(data.reviewCount);
  }

  if (typeof data.correctCount === 'number' && data.correctCount >= 0) {
    sanitized.correctCount = Math.floor(data.correctCount);
  }

  if (typeof data.difficultyLevel === 'number' && data.difficultyLevel >= 1 && data.difficultyLevel <= 10) {
    sanitized.difficultyLevel = Math.floor(data.difficultyLevel);
  }

  return sanitized;
}

/**
 * Sanitize user data
 */
export function sanitizeUserData(data: any): Partial<UserData> {
  const sanitized: Partial<UserData> = {};

  if (typeof data.blueskyId === 'string') {
    sanitized.blueskyId = data.blueskyId.trim();
  }

  if (typeof data.displayName === 'string') {
    sanitized.displayName = data.displayName.trim();
  }

  if (typeof data.avatarUrl === 'string') {
    sanitized.avatarUrl = data.avatarUrl.trim();
  }

  return sanitized;
}

/**
 * Generate unique ID
 */
export function generateId(prefix: string = ''): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9);
  return prefix ? `${prefix}_${timestamp}_${random}` : `${timestamp}_${random}`;
}

/**
 * Format file size in human readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Validate app data structure
 */
export function validateAppData(data: any): data is AppData {
  if (!data || typeof data !== 'object') {
    return false;
  }

  // Check required arrays
  if (!Array.isArray(data.users) || !Array.isArray(data.words)) {
    return false;
  }

  // Check version
  if (typeof data.version !== 'string') {
    return false;
  }

  // Validate each user
  for (const user of data.users) {
    if (!validateUserData(user) || !user.id || !user.createdAt || !user.updatedAt) {
      return false;
    }
  }

  // Validate each word
  for (const word of data.words) {
    if (!validateWordData(word) || !word.id || !word.date) {
      return false;
    }
  }

  return true;
}

/**
 * Create default app data structure
 */
export function createDefaultAppData(): AppData {
  return {
    users: [],
    words: [],
    posts: [],
    learningSessions: [],
    version: '1.0.0',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

/**
 * Deep clone object
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime()) as unknown as T;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => deepClone(item)) as unknown as T;
  }

  const cloned = {} as T;
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      cloned[key] = deepClone(obj[key]);
    }
  }

  return cloned;
}

/**
 * Check if two objects are equal (shallow comparison)
 */
export function isEqual(obj1: any, obj2: any): boolean {
  if (obj1 === obj2) {
    return true;
  }

  if (obj1 == null || obj2 == null) {
    return obj1 === obj2;
  }

  if (typeof obj1 !== typeof obj2) {
    return false;
  }

  if (typeof obj1 !== 'object') {
    return obj1 === obj2;
  }

  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  if (keys1.length !== keys2.length) {
    return false;
  }

  for (const key of keys1) {
    if (!keys2.includes(key) || obj1[key] !== obj2[key]) {
      return false;
    }
  }

  return true;
}