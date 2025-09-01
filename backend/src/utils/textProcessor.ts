/**
 * Text processing utilities for extracting and analyzing words from posts
 */

export interface ProcessedWord {
  text: string;
  startIndex: number;
  endIndex: number;
  isWord: boolean;
}

/**
 * Simple word extraction from text (splits by whitespace and punctuation)
 * This is a basic implementation - can be enhanced with more sophisticated NLP
 */
export function extractWords(text: string): ProcessedWord[] {
  const words: ProcessedWord[] = [];
  const wordRegex = /\b\w+\b/g;
  let match;

  while ((match = wordRegex.exec(text)) !== null) {
    words.push({
      text: match[0].toLowerCase(),
      startIndex: match.index,
      endIndex: match.index + match[0].length,
      isWord: true
    });
  }

  return words;
}

/**
 * Clean and normalize a word for storage/comparison
 */
export function normalizeWord(word: string): string {
  return word.toLowerCase().trim().replace(/[^\w]/g, '');
}

/**
 * Check if a string is likely to be a meaningful word
 * (filters out very short words, numbers, etc.)
 */
export function isValidWord(word: string): boolean {
  const normalized = normalizeWord(word);
  
  // Filter out very short words, numbers, and common stop words
  if (normalized.length < 2) return false;
  if (/^\d+$/.test(normalized)) return false;
  
  // Basic stop words (can be expanded)
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 
    'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 
    'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
    'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
    'my', 'your', 'his', 'her', 'its', 'our', 'their', 'this', 'that', 'these', 'those'
  ]);
  
  return !stopWords.has(normalized);
}

/**
 * Extract meaningful words from text, filtering out stop words and invalid words
 */
export function extractMeaningfulWords(text: string): string[] {
  const allWords = extractWords(text);
  return allWords
    .map(w => w.text)
    .filter(word => isValidWord(word))
    .filter((word, index, array) => array.indexOf(word) === index); // Remove duplicates
}

export default {
  extractWords,
  normalizeWord,
  isValidWord,
  extractMeaningfulWords
};