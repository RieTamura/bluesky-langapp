import React from 'react';
import { selectWord } from '../../stores/shared';

interface WordHighlighterProps {
  text: string;
  extractedWords: string[];
}

export default function WordHighlighter({ text, extractedWords }: WordHighlighterProps) {
  const getWordStatus = (word: string): 'unknown' | 'learning' | 'known' => {
    const userIdentifier = localStorage.getItem('userIdentifier');
    const storageKey = userIdentifier ? `savedWords_${userIdentifier}` : 'savedWords';
    const savedWords = JSON.parse(localStorage.getItem(storageKey) || '{}');
    const wordData = savedWords[word.toLowerCase()];
    
    if (!wordData) {
      return 'unknown';
    }
    
    // Handle both old string format and new object format
    if (typeof wordData === 'string') {
      return wordData as 'unknown' | 'learning' | 'known';
    } else if (typeof wordData === 'object' && wordData.status) {
      return wordData.status;
    }
    
    return 'unknown';
  };

  const escapeHtml = (text: string): string => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  };

  const escapeRegex = (text: string): string => {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };

  const highlightWords = (text: string, extractedWords: string[]): string => {
    if (!extractedWords || extractedWords.length === 0) {
      return escapeHtml(text);
    }

    let highlightedText = escapeHtml(text);
    
    // Sort words by length (longest first) to avoid partial matches
    const sortedWords = [...extractedWords].sort((a, b) => b.length - a.length);
    
    sortedWords.forEach(word => {
      const escapedWord = escapeRegex(word);
      const regex = new RegExp(`\\b${escapedWord}\\b`, 'gi');
      const wordStatus = getWordStatus(word.toLowerCase());
      
      highlightedText = highlightedText.replace(regex, (match) => {
        return `<span class="word-highlight word-${wordStatus} px-1 py-0.5 rounded cursor-pointer font-medium transition-all hover:-translate-y-0.5 hover:shadow-sm" data-word="${escapeHtml(word.toLowerCase())}">${match}</span>`;
      });
    });

    return highlightedText;
  };

  const handleWordClick = async (word: string) => {
    selectWord(word);
  };

  React.useEffect(() => {
    const wordHighlights = document.querySelectorAll('.word-highlight');
    
    const handleClick = (e: Event) => {
      const target = e.target as HTMLElement;
      const word = target.dataset.word;
      if (word) {
        handleWordClick(word);
      }
    };

    wordHighlights.forEach(element => {
      element.addEventListener('click', handleClick);
    });

    return () => {
      wordHighlights.forEach(element => {
        element.removeEventListener('click', handleClick);
      });
    };
  });

  return (
    <div 
      dangerouslySetInnerHTML={{ 
        __html: highlightWords(text, extractedWords) 
      }}
    />
  );
}