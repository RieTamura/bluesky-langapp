import React from 'react';

export default function WordLegend() {
  return (
    <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
      <h4 className="font-semibold text-gray-800 mb-3">単語の色分け</h4>
      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <span className="word-unknown px-2 py-1 rounded text-sm font-medium bg-red-100 text-red-700 border border-red-200">
            未知
          </span>
          <span className="text-sm text-gray-600">クリックして保存</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="word-learning px-2 py-1 rounded text-sm font-medium bg-yellow-100 text-yellow-700 border border-yellow-200">
            学習中
          </span>
          <span className="text-sm text-gray-600">学習中の単語</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="word-known px-2 py-1 rounded text-sm font-medium bg-green-100 text-green-700 border border-green-200">
            既知
          </span>
          <span className="text-sm text-gray-600">習得済みの単語</span>
        </div>
      </div>
    </div>
  );
}