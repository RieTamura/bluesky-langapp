import { Request, Response } from 'express';
import DataService from '../services/dataService.js';
import { validateWordData, validateUserData, sanitizeWordData, sanitizeUserData } from '../utils/dataUtils.js';
import { ApiResponse, CreateWordRequest, UpdateWordRequest, CreateUserRequest, UpdateUserRequest } from '../types/data.js';

const dataService = new DataService();

/**
 * Initialize data service
 */
export async function initializeData(req: Request, res: Response): Promise<void> {
  try {
    await dataService.initialize();
    const stats = await dataService.getStats();
    
    const response: ApiResponse = {
      success: true,
      message: 'Data service initialized successfully',
      data: stats
    };
    
    res.json(response);
  } catch (error) {
    console.error('Failed to initialize data service:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to initialize data service'
    };
    res.status(500).json(response);
  }
}

/**
 * Get all users
 */
export async function getUsers(req: Request, res: Response): Promise<void> {
  try {
    const users = await dataService.getUsers();
    
    const response: ApiResponse = {
      success: true,
      data: users
    };
    
    res.json(response);
  } catch (error) {
    console.error('Failed to get users:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to retrieve users'
    };
    res.status(500).json(response);
  }
}

/**
 * Get user by ID
 */
export async function getUserById(req: Request, res: Response): Promise<void> {
  try {
    const { userId } = req.params;
    const user = await dataService.getUserById(userId);
    
    if (!user) {
      const response: ApiResponse = {
        success: false,
        error: 'User not found'
      };
      res.status(404).json(response);
      return;
    }
    
    const response: ApiResponse = {
      success: true,
      data: user
    };
    
    res.json(response);
  } catch (error) {
    console.error('Failed to get user:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to retrieve user'
    };
    res.status(500).json(response);
  }
}

/**
 * Create or update user
 */
export async function saveUser(req: Request, res: Response): Promise<void> {
  try {
    const userData = req.body as CreateUserRequest;
    
    if (!validateUserData(userData)) {
      const response: ApiResponse = {
        success: false,
        error: 'Invalid user data'
      };
      res.status(400).json(response);
      return;
    }
    
  const sanitizedData = sanitizeUserData(userData);
  const savedUser = await dataService.saveUser(sanitizedData as any);
    
    const response: ApiResponse = {
      success: true,
      data: savedUser,
      message: 'User saved successfully'
    };
    
    res.json(response);
  } catch (error) {
    console.error('Failed to save user:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to save user'
    };
    res.status(500).json(response);
  }
}

/**
 * Update user
 */
export async function updateUser(req: Request, res: Response): Promise<void> {
  try {
    const { userId } = req.params;
    const updateData = req.body as UpdateUserRequest;
    
    // Check if user exists
    const existingUser = await dataService.getUserById(userId);
    if (!existingUser) {
      const response: ApiResponse = {
        success: false,
        error: 'User not found'
      };
      res.status(404).json(response);
      return;
    }
    
    const userData = { ...updateData, id: userId };
    
    if (!validateUserData(userData)) {
      const response: ApiResponse = {
        success: false,
        error: 'Invalid user data'
      };
      res.status(400).json(response);
      return;
    }
    
    const sanitizedData = sanitizeUserData(userData);
    const updatedUser = await dataService.saveUser({ ...existingUser, ...sanitizedData });
    
    const response: ApiResponse = {
      success: true,
      data: updatedUser,
      message: 'User updated successfully'
    };
    
    res.json(response);
  } catch (error) {
    console.error('Failed to update user:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to update user'
    };
    res.status(500).json(response);
  }
}

/**
 * Get all words (optionally filtered by user)
 */
export async function getWords(req: Request, res: Response): Promise<void> {
  try {
    const { userId } = req.query;
    const words = await dataService.getWords(userId as string);
    
    const response: ApiResponse = {
      success: true,
      data: words
    };
    
    res.json(response);
  } catch (error) {
    console.error('Failed to get words:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to retrieve words'
    };
    res.status(500).json(response);
  }
}

/**
 * Get word by ID
 */
export async function getWordById(req: Request, res: Response): Promise<void> {
  try {
    const { wordId } = req.params;
    const word = await dataService.getWordById(wordId);
    
    if (!word) {
      const response: ApiResponse = {
        success: false,
        error: 'Word not found'
      };
      res.status(404).json(response);
      return;
    }
    
    const response: ApiResponse = {
      success: true,
      data: word
    };
    
    res.json(response);
  } catch (error) {
    console.error('Failed to get word:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to retrieve word'
    };
    res.status(500).json(response);
  }
}

/**
 * Create new word
 */
export async function createWord(req: Request, res: Response): Promise<void> {
  try {
    const wordData = req.body as CreateWordRequest;
    
    if (!validateWordData(wordData)) {
      const response: ApiResponse = {
        success: false,
        error: 'Invalid word data'
      };
      res.status(400).json(response);
      return;
    }
    
  const sanitizedData = sanitizeWordData(wordData);
  const savedWord = await dataService.saveWord(sanitizedData as any);
    
    const response: ApiResponse = {
      success: true,
      data: savedWord,
      message: 'Word created successfully'
    };
    
    res.status(201).json(response);
  } catch (error) {
    console.error('Failed to create word:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to create word'
    };
    res.status(500).json(response);
  }
}

/**
 * Update word
 */
export async function updateWord(req: Request, res: Response): Promise<void> {
  try {
    const { wordId } = req.params;
    const updateData = req.body as UpdateWordRequest;
    
    // Check if word exists
    const existingWord = await dataService.getWordById(wordId);
    if (!existingWord) {
      const response: ApiResponse = {
        success: false,
        error: 'Word not found'
      };
      res.status(404).json(response);
      return;
    }
    
    const wordData = { ...updateData, id: wordId };
    
    if (!validateWordData(wordData)) {
      const response: ApiResponse = {
        success: false,
        error: 'Invalid word data'
      };
      res.status(400).json(response);
      return;
    }
    
  const sanitizedData = sanitizeWordData(wordData);
  const updatedWord = await dataService.saveWord({ ...existingWord, ...sanitizedData } as any);
    
    const response: ApiResponse = {
      success: true,
      data: updatedWord,
      message: 'Word updated successfully'
    };
    
    res.json(response);
  } catch (error) {
    console.error('Failed to update word:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to update word'
    };
    res.status(500).json(response);
  }
}

/**
 * Delete word
 */
export async function deleteWord(req: Request, res: Response): Promise<void> {
  try {
    const { wordId } = req.params;
    const deleted = await dataService.deleteWord(wordId);
    
    if (!deleted) {
      const response: ApiResponse = {
        success: false,
        error: 'Word not found'
      };
      res.status(404).json(response);
      return;
    }
    
    const response: ApiResponse = {
      success: true,
      message: 'Word deleted successfully'
    };
    
    res.json(response);
  } catch (error) {
    console.error('Failed to delete word:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to delete word'
    };
    res.status(500).json(response);
  }
}

/**
 * Create backup
 */
export async function createBackup(req: Request, res: Response): Promise<void> {
  try {
    const backupPath = await dataService.createBackup();
    
    const response: ApiResponse = {
      success: true,
      data: { backupPath },
      message: 'Backup created successfully'
    };
    
    res.json(response);
  } catch (error) {
    console.error('Failed to create backup:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to create backup'
    };
    res.status(500).json(response);
  }
}

/**
 * List backups
 */
export async function listBackups(req: Request, res: Response): Promise<void> {
  try {
    const backups = await dataService.listBackups();
    
    const response: ApiResponse = {
      success: true,
      data: backups
    };
    
    res.json(response);
  } catch (error) {
    console.error('Failed to list backups:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to list backups'
    };
    res.status(500).json(response);
  }
}

/**
 * Restore from backup
 */
export async function restoreFromBackup(req: Request, res: Response): Promise<void> {
  try {
    const { backupFileName } = req.params;
    await dataService.restoreFromBackup(backupFileName);
    
    const response: ApiResponse = {
      success: true,
      message: 'Data restored from backup successfully'
    };
    
    res.json(response);
  } catch (error) {
    console.error('Failed to restore from backup:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to restore from backup'
    };
    res.status(500).json(response);
  }
}

/**
 * Get data statistics
 */
export async function getStats(req: Request, res: Response): Promise<void> {
  try {
    const stats = await dataService.getStats();
    
    const response: ApiResponse = {
      success: true,
      data: stats
    };
    
    res.json(response);
  } catch (error) {
    console.error('Failed to get stats:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to retrieve statistics'
    };
    res.status(500).json(response);
  }
}