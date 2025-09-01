import React, { useState, useEffect } from 'react';

export default function ProgressContent() {
  const [stats, setStats] = useState({
    totalWords: 0,
    knownWords: 0,
    learningWords: 0,
    unknownWords: 0,
    weeklyProgress: [],
    monthlyProgress: []
  });

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="sticky top-14 bg-white border-b border-gray-200 z-40 p-4">
        <h1 className="text-2xl font-bold text-gray-900">学習進捗</h1>
        <p className="text-gray-600 mt-1">あなたの学習状況を確認しましょう</p>
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

        {/* Progress Chart */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">学習進捗グラフ</h2>
          
          {/* Overall Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">全体の進捗</span>
              <span className="text-sm text-gray-500">
                {stats.totalWords > 0 ? Math.round((stats.knownWords / stats.totalWords) * 100) : 0}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-green-600 h-3 rounded-full transition-all duration-300"
                style={{ 
                  width: `${stats.totalWords > 0 ? (stats.knownWords / stats.totalWords) * 100 : 0}%` 
                }}
              ></div>
            </div>
          </div>

          {/* Status Breakdown */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center space-x-3">
              <div className="w-4 h-4 bg-green-500 rounded"></div>
              <span className="text-sm text-gray-700">習得済み: {stats.knownWords}</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-4 h-4 bg-yellow-500 rounded"></div>
              <span className="text-sm text-gray-700">学習中: {stats.learningWords}</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-4 h-4 bg-red-500 rounded"></div>
              <span className="text-sm text-gray-700">未学習: {stats.unknownWords}</span>
            </div>
          </div>
        </div>

        {/* Weekly Activity */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">今週の活動</h2>
          
          <div className="grid gap-4 md:grid-cols-7">
            {['月', '火', '水', '木', '金', '土', '日'].map((day, index) => (
              <div key={day} className="text-center">
                <div className="text-sm text-gray-600 mb-2">{day}</div>
                <div className="w-full h-20 bg-gray-100 rounded flex items-end justify-center p-1">
                  <div 
                    className="w-full bg-blue-500 rounded"
                    style={{ height: `${Math.random() * 80 + 10}%` }}
                  ></div>
                </div>
                <div className="text-xs text-gray-500 mt-1">{Math.floor(Math.random() * 20)}</div>
              </div>
            ))}
          </div>
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
            
            <div className="text-center p-4 bg-gray-100 border border-gray-300 rounded-lg opacity-50">
              <div className="text-3xl mb-2">🌟</div>
              <div className="text-sm font-medium text-gray-500">マスター</div>
              <div className="text-xs text-gray-400">100個の単語を習得</div>
            </div>
          </div>
        </div>

        {/* Coming Soon */}
        <div className="mt-8 text-center py-12 bg-gray-50 rounded-lg">
          <div className="text-6xl mb-4">📊</div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">詳細な進捗分析は実装中です</h3>
          <p className="text-gray-500">
            より詳細な学習分析とレポート機能を次のタスクで実装予定です。
          </p>
        </div>
      </div>
    </div>
  );
}