import { Router } from 'express';
import WordsController from '../controllers/wordsController.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';

const router = Router();

/**
 * GET /api/words
 * Get all words for the authenticated user
 * Query parameters:
 * - status: Filter by word status (unknown, learning, known)
 * - limit: Number of words to return (optional)
 * - offset: Number of words to skip (optional, default: 0)
 */
router.get('/', optionalAuth, WordsController.getWords);

/**
 * POST /api/words
 * Create a new word
 * Body:
 * - word: string (required) - The word text
 * - status: string (optional) - Word status (unknown, learning, known), default: unknown
 * - definition: string (optional) - Word definition
 * - exampleSentence: string (optional) - Example sentence using the word
 */
router.post('/', requireAuth, WordsController.createWord);

/**
 * GET /api/words/:id
 * Get a specific word by ID
 */
router.get('/:id', requireAuth, WordsController.getWord);

/**
 * PUT /api/words/:id
 * Update an existing word
 * Body:
 * - status: string (optional) - Word status (unknown, learning, known)
 * - definition: string (optional) - Word definition
 * - exampleSentence: string (optional) - Example sentence
 * - reviewCount: number (optional) - Number of times reviewed
 * - correctCount: number (optional) - Number of correct answers
 */
router.put('/:id', requireAuth, WordsController.updateWord);

/**
 * DELETE /api/words/:id
 * Delete a word
 */
router.delete('/:id', requireAuth, WordsController.deleteWord);

/**
 * GET /api/words/:word/definition
 * Get dictionary definition for a word
 * Path parameters:
 * - word: string (required) - The word to look up
 */
router.get('/:word/definition', requireAuth, WordsController.getWordDefinition);

export default router;