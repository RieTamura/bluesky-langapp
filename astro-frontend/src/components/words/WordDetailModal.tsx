import React, { useState, useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { sharedStore, closeWordModal, addNotification } from '../../stores/shared';
import { saveWord } from '../../stores/words';
import { apiService } from '../../services/api';

interface WordDefinition {
  word: string;
  pronunciation?: string;
  audioUrl?: string;
  definitions: Array<{
    partOfSpeech: string;
    definition: string;
    example?: string;
  }>;
}

export default function WordDetailModal() {
  const shared = useStore(sharedStore);
  const [definition, setDefinition] = useState<WordDefinition | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDefinition = async (word: string) => {
    setIsLoading(true);
    setError(null);
    setDefinition(null);

    try {
      const data = await apiService.getWordDefinition(word);
      
      if (data.success && data.data) {
        setDefinition(data.data);
      } else {
        setError(data.message || '辞書に定義が見つかりませんでした');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '定義の取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveWord = async (status: 'unknown' | 'learning' | 'known') => {
    if (!shared.selectedWord) return;

    const success = await saveWord(shared.selectedWord, status);
    
    if (success) {
      addNotification(`単語「${shared.selectedWord}」を${
        status === 'learning' ? '学習中' : 
        status === 'known' ? '既知' : '未知'
      }として保存しました`, 'success');
      closeWordModal();
    } else {
      addNotification('単語の保存に失敗しました', 'error');
    }
  };

  const playAudio = (audioUrl: string) => {
    const audio = new Audio(audioUrl);
    audio.play().catch(console.error);
  };

  useEffect(() => {
    if (shared.showWordModal && shared.selectedWord) {
      fetchDefinition(shared.selectedWord);
    }
  }, [shared.showWordModal, shared.selectedWord]);

  if (!shared.showWordModal || !shared.selectedWord) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-gray-50 rounded-t-lg">
          <div className="flex-1 pr-12">
            <h3 className="text-3xl font-semibold text-gray-900 leading-tight">
              {shared.selectedWord}
            </h3>
          </div>
          <button
            onClick={closeWordModal}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors p-1 rounded"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">定義を取得中...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {definition && (
            <div>
              {definition.pronunciation && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200 flex items-center gap-2">
                  <strong className="text-gray-700">発音:</strong>
                  <span className="text-gray-800">{definition.pronunciation}</span>
                  {definition.audioUrl && (
                    <button
                      onClick={() => playAudio(definition.audioUrl!)}
                      className="ml-2 text-blue-600 hover:text-blue-800 transition-colors p-1 rounded"
                      title="音声を再生"
                    >
                      🔊
                    </button>
                  )}
                </div>
              )}

              <div>
                <h4 className="text-lg font-semibold text-gray-800 mb-4">意味:</h4>
                <div className="space-y-4">
                  {definition.definitions.map((def, index) => (
                    <div key={index} className="p-4 bg-gray-50 rounded-lg border-l-4 border-blue-500">
                      <div className="text-sm font-semibold text-blue-600 uppercase tracking-wide mb-2">
                        {def.partOfSpeech}
                      </div>
                      <div className="text-gray-800 leading-relaxed mb-2">
                        {def.definition}
                      </div>
                      {def.example && (
                        <div className="text-gray-600 italic text-sm pt-2 border-t border-gray-200">
                          例: {def.example}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6 bg-gray-50 rounded-b-lg text-center">
          <h4 className="font-semibold text-gray-800 mb-4">学習状況:</h4>
          <div className="flex gap-3 justify-center flex-wrap mb-4">
            <button
              onClick={() => handleSaveWord('unknown')}
              className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-full font-medium hover:bg-gray-50 hover:border-gray-400 transition-colors uppercase tracking-wide text-sm"
            >
              未知
            </button>
            <button
              onClick={() => handleSaveWord('learning')}
              className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-full font-medium hover:bg-gray-50 hover:border-gray-400 transition-colors uppercase tracking-wide text-sm"
            >
              学習中
            </button>
            <button
              onClick={() => handleSaveWord('known')}
              className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-full font-medium hover:bg-gray-50 hover:border-gray-400 transition-colors uppercase tracking-wide text-sm"
            >
              既知
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}