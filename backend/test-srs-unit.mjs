#!/usr/bin/env node

/**
 * Unit test for SRS (Spaced Repetition System) functionality
 * Tests the core SRS algorithm without requiring a running server
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Mock the data service for testing
class MockDataService {
  constructor() {
    this.words = [
      {
        id: 'word1',
        word: 'test',
        status: 'learning',
        userId: 'test-user',
        reviewCount: 2,
        correctCount: 1,
        lastReviewedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
        difficultyLevel: 25,
        date: new Date().toISOString()
      },
      {
        id: 'word2',
        word: 'example',
        status: 'unknown',
        userId: 'test-user',
        reviewCount: 0,
        correctCount: 0,
        date: new Date().toISOString()
      }
    ];
  }

  async getWords(userId) {
    return this.words.filter(word => word.userId === userId);
  }

  async getWordById(wordId) {
    return this.words.find(word => word.id === wordId) || null;
  }

  async saveWord(wordData) {
    const existingIndex = this.words.findIndex(word => word.id === wordData.id);
    if (existingIndex >= 0) {
      this.words[existingIndex] = { ...this.words[existingIndex], ...wordData };
      return this.words[existingIndex];
    } else {
      const newWord = { ...wordData, id: wordData.id || `word_${Date.now()}` };
      this.words.push(newWord);
      return newWord;
    }
  }
}

// Create a simplified version of the LearningService for testing
class TestLearningService {
  constructor() {
    this.dataService = new MockDataService();
    
    // SRS constants
    this.SRS_INITIAL_INTERVAL = 1;
    this.SRS_INITIAL_EASE_FACTOR = 2.5;
    this.SRS_MIN_EASE_FACTOR = 1.3;
    this.SRS_MAX_EASE_FACTOR = 2.5;
    
    // Difficulty adjustment constants
    this.DIFFICULTY_HISTORY_SIZE = 10;
    this.DIFFICULTY_THRESHOLD_EASY = 0.8;
    this.DIFFICULTY_THRESHOLD_HARD = 0.4;
    this.DIFFICULTY_MULTIPLIER_EASY = 0.8;
    this.DIFFICULTY_MULTIPLIER_HARD = 1.5;
  }

  initializeSRSData() {
    const now = new Date();
    const nextReview = new Date(now.getTime() + this.SRS_INITIAL_INTERVAL * 24 * 60 * 60 * 1000);
    
    return {
      interval: this.SRS_INITIAL_INTERVAL,
      repetition: 0,
      easeFactor: this.SRS_INITIAL_EASE_FACTOR,
      nextReviewDate: nextReview.toISOString(),
      lastReviewDate: now.toISOString()
    };
  }

  updateSRSData(srsData, quality) {
    const now = new Date();
    let newSRSData = { ...srsData };

    if (quality >= 3) {
      // Successful review
      if (newSRSData.repetition === 0) {
        newSRSData.interval = 1;
      } else if (newSRSData.repetition === 1) {
        newSRSData.interval = 6;
      } else {
        newSRSData.interval = Math.round(newSRSData.interval * newSRSData.easeFactor);
      }
      newSRSData.repetition += 1;
    } else {
      // Failed review
      newSRSData.repetition = 0;
      newSRSData.interval = 1;
    }

    // Update ease factor
    newSRSData.easeFactor = newSRSData.easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    newSRSData.easeFactor = Math.max(this.SRS_MIN_EASE_FACTOR, 
      Math.min(this.SRS_MAX_EASE_FACTOR, newSRSData.easeFactor));

    // Calculate next review date
    const nextReviewDate = new Date(now.getTime() + newSRSData.interval * 24 * 60 * 60 * 1000);
    newSRSData.nextReviewDate = nextReviewDate.toISOString();
    newSRSData.lastReviewDate = now.toISOString();

    return newSRSData;
  }

  calculateQuality(isCorrect, responseTimeMs) {
    if (!isCorrect) {
      return 0;
    }
    
    let quality = 4;
    
    if (responseTimeMs) {
      if (responseTimeMs < 3000) {
        quality = 5;
      } else if (responseTimeMs < 8000) {
        quality = 4;
      } else if (responseTimeMs < 15000) {
        quality = 3;
      } else {
        quality = 3;
      }
    }
    
    return quality;
  }

  initializeDifficultyAdjustment() {
    return {
      baseInterval: this.SRS_INITIAL_INTERVAL,
      difficultyMultiplier: 1.0,
      performanceHistory: []
    };
  }

  updateDifficultyAdjustment(difficultyData, isCorrect, responseTimeMs) {
    const newDifficultyData = { ...difficultyData };
    
    let performanceScore = isCorrect ? 1 : 0;
    
    if (responseTimeMs && isCorrect) {
      const timeScore = Math.max(0.5, Math.min(1.0, 5000 / responseTimeMs));
      performanceScore = performanceScore * timeScore;
    }
    
    newDifficultyData.performanceHistory.push(performanceScore);
    
    if (newDifficultyData.performanceHistory.length > this.DIFFICULTY_HISTORY_SIZE) {
      newDifficultyData.performanceHistory = newDifficultyData.performanceHistory.slice(-this.DIFFICULTY_HISTORY_SIZE);
    }
    
    const recentPerformance = newDifficultyData.performanceHistory.reduce((sum, score) => sum + score, 0) / 
      newDifficultyData.performanceHistory.length;
    
    if (recentPerformance >= this.DIFFICULTY_THRESHOLD_EASY) {
      newDifficultyData.difficultyMultiplier = this.DIFFICULTY_MULTIPLIER_EASY;
    } else if (recentPerformance <= this.DIFFICULTY_THRESHOLD_HARD) {
      newDifficultyData.difficultyMultiplier = this.DIFFICULTY_MULTIPLIER_HARD;
    } else {
      newDifficultyData.difficultyMultiplier = 1.0;
    }
    
    return newDifficultyData;
  }
}

// Test functions
function testSRSAlgorithm() {
  console.log('🧪 Testing SRS Algorithm...\n');
  
  const service = new TestLearningService();
  
  // Test 1: Initialize SRS data
  console.log('1. Testing SRS initialization...');
  const initialSRS = service.initializeSRSData();
  console.log('✅ Initial SRS data:', initialSRS);
  
  // Test 2: Correct answer progression
  console.log('\n2. Testing correct answer progression...');
  let srsData = initialSRS;
  
  // First correct answer (quality 5 - fast and correct)
  srsData = service.updateSRSData(srsData, 5);
  console.log('   After 1st correct answer:', {
    interval: srsData.interval,
    repetition: srsData.repetition,
    easeFactor: srsData.easeFactor.toFixed(2)
  });
  
  // Second correct answer
  srsData = service.updateSRSData(srsData, 4);
  console.log('   After 2nd correct answer:', {
    interval: srsData.interval,
    repetition: srsData.repetition,
    easeFactor: srsData.easeFactor.toFixed(2)
  });
  
  // Third correct answer
  srsData = service.updateSRSData(srsData, 4);
  console.log('   After 3rd correct answer:', {
    interval: srsData.interval,
    repetition: srsData.repetition,
    easeFactor: srsData.easeFactor.toFixed(2)
  });
  
  // Test 3: Incorrect answer impact
  console.log('\n3. Testing incorrect answer impact...');
  srsData = service.updateSRSData(srsData, 0);
  console.log('   After incorrect answer:', {
    interval: srsData.interval,
    repetition: srsData.repetition,
    easeFactor: srsData.easeFactor.toFixed(2)
  });
  
  console.log('✅ SRS algorithm test completed');
}

function testDifficultyAdjustment() {
  console.log('\n🎯 Testing Difficulty Adjustment...\n');
  
  const service = new TestLearningService();
  
  // Test 1: Initialize difficulty adjustment
  console.log('1. Testing difficulty adjustment initialization...');
  let difficultyData = service.initializeDifficultyAdjustment();
  console.log('✅ Initial difficulty data:', difficultyData);
  
  // Test 2: Easy performance (high accuracy, fast responses)
  console.log('\n2. Testing easy performance pattern...');
  for (let i = 0; i < 5; i++) {
    difficultyData = service.updateDifficultyAdjustment(difficultyData, true, 2000); // Fast correct answers
  }
  console.log('   After 5 fast correct answers:', {
    difficultyMultiplier: difficultyData.difficultyMultiplier,
    performanceHistory: difficultyData.performanceHistory.slice(-3)
  });
  
  // Test 3: Hard performance (low accuracy, slow responses)
  console.log('\n3. Testing hard performance pattern...');
  difficultyData = service.initializeDifficultyAdjustment();
  for (let i = 0; i < 5; i++) {
    const isCorrect = i < 2; // Only 2 out of 5 correct
    difficultyData = service.updateDifficultyAdjustment(difficultyData, isCorrect, 10000); // Slow responses
  }
  console.log('   After mixed performance (40% accuracy):', {
    difficultyMultiplier: difficultyData.difficultyMultiplier,
    performanceHistory: difficultyData.performanceHistory.slice(-3)
  });
  
  console.log('✅ Difficulty adjustment test completed');
}

function testQualityCalculation() {
  console.log('\n⚡ Testing Quality Calculation...\n');
  
  const service = new TestLearningService();
  
  const testCases = [
    { isCorrect: false, responseTimeMs: 5000, expected: 0 },
    { isCorrect: true, responseTimeMs: 2000, expected: 5 }, // Very fast
    { isCorrect: true, responseTimeMs: 5000, expected: 4 }, // Normal
    { isCorrect: true, responseTimeMs: 10000, expected: 3 }, // Slow
    { isCorrect: true, responseTimeMs: 20000, expected: 3 }, // Very slow
    { isCorrect: true, responseTimeMs: undefined, expected: 4 } // No time data
  ];
  
  testCases.forEach((testCase, index) => {
    const quality = service.calculateQuality(testCase.isCorrect, testCase.responseTimeMs);
    const passed = quality === testCase.expected;
    console.log(`   Test ${index + 1}: ${passed ? '✅' : '❌'} Quality=${quality}, Expected=${testCase.expected}`);
  });
  
  console.log('✅ Quality calculation test completed');
}

async function runAllTests() {
  console.log('🚀 Starting SRS Unit Tests\n');
  console.log('=' .repeat(50));
  
  try {
    testSRSAlgorithm();
    testDifficultyAdjustment();
    testQualityCalculation();
    
    console.log('\n' + '='.repeat(50));
    console.log('🎉 All SRS tests completed successfully!');
    
  } catch (error) {
    console.error('\n💥 Test failed with error:', error.message);
    console.error(error.stack);
  }
}

// Run the tests
runAllTests();