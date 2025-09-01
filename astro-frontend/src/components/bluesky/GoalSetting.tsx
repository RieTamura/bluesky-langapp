import React, { useState, useEffect } from 'react';

interface Goal {
  id: string;
  type: 'daily_words' | 'weekly_words' | 'monthly_words' | 'quiz_streak' | 'accuracy_rate';
  title: string;
  description: string;
  targetValue: number;
  currentValue: number;
  deadline?: string;
  isActive: boolean;
  createdAt: string;
}

interface GoalSettingProps {
  onGoalUpdate?: (goals: Goal[]) => void;
}

export default function GoalSetting({ onGoalUpdate }: GoalSettingProps) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [newGoal, setNewGoal] = useState({
    type: 'daily_words' as Goal['type'],
    targetValue: 5,
    deadline: ''
  });

  useEffect(() => {
    loadGoals();
  }, []);

  const loadGoals = () => {
    // Load goals from localStorage for now
    const savedGoals = localStorage.getItem('learningGoals');
    if (savedGoals) {
      setGoals(JSON.parse(savedGoals));
    } else {
      // Set default goals
      const defaultGoals: Goal[] = [
        {
          id: 'daily-words-1',
          type: 'daily_words',
          title: '毎日5個の新しい単語',
          description: '毎日5個の新しい単語を学習する',
          targetValue: 5,
          currentValue: 0,
          isActive: true,
          createdAt: new Date().toISOString()
        },
        {
          id: 'weekly-quiz-1',
          type: 'quiz_streak',
          title: '週3回のクイズ',
          description: '週に3回以上クイズに挑戦する',
          targetValue: 3,
          currentValue: 0,
          isActive: true,
          createdAt: new Date().toISOString()
        }
      ];
      setGoals(defaultGoals);
      localStorage.setItem('learningGoals', JSON.stringify(defaultGoals));
    }
  };

  const addGoal = () => {
    const goalTemplates = {
      daily_words: {
        title: `毎日${newGoal.targetValue}個の新しい単語`,
        description: `毎日${newGoal.targetValue}個の新しい単語を学習する`
      },
      weekly_words: {
        title: `週${newGoal.targetValue}個の単語学習`,
        description: `週に${newGoal.targetValue}個の単語を学習する`
      },
      monthly_words: {
        title: `月${newGoal.targetValue}個の単語習得`,
        description: `月に${newGoal.targetValue}個の単語を習得する`
      },
      quiz_streak: {
        title: `${newGoal.targetValue}日連続クイズ`,
        description: `${newGoal.targetValue}日連続でクイズに挑戦する`
      },
      accuracy_rate: {
        title: `正答率${newGoal.targetValue}%達成`,
        description: `クイズの正答率${newGoal.targetValue}%を達成する`
      }
    };

    const template = goalTemplates[newGoal.type];
    const goal: Goal = {
      id: `goal-${Date.now()}`,
      type: newGoal.type,
      title: template.title,
      description: template.description,
      targetValue: newGoal.targetValue,
      currentValue: 0,
      deadline: newGoal.deadline || undefined,
      isActive: true,
      createdAt: new Date().toISOString()
    };

    const updatedGoals = [...goals, goal];
    setGoals(updatedGoals);
    localStorage.setItem('learningGoals', JSON.stringify(updatedGoals));
    onGoalUpdate?.(updatedGoals);
    
    setShowAddGoal(false);
    setNewGoal({
      type: 'daily_words',
      targetValue: 5,
      deadline: ''
    });
  };

  const toggleGoal = (goalId: string) => {
    const updatedGoals = goals.map(goal =>
      goal.id === goalId ? { ...goal, isActive: !goal.isActive } : goal
    );
    setGoals(updatedGoals);
    localStorage.setItem('learningGoals', JSON.stringify(updatedGoals));
    onGoalUpdate?.(updatedGoals);
  };

  const deleteGoal = (goalId: string) => {
    const updatedGoals = goals.filter(goal => goal.id !== goalId);
    setGoals(updatedGoals);
    localStorage.setItem('learningGoals', JSON.stringify(updatedGoals));
    onGoalUpdate?.(updatedGoals);
  };

  const getProgressPercentage = (goal: Goal): number => {
    return Math.min(100, (goal.currentValue / goal.targetValue) * 100);
  };

  const getGoalIcon = (type: Goal['type']): string => {
    switch (type) {
      case 'daily_words': return '📚';
      case 'weekly_words': return '📖';
      case 'monthly_words': return '🎯';
      case 'quiz_streak': return '🔥';
      case 'accuracy_rate': return '🎪';
      default: return '⭐';
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">学習目標</h2>
        <button
          onClick={() => setShowAddGoal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
        >
          目標を追加
        </button>
      </div>

      {/* Active Goals */}
      <div className="space-y-4 mb-6">
        {goals.filter(goal => goal.isActive).map(goal => (
          <div key={goal.id} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">{getGoalIcon(goal.type)}</span>
                <div>
                  <h3 className="font-medium text-gray-900">{goal.title}</h3>
                  <p className="text-sm text-gray-600">{goal.description}</p>
                  {goal.deadline && (
                    <p className="text-xs text-gray-500 mt-1">
                      期限: {new Date(goal.deadline).toLocaleDateString('ja-JP')}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => toggleGoal(goal.id)}
                  className="text-gray-400 hover:text-gray-600"
                  title="一時停止"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
                <button
                  onClick={() => deleteGoal(goal.id)}
                  className="text-red-400 hover:text-red-600"
                  title="削除"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-2">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm text-gray-600">進捗</span>
                <span className="text-sm font-medium text-gray-900">
                  {goal.currentValue} / {goal.targetValue}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${getProgressPercentage(goal)}%` }}
                />
              </div>
              <div className="text-right mt-1">
                <span className="text-xs text-gray-500">
                  {Math.round(getProgressPercentage(goal))}% 完了
                </span>
              </div>
            </div>
          </div>
        ))}

        {goals.filter(goal => goal.isActive).length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">🎯</div>
            <p>アクティブな目標がありません</p>
            <p className="text-sm">新しい目標を追加して学習を始めましょう！</p>
          </div>
        )}
      </div>

      {/* Inactive Goals */}
      {goals.filter(goal => !goal.isActive).length > 0 && (
        <div className="border-t border-gray-200 pt-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">一時停止中の目標</h3>
          <div className="space-y-2">
            {goals.filter(goal => !goal.isActive).map(goal => (
              <div key={goal.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <span className="text-lg opacity-50">{getGoalIcon(goal.type)}</span>
                  <span className="text-sm text-gray-600">{goal.title}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => toggleGoal(goal.id)}
                    className="text-green-600 hover:text-green-700 text-sm"
                  >
                    再開
                  </button>
                  <button
                    onClick={() => deleteGoal(goal.id)}
                    className="text-red-400 hover:text-red-600"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Goal Modal */}
      {showAddGoal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">新しい目標を追加</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  目標の種類
                </label>
                <select
                  value={newGoal.type}
                  onChange={(e) => setNewGoal({ ...newGoal, type: e.target.value as Goal['type'] })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="daily_words">毎日の単語学習</option>
                  <option value="weekly_words">週間単語学習</option>
                  <option value="monthly_words">月間単語習得</option>
                  <option value="quiz_streak">クイズ連続日数</option>
                  <option value="accuracy_rate">正答率</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  目標値
                </label>
                <input
                  type="number"
                  value={newGoal.targetValue}
                  onChange={(e) => setNewGoal({ ...newGoal, targetValue: parseInt(e.target.value) || 0 })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min="1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  期限（オプション）
                </label>
                <input
                  type="date"
                  value={newGoal.deadline}
                  onChange={(e) => setNewGoal({ ...newGoal, deadline: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowAddGoal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={addGoal}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                追加
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}