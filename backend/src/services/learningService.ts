import DataService from './dataService.js';
import type { WordData, LearningSessionData } from '../types/data.js';
import { normalizeWord } from '../utils/textProcessor.js';

// Escape regex special characters in a user-provided string so it can be used
// in a RegExp constructor to match literally.
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export interface QuizQuestion {
  id: string;
  word: WordData;
  questionType: 'meaning' | 'usage' | 'pronunciation';
  question: string;
  options?: string[];
  correctAnswer: string;
}

// Spaced Repetition System (SRS) interfaces
export interface SRSData {
  interval: number; // Days until next review
  repetition: number; // Number of successful reviews
  easeFactor: number; // Difficulty multiplier (1.3 - 2.5)
  nextReviewDate: string; // ISO date string
  lastReviewDate: string; // ISO date string
}

export interface DifficultyAdjustment {
  baseInterval: number;
  difficultyMultiplier: number;
  performanceHistory: number[]; // Recent performance scores (0-1)
}

export interface WordSRSData extends WordData {
  srsData?: SRSData;
  difficultyAdjustment?: DifficultyAdjustment;
}

export interface QuizAnswer {
  questionId: string;
  userAnswer: string;
  isCorrect: boolean;
  responseTimeMs?: number;
}

export interface QuizSession {
  sessionId: string;
  userId: string;
  questions: QuizQuestion[];
  currentQuestionIndex: number;
  answers: QuizAnswer[];
  startedAt: string;
  completedAt?: string;
}

class LearningService {
  private dataService: DataService;
  private activeSessions: Map<string, QuizSession> = new Map();

  // SRS constants
  private readonly SRS_INITIAL_INTERVAL = 1; // 1 day
  private readonly SRS_INITIAL_EASE_FACTOR = 2.5;
  private readonly SRS_MIN_EASE_FACTOR = 1.3;
  private readonly SRS_MAX_EASE_FACTOR = 2.5;
  private readonly SRS_EASE_FACTOR_BONUS = 0.1;
  private readonly SRS_EASE_FACTOR_PENALTY = 0.2;
  
  // Difficulty adjustment constants
  private readonly DIFFICULTY_HISTORY_SIZE = 10; // Number of recent attempts to consider
  private readonly DIFFICULTY_THRESHOLD_EASY = 0.8; // 80% accuracy = easy
  private readonly DIFFICULTY_THRESHOLD_HARD = 0.4; // 40% accuracy = hard
  private readonly DIFFICULTY_MULTIPLIER_EASY = 0.8; // Reduce interval by 20%
  private readonly DIFFICULTY_MULTIPLIER_HARD = 1.5; // Increase interval by 50%

  constructor() {
    this.dataService = new DataService();
  }

  /**
   * Generate a quiz question for a word
   */
  private generateQuizQuestion(word: WordData): QuizQuestion {
    const questionTypes: ('meaning' | 'usage' | 'pronunciation')[] = ['meaning', 'usage'];
    const questionType = questionTypes[Math.floor(Math.random() * questionTypes.length)];
    
  const questionId = `q_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

    console.log(`Generating quiz question for word: ${word.word}, definition: ${word.definition}`);

    switch (questionType) {
      case 'meaning':
        return {
          id: questionId,
          word,
          questionType: 'meaning',
          question: `What does "${word.word}" mean?`,
          correctAnswer: word.definition || 'No definition available'
        };
      
      case 'usage':
        const exampleSentence = word.exampleSentence || `Please use "${word.word}" in a sentence.`;
        const escaped = escapeRegExp(word.word || '');
        const sentenceWithBlank = exampleSentence.replace(new RegExp(escaped, 'gi'), '___');
        return {
          id: questionId,
          word,
          questionType: 'usage',
          question: `Fill in the blank: "${sentenceWithBlank}"`,
          correctAnswer: word.word
        };
      
      default:
        return {
          id: questionId,
          word,
          questionType: 'meaning',
          question: `What does "${word.word}" mean?`,
          correctAnswer: word.definition || 'No definition available'
        };
    }
  }

  /**
   * Start a new quiz session
   */
  async startQuizSession(userId: string, questionCount: number = 5): Promise<QuizSession> {
    try {
      // Get learning words for the user
      console.log(`Starting quiz for user: ${userId}`);
      let allWords = await this.dataService.getWords(userId);
      console.log(`Total words found for user ${userId}: ${allWords.length}`);
      
      // If no words found for this user, check for default_user words and migrate them
      if (allWords.length === 0) {
        console.log('No words found for user, checking for default_user words to migrate...');
        const defaultWords = await this.dataService.getWords('default_user');
        console.log(`Found ${defaultWords.length} default_user words to migrate`);
        
        if (defaultWords.length > 0) {
          // Migrate default_user words to current user
          for (const word of defaultWords) {
            await this.dataService.saveWord({
              ...word,
              userId: userId
            });
          }
          console.log(`Migrated ${defaultWords.length} words to user ${userId}`);
          allWords = await this.dataService.getWords(userId);
        }
      }
      
      console.log('Words:', allWords.map(w => ({ word: w.word, status: w.status })));
      
      // Get words due for review using SRS algorithm
      const dueWords = await this.getWordsForReview(userId);
      console.log(`Words due for review: ${dueWords.length}`);
      
      // If not enough due words, include other learning/unknown words
      let availableWords = dueWords;
      if (availableWords.length < questionCount) {
        const otherLearningWords = allWords.filter(word => 
          (word.status === 'learning' || word.status === 'unknown') &&
          !dueWords.some(dueWord => dueWord.id === word.id)
        );
        availableWords = [...dueWords, ...otherLearningWords];
      }
      
      console.log(`Available words for quiz: ${availableWords.length}`);

      if (availableWords.length === 0) {
        throw new Error('No words available for quiz. Add some words to your learning list first.');
      }

      // Phase 2: simple reinjection of some known words (placeholder)
      const knownWordsPool = allWords.filter(w => w.status === 'known');
      const reinjectCount = Math.min(2, Math.floor(questionCount / 4)); // up to 25% of quiz
      const reinjected = this.shuffleArray(knownWordsPool).slice(0, reinjectCount);

      // Prioritize due words, then shuffle remaining unknown/learning, then optional reinjected known words
      const baseSelection = [
        ...dueWords.slice(0, Math.min(questionCount, dueWords.length)),
        ...this.shuffleArray(availableWords.filter(word => !dueWords.some(dueWord => dueWord.id === word.id)))
      ];
      let selectedWords = baseSelection.slice(0, questionCount);
      if (reinjected.length > 0 && selectedWords.length < questionCount) {
        const slotsLeft = questionCount - selectedWords.length;
        selectedWords = [...selectedWords, ...reinjected.slice(0, slotsLeft)];
      }

      // Generate questions
      const questions = selectedWords.map(word => this.generateQuizQuestion(word));

      // Create session
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const session: QuizSession = {
        sessionId,
        userId,
        questions,
        currentQuestionIndex: 0,
        answers: [],
        startedAt: new Date().toISOString()
      };

      // Store active session
      this.activeSessions.set(sessionId, session);

      return session;
    } catch (error) {
      console.error('Failed to start quiz session:', error);
      throw error;
    }
  }

  /**
   * Get current question for a quiz session
   */
  async getCurrentQuestion(sessionId: string): Promise<QuizQuestion | null> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error('Quiz session not found');
    }

    if (session.currentQuestionIndex >= session.questions.length) {
      return null; // Quiz completed
    }

    return session.questions[session.currentQuestionIndex];
  }

  /**
   * Submit answer for current question
   */
  async submitAnswer(sessionId: string, userAnswer: string, responseTimeMs?: number): Promise<{
    isCorrect: boolean;
    correctAnswer: string;
    explanation?: string;
    nextQuestion?: QuizQuestion;
    sessionCompleted: boolean;
  }> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error('Quiz session not found');
    }

    const currentQuestion = session.questions[session.currentQuestionIndex];
    if (!currentQuestion) {
      throw new Error('No current question available');
    }

    // Check if answer is correct
    const isCorrect = this.checkAnswer(currentQuestion, userAnswer);
    
    // Record answer
    const answer: QuizAnswer = {
      questionId: currentQuestion.id,
      userAnswer,
      isCorrect,
      responseTimeMs
    };
    session.answers.push(answer);

    // Update word statistics with SRS and difficulty adjustment
    await this.updateWordStats(currentQuestion.word.id, isCorrect, responseTimeMs);

    // Move to next question
    session.currentQuestionIndex++;
    
    // Check if quiz is completed
    const sessionCompleted = session.currentQuestionIndex >= session.questions.length;
    let nextQuestion: QuizQuestion | undefined;

    if (sessionCompleted) {
      session.completedAt = new Date().toISOString();
      await this.saveLearningSession(session);
      this.activeSessions.delete(sessionId);
    } else {
      nextQuestion = session.questions[session.currentQuestionIndex];
    }

    return {
      isCorrect,
      correctAnswer: currentQuestion.correctAnswer,
      explanation: this.getAnswerExplanation(currentQuestion, isCorrect),
      nextQuestion,
      sessionCompleted
    };
  }

  /**
   * Check if user answer is correct
   */
  private checkAnswer(question: QuizQuestion, userAnswer: string): boolean {
  // Use the same normalization routine for both sides to avoid false negatives
  const normalizedUserAnswer = normalizeWord(userAnswer || '').trim();
  const normalizedCorrectAnswer = normalizeWord(question.correctAnswer || '').trim();

    // Empty answer (skip) is always incorrect
    if (normalizedUserAnswer === '') {
      return false;
    }

    switch (question.questionType) {
      case 'meaning':
        // For meaning questions, check if key words match
        return this.checkMeaningAnswer(normalizedCorrectAnswer, normalizedUserAnswer);
      
      case 'usage':
        // For usage questions, check exact word match using normalizedWord if available
        const targetWord = (question.word as any).normalizedWord || normalizeWord(question.word.word || '');
        return normalizedUserAnswer === targetWord;
      
      default:
        return normalizedUserAnswer === normalizedCorrectAnswer;
    }
  }

  /**
   * Check meaning answer with some flexibility
   */
  private checkMeaningAnswer(correctAnswer: string, userAnswer: string): boolean {
    console.log(`Checking answer - Correct: "${correctAnswer}", User: "${userAnswer}"`);
    
    // Empty answer (skip) is always incorrect
    if (userAnswer === '') {
      console.log('Empty answer - skipped');
      return false;
    }
    
    // Handle Japanese and English answers
    const correctWords = correctAnswer.split(/[、,\s]+/).filter(word => word.length > 0);
    const userWords = userAnswer.split(/[、,\s]+/).filter(word => word.length > 0);
    
    console.log(`Correct words: ${correctWords.join(', ')}`);
    console.log(`User words: ${userWords.join(', ')}`);
    
    // Check for exact matches or partial matches
    let matchCount = 0;
    for (const correctWord of correctWords) {
      if (userWords.some(userWord => 
        userWord.includes(correctWord) || 
        correctWord.includes(userWord) ||
        userWord === correctWord
      )) {
        matchCount++;
        console.log(`Match found: "${correctWord}"`);
      }
    }
    
    console.log(`Match count: ${matchCount}`);
    
    // More lenient matching - if any significant word matches, consider it correct
    const isCorrect = matchCount > 0 || correctWords.length === 0;
    console.log(`Answer is correct: ${isCorrect}`);
    
    return isCorrect;
  }

  /**
   * Get explanation for the answer
   */
  private getAnswerExplanation(question: QuizQuestion, isCorrect: boolean): string {
    const baseMessage = isCorrect ? 'Correct! Well done.' : '';
    
    let explanation = '';
    switch (question.questionType) {
      case 'meaning':
        explanation = `正解: ${question.correctAnswer}`;
        break;
      case 'usage':
        explanation = `正解: ${question.word.word}`;
        break;
      default:
        explanation = `正解: ${question.correctAnswer}`;
        break;
    }

    return isCorrect ? `${baseMessage}\n${explanation}` : `${explanation}`;
  }

  /**
   * Update word learning statistics with SRS and difficulty adjustment
   */
  private async updateWordStats(wordId: string, isCorrect: boolean, responseTimeMs?: number): Promise<void> {
    try {
      const word = await this.dataService.getWordById(wordId);
      if (!word) return;

      const reviewCount = (word.reviewCount || 0) + 1;
      const correctCount = (word.correctCount || 0) + (isCorrect ? 1 : 0);
      
      // Initialize or parse existing SRS data
      let srsData: SRSData;
      try {
        // For now, we'll store SRS data in the word's existing fields
        // In a future version, we could extend the data model
        if (word.lastReviewedAt && word.reviewCount && word.reviewCount > 0) {
          srsData = {
            interval: 1, // Will be recalculated
            repetition: word.reviewCount,
            easeFactor: this.SRS_INITIAL_EASE_FACTOR,
            nextReviewDate: word.lastReviewedAt,
            lastReviewDate: word.lastReviewedAt
          };
        } else {
          srsData = this.initializeSRSData();
        }
      } catch (error) {
        srsData = this.initializeSRSData();
      }

      // Initialize or parse difficulty adjustment data
      let difficultyData: DifficultyAdjustment;
      try {
        // For now, we'll use a simple approach and store in memory
        // In a future version, this could be persisted
        difficultyData = this.initializeDifficultyAdjustment();
      } catch (error) {
        difficultyData = this.initializeDifficultyAdjustment();
      }

      // Calculate quality score for SRS algorithm
      const quality = this.calculateQuality(isCorrect, responseTimeMs);
      
      // Update SRS data
      const updatedSRSData = this.updateSRSData(srsData, quality);
      
      // Update difficulty adjustment
      const updatedDifficultyData = this.updateDifficultyAdjustment(difficultyData, isCorrect, responseTimeMs);
      
      // Apply difficulty adjustment to SRS interval
      const adjustedInterval = Math.round(updatedSRSData.interval * updatedDifficultyData.difficultyMultiplier);
      updatedSRSData.interval = Math.max(1, adjustedInterval);
      
      // Recalculate next review date with adjusted interval
      const now = new Date();
      const nextReviewDate = new Date(now.getTime() + updatedSRSData.interval * 24 * 60 * 60 * 1000);
      updatedSRSData.nextReviewDate = nextReviewDate.toISOString();
      
      // Update status based on SRS performance
      let newStatus = word.status;
      if (updatedSRSData.repetition >= 5 && updatedSRSData.easeFactor >= 2.0) {
        // Word has been successfully reviewed multiple times with good ease factor
        newStatus = 'known';
      } else if (reviewCount > 0) {
        newStatus = 'learning';
      }

      // Save updated word data
      await this.dataService.saveWord({
        ...word,
        reviewCount,
        correctCount,
        status: newStatus,
        lastReviewedAt: now.toISOString(),
        // Store some SRS data in existing fields for now
        difficultyLevel: Math.round(updatedSRSData.easeFactor * 10) // Store ease factor as difficulty level
      });

      console.log(`Updated word stats for "${word.word}":`, {
        reviewCount,
        correctCount,
        status: newStatus,
        srsInterval: updatedSRSData.interval,
        easeFactor: updatedSRSData.easeFactor,
        difficultyMultiplier: updatedDifficultyData.difficultyMultiplier,
        nextReviewDate: updatedSRSData.nextReviewDate
      });
    } catch (error) {
      console.error('Failed to update word stats:', error);
    }
  }

  /**
   * Save learning session to data service
   */
  private async saveLearningSession(session: QuizSession): Promise<void> {
    try {
      const correctAnswers = session.answers.filter(answer => answer.isCorrect).length;
      
      const sessionData: LearningSessionData = {
        id: session.sessionId,
        userId: session.userId,
        sessionType: 'quiz',
        startedAt: session.startedAt,
        completedAt: session.completedAt,
        totalQuestions: session.questions.length,
        correctAnswers
      };

      // For now, we'll extend the data service to handle learning sessions
      // This would be implemented in the data service
      console.log('Learning session completed:', sessionData);
    } catch (error) {
      console.error('Failed to save learning session:', error);
    }
  }

  /**
   * Get quiz session results
   */
  async getSessionResults(sessionId: string): Promise<{
    sessionId: string;
    totalQuestions: number;
    correctAnswers: number;
    accuracy: number;
    completedAt?: string;
    answers: QuizAnswer[];
  } | null> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      return null;
    }

    const correctAnswers = session.answers.filter(answer => answer.isCorrect).length;
    const accuracy = session.answers.length > 0 ? correctAnswers / session.answers.length : 0;

    return {
      sessionId,
      totalQuestions: session.questions.length,
      correctAnswers,
      accuracy,
      completedAt: session.completedAt,
      answers: session.answers
    };
  }

  /**
   * Initialize SRS data for a word
   */
  private initializeSRSData(): SRSData {
    const now = new Date();
    const nextReview = new Date(now.getTime() + this.SRS_INITIAL_INTERVAL * 24 * 60 * 60 * 1000);
    
    return {
      interval: this.SRS_INITIAL_INTERVAL,
      repetition: 0,
      easeFactor: this.SRS_INITIAL_EASE_FACTOR,
      nextReviewDate: nextReview.toISOString(),
      lastReviewDate: now.toISOString()
    };
  }

  /**
   * Initialize difficulty adjustment data for a word
   */
  private initializeDifficultyAdjustment(): DifficultyAdjustment {
    return {
      baseInterval: this.SRS_INITIAL_INTERVAL,
      difficultyMultiplier: 1.0,
      performanceHistory: []
    };
  }

  /**
   * Update SRS data based on quiz performance
   * Implements the SM-2 algorithm with modifications
   */
  private updateSRSData(srsData: SRSData, quality: number): SRSData {
    const now = new Date();
    let newSRSData = { ...srsData };

    // Quality: 0-5 scale (0 = complete blackout, 5 = perfect response)
    // We'll map our boolean correct/incorrect to this scale
    // quality >= 3 is considered successful
    
    if (quality >= 3) {
      // Successful review
      if (newSRSData.repetition === 0) {
        newSRSData.interval = 1;
      } else if (newSRSData.repetition === 1) {
        newSRSData.interval = 6;
      } else {
        newSRSData.interval = Math.round(newSRSData.interval * newSRSData.easeFactor);
      }
      newSRSData.repetition += 1;
    } else {
      // Failed review - reset repetition but keep some progress
      newSRSData.repetition = 0;
      newSRSData.interval = 1;
    }

    // Update ease factor based on quality
    newSRSData.easeFactor = newSRSData.easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    
    // Clamp ease factor to valid range
    newSRSData.easeFactor = Math.max(this.SRS_MIN_EASE_FACTOR, 
      Math.min(this.SRS_MAX_EASE_FACTOR, newSRSData.easeFactor));

    // Calculate next review date
    const nextReviewDate = new Date(now.getTime() + newSRSData.interval * 24 * 60 * 60 * 1000);
    newSRSData.nextReviewDate = nextReviewDate.toISOString();
    newSRSData.lastReviewDate = now.toISOString();

    return newSRSData;
  }

  /**
   * Update difficulty adjustment based on recent performance
   */
  private updateDifficultyAdjustment(
    difficultyData: DifficultyAdjustment, 
    isCorrect: boolean, 
    responseTimeMs?: number
  ): DifficultyAdjustment {
    const newDifficultyData = { ...difficultyData };
    
    // Calculate performance score (0-1)
    let performanceScore = isCorrect ? 1 : 0;
    
    // Adjust score based on response time if available
    if (responseTimeMs && isCorrect) {
      // Faster responses get higher scores
      // Assume 5 seconds is average, scale accordingly
      const timeScore = Math.max(0.5, Math.min(1.0, 5000 / responseTimeMs));
      performanceScore = performanceScore * timeScore;
    }
    
    // Add to performance history
    newDifficultyData.performanceHistory.push(performanceScore);
    
    // Keep only recent history
    if (newDifficultyData.performanceHistory.length > this.DIFFICULTY_HISTORY_SIZE) {
      newDifficultyData.performanceHistory = newDifficultyData.performanceHistory.slice(-this.DIFFICULTY_HISTORY_SIZE);
    }
    
    // Calculate average performance over recent attempts
    const recentPerformance = newDifficultyData.performanceHistory.reduce((sum, score) => sum + score, 0) / 
      newDifficultyData.performanceHistory.length;
    
    // Adjust difficulty multiplier based on performance
    if (recentPerformance >= this.DIFFICULTY_THRESHOLD_EASY) {
      // Word is too easy - reduce intervals
      newDifficultyData.difficultyMultiplier = this.DIFFICULTY_MULTIPLIER_EASY;
    } else if (recentPerformance <= this.DIFFICULTY_THRESHOLD_HARD) {
      // Word is too hard - increase intervals
      newDifficultyData.difficultyMultiplier = this.DIFFICULTY_MULTIPLIER_HARD;
    } else {
      // Word difficulty is appropriate
      newDifficultyData.difficultyMultiplier = 1.0;
    }
    
    return newDifficultyData;
  }

  /**
   * Convert boolean correctness and response time to SM-2 quality scale
   */
  private calculateQuality(isCorrect: boolean, responseTimeMs?: number): number {
    if (!isCorrect) {
      return 0; // Complete failure
    }
    
    // Base quality for correct answer
    let quality = 4; // Good response
    
    // Adjust based on response time if available
    if (responseTimeMs) {
      if (responseTimeMs < 3000) { // Very fast (< 3 seconds)
        quality = 5; // Perfect response
      } else if (responseTimeMs < 8000) { // Fast (< 8 seconds)
        quality = 4; // Good response
      } else if (responseTimeMs < 15000) { // Moderate (< 15 seconds)
        quality = 3; // Satisfactory response
      } else {
        quality = 3; // Slow but correct
      }
    }
    
    return quality;
  }

  /**
   * Check if a word is due for review based on SRS data
   */
  private isWordDueForReview(srsData?: SRSData): boolean {
    if (!srsData) {
      return true; // New words are always due
    }
    
    const now = new Date();
    const nextReviewDate = new Date(srsData.nextReviewDate);
    
    return now >= nextReviewDate;
  }

  /**
   * Get words that are due for review
   */
  async getWordsForReview(userId: string): Promise<WordData[]> {
    try {
      const allWords = await this.dataService.getWords(userId);
      
      // Filter words that are due for review
      const dueWords = allWords.filter(word => {
        // Only include learning and unknown words
        if (word.status === 'known') {
          return false;
        }
        
        // Parse SRS data if available
        let srsData: SRSData | undefined;
        try {
          if (word.lastReviewedAt) {
            // Try to reconstruct SRS data from existing fields
            srsData = {
              interval: 1, // Default interval
              repetition: word.reviewCount || 0,
              easeFactor: this.SRS_INITIAL_EASE_FACTOR,
              nextReviewDate: word.lastReviewedAt, // Will be recalculated
              lastReviewDate: word.lastReviewedAt
            };
          }
        } catch (error) {
          // If parsing fails, treat as new word
          srsData = undefined;
        }
        
        return this.isWordDueForReview(srsData);
      });
      
      // Sort by priority (words not reviewed recently first)
      return dueWords.sort((a, b) => {
        const aLastReview = a.lastReviewedAt ? new Date(a.lastReviewedAt).getTime() : 0;
        const bLastReview = b.lastReviewedAt ? new Date(b.lastReviewedAt).getTime() : 0;
        return aLastReview - bLastReview;
      });
    } catch (error) {
      console.error('Failed to get words for review:', error);
      throw error;
    }
  }

  /**
   * Utility function to shuffle array
   */
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Get SRS-enhanced learning statistics for a user
   */
  async getAdvancedLearningStats(userId: string): Promise<{
    totalWords: number;
    unknownWords: number;
    learningWords: number;
    knownWords: number;
    totalReviews: number;
    averageAccuracy: number;
    wordsForReview: number;
    averageEaseFactor: number;
    reviewSchedule: {
      today: number;
      tomorrow: number;
      thisWeek: number;
      nextWeek: number;
    };
  }> {
    try {
      console.log(`Getting advanced learning stats for user: ${userId}`);
      let words = await this.dataService.getWords(userId);
      console.log(`Advanced stats - Total words found for user ${userId}: ${words.length}`);
      
      // Migration logic (same as before)
      if (words.length === 0) {
        console.log('No words found for user, checking for default_user words to migrate...');
        const defaultWords = await this.dataService.getWords('default_user');
        console.log(`Found ${defaultWords.length} default_user words to migrate`);
        
        if (defaultWords.length > 0) {
          for (const word of defaultWords) {
            await this.dataService.saveWord({
              ...word,
              userId: userId
            });
          }
          console.log(`Migrated ${defaultWords.length} words to user ${userId}`);
          words = await this.dataService.getWords(userId);
        }
      }
      
      const totalWords = words.length;
      const unknownWords = words.filter(w => w.status === 'unknown').length;
      const learningWords = words.filter(w => w.status === 'learning').length;
      const knownWords = words.filter(w => w.status === 'known').length;
      
      const totalReviews = words.reduce((sum, word) => sum + (word.reviewCount || 0), 0);
      const totalCorrect = words.reduce((sum, word) => sum + (word.correctCount || 0), 0);
      const averageAccuracy = totalReviews > 0 ? totalCorrect / totalReviews : 0;
      
      // Get words due for review
      const wordsForReview = (await this.getWordsForReview(userId)).length;
      
      // Calculate average ease factor from difficulty levels
      const wordsWithDifficulty = words.filter(w => w.difficultyLevel);
      const averageEaseFactor = wordsWithDifficulty.length > 0 
        ? wordsWithDifficulty.reduce((sum, word) => sum + (word.difficultyLevel || 25), 0) / wordsWithDifficulty.length / 10
        : this.SRS_INITIAL_EASE_FACTOR;
      
      // Calculate review schedule
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
      const thisWeekEnd = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      const nextWeekEnd = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);
      
      let reviewToday = 0;
      let reviewTomorrow = 0;
      let reviewThisWeek = 0;
      let reviewNextWeek = 0;
      
      for (const word of words) {
        if (word.status === 'known') continue;
        
        // Estimate next review date based on last review and difficulty
        let nextReviewDate = today;
        if (word.lastReviewedAt) {
          const lastReview = new Date(word.lastReviewedAt);
          const daysSinceReview = Math.floor((now.getTime() - lastReview.getTime()) / (24 * 60 * 60 * 1000));
          
          // Simple estimation - in a full implementation, this would use stored SRS data
          let estimatedInterval = 1;
          if (word.reviewCount && word.reviewCount > 0) {
            estimatedInterval = Math.min(30, Math.max(1, word.reviewCount * 2));
          }
          
          nextReviewDate = new Date(lastReview.getTime() + estimatedInterval * 24 * 60 * 60 * 1000);
        }
        
        if (nextReviewDate <= tomorrow) {
          if (nextReviewDate <= today) {
            reviewToday++;
          } else {
            reviewTomorrow++;
          }
        } else if (nextReviewDate <= thisWeekEnd) {
          reviewThisWeek++;
        } else if (nextReviewDate <= nextWeekEnd) {
          reviewNextWeek++;
        }
      }

      return {
        totalWords,
        unknownWords,
        learningWords,
        knownWords,
        totalReviews,
        averageAccuracy,
        wordsForReview,
        averageEaseFactor,
        reviewSchedule: {
          today: reviewToday,
          tomorrow: reviewTomorrow,
          thisWeek: reviewThisWeek,
          nextWeek: reviewNextWeek
        }
      };
    } catch (error) {
      console.error('Failed to get advanced learning stats:', error);
      throw error;
    }
  }

  /**
   * Get learning statistics for a user (backward compatibility)
   */
  async getLearningStats(userId: string): Promise<{
    totalWords: number;
    unknownWords: number;
    learningWords: number;
    knownWords: number;
    totalReviews: number;
    averageAccuracy: number;
  }> {
    try {
      console.log(`Getting learning stats for user: ${userId}`);
      let words = await this.dataService.getWords(userId);
      console.log(`Stats - Total words found for user ${userId}: ${words.length}`);
      
      // If no words found for this user, check for default_user words and migrate them
      if (words.length === 0) {
        console.log('No words found for user, checking for default_user words to migrate...');
        const defaultWords = await this.dataService.getWords('default_user');
        console.log(`Found ${defaultWords.length} default_user words to migrate`);
        
        if (defaultWords.length > 0) {
          // Migrate default_user words to current user
          for (const word of defaultWords) {
            await this.dataService.saveWord({
              ...word,
              userId: userId
            });
          }
          console.log(`Migrated ${defaultWords.length} words to user ${userId}`);
          words = await this.dataService.getWords(userId);
        }
      }
      
      const totalWords = words.length;
      const unknownWords = words.filter(w => w.status === 'unknown').length;
      const learningWords = words.filter(w => w.status === 'learning').length;
      const knownWords = words.filter(w => w.status === 'known').length;
      
      const totalReviews = words.reduce((sum, word) => sum + (word.reviewCount || 0), 0);
      const totalCorrect = words.reduce((sum, word) => sum + (word.correctCount || 0), 0);
      const averageAccuracy = totalReviews > 0 ? totalCorrect / totalReviews : 0;

      return {
        totalWords,
        unknownWords,
        learningWords,
        knownWords,
        totalReviews,
        averageAccuracy
      };
    } catch (error) {
      console.error('Failed to get learning stats:', error);
      throw error;
    }
  }
}

export default LearningService;