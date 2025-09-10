import BlueskyService from './blueskyService.js';
import DataService from './dataService.js';
import type { WordData, UserData } from '../types/data.js';
import { generateId } from '../utils/dataUtils.js';

export interface LearningProgressPost {
  id: string;
  userId: string;
  type: 'milestone' | 'daily_summary' | 'achievement' | 'streak' | 'custom';
  content: string;
  metadata: {
    wordsLearned?: number;
    totalWords?: number;
    streak?: number;
    milestone?: string;
    studyTime?: number;
    accuracy?: number;
    newWords?: string[];
    masteredWords?: string[];
  };
  createdAt: string;
  postedAt?: string;
  blueskyUri?: string;
  blueskySuccess?: boolean;
  error?: string;
}

export interface SharedLearningData {
  format: 'bluesky-langapp-v1';
  metadata: {
    sharedAt: string;
    userId: string;
    userName?: string;
    appVersion: string;
    dataVersion: string;
  };
  summary: {
    totalWords: number;
    knownWords: number;
    learningWords: number;
    unknownWords: number;
    studyStreak: number;
    totalStudyDays: number;
    averageAccuracy: number;
    lastStudyDate: string;
  };
  recentProgress: {
    date: string;
    wordsStudied: number;
    newWords: number;
    masteredWords: number;
    accuracy: number;
  }[];
  achievements: {
    type: 'milestone' | 'streak' | 'accuracy' | 'consistency';
    title: string;
    description: string;
    achievedAt: string;
    value: number;
  }[];
  vocabulary?: {
    word: string;
    status: 'learning' | 'known';
    addedAt: string;
    masteredAt?: string;
    reviewCount: number;
    accuracy: number;
  }[];
}

export interface PostTemplate {
  type: LearningProgressPost['type'];
  template: string;
  variables: string[];
  examples: string[];
}

class ATProtocolService {
  private blueskyService: BlueskyService;
  private dataService: DataService;
  private postHistory: LearningProgressPost[] = [];

  constructor() {
    this.blueskyService = new BlueskyService();
    this.dataService = new DataService();
  }

  /**
   * Initialize with Bluesky credentials
   */
  async initialize(credentials: { identifier: string; password: string }): Promise<void> {
    await this.blueskyService.login(credentials);
  }

  /**
   * Generate learning progress post content
   */
  private generateProgressPost(
    type: LearningProgressPost['type'],
    metadata: LearningProgressPost['metadata'],
    user?: UserData
  ): string {
    const templates = this.getPostTemplates();
    const template = templates.find(t => t.type === type);
    
    if (!template) {
      throw new Error(`No template found for post type: ${type}`);
    }

    let content = template.template;
    const userName = user?.displayName || user?.blueskyId || 'Language learner';

    // Replace variables in template
    content = content.replace(/\{userName\}/g, userName);
    content = content.replace(/\{wordsLearned\}/g, String(metadata.wordsLearned || 0));
    content = content.replace(/\{totalWords\}/g, String(metadata.totalWords || 0));
    content = content.replace(/\{streak\}/g, String(metadata.streak || 0));
    content = content.replace(/\{milestone\}/g, metadata.milestone || '');
    content = content.replace(/\{studyTime\}/g, String(metadata.studyTime || 0));
    content = content.replace(/\{accuracy\}/g, String(Math.round((metadata.accuracy || 0) * 100)));
    content = content.replace(/\{newWordsCount\}/g, String(metadata.newWords?.length || 0));
    content = content.replace(/\{masteredWordsCount\}/g, String(metadata.masteredWords?.length || 0));

    // Add hashtags
    content += '\n\n#LanguageLearning #BlueskyLangApp #Vocabulary';

    // Add new words if available (limit to avoid character limit)
    if (metadata.newWords && metadata.newWords.length > 0) {
      const wordsToShow = metadata.newWords.slice(0, 5);
      content += `\n\nNew words: ${wordsToShow.join(', ')}`;
      if (metadata.newWords.length > 5) {
        content += ` (+${metadata.newWords.length - 5} more)`;
      }
    }

    return content;
  }

  /**
   * Get post templates for different types of progress updates
   */
  private getPostTemplates(): PostTemplate[] {
    return [
      {
        type: 'milestone',
        template: '🎉 Milestone achieved! I\'ve learned {wordsLearned} words using Bluesky LangApp! {milestone}',
        variables: ['userName', 'wordsLearned', 'milestone'],
        examples: [
          '🎉 Milestone achieved! I\'ve learned 100 words using Bluesky LangApp! First century complete!',
          '🎉 Milestone achieved! I\'ve learned 500 words using Bluesky LangApp! Half a thousand words mastered!'
        ]
      },
      {
        type: 'daily_summary',
        template: '📚 Daily study complete! Studied {wordsLearned} words today with {accuracy}% accuracy. Total vocabulary: {totalWords} words.',
        variables: ['wordsLearned', 'accuracy', 'totalWords'],
        examples: [
          '📚 Daily study complete! Studied 15 words today with 87% accuracy. Total vocabulary: 234 words.',
          '📚 Daily study complete! Studied 8 words today with 92% accuracy. Total vocabulary: 156 words.'
        ]
      },
      {
        type: 'achievement',
        template: '🏆 Achievement unlocked! {milestone} My vocabulary is growing stronger every day!',
        variables: ['milestone'],
        examples: [
          '🏆 Achievement unlocked! Perfect week - 7 days of consistent study! My vocabulary is growing stronger every day!',
          '🏆 Achievement unlocked! Speed learner - 50 words in one week! My vocabulary is growing stronger every day!'
        ]
      },
      {
        type: 'streak',
        template: '🔥 Study streak: {streak} days! Consistency is key to language learning success.',
        variables: ['streak'],
        examples: [
          '🔥 Study streak: 7 days! Consistency is key to language learning success.',
          '🔥 Study streak: 30 days! Consistency is key to language learning success.'
        ]
      },
      {
        type: 'custom',
        template: '{content}',
        variables: ['content'],
        examples: [
          'Just discovered some fascinating words from my Bluesky timeline! Language learning through social media is amazing.',
          'Loving how Bluesky LangApp turns my social media browsing into vocabulary building time!'
        ]
      }
    ];
  }

  /**
   * Create and post learning progress to Bluesky
   */
  async postLearningProgress(
    userId: string,
    type: LearningProgressPost['type'],
    metadata: LearningProgressPost['metadata'],
    customContent?: string
  ): Promise<LearningProgressPost> {
    try {
      // Get user data
      const user = await this.dataService.getUserById(userId);
      
      // Generate post content
      let content: string;
      if (type === 'custom' && customContent) {
        content = customContent;
      } else {
        content = this.generateProgressPost(type, metadata, user || undefined);
      }

      // Create post record
      const post: LearningProgressPost = {
        id: generateId('post'),
        userId,
        type,
        content,
        metadata,
        createdAt: new Date().toISOString()
      };

      try {
        // Post to Bluesky
        const blueskyResponse = await this.blueskyService.createPost(content);
        
        post.postedAt = new Date().toISOString();
        post.blueskyUri = blueskyResponse.uri;
        post.blueskySuccess = true;
        
        console.log('Learning progress posted successfully:', blueskyResponse.uri);
      } catch (error) {
        post.blueskySuccess = false;
        post.error = error instanceof Error ? error.message : 'Unknown error';
        console.error('Failed to post to Bluesky:', error);
      }

      // Store in history
      this.postHistory.push(post);

      return post;
    } catch (error) {
      console.error('Failed to create learning progress post:', error);
      throw error;
    }
  }

  /**
   * Generate shared learning data format
   */
  async generateSharedLearningData(
    userId: string,
    includeVocabulary: boolean = false
  ): Promise<SharedLearningData> {
    try {
      const user = await this.dataService.getUserById(userId);
      const words = await this.dataService.getWords(userId);
      
      if (!user) {
        throw new Error(`User not found: ${userId}`);
      }

      // Calculate statistics
      const knownWords = words.filter(w => w.status === 'known');
      const learningWords = words.filter(w => w.status === 'learning');
      const unknownWords = words.filter(w => w.status === 'unknown');

      // Calculate study streak (simplified - would need learning session data for accuracy)
      const studyDates = words
        .map(w => w.lastReviewedAt || w.date)
        .filter(date => date)
        .map(date => new Date(date).toDateString())
        .filter((date, index, arr) => arr.indexOf(date) === index)
        .sort();

      const studyStreak = this.calculateStudyStreak(studyDates);
      const averageAccuracy = words.reduce((sum, w) => {
        const accuracy = w.reviewCount ? (w.correctCount || 0) / w.reviewCount : 0;
        return sum + accuracy;
      }, 0) / (words.length || 1);

      // Generate recent progress (last 7 days)
      const recentProgress = this.generateRecentProgress(words, 7);

      // Generate achievements
      const achievements = this.generateAchievements(words, studyStreak, averageAccuracy);

      const sharedData: SharedLearningData = {
        format: 'bluesky-langapp-v1',
        metadata: {
          sharedAt: new Date().toISOString(),
          userId: user.id,
          userName: user.displayName,
          appVersion: '1.0.0',
          dataVersion: '1.0.0'
        },
        summary: {
          totalWords: words.length,
          knownWords: knownWords.length,
          learningWords: learningWords.length,
          unknownWords: unknownWords.length,
          studyStreak,
          totalStudyDays: studyDates.length,
          averageAccuracy: Math.round(averageAccuracy * 100) / 100,
          lastStudyDate: studyDates[studyDates.length - 1] || ''
        },
        recentProgress,
        achievements
      };

      // Include vocabulary if requested
      if (includeVocabulary) {
        sharedData.vocabulary = words
          .filter(w => w.status !== 'unknown')
          .map(w => ({
            word: w.word,
            status: w.status as 'learning' | 'known',
            addedAt: w.date,
            masteredAt: w.status === 'known' ? w.lastReviewedAt : undefined,
            reviewCount: w.reviewCount || 0,
            accuracy: w.reviewCount ? (w.correctCount || 0) / w.reviewCount : 0
          }));
      }

      return sharedData;
    } catch (error) {
      console.error('Failed to generate shared learning data:', error);
      throw error;
    }
  }

  /**
   * Calculate study streak from study dates
   */
  private calculateStudyStreak(studyDates: string[]): number {
    if (studyDates.length === 0) return 0;

    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString();
    
    // Check if user studied today or yesterday
    const lastStudyDate = studyDates[studyDates.length - 1];
    if (lastStudyDate !== today && lastStudyDate !== yesterday) {
      return 0;
    }

    // Count consecutive days backwards
    let streak = 0;
    const sortedDates = studyDates.sort().reverse();
    let currentDate = new Date();
    
    for (const studyDate of sortedDates) {
      const studyDateTime = new Date(studyDate);
      const daysDiff = Math.floor((currentDate.getTime() - studyDateTime.getTime()) / (24 * 60 * 60 * 1000));
      
      if (daysDiff === streak) {
        streak++;
        currentDate = studyDateTime;
      } else if (daysDiff > streak) {
        break;
      }
    }

    return streak;
  }

  /**
   * Generate recent progress data
   */
  private generateRecentProgress(words: WordData[], days: number): SharedLearningData['recentProgress'] {
    const progress: SharedLearningData['recentProgress'] = [];
    const today = new Date();

    for (let i = 0; i < days; i++) {
      const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
      const dateString = date.toISOString().split('T')[0];
      
      const dayWords = words.filter(w => {
        const wordDate = new Date(w.lastReviewedAt || w.date).toISOString().split('T')[0];
        return wordDate === dateString;
      });

      const newWords = dayWords.filter(w => {
        const addedDate = new Date(w.date).toISOString().split('T')[0];
        return addedDate === dateString;
      }).length;

      const masteredWords = dayWords.filter(w => {
        const masteredDate = w.lastReviewedAt ? new Date(w.lastReviewedAt).toISOString().split('T')[0] : null;
        return masteredDate === dateString && w.status === 'known';
      }).length;

      const accuracy = dayWords.length > 0 
        ? dayWords.reduce((sum, w) => sum + (w.reviewCount ? (w.correctCount || 0) / w.reviewCount : 0), 0) / dayWords.length
        : 0;

      progress.unshift({
        date: dateString,
        wordsStudied: dayWords.length,
        newWords,
        masteredWords,
        accuracy: Math.round(accuracy * 100) / 100
      });
    }

    return progress;
  }

  /**
   * Generate achievements based on learning data
   */
  private generateAchievements(
    words: WordData[],
    studyStreak: number,
    averageAccuracy: number
  ): SharedLearningData['achievements'] {
    const achievements: SharedLearningData['achievements'] = [];
    const now = new Date().toISOString();

    // Milestone achievements
    const milestones = [10, 25, 50, 100, 250, 500, 1000];
    const totalWords = words.length;
    
    for (const milestone of milestones) {
      if (totalWords >= milestone) {
        achievements.push({
          type: 'milestone',
          title: `${milestone} Words Learned`,
          description: `Reached ${milestone} words in vocabulary`,
          achievedAt: now,
          value: milestone
        });
      }
    }

    // Streak achievements
    const streakMilestones = [3, 7, 14, 30, 60, 100];
    for (const streakMilestone of streakMilestones) {
      if (studyStreak >= streakMilestone) {
        achievements.push({
          type: 'streak',
          title: `${streakMilestone} Day Streak`,
          description: `Studied consistently for ${streakMilestone} days`,
          achievedAt: now,
          value: streakMilestone
        });
      }
    }

    // Accuracy achievements
    if (averageAccuracy >= 0.9) {
      achievements.push({
        type: 'accuracy',
        title: 'Accuracy Master',
        description: 'Maintained 90%+ accuracy',
        achievedAt: now,
        value: Math.round(averageAccuracy * 100)
      });
    }

    // Consistency achievement
    const studyDays = words
      .map(w => new Date(w.lastReviewedAt || w.date).toDateString())
      .filter((date, index, arr) => arr.indexOf(date) === index)
      .length;

    if (studyDays >= 30) {
      achievements.push({
        type: 'consistency',
        title: 'Consistent Learner',
        description: `Studied on ${studyDays} different days`,
        achievedAt: now,
        value: studyDays
      });
    }

    return achievements.slice(-10); // Return last 10 achievements
  }

  /**
   * Get post history
   */
  getPostHistory(userId?: string): LearningProgressPost[] {
    if (userId) {
      return this.postHistory.filter(post => post.userId === userId);
    }
    return this.postHistory;
  }

  /**
   * Get available post templates
   */
  getAvailableTemplates(): PostTemplate[] {
    return this.getPostTemplates();
  }

  /**
   * Check if Bluesky service is authenticated
   */
  isAuthenticated(): boolean {
    return this.blueskyService.isLoggedIn();
  }

  /**
   * Logout from Bluesky
   */
  logout(): void {
    this.blueskyService.logout();
  }
}

export default ATProtocolService;