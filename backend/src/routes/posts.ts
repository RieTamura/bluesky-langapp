import { Router } from 'express';
import PostsController from '../controllers/postsController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

/**
 * GET /api/posts
 * Get user's Bluesky posts
 * Query parameters:
 * - identifier: Bluesky user identifier (required)
 * - limit: Number of posts to fetch (optional, default: 10, max: 100)
 */
router.get('/', requireAuth, PostsController.getPosts);

/**
 * GET /api/posts/following
 * Get posts from the user's following timeline (home feed)
 * Query parameters:
 * - limit: Number of posts to fetch (optional, default: 10, max: 100)
 */
router.get('/following', requireAuth, PostsController.getFollowingFeed);

/**
 * GET /api/posts/:id
 * Get a specific post by ID
 */
router.get('/:id', requireAuth, PostsController.getPost);

export default router;