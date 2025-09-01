import fetch from 'node-fetch';

export interface DictionaryDefinition {
  word: string;
  phonetic?: string;
  phonetics: Array<{
    text?: string;
    audio?: string;
  }>;
  meanings: Array<{
    partOfSpeech: string;
    definitions: Array<{
      definition: string;
      example?: string;
      synonyms?: string[];
      antonyms?: string[];
    }>;
  }>;
  sourceUrls?: string[];
}

export interface SimplifiedDefinition {
  word: string;
  pronunciation?: string;
  definitions: Array<{
    partOfSpeech: string;
    definition: string;
    example?: string;
  }>;
  audioUrl?: string;
}

export class DictionaryService {
  private static readonly FREE_DICTIONARY_API_BASE = 'https://api.dictionaryapi.dev/api/v2/entries/en';
  private static readonly REQUEST_TIMEOUT = 10000; // 10 seconds

  /**
   * Get word definition from Free Dictionary API
   * @param word The word to look up
   * @returns Promise<SimplifiedDefinition | null>
   */
  static async getDefinition(word: string): Promise<SimplifiedDefinition | null> {
    try {
      if (!word || typeof word !== 'string' || word.trim().length === 0) {
        throw new Error('Invalid word parameter');
      }

      const normalizedWord = word.toLowerCase().trim();
      const url = `${DictionaryService.FREE_DICTIONARY_API_BASE}/${encodeURIComponent(normalizedWord)}`;

      console.log(`Fetching definition for word: ${normalizedWord}`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), DictionaryService.REQUEST_TIMEOUT);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Bluesky-LangApp/1.0.0',
          'Accept': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 404) {
          console.log(`Word not found in dictionary: ${normalizedWord}`);
          return null;
        }
        throw new Error(`Dictionary API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as DictionaryDefinition[];
      
      if (!Array.isArray(data) || data.length === 0) {
        console.log(`No definitions found for word: ${normalizedWord}`);
        return null;
      }

      // Use the first entry (most common)
      const entry = data[0];
      
      // Extract pronunciation
      let pronunciation: string | undefined;
      if (entry.phonetic) {
        pronunciation = entry.phonetic;
      } else if (entry.phonetics && entry.phonetics.length > 0) {
        pronunciation = entry.phonetics.find(p => p.text)?.text;
      }

      // Extract audio URL
      let audioUrl: string | undefined;
      if (entry.phonetics && entry.phonetics.length > 0) {
        audioUrl = entry.phonetics.find(p => p.audio)?.audio;
      }

      // Extract definitions
      const definitions: SimplifiedDefinition['definitions'] = [];
      
      for (const meaning of entry.meanings) {
        const partOfSpeech = meaning.partOfSpeech;
        
        // Take up to 3 definitions per part of speech to avoid overwhelming the user
        const meaningDefinitions = meaning.definitions.slice(0, 3);
        
        for (const def of meaningDefinitions) {
          definitions.push({
            partOfSpeech,
            definition: def.definition,
            example: def.example,
          });
        }
      }

      if (definitions.length === 0) {
        console.log(`No usable definitions found for word: ${normalizedWord}`);
        return null;
      }

      const result: SimplifiedDefinition = {
        word: entry.word || normalizedWord,
        pronunciation,
        definitions,
        audioUrl,
      };

      console.log(`Successfully fetched definition for word: ${normalizedWord}`);
      return result;

    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          console.error(`Dictionary API request timeout for word: ${word}`);
          throw new Error('Dictionary service timeout');
        }
        console.error(`Dictionary service error for word "${word}":`, error.message);
        throw new Error(`Failed to fetch definition: ${error.message}`);
      }
      console.error(`Unknown dictionary service error for word "${word}":`, error);
      throw new Error('Unknown dictionary service error');
    }
  }

  /**
   * Check if the dictionary service is available
   * @returns Promise<boolean>
   */
  static async isServiceAvailable(): Promise<boolean> {
    try {
      // Test with a common word
      const result = await DictionaryService.getDefinition('test');
      return result !== null;
    } catch (error) {
      console.error('Dictionary service availability check failed:', error);
      return false;
    }
  }
}

export default DictionaryService;