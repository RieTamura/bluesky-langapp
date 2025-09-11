import React, { useState, useEffect } from 'react';
import { Badge } from '../ui';
import { ListFilter } from '../icons';

interface Word {
  id: string;
  word: string;
  meaning?: string;
  status: 'unknown' | 'learning' | 'known';
  createdAt: string;
  lastReviewed?: string;
}

export default function WordsContent() {
  const [words, setWords] = useState<Word[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'unknown' | 'learning' | 'known'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    // Check if user is authenticated before loading words
    const sessionId = localStorage.getItem('sessionId');
    if (sessionId) {
      loadWords();
    } else {
      setIsLoading(false);
      setError('ログインが必要です');
    }
  }, []);

  const loadWords = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const sessionId = localStorage.getItem('sessionId');
      if (!sessionId) {
        throw new Error('認証が必要です');
      }

      const response = await fetch('/api/words', {
        headers: {
          'Authorization': `Bearer ${sessionId}`
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Clear invalid session
          localStorage.removeItem('sessionId');
          localStorage.removeItem('userIdentifier');
          throw new Error('セッションが無効です。再度ログインしてください。');
        }
        throw new Error('単語の取得に失敗しました');
      }

      const data = await response.json();
      // Normalize backend field names to the frontend model so both
      // older and newer API shapes work (definition/date/lastReviewedAt -> meaning/createdAt/lastReviewed)
      const incomingAny = Array.isArray(data?.data) ? data.data : [];

      const allowedStatus = ['known', 'learning', 'unknown'];

      const normalized = (incomingAny as any[])
        .map((w) => {
          const rawId = w?.id ?? w?.key ?? w?._id;
          const id = rawId != null ? String(rawId) : undefined;
          const rawWord = (w && (w.word || w.text || w.label));
          const wordText = rawWord != null ? String(rawWord).trim() : '';
          if (!id || !wordText) return null;

          const meaning = w?.meaning ?? w?.definition ?? w?.description ?? undefined;

          // createdAt: prefer provided values if valid ISO/parsable date, otherwise fallback to now
          const createdRaw = w?.createdAt ?? w?.date ?? w?.firstEncounteredAt;
          let createdAt: string;
          if (createdRaw) {
            const parsed = Date.parse(String(createdRaw));
            createdAt = isNaN(parsed) ? new Date().toISOString() : new Date(parsed).toISOString();
          } else {
            createdAt = new Date().toISOString();
          }

          // lastReviewed: only set when valid, otherwise undefined
          const lastRaw = w?.lastReviewed ?? w?.lastReviewedAt;
          let lastReviewed: string | undefined = undefined;
          if (lastRaw) {
            const parsed = Date.parse(String(lastRaw));
            if (!isNaN(parsed)) lastReviewed = new Date(parsed).toISOString();
            else lastReviewed = undefined;
          }

          const rawStatus = String(w?.status ?? '').toLowerCase();
          const status = allowedStatus.includes(rawStatus) ? (rawStatus as Word['status']) : 'unknown';

          return {
            id,
            word: wordText,
            meaning,
            status,
            createdAt,
            lastReviewed
          } as Word;
        })
        .filter((x): x is Word => !!x);

      setWords(normalized);
    } catch (err) {
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredWords = words.filter(word => {
    const matchesFilter = filter === 'all' || word.status === filter;
    const matchesSearch = word.word.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (word.meaning && word.meaning.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  const getStatusCount = (status: 'unknown' | 'learning' | 'known') => {
    return words.filter(word => word.status === status).length;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">単語を読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    const isAuthError = error.includes('ログイン') || error.includes('認証') || error.includes('セッション');
    
    return (
      <div className="p-6 text-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-red-800 mb-2">
            {isAuthError ? 'ログインが必要です' : 'エラーが発生しました'}
          </h3>
          <p className="text-red-700 mb-4">{error}</p>
          <div className="space-x-3">
            {isAuthError ? (
              <a 
                href="/"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors inline-block"
              >
                ログインページへ
              </a>
            ) : (
              <button 
                onClick={loadWords}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md transition-colors"
              >
                再試行
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="sticky top-14 bg-white border-b border-gray-200 z-40 p-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900">単語帳</h1>
          <button
            onClick={loadWords}
            className="flex items-center space-x-2 px-3 py-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
            </svg>
            <span>更新</span>
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-lg font-semibold text-gray-900">{words.length}</div>
            <div className="text-sm text-gray-600">総単語数</div>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <div className="text-lg font-semibold text-red-600">{getStatusCount('unknown')}</div>
            <div className="text-sm text-gray-600">未学習</div>
          </div>
          <div className="text-center p-3 bg-yellow-50 rounded-lg">
            <div className="text-lg font-semibold text-yellow-600">{getStatusCount('learning')}</div>
            <div className="text-sm text-gray-600">学習中</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-lg font-semibold text-green-600">{getStatusCount('known')}</div>
            <div className="text-sm text-gray-600">習得済み</div>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="単語を検索..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {/* Filter icon button (Lucide list-filter) */}
          <div className="flex items-center">
            <button
              type="button"
              title="フィルター"
              onClick={() => { /* 将来的なフィルター表示トグル用。今はダミー */ }}
              className="p-2 rounded-md hover:bg-gray-100 transition-colors"
              aria-label="フィルター"
            >
              <ListFilter size={18} className="text-gray-600" />
            </button>
          </div>
          <div className="flex space-x-2">
            {(['all', 'unknown', 'learning', 'known'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  filter === status
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status === 'all' ? 'すべて' : 
                 status === 'unknown' ? '未学習' :
                 status === 'learning' ? '学習中' : '習得済み'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Words List */}
      <div className="p-4">
        {filteredWords.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C20.168 18.477 18.582 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm || filter !== 'all' ? '該当する単語がありません' : '単語がありません'}
            </h3>
            <p className="text-gray-600">
              {searchTerm || filter !== 'all' 
                ? '検索条件を変更してみてください' 
                : '投稿から単語をクリックして追加しましょう'
              }
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredWords.map((word) => (
              <div
                key={word.id}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => openWordDetail(word.word)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{word.word}</h3>
                      <Badge variant={word.status}>
                        {word.status === 'unknown' ? '未学習' :
                         word.status === 'learning' ? '学習中' : '習得済み'}
                      </Badge>
                    </div>
                    {word.meaning && (
                      <p className="text-gray-600 mb-2">{word.meaning}</p>
                    )}
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span>追加日: {new Date(word.createdAt).toLocaleDateString('ja-JP')}</span>
                      {word.lastReviewed && (
                        <span>最終復習: {new Date(word.lastReviewed).toLocaleDateString('ja-JP')}</span>
                      )}
                    </div>
                  </div>
                  <div className="ml-4">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                    </svg>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  function openWordDetail(word: string) {
    window.dispatchEvent(new CustomEvent('openWordDetail', { detail: { word } }));
  }
}