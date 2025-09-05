import { useRef, useState, useCallback } from 'react';
import { quizApi } from '../services/api';

interface QuizQuestion {
  id: string;
  question: string;
  questionType: 'meaning' | 'usage';
  word: string;
  options?: string[];
}

interface QuizState {
  sessionId?: string;
  current?: QuizQuestion;
  isLoading: boolean;
  completed: boolean;
  accuracy?: number;
  totalQuestions?: number;
  answered: number;
  lastResult?: { correct: boolean; correctAnswer: string };
}

export function useQuiz(initialCount = 5) {
  const [state, setState] = useState<QuizState>({ isLoading: false, completed: false, answered: 0 });
  const startTimeRef = useRef<number | null>(null);

  const start = useCallback(async (count = initialCount) => {
    setState(s => ({ ...s, isLoading: true }));
    const res = await quizApi.start(count);
    const d = res.data;
    setState({
      isLoading: false,
      sessionId: d.sessionId,
      current: d.currentQuestion,
      completed: false,
      totalQuestions: d.totalQuestions,
      answered: 0
    });
    startTimeRef.current = performance.now();
  }, [initialCount]);

  const answer = useCallback(async (text: string) => {
    if (!state.sessionId || !state.current) return;
    const startMs = startTimeRef.current || performance.now();
    const responseTimeMs = performance.now() - startMs;
    setState(s => ({ ...s, isLoading: true }));
    const res = await quizApi.answer(state.sessionId!, text, Math.round(responseTimeMs));
    const d = res.data;
    let next: QuizQuestion | undefined = d.nextQuestion;
    setState(s => ({
      ...s,
      isLoading: false,
      current: d.sessionCompleted ? undefined : next,
      completed: d.sessionCompleted,
      answered: s.answered + 1,
      lastResult: { correct: d.isCorrect, correctAnswer: d.correctAnswer },
      accuracy: d.results ? d.results.accuracy : s.accuracy,
      totalQuestions: d.results ? d.results.totalQuestions : s.totalQuestions
    }));
    if (!d.sessionCompleted) startTimeRef.current = performance.now();
  }, [state.sessionId, state.current]);

  return {
    ...state,
    start,
    answer
  };
}
