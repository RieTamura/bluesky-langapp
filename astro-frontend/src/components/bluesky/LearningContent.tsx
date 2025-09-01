import React, { useState, useEffect } from 'react';

export default function LearningContent() {
  const [isLoading, setIsLoading] = useState(false);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="sticky top-14 bg-white border-b border-gray-200 z-40 p-4">
        <h1 className="text-2xl font-bold text-gray-900">学習</h1>
        <p className="text-gray-600 mt-1">クイズやフラッシュカードで単語を学習しましょう</p>
      </div>

      {/* Learning Options */}
      <div className="p-6">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Flashcards */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">🃏</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">フラッシュカード</h3>
                <p className="text-sm text-gray-600">単語と意味を覚える</p>
              </div>
            </div>
            <p className="text-gray-700 mb-4">
              単語カードを使って効率的に語彙を増やしましょう。
            </p>
            <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md transition-colors">
              開始する
            </button>
          </div>

          {/* Quiz */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">❓</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">クイズ</h3>
                <p className="text-sm text-gray-600">理解度をテスト</p>
              </div>
            </div>
            <p className="text-gray-700 mb-4">
              選択式クイズで学習した単語の理解度を確認しましょう。
            </p>
            <button className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-md transition-colors">
              開始する
            </button>
          </div>

          {/* Review */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">🔄</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">復習</h3>
                <p className="text-sm text-gray-600">忘れかけた単語を再学習</p>
              </div>
            </div>
            <p className="text-gray-700 mb-4">
              間隔反復学習で長期記憶に定着させましょう。
            </p>
            <button className="w-full bg-yellow-600 hover:bg-yellow-700 text-white py-2 px-4 rounded-md transition-colors">
              開始する
            </button>
          </div>
        </div>

        {/* Today's Learning */}
        <div className="mt-8 bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">今日の学習目標</h2>
          
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">5</div>
              <div className="text-sm text-gray-600">新しい単語</div>
              <div className="mt-2 bg-blue-200 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full" style={{ width: '60%' }}></div>
              </div>
              <div className="text-xs text-gray-500 mt-1">3/5 完了</div>
            </div>
            
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">10</div>
              <div className="text-sm text-gray-600">復習単語</div>
              <div className="mt-2 bg-green-200 rounded-full h-2">
                <div className="bg-green-600 h-2 rounded-full" style={{ width: '80%' }}></div>
              </div>
              <div className="text-xs text-gray-500 mt-1">8/10 完了</div>
            </div>
            
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">15</div>
              <div className="text-sm text-gray-600">学習時間（分）</div>
              <div className="mt-2 bg-purple-200 rounded-full h-2">
                <div className="bg-purple-600 h-2 rounded-full" style={{ width: '40%' }}></div>
              </div>
              <div className="text-xs text-gray-500 mt-1">6/15 分</div>
            </div>
          </div>
        </div>

        {/* Coming Soon */}
        <div className="mt-8 text-center py-12 bg-gray-50 rounded-lg">
          <div className="text-6xl mb-4">🚧</div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">学習機能は実装中です</h3>
          <p className="text-gray-500">
            フラッシュカード、クイズ、復習機能を次のタスクで実装予定です。
          </p>
        </div>
      </div>
    </div>
  );
}