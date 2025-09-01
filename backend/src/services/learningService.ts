import DataService, { WordData } from './dataService.js';
import { LearningSessionData } from '../types/data.js';

export interface QuizQuestion {
  id: string;
  word: WordData;
  questionType: 'meaning' | 'usage' | 'pronunciation';
  question: string;
  options?: string[];
  correctAnswer: string;
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

  constructor() {
    this.dataService = new DataService();
  }

  /**
   * Generate a quiz question for a word
   */
  private generateQuizQuestion(word: WordData): QuizQuestion {
    const questionTypes: ('meaning' | 'usage' | 'pronunciation')[] = ['meaning', 'usage'];
    const questionType = questionTypes[Math.floor(Math.random() * questionTypes.length)];
    
    const questionId = `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

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
        const sentenceWithBlank = exampleSentence.replace(new RegExp(word.word, 'gi'), '___');
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
      
      const learningWords = allWords.filter(word => 
        word.status === 'learning' || word.status === 'unknown'
      );
      console.log(`Learning words found: ${learningWords.length}`);

      if (learningWords.length === 0) {
        throw new Error('No words available for quiz. Add some words to your learning list first.');
      }

      // Select random words for quiz
      const selectedWords = this.shuffleArray(learningWords)
        .slice(0, Math.min(questionCount, learningWords.length));

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

    // Update word statistics if correct
    if (isCorrect) {
      await this.updateWordStats(currentQuestion.word.id, true);
    } else {
      await this.updateWordStats(currentQuestion.word.id, false);
    }

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
    const normalizedUserAnswer = userAnswer.toLowerCase().trim();
    const normalizedCorrectAnswer = question.correctAnswer.toLowerCase().trim();

    // Empty answer (skip) is always incorrect
    if (normalizedUserAnswer === '') {
      return false;
    }

    switch (question.questionType) {
      case 'meaning':
        // For meaning questions, check if key words match
        return this.checkMeaningAnswer(normalizedCorrectAnswer, normalizedUserAnswer);
      
      case 'usage':
        // For usage questions, check exact word match (case insensitive)
        const targetWord = question.word.word.toLowerCase().replace(/[!?.,]/g, '');
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
   * Update word learning statistics
   */
  private async updateWordStats(wordId: string, isCorrect: boolean): Promise<void> {
    try {
      const word = await this.dataService.getWordById(wordId);
      if (!word) return;

      const reviewCount = (word.reviewCount || 0) + 1;
      const correctCount = (word.correctCount || 0) + (isCorrect ? 1 : 0);
      
      // Update status based on performance
      let newStatus = word.status;
      if (isCorrect && reviewCount >= 3 && correctCount >= 2) {
        newStatus = 'known';
      } else if (reviewCount > 0) {
        newStatus = 'learning';
      }

      await this.dataService.saveWord({
        ...word,
        reviewCount,
        correctCount,
        status: newStatus,
        lastReviewedAt: new Date().toISOString()
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
   * Get learning statistics for a user
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