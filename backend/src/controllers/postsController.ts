import { Request, Response } from 'express';
import AuthController from './authController.js';
import { extractMeaningfulWords } from '../utils/textProcessor.js';

export class PostsController {
  /**
   * Get user's Bluesky posts
   */
  static async getPosts(req: Request, res: Response): Promise<void> {
    try {
      console.log('getPosts called with query:', req.query);
      
      const blueskyService = AuthController.getBlueskyService(req);
      console.log('BlueskyService obtained:', !!blueskyService);
      console.log('BlueskyService logged in:', blueskyService?.isLoggedIn());
      
      if (!blueskyService || !blueskyService.isLoggedIn()) {
        console.log('Authentication failed - no service or not logged in');
        res.status(401).json({
          error: 'Not authenticated',
          message: 'Please login first'
        });
        return;
      }

      // Get query parameters
      const identifier = req.query.identifier as string;
      const limit = parseInt(req.query.limit as string) || 10;

      console.log('Request params:', { identifier, limit });

      if (!identifier) {
        res.status(400).json({
          error: 'Missing identifier',
          message: 'User identifier is required'
        });
        return;
      }

      // Validate limit
      if (limit < 1 || limit > 100) {
        res.status(400).json({
          error: 'Invalid limit',
          message: 'Limit must be between 1 and 100'
        });
        return;
      }

      console.log('Fetching posts from Bluesky...');
      const posts = await blueskyService.getUserPosts(identifier, limit);
      console.log('Posts fetched:', posts.length);

      // Extract words from posts for language learning
      const postsWithWords = posts.map(post => ({
        ...post,
        extractedWords: extractMeaningfulWords(post.text)
      }));

      res.json({
        success: true,
        data: postsWithWords,
        meta: {
          count: posts.length,
          limit: limit,
          identifier: identifier
        }
      });
    } catch (error) {
      console.error('Get posts error:', error);
      res.status(500).json({
        error: 'Failed to fetch posts',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get posts from the user's following timeline (home feed)
   */
  static async getFollowingFeed(req: Request, res: Response): Promise<void> {
    try {
      console.log('getFollowingFeed called with query:', req.query);
      
      const blueskyService = AuthController.getBlueskyService(req);
      console.log('BlueskyService obtained:', !!blueskyService);
      console.log('BlueskyService logged in:', blueskyService?.isLoggedIn());
      
      if (!blueskyService || !blueskyService.isLoggedIn()) {
        console.log('Authentication failed - no service or not logged in');
        res.status(401).json({
          error: 'Not authenticated',
          message: 'Please login first'
        });
        return;
      }

      // Get query parameters
      const limit = parseInt(req.query.limit as string) || 10;

      console.log('Request params:', { limit });

      // Validate limit
      if (limit < 1 || limit > 100) {
        res.status(400).json({
          error: 'Invalid limit',
          message: 'Limit must be between 1 and 100'
        });
        return;
      }

      console.log('Fetching following feed from Bluesky...');
      const posts = await blueskyService.getFollowingFeed(limit);
      console.log('Following posts fetched:', posts.length);

      // Extract words from posts for language learning
      const postsWithWords = posts.map(post => ({
        ...post,
        extractedWords: extractMeaningfulWords(post.text)
      }));

      res.json({
        success: true,
        data: postsWithWords,
        meta: {
          count: posts.length,
          limit: limit,
          feedType: 'following'
        }
      });
    } catch (error) {
      console.error('Get following feed error:', error);
      res.status(500).json({
        error: 'Failed to fetch following feed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get discover (popular) feed posts
   */
  static async getDiscoverFeed(req: Request, res: Response): Promise<void> {
    try {
      console.log('getDiscoverFeed called with query:', req.query);
      const blueskyService = AuthController.getBlueskyService(req);
      if (!blueskyService || !blueskyService.isLoggedIn()) {
        res.status(401).json({ error: 'Not authenticated', message: 'Please login first' });
        return;
      }
      const limit = parseInt(req.query.limit as string) || 10;
      if (limit < 1 || limit > 100) {
        res.status(400).json({ error: 'Invalid limit', message: 'Limit must be between 1 and 100' });
        return;
      }
      console.log('Fetching discover feed from Bluesky...');
      const posts = await (blueskyService as any).getDiscoverFeed(limit);
      console.log('Discover posts fetched:', posts.length);
      const postsWithWords = posts.map((post: any) => ({
        ...post,
        extractedWords: extractMeaningfulWords(post.text)
      }));
      res.json({
        success: true,
        data: postsWithWords,
        meta: { count: posts.length, limit, feedType: 'discover' }
      });
    } catch (error) {
      console.error('Get discover feed error:', error);
      res.status(500).json({
        error: 'Failed to fetch discover feed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get a specific post by ID
   */
  static async getPost(req: Request, res: Response): Promise<void> {
    try {
      const blueskyService = AuthController.getBlueskyService(req);
      if (!blueskyService || !blueskyService.isLoggedIn()) {
        res.status(401).json({
          error: 'Not authenticated',
          message: 'Please login first'
        });
        return;
      }

      const postId = req.params.id;
      
      // For now, return a placeholder response
      // In a full implementation, you would fetch the specific post
      res.status(501).json({
        error: 'Not implemented',
        message: 'Individual post fetching not yet implemented',
        postId: postId
      });
    } catch (error) {
      console.error('Get post error:', error);
      res.status(500).json({
        error: 'Failed to fetch post',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

export default PostsController;