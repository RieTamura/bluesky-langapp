import fs from 'fs/promises';
import path from 'path';
import { normalizeWord } from '../utils/textProcessor.js';
import type { WordData, UserData, AppData } from '../types/data.js';

class DataService {
  private dataDir: string;
  private wordsFile: string;
  private usersFile: string;
  private backupDir: string;
  private appDataFile: string;

  constructor() {
    // Use project root for data files
    this.dataDir = path.resolve(process.cwd(), '..');
    this.wordsFile = path.join(this.dataDir, 'words.json');
    this.usersFile = path.join(this.dataDir, 'users.json');
    this.appDataFile = path.join(this.dataDir, 'app-data.json');
    this.backupDir = path.join(this.dataDir, 'data-backups');
  }

  /**
   * Initialize data directory and files
   */
  async initialize(): Promise<void> {
    try {
      // Ensure backup directory exists
      await fs.mkdir(this.backupDir, { recursive: true });

      // Initialize app data file if it doesn't exist
      if (!await this.fileExists(this.appDataFile)) {
        const initialData: AppData = {
          users: [],
          words: [],
          version: '1.0.0'
        };
        await this.writeAppData(initialData);
      }

      // Migrate existing words.json if it exists
      await this.migrateExistingWords();
    } catch (error) {
      console.error('Failed to initialize data service:', error);
      throw error;
    }
  }

  /**
   * Check if file exists
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Migrate existing words.json to new format
   */
  private async migrateExistingWords(): Promise<void> {
    if (await this.fileExists(this.wordsFile)) {
      try {
        const existingWords = await this.readJsonFile<WordData[]>(this.wordsFile);
        const appData = await this.readAppData();
        
        // Add IDs to existing words if they don't have them
        const migratedWords = existingWords.map((word, index) => ({
          ...word,
          id: word.id || `word_${Date.now()}_${index}`,
          userId: word.userId || 'default_user',
          normalizedWord: word.normalizedWord || normalizeWord(word.word || '')
        }));

        appData.words = migratedWords;
        await this.writeAppData(appData);
        
        console.log(`Migrated ${migratedWords.length} words to new format`);
      } catch (error) {
        console.error('Failed to migrate existing words:', error);
      }
    }

    // Add definitions to words that don't have them
    await this.addMissingDefinitions();

  // Ensure languageCode present
  await this.addMissingLanguageCodes();
  }

  /**
   * Add definitions to words that don't have them
   */
  private async addMissingDefinitions(): Promise<void> {
    try {
      const appData = await this.readAppData();
      let updatedCount = 0;

      // Basic definitions and example sentences for common words
  const wordData: { [key: string]: { definition: string; exampleSentence: string } } = {
        'excited': {
          definition: '興奮した、わくわくした',
          exampleSentence: 'I am so excited about the new project.'
        },
        'stuff': {
          definition: '物、もの、材料',
          exampleSentence: 'There\'s a lot of stuff in the garage.'
        },
        'records': {
          definition: '記録、レコード',
          exampleSentence: 'Please keep records of all transactions.'
        },
        'from': {
          definition: '〜から、〜より',
          exampleSentence: 'I received a letter from my friend.'
        },
        'backfill': {
          definition: '埋め戻し、補完',
          exampleSentence: 'We need to backfill the missing data.'
        },
        'provides': {
          definition: '提供する、与える',
          exampleSentence: 'This service provides excellent support.'
        },
        'typescript': {
          definition: 'TypeScript（プログラミング言語）',
          exampleSentence: 'TypeScript helps catch errors at compile time.'
        },
        'client': {
          definition: 'クライアント、顧客',
          exampleSentence: 'The client was very satisfied with our work.'
        },
        'interact': {
          definition: '相互作用する、やり取りする',
          exampleSentence: 'Users can interact with the application easily.'
        },
        'celebration': {
          definition: 'お祝い、祝賀',
          exampleSentence: 'We had a celebration for her birthday.'
        },
        'companion': {
          definition: '仲間、相棒',
          exampleSentence: 'My dog is my faithful companion.'
        },
        'earn': {
          definition: '稼ぐ、得る',
          exampleSentence: 'You need to earn their trust first.'
        }
      };

      for (let i = 0; i < appData.words.length; i++) {
        const word = appData.words[i];
        const normalizedWord = word.normalizedWord || normalizeWord(word.word || '');
        let updated = false;

        if (!word.definition && wordData[normalizedWord]) {
          appData.words[i] = {
            ...word,
            definition: wordData[normalizedWord].definition
          };
          updated = true;
        }

        if (!word.exampleSentence && wordData[normalizedWord]) {
          appData.words[i] = {
            ...appData.words[i],
            exampleSentence: wordData[normalizedWord].exampleSentence
          };
          updated = true;
        }

  if (updated) {
          updatedCount++;
        }
      }

      if (updatedCount > 0) {
        await this.writeAppData(appData);
        console.log(`Added definitions and example sentences to ${updatedCount} words`);
      }
    } catch (error) {
      console.error('Failed to add missing definitions:', error);
    }
  }

  /**
   * Ensure every word has a languageCode (default 'en')
   */
  private async addMissingLanguageCodes(): Promise<void> {
    try {
      const appData = await this.readAppData();
      let changed = false;
      for (let i = 0; i < appData.words.length; i++) {
        const w = appData.words[i];
        if (!w.languageCode) {
          appData.words[i] = { ...w, languageCode: 'en' };
          changed = true;
        }
      }
      if (changed) {
        await this.writeAppData(appData);
        console.log('Added default languageCode="en" to words lacking it');
      }
    } catch (err) {
      console.error('Failed to add missing language codes:', err);
    }
  }

  /**
   * Read JSON file with error handling
   */
  private async readJsonFile<T>(filePath: string): Promise<T> {
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.error(`Failed to read JSON file ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Write JSON file with error handling
   */
  private async writeJsonFile<T>(filePath: string, data: T): Promise<void> {
    try {
      await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
      console.error(`Failed to write JSON file ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Read app data
   */
  async readAppData(): Promise<AppData> {
    if (!await this.fileExists(this.appDataFile)) {
      const initialData: AppData = {
        users: [],
        words: [],
        version: '1.0.0'
      };
      await this.writeAppData(initialData);
      return initialData;
    }
    return this.readJsonFile<AppData>(this.appDataFile);
  }

  /**
   * Write app data
   */
  async writeAppData(data: AppData): Promise<void> {
    data.version = '1.0.0';
    await this.writeJsonFile(this.appDataFile, data);
  }

  /**
   * Get all users
   */
  async getUsers(): Promise<UserData[]> {
    const appData = await this.readAppData();
    return appData.users;
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<UserData | null> {
    const users = await this.getUsers();
    return users.find(user => user.id === userId) || null;
  }

  /**
   * Create or update user
   */
  async saveUser(userData: Omit<UserData, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<UserData> {
    const appData = await this.readAppData();
    const now = new Date().toISOString();
    
    if (userData.id) {
      // Update existing user
      const userIndex = appData.users.findIndex(user => user.id === userData.id);
      if (userIndex >= 0) {
        appData.users[userIndex] = {
          ...appData.users[userIndex],
          ...userData,
          updatedAt: now
        };
        await this.writeAppData(appData);
        return appData.users[userIndex];
      }
    }
    
    // Create new user
    const newUser: UserData = {
      id: userData.id || `user_${Date.now()}`,
      blueskyId: userData.blueskyId,
      displayName: userData.displayName,
      avatarUrl: userData.avatarUrl,
      createdAt: now,
      updatedAt: now
    };
    
    appData.users.push(newUser);
    await this.writeAppData(appData);
    return newUser;
  }

  /**
   * Get all words
   */
  async getWords(userId?: string): Promise<WordData[]> {
    const appData = await this.readAppData();
    if (userId) {
      return appData.words.filter(word => word.userId === userId);
    }
    return appData.words;
  }

  /**
   * Get word by ID
   */
  async getWordById(wordId: string): Promise<WordData | null> {
    const words = await this.getWords();
    return words.find(word => word.id === wordId) || null;
  }

  /**
   * Save word (create or update)
   */
  async saveWord(wordData: Omit<WordData, 'id' | 'date'> & { id?: string }): Promise<WordData> {
    const appData = await this.readAppData();
    const now = new Date().toISOString();
    
    if (wordData.id) {
      // Update existing word
      const wordIndex = appData.words.findIndex(word => word.id === wordData.id);
      if (wordIndex >= 0) {
        appData.words[wordIndex] = {
          ...appData.words[wordIndex],
          ...wordData,
          normalizedWord: wordData.normalizedWord || normalizeWord((wordData as any).word || appData.words[wordIndex].word || ''),
          languageCode: wordData.languageCode || appData.words[wordIndex].languageCode || 'en',
          date: now
        };
        await this.writeAppData(appData);
        return appData.words[wordIndex];
      }
    }
    
    // Create new word
    const newWord: WordData = {
      id: wordData.id || `word_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      word: wordData.word,
  normalizedWord: (wordData as any).normalizedWord || normalizeWord(wordData.word || ''),
      status: wordData.status,
      userId: wordData.userId || 'default_user',
  languageCode: wordData.languageCode || 'en',
      definition: wordData.definition,
      exampleSentence: wordData.exampleSentence,
      reviewCount: wordData.reviewCount || 0,
      correctCount: wordData.correctCount || 0,
      lastReviewedAt: wordData.lastReviewedAt,
      difficultyLevel: wordData.difficultyLevel,
      firstEncounteredAt: wordData.firstEncounteredAt,
      date: now
    };
    
    appData.words.push(newWord);
    await this.writeAppData(appData);
    return newWord;
  }

  /**
   * Delete word
   */
  async deleteWord(wordId: string): Promise<boolean> {
    const appData = await this.readAppData();
    const initialLength = appData.words.length;
    appData.words = appData.words.filter(word => word.id !== wordId);
    
    if (appData.words.length < initialLength) {
      await this.writeAppData(appData);
      return true;
    }
    return false;
  }

  /**
   * Create backup of current data
   */
  async createBackup(): Promise<string> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFileName = `backup_${timestamp}.json`;
      const backupFilePath = path.join(this.backupDir, backupFileName);
      
      const appData = await this.readAppData();
      appData.lastBackup = new Date().toISOString();
      
      await this.writeJsonFile(backupFilePath, appData);
      await this.writeAppData(appData);
      
      console.log(`Backup created: ${backupFileName}`);
      return backupFilePath;
    } catch (error) {
      console.error('Failed to create backup:', error);
      throw error;
    }
  }

  /**
   * List available backups
   */
  async listBackups(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.backupDir);
      return files
        .filter(file => file.startsWith('backup_') && file.endsWith('.json'))
        .sort()
        .reverse(); // Most recent first
    } catch (error) {
      console.error('Failed to list backups:', error);
      return [];
    }
  }

  /**
   * Restore from backup
   */
  async restoreFromBackup(backupFileName: string): Promise<void> {
    try {
      const backupFilePath = path.join(this.backupDir, backupFileName);
      
      if (!await this.fileExists(backupFilePath)) {
        throw new Error(`Backup file not found: ${backupFileName}`);
      }
      
      const backupData = await this.readJsonFile<AppData>(backupFilePath);
      await this.writeAppData(backupData);
      
      console.log(`Data restored from backup: ${backupFileName}`);
    } catch (error) {
      console.error('Failed to restore from backup:', error);
      throw error;
    }
  }

  /**
   * Get data statistics
   */
  async getStats(): Promise<{ users: number; words: number; backups: number }> {
    const appData = await this.readAppData();
    const backups = await this.listBackups();
    
    return {
      users: appData.users.length,
      words: appData.words.length,
      backups: backups.length
    };
  }
}

export default DataService;