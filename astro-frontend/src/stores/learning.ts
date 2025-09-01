import { atom } from 'nanostores';
import { apiService } from '../services/api';

export interface QuizQuestion {
  id: number;
  word: string;
  questionType: 'meaning' | 'usage' | 'pronunciation';
  question: string;
  options?: string[];
  correctAnswer: string;
}

export interface QuizState {
  isActive: boolean;
  questions: QuizQuestion[];
  currentQuestionIndex: number;
  answers: Array<{
    questionId: number;
    userAnswer: string;
    isCorrect: boolean;
  }>;
  isLoading: boolean;
  error: string | null;
}

export interface LearningStats {
  totalWords: number;
  knownWords: number;
  learningWords: number;
  unknownWords: number;
  totalQuizzes: number;
  averageAccuracy: number;
}

export const quizStore = atom<QuizState>({
  isActive: false,
  questions: [],
  currentQuestionIndex: 0,
  answers: [],
  isLoading: false,
  error: null
});

export const learningStatsStore = atom<LearningStats>({
  totalWords: 0,
  knownWords: 0,
  learningWords: 0,
  unknownWords: 0,
  totalQuizzes: 0,
  averageAccuracy: 0
});

export const startQuiz = async (questionCount = 5) => {
  const currentState = quizStore.get();
  
  quizStore.set({
    ...currentState,
    isLoading: true,
    error: null
  });

  try {
    const data = await apiService.getQuiz(questionCount);

    if (data.success && data.data) {
      quizStore.set({
        isActive: true,
        questions: data.data,
        currentQuestionIndex: 0,
        answers: [],
        isLoading: false,
        error: null
      });
    } else {
      throw new Error(data.message || 'Failed to start quiz');
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    quizStore.set({
      ...currentState,
      isLoading: false,
      error: errorMessage
    });
  }
};

export const submitAnswer = async (answer: string) => {
  const currentState = quizStore.get();
  const currentQuestion = currentState.questions[currentState.currentQuestionIndex];
  
  if (!currentQuestion) return;

  try {
    const data = await apiService.submitQuizAnswer(currentQuestion.id, answer);
    
    const newAnswer = {
      questionId: currentQuestion.id,
      userAnswer: answer,
      isCorrect: data.isCorrect || false
    };

    const updatedAnswers = [...currentState.answers, newAnswer];
    
    quizStore.set({
      ...currentState,
      answers: updatedAnswers
    });

    return data.isCorrect;
  } catch (error) {
    console.error('Failed to submit answer:', error);
    return false;
  }
};

export const nextQuestion = () => {
  const currentState = quizStore.get();
  const nextIndex = currentState.currentQuestionIndex + 1;
  
  if (nextIndex < currentState.questions.length) {
    quizStore.set({
      ...currentState,
      currentQuestionIndex: nextIndex
    });
  } else {
    // Quiz completed
    quizStore.set({
      ...currentState,
      isActive: false
    });
  }
};

export const resetQuiz = () => {
  quizStore.set({
    isActive: false,
    questions: [],
    currentQuestionIndex: 0,
    answers: [],
    isLoading: false,
    error: null
  });
};

export const loadLearningStats = async () => {
  try {
    const data = await apiService.getLearningStats();

    if (data.success && data.data) {
      learningStatsStore.set(data.data);
    } else {
      throw new Error(data.message || 'Failed to load learning stats');
    }
  } catch (error) {
    console.error('Failed to load learning stats:', error);
  }
};

// Computed values
export const getQuizProgress = () => {
  const state = quizStore.get();
  return {
    current: state.currentQuestionIndex + 1,
    total: state.questions.length,
    percentage: state.questions.length > 0 ? ((state.currentQuestionIndex + 1) / state.questions.length) * 100 : 0
  };
};

export const getQuizResults = () => {
  const state = quizStore.get();
  const correctAnswers = state.answers.filter(a => a.isCorrect).length;
  const totalAnswers = state.answers.length;
  
  return {
    correct: correctAnswers,
    total: totalAnswers,
    accuracy: totalAnswers > 0 ? (correctAnswers / totalAnswers) * 100 : 0
  };
};