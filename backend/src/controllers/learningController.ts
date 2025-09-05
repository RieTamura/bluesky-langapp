import { Request, Response } from 'express';
import LearningService from '../services/learningService.js';
import AuthController from './authController.js';

export class LearningController {
  private static learningService = new LearningService();

  /**
   * GET /api/learning/quiz
   * Start a new quiz session or get current question
   */
  static async getQuiz(req: Request, res: Response): Promise<void> {
    try {
      const userId = AuthController.getUserId(req);
      console.log(`Quiz request - User ID: ${userId}`);
      if (!userId) {
        res.status(401).json({
          error: 'Authentication required',
          message: 'Valid session required'
        });
        return;
      }

      const sessionId = req.query.sessionId as string;
      const questionCount = parseInt(req.query.count as string) || 5;

      if (sessionId) {
        // Get current question for existing session
        try {
          const currentQuestion = await LearningController.learningService.getCurrentQuestion(sessionId);
          
          if (!currentQuestion) {
            // Session completed
            const results = await LearningController.learningService.getSessionResults(sessionId);
            res.json({
              success: true,
              data: {
                sessionCompleted: true,
                results
              },
              message: 'Quiz session completed'
            });
            return;
          }

          res.json({
            success: true,
            data: {
              sessionId,
              currentQuestion: {
                id: currentQuestion.id,
                question: currentQuestion.question,
                questionType: currentQuestion.questionType,
                word: currentQuestion.word.word,
                options: currentQuestion.options
              },
              sessionCompleted: false
            }
          });
        } catch (error) {
          // Session not found, start new one
          const session = await LearningController.learningService.startQuizSession(userId, questionCount);
          const firstQuestion = session.questions[0];

          res.json({
            success: true,
            data: {
              sessionId: session.sessionId,
              currentQuestion: {
                id: firstQuestion.id,
                question: firstQuestion.question,
                questionType: firstQuestion.questionType,
                word: firstQuestion.word.word,
                options: firstQuestion.options
              },
              sessionCompleted: false,
              totalQuestions: session.questions.length
            },
            message: 'New quiz session started'
          });
        }
      } else {
        // Start new quiz session
        const session = await LearningController.learningService.startQuizSession(userId, questionCount);
        const firstQuestion = session.questions[0];

        res.json({
          success: true,
          data: {
            sessionId: session.sessionId,
            currentQuestion: {
              id: firstQuestion.id,
              question: firstQuestion.question,
              questionType: firstQuestion.questionType,
              word: firstQuestion.word.word,
              options: firstQuestion.options
            },
            sessionCompleted: false,
            totalQuestions: session.questions.length
          },
          message: 'New quiz session started'
        });
      }
    } catch (error) {
      console.error('Get quiz error:', error);
      
      if (error instanceof Error && error.message.includes('No words available')) {
        res.status(400).json({
          error: 'No words available for quiz',
          message: 'クイズを開始するには、まず単語帳に「未知」または「学習中」の単語を追加してください。投稿ページで単語をクリックして保存するか、単語帳ページで直接追加できます。'
        });
        return;
      }

      res.status(500).json({
        error: 'Failed to get quiz',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * POST /api/learning/quiz/answer
   * Submit answer for current quiz question
   */
  static async submitQuizAnswer(req: Request, res: Response): Promise<void> {
    try {
      const userId = AuthController.getUserId(req);
      if (!userId) {
        res.status(401).json({
          error: 'Authentication required',
          message: 'Valid session required'
        });
        return;
      }

      const { sessionId, answer, responseTimeMs } = req.body;

      // Validate required fields
      if (!sessionId || typeof sessionId !== 'string') {
        res.status(400).json({
          error: 'Invalid request',
          message: 'Session ID is required'
        });
        return;
      }

      if (typeof answer !== 'string') {
        res.status(400).json({
          error: 'Invalid request',
          message: 'Answer must be a string'
        });
        return;
      }

      // Submit answer
      const result = await LearningController.learningService.submitAnswer(
        sessionId,
        answer.trim(),
        responseTimeMs
      );

      const responseData: any = {
        isCorrect: result.isCorrect,
        correctAnswer: result.correctAnswer,
        explanation: result.explanation,
        sessionCompleted: result.sessionCompleted
      };

      if (result.nextQuestion) {
        responseData.nextQuestion = {
          id: result.nextQuestion.id,
          question: result.nextQuestion.question,
          questionType: result.nextQuestion.questionType,
          word: result.nextQuestion.word.word,
          options: result.nextQuestion.options
        };
      }

      if (result.sessionCompleted) {
        const sessionResults = await LearningController.learningService.getSessionResults(sessionId);
        responseData.results = sessionResults;
      }

      res.json({
        success: true,
        data: responseData,
        message: result.isCorrect ? 'Correct answer!' : 'Incorrect answer'
      });
    } catch (error) {
      console.error('Submit quiz answer error:', error);
      
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({
          error: 'Quiz session not found',
          message: 'The quiz session has expired or does not exist'
        });
        return;
      }

      res.status(500).json({
        error: 'Failed to submit answer',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * GET /api/learning/stats
   * Get learning statistics for the user
   */
  static async getLearningStats(req: Request, res: Response): Promise<void> {
    try {
      const userId = AuthController.getUserId(req);
      if (!userId) {
        res.status(401).json({
          error: 'Authentication required',
          message: 'Valid session required'
        });
        return;
      }

      const stats = await LearningController.learningService.getLearningStats(userId);

      res.json({
        success: true,
        data: stats,
        message: 'Learning statistics retrieved successfully'
      });
    } catch (error) {
      console.error('Get learning stats error:', error);
      res.status(500).json({
        error: 'Failed to get learning statistics',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * GET /api/learning/progress
   * Get detailed learning progress for the user
   */
  static async getLearningProgress(req: Request, res: Response): Promise<void> {
    try {
      const userId = AuthController.getUserId(req);
      if (!userId) {
        res.status(401).json({
          error: 'Authentication required',
          message: 'Valid session required'
        });
        return;
      }

      const stats = await LearningController.learningService.getLearningStats(userId);
      
      // Calculate progress percentages
      const totalWords = stats.totalWords;
      const progressData = {
        ...stats,
        unknownPercentage: totalWords > 0 ? (stats.unknownWords / totalWords) * 100 : 0,
        learningPercentage: totalWords > 0 ? (stats.learningWords / totalWords) * 100 : 0,
        knownPercentage: totalWords > 0 ? (stats.knownWords / totalWords) * 100 : 0,
        accuracyPercentage: stats.averageAccuracy * 100
      };

      res.json({
        success: true,
        data: progressData,
        message: 'Learning progress retrieved successfully'
      });
    } catch (error) {
      console.error('Get learning progress error:', error);
      res.status(500).json({
        error: 'Failed to get learning progress',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * GET /api/learning/advanced-stats
   * Get advanced learning statistics with SRS data
   */
  static async getAdvancedLearningStats(req: Request, res: Response): Promise<void> {
    try {
      const userId = AuthController.getUserId(req);
      if (!userId) {
        res.status(401).json({
          error: 'Authentication required',
          message: 'Valid session required'
        });
        return;
      }

      const advancedStats = await LearningController.learningService.getAdvancedLearningStats(userId);

      res.json({
        success: true,
        data: advancedStats,
        message: 'Advanced learning statistics retrieved successfully'
      });
    } catch (error) {
      console.error('Get advanced learning stats error:', error);
      res.status(500).json({
        error: 'Failed to get advanced learning statistics',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * GET /api/learning/due-words
   * Get list of words due for review (optionally filtered by languageCode)
   * Query:
   * - languageCode (optional) single code or comma separated list
   * - limit (optional)
   */
  static async getDueWords(req: Request, res: Response): Promise<void> {
    try {
      const userId = AuthController.getUserId(req);
      if (!userId) {
        res.status(401).json({
          error: 'Authentication required',
          message: 'Valid session required'
        });
        return;
      }

      const languageParam = (req.query.languageCode as string) || '';
      const limit = parseInt(req.query.limit as string) || undefined;
      const languageFilter = languageParam
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

      const dueWords = await LearningController.learningService.getWordsForReview(userId);
      let filtered = dueWords;
      if (languageFilter.length > 0) {
        filtered = filtered.filter(w => languageFilter.includes(w.languageCode || 'en'));
      }
      if (limit) {
        filtered = filtered.slice(0, limit);
      }

      res.json({
        success: true,
        data: filtered,
        meta: {
          total: dueWords.length,
          filtered: filtered.length,
          languages: languageFilter
        }
      });
    } catch (error) {
      console.error('Get due words error:', error);
      res.status(500).json({
        error: 'Failed to get due words',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * GET /api/learning/review-schedule
   * Get the review schedule for upcoming days
   */
  static async getReviewSchedule(req: Request, res: Response): Promise<void> {
    try {
      const userId = AuthController.getUserId(req);
      if (!userId) {
        res.status(401).json({
          error: 'Authentication required',
          message: 'Valid session required'
        });
        return;
      }

      const advancedStats = await LearningController.learningService.getAdvancedLearningStats(userId);

      res.json({
        success: true,
        data: {
          reviewSchedule: advancedStats.reviewSchedule,
          wordsForReview: advancedStats.wordsForReview,
          averageEaseFactor: advancedStats.averageEaseFactor
        },
        message: 'Review schedule retrieved successfully'
      });
    } catch (error) {
      console.error('Get review schedule error:', error);
      res.status(500).json({
        error: 'Failed to get review schedule',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * GET /api/learning/history
   * Get learning history for calendar visualization
   */
  static async getLearningHistory(req: Request, res: Response): Promise<void> {
    try {
      const userId = AuthController.getUserId(req);
      if (!userId) {
        res.status(401).json({
          error: 'Authentication required',
          message: 'Valid session required'
        });
        return;
      }

      const days = parseInt(req.query.days as string) || 30;
      
      // Generate mock learning history for now
      // In a real implementation, this would query actual learning session data
      const history = [];
      const today = new Date();
      
      for (let i = days; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        
        // Generate realistic mock data based on day of week
        const dayOfWeek = date.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        
        const baseActivity = isWeekend ? 2 : 5;
        const wordsLearned = Math.floor(Math.random() * baseActivity + Math.random() * 3);
        const quizzesTaken = Math.floor(Math.random() * (baseActivity / 2) + Math.random() * 2);
        
        history.push({
          date: date.toISOString().split('T')[0],
          wordsLearned,
          quizzesTaken,
          accuracy: Math.random() * 0.3 + 0.7 // 70-100% accuracy
        });
      }

      res.json({
        success: true,
        data: history,
        message: 'Learning history retrieved successfully'
      });
    } catch (error) {
      console.error('Get learning history error:', error);
      res.status(500).json({
        error: 'Failed to get learning history',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

export default LearningController;