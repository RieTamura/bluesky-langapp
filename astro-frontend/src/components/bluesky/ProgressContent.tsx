import React, { useState, useEffect } from 'react';
import ProgressChart from './ProgressChart';
import LearningCalendar from './LearningCalendar';
import GoalSetting from './GoalSetting';

interface LearningStats {
  totalWords: number;
  knownWords: number;
  learningWords: number;
  unknownWords: number;
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
}

export default function ProgressContent() {
  const [stats, setStats] = useState<LearningStats>({
    totalWords: 0,
    knownWords: 0,
    learningWords: 0,
    unknownWords: 0,
    totalReviews: 0,
    averageAccuracy: 0,
    wordsForReview: 0,
    averageEaseFactor: 2.5,
    reviewSchedule: {
      today: 0,
      tomorrow: 0,
      thisWeek: 0,
      nextWeek: 0
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLearningStats();
    fetchLearningHistory();
  }, []);

  const fetchLearningStats = async () => {
    try {
      setLoading(true);
      const sessionId = localStorage.getItem('sessionId');
      
      if (!sessionId) {
        setError('認証が必要です');
        return;
      }

      const response = await fetch('/api/learning/advanced-stats', {
        headers: {
          'Authorization': `Bearer ${sessionId}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('統計データの取得に失敗しました');
      }

      const result = await response.json();
      if (result.success) {
        setStats(result.data);
      } else {
        throw new Error(result.message || '統計データの取得に失敗しました');
      }
    } catch (error) {
      console.error('Failed to fetch learning stats:', error);
      setError(error instanceof Error ? error.message : '統計データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // Generate chart data
  const generateProgressChartData = () => {
    return {
      labels: ['未学習', '学習中', '習得済み'],
      datasets: [
        {
          data: [stats.unknownWords, stats.learningWords, stats.knownWords],
          backgroundColor: [
            '#EF4444', // red-500
            '#F59E0B', // yellow-500
            '#10B981', // green-500
          ],
          borderWidth: 0,
        },
      ],
    };
  };

  const generateAccuracyChartData = () => {
    // Generate mock weekly accuracy data - in real app this would come from API
    const weeks = ['4週前', '3週前', '2週前', '先週', '今週'];
    const accuracyData = [
      Math.max(0, stats.averageAccuracy * 100 - 20 + Math.random() * 10),
      Math.max(0, stats.averageAccuracy * 100 - 15 + Math.random() * 10),
      Math.max(0, stats.averageAccuracy * 100 - 10 + Math.random() * 10),
      Math.max(0, stats.averageAccuracy * 100 - 5 + Math.random() * 10),
      stats.averageAccuracy * 100
    ];

    return {
      labels: weeks,
      datasets: [
        {
          label: '正答率 (%)',
          data: accuracyData,
          borderColor: '#3B82F6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.4,
          fill: true,
        },
      ],
    };
  };

  const generateReviewScheduleData = () => {
    return {
      labels: ['今日', '明日', '今週', '来週'],
      datasets: [
        {
          label: '復習予定単語数',
          data: [
            stats.reviewSchedule.today,
            stats.reviewSchedule.tomorrow,
            stats.reviewSchedule.thisWeek,
            stats.reviewSchedule.nextWeek
          ],
          backgroundColor: '#8B5CF6',
          borderColor: '#7C3AED',
          borderWidth: 1,
        },
      ],
    };
  };

  const [learningHistory, setLearningHistory] = useState<Array<{
    date: string;
    wordsLearned: number;
    quizzesTaken: number;
  }>>([]);

  const fetchLearningHistory = async () => {
    try {
      const sessionId = localStorage.getItem('sessionId');
      
      if (!sessionId) {
        return;
      }

      const response = await fetch('/api/learning/history?days=30', {
        headers: {
          'Authorization': `Bearer ${sessionId}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setLearningHistory(result.data);
        }
      }
    } catch (error) {
      console.error('Failed to fetch learning history:', error);
      // Fallback to mock data
      const history = [];
      const today = new Date();
      
      for (let i = 30; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        
        history.push({
          date: date.toISOString().split('T')[0],
          wordsLearned: Math.floor(Math.random() * 8),
          quizzesTaken: Math.floor(Math.random() * 3)
        });
      }
      
      setLearningHistory(history);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">統計データを読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">エラーが発生しました</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchLearningStats}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            再試行
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="sticky top-14 bg-white border-b border-gray-200 z-40 p-4">
        <h1 className="text-2xl font-bold text-gray-900">学習進捗</h1>
        <p className="text-gray-600 mt-1">あなたの学習状況を詳しく確認しましょう</p>
      </div>

      {/* Progress Overview */}
      <div className="p-6">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
            <div className="text-3xl font-bold text-gray-900 mb-2">{stats.totalWords}</div>
            <div className="text-sm text-gray-600">総単語数</div>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
            <div className="text-3xl font-bold text-green-600 mb-2">{stats.knownWords}</div>
            <div className="text-sm text-gray-600">習得済み</div>
            <div className="mt-2 text-xs text-gray-500">
              {stats.totalWords > 0 ? Math.round((stats.knownWords / stats.totalWords) * 100) : 0}%
            </div>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
            <div className="text-3xl font-bold text-yellow-600 mb-2">{stats.learningWords}</div>
            <div className="text-sm text-gray-600">学習中</div>
            <div className="mt-2 text-xs text-gray-500">
              {stats.totalWords > 0 ? Math.round((stats.learningWords / stats.totalWords) * 100) : 0}%
            </div>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
            <div className="text-3xl font-bold text-red-600 mb-2">{stats.unknownWords}</div>
            <div className="text-sm text-gray-600">未学習</div>
            <div className="mt-2 text-xs text-gray-500">
              {stats.totalWords > 0 ? Math.round((stats.unknownWords / stats.totalWords) * 100) : 0}%
            </div>
          </div>
        </div>

        {/* Additional Stats Row */}
        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
            <div className="text-2xl font-bold text-blue-600 mb-2">
              {Math.round(stats.averageAccuracy * 100)}%
            </div>
            <div className="text-sm text-gray-600">平均正答率</div>
            <div className="mt-2 text-xs text-gray-500">
              {stats.totalReviews}回のレビュー
            </div>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
            <div className="text-2xl font-bold text-purple-600 mb-2">{stats.wordsForReview}</div>
            <div className="text-sm text-gray-600">復習予定</div>
            <div className="mt-2 text-xs text-gray-500">
              今日復習する単語
            </div>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
            <div className="text-2xl font-bold text-indigo-600 mb-2">
              {stats.averageEaseFactor.toFixed(1)}
            </div>
            <div className="text-sm text-gray-600">平均難易度</div>
            <div className="mt-2 text-xs text-gray-500">
              学習効率指標
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid gap-6 lg:grid-cols-2 mb-8">
          {/* Word Status Distribution */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">単語ステータス分布</h2>
            <ProgressChart
              type="doughnut"
              data={generateProgressChartData()}
              options={{
                plugins: {
                  legend: {
                    position: 'bottom' as const,
                  },
                },
                maintainAspectRatio: false,
              }}
            />
          </div>

          {/* Accuracy Trend */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">正答率の推移</h2>
            <ProgressChart
              type="line"
              data={generateAccuracyChartData()}
              options={{
                scales: {
                  y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                      callback: function(value: any) {
                        return value + '%';
                      }
                    }
                  }
                },
                plugins: {
                  legend: {
                    display: false,
                  },
                },
              }}
            />
          </div>
        </div>

        {/* Review Schedule Chart */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">復習スケジュール</h2>
          <div className="h-64">
            <ProgressChart
              type="bar"
              data={generateReviewScheduleData()}
              options={{
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      stepSize: 1
                    }
                  }
                },
                plugins: {
                  legend: {
                    display: false,
                  },
                },
              }}
            />
          </div>
        </div>

        {/* Learning Calendar */}
        <div className="mb-8">
          <LearningCalendar learningHistory={learningHistory} />
        </div>

        {/* Goal Setting */}
        <div className="mb-8">
          <GoalSetting />
        </div>

        {/* Achievements */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">達成バッジ</h2>
          
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
            <div className="text-center p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="text-3xl mb-2">🏆</div>
              <div className="text-sm font-medium text-gray-900">初回学習</div>
              <div className="text-xs text-gray-600">最初の単語を学習</div>
            </div>
            
            <div className="text-center p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="text-3xl mb-2">📚</div>
              <div className="text-sm font-medium text-gray-900">単語コレクター</div>
              <div className="text-xs text-gray-600">10個の単語を追加</div>
            </div>
            
            <div className="text-center p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="text-3xl mb-2">🎯</div>
              <div className="text-sm font-medium text-gray-900">継続学習</div>
              <div className="text-xs text-gray-600">7日連続で学習</div>
            </div>
            
            <div className={`text-center p-4 rounded-lg ${
              stats.knownWords >= 100 
                ? 'bg-purple-50 border border-purple-200' 
                : 'bg-gray-100 border border-gray-300 opacity-50'
            }`}>
              <div className="text-3xl mb-2">🌟</div>
              <div className={`text-sm font-medium ${
                stats.knownWords >= 100 ? 'text-gray-900' : 'text-gray-500'
              }`}>
                マスター
              </div>
              <div className={`text-xs ${
                stats.knownWords >= 100 ? 'text-gray-600' : 'text-gray-400'
              }`}>
                100個の単語を習得
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}