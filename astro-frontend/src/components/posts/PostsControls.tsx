import React from 'react';

interface PostsControlsProps {
  currentLimit: number;
  onLimitChange: (limit: number) => void;
}

export default function PostsControls({ currentLimit, onLimitChange }: PostsControlsProps) {
  return (
    <div className="bg-gray-50 p-3 md:p-4 rounded-md border border-gray-200 mb-4 md:mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <label htmlFor="postsLimit" className="text-sm font-medium text-gray-700">
          取得件数
        </label>
        <div className="w-full sm:w-auto sm:max-w-48">
          <select
            id="postsLimit"
            value={currentLimit}
            onChange={(e) => onLimitChange(Number(e.target.value))}
            className="w-full px-3 py-2.5 md:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base md:text-sm"
          >
            <option value={5}>5件</option>
            <option value={10}>10件</option>
            <option value={20}>20件</option>
            <option value={50}>50件</option>
          </select>
        </div>
      </div>
    </div>
  );
}