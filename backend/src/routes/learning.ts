import { Router } from 'express';
import LearningController from '../controllers/learningController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

/**
 * GET /api/learning/quiz
 * Start a new quiz session or get current question
 * Query parameters:
 * - sessionId: string (optional) - Existing session ID to continue
 * - count: number (optional) - Number of questions for new session (default: 5)
 */
router.get('/quiz', requireAuth, LearningController.getQuiz);

/**
 * POST /api/learning/quiz/answer
 * Submit answer for current quiz question
 * Body:
 * - sessionId: string (required) - Quiz session ID
 * - answer: string (required) - User's answer
 * - responseTimeMs: number (optional) - Time taken to answer in milliseconds
 */
router.post('/quiz/answer', requireAuth, LearningController.submitQuizAnswer);

/**
 * GET /api/learning/stats
 * Get learning statistics for the authenticated user
 */
router.get('/stats', requireAuth, LearningController.getLearningStats);

/**
 * GET /api/learning/progress
 * Get detailed learning progress for the authenticated user
 */
router.get('/progress', requireAuth, LearningController.getLearningProgress);

/**
 * GET /api/learning/advanced-stats
 * Get advanced learning statistics with SRS data
 */
router.get('/advanced-stats', requireAuth, LearningController.getAdvancedLearningStats);

/**
 * GET /api/learning/review-schedule
 * Get the review schedule for upcoming days
 */
router.get('/review-schedule', requireAuth, LearningController.getReviewSchedule);

/**
 * GET /api/learning/history
 * Get learning history for calendar visualization
 * Query parameters:
 * - days: number (optional) - Number of days to retrieve (default: 30)
 */
router.get('/history', requireAuth, LearningController.getLearningHistory);

export default router;