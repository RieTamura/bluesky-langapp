import { Request, Response } from 'express';
import { LearningProgressPost } from '../services/atProtocolService.js';
import type { ApiResponse } from '../types/data.js';

import { atProtocolService } from '../services/atProtocolService.js';

/**
 * Initialize AT Protocol service with Bluesky credentials
 */
export async function initializeATProtocol(req: Request, res: Response): Promise<void> {
  try {
    const { identifier, password } = req.body;
    
    if (!identifier || !password) {
      const response: ApiResponse = {
        success: false,
        error: 'Bluesky identifier and password are required'
      };
      res.status(400).json(response);
      return;
    }

    await atProtocolService.initialize({ identifier, password });
    
    const response: ApiResponse = {
      success: true,
      message: 'AT Protocol service initialized successfully'
    };
    
    res.json(response);
  } catch (error) {
    console.error('Failed to initialize AT Protocol service:', error);
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to initialize AT Protocol service'
    };
    res.status(500).json(response);
  }
}

/**
 * Post learning progress to Bluesky
 */
export async function postLearningProgress(req: Request, res: Response): Promise<void> {
  try {
    const { userId, type, metadata, customContent } = req.body;
    
    if (!userId || !type) {
      const response: ApiResponse = {
        success: false,
        error: 'User ID and post type are required'
      };
      res.status(400).json(response);
      return;
    }

    if (!atProtocolService.isAuthenticated()) {
      const response: ApiResponse = {
        success: false,
        error: 'AT Protocol service not authenticated. Please initialize first.'
      };
      res.status(401).json(response);
      return;
    }

    const post = await atProtocolService.postLearningProgress(
      userId,
      type,
      metadata || {},
      customContent
    );
    
    const response: ApiResponse = {
      success: true,
      data: post,
      message: post.blueskySuccess 
        ? 'Learning progress posted successfully'
        : 'Post created but failed to publish to Bluesky'
    };
    
    res.json(response);
  } catch (error) {
    console.error('Failed to post learning progress:', error);
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to post learning progress'
    };
    res.status(500).json(response);
  }
}

/**
 * Generate shared learning data
 */
export async function generateSharedData(req: Request, res: Response): Promise<void> {
  try {
    const { userId } = req.params;
    const { includeVocabulary } = req.query;
    
    if (!userId) {
      const response: ApiResponse = {
        success: false,
        error: 'User ID is required'
      };
      res.status(400).json(response);
      return;
    }

    const sharedData = await atProtocolService.generateSharedLearningData(
      userId,
      includeVocabulary === 'true'
    );
    
    const response: ApiResponse = {
      success: true,
      data: sharedData,
      message: 'Shared learning data generated successfully'
    };
    
    res.json(response);
  } catch (error) {
    console.error('Failed to generate shared learning data:', error);
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate shared learning data'
    };
    res.status(500).json(response);
  }
}

/**
 * Get post history
 */
export async function getPostHistory(req: Request, res: Response): Promise<void> {
  try {
    const { userId } = req.query;
    
    const history = atProtocolService.getPostHistory(userId as string);
    
    const response: ApiResponse = {
      success: true,
      data: history
    };
    
    res.json(response);
  } catch (error) {
    console.error('Failed to get post history:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to retrieve post history'
    };
    res.status(500).json(response);
  }
}

/**
 * Get available post templates
 */
export async function getPostTemplates(req: Request, res: Response): Promise<void> {
  try {
    const templates = atProtocolService.getAvailableTemplates();
    
    const response: ApiResponse = {
      success: true,
      data: templates
    };
    
    res.json(response);
  } catch (error) {
    console.error('Failed to get post templates:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to retrieve post templates'
    };
    res.status(500).json(response);
  }
}

/**
 * Get authentication status
 */
export async function getAuthStatus(req: Request, res: Response): Promise<void> {
  try {
    const isAuthenticated = atProtocolService.isAuthenticated();
    
    const response: ApiResponse = {
      success: true,
      data: { isAuthenticated }
    };
    
    res.json(response);
  } catch (error) {
    console.error('Failed to get auth status:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to get authentication status'
    };
    res.status(500).json(response);
  }
}

/**
 * Logout from AT Protocol service
 */
export async function logout(req: Request, res: Response): Promise<void> {
  try {
    atProtocolService.logout();
    
    const response: ApiResponse = {
      success: true,
      message: 'Logged out successfully'
    };
    
    res.json(response);
  } catch (error) {
    console.error('Failed to logout:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to logout'
    };
    res.status(500).json(response);
  }
}

/**
 * Auto-generate and post milestone achievements
 */
export async function autoPostMilestone(req: Request, res: Response): Promise<void> {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      const response: ApiResponse = {
        success: false,
        error: 'User ID is required'
      };
      res.status(400).json(response);
      return;
    }

    if (!atProtocolService.isAuthenticated()) {
      const response: ApiResponse = {
        success: false,
        error: 'AT Protocol service not authenticated'
      };
      res.status(401).json(response);
      return;
    }

    // Generate shared data to get current statistics
    const sharedData = await atProtocolService.generateSharedLearningData(userId);
    const { totalWords, studyStreak } = sharedData.summary;

    // Check for milestone achievements
    const milestones = [10, 25, 50, 100, 250, 500, 1000];
    const streakMilestones = [7, 14, 30, 60, 100];
    
    let post: LearningProgressPost | null = null;

    // Check word count milestones
    for (const milestone of milestones.reverse()) {
      if (totalWords >= milestone) {
        post = await atProtocolService.postLearningProgress(
          userId,
          'milestone',
          {
            wordsLearned: totalWords,
            milestone: `${milestone} words milestone reached!`
          }
        );
        break;
      }
    }

    // Check streak milestones if no word milestone was posted
    if (!post) {
      for (const streakMilestone of streakMilestones.reverse()) {
        if (studyStreak >= streakMilestone) {
          post = await atProtocolService.postLearningProgress(
            userId,
            'streak',
            {
              streak: studyStreak
            }
          );
          break;
        }
      }
    }

    if (post) {
      const response: ApiResponse = {
        success: true,
        data: post,
        message: 'Milestone achievement posted successfully'
      };
      res.json(response);
    } else {
      const response: ApiResponse = {
        success: true,
        message: 'No milestone achievements to post at this time'
      };
      res.json(response);
    }
  } catch (error) {
    console.error('Failed to auto-post milestone:', error);
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to auto-post milestone'
    };
    res.status(500).json(response);
  }
}

/**
 * Get Bluesky profile (authenticated user or arbitrary actor)
 */
export async function getProfile(req: Request, res: Response): Promise<void> {
  try {
    const actor = (req.query.actor as string) || undefined;

    const profile = await atProtocolService.getProfile(actor);

    const response: ApiResponse = {
      success: true,
      data: profile
    };

    res.json(response);
  } catch (error) {
    console.error('Failed to get profile:', error);
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get profile'
    };
    res.status(500).json(response);
  }
}