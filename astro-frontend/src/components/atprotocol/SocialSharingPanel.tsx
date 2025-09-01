import React, { useState, useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { authStore } from '../../stores/auth';

interface LearningStats {
  totalWords: number;
  knownWords: number;
  learningWords: number;
  studyStreak: number;
  averageAccuracy: number;
}

interface PostTemplate {
  type: string;
  template: string;
  variables: string[];
  examples: string[];
}

const SocialSharingPanel: React.FC = () => {
  const auth = useStore(authStore);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [stats, setStats] = useState<LearningStats | null>(null);
  const [templates, setTemplates] = useState<PostTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('milestone');
  const [customMessage, setCustomMessage] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [lastPost, setLastPost] = useState<string | null>(null);

  useEffect(() => {
    checkConnectionStatus();
    loadTemplates();
    if (auth.user) {
      loadLearningStats();
    }
  }, [auth.user]);

  const checkConnectionStatus = async () => {
    try {
      const response = await fetch('/api/atprotocol/auth/status');
      const data = await response.json();
      setIsConnected(data.success && data.data.isAuthenticated);
    } catch (error) {
      console.error('Failed to check connection status:', error);
      setIsConnected(false);
    }
  };

  const loadTemplates = async () => {
    try {
      const response = await fetch('/api/atprotocol/posts/templates');
      const data = await response.json();
      if (data.success) {
        setTemplates(data.data);
      }
    } catch (error) {
      console.error('Failed to load templates:', error);
    }
  };

  const loadLearningStats = async () => {
    if (!auth.user) return;
    
    try {
      const response = await fetch(`/api/atprotocol/shared-data/${auth.user.id}`);
      const data = await response.json();
      if (data.success) {
        setStats(data.data.summary);
      }
    } catch (error) {
      console.error('Failed to load learning stats:', error);
    }
  };

  const connectToBluesky = async () => {
    if (!auth.credentials) {
      alert('Please log in to Bluesky first');
      return;
    }

    setIsConnecting(true);
    try {
      const response = await fetch('/api/atprotocol/init', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          identifier: auth.credentials.identifier,
          password: auth.credentials.password,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setIsConnected(true);
        alert('Successfully connected to Bluesky for social sharing!');
      } else {
        alert(`Failed to connect: ${data.error}`);
      }
    } catch (error) {
      console.error('Failed to connect to Bluesky:', error);
      alert('Failed to connect to Bluesky');
    } finally {
      setIsConnecting(false);
    }
  };

  const postToBluesky = async () => {
    if (!auth.user || !isConnected) return;

    setIsPosting(true);
    try {
      const requestBody: any = {
        userId: auth.user.id,
        type: selectedTemplate,
      };

      if (selectedTemplate === 'custom') {
        requestBody.customContent = customMessage;
      } else if (stats) {
        requestBody.metadata = {
          wordsLearned: stats.totalWords,
          totalWords: stats.totalWords,
          streak: stats.studyStreak,
          accuracy: stats.averageAccuracy,
        };

        if (selectedTemplate === 'milestone') {
          const milestones = [10, 25, 50, 100, 250, 500, 1000];
          const currentMilestone = milestones.reverse().find(m => stats.totalWords >= m);
          if (currentMilestone) {
            requestBody.metadata.milestone = `${currentMilestone} words milestone reached!`;
          }
        }
      }

      const response = await fetch('/api/atprotocol/post/progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();
      if (data.success) {
        setLastPost(data.data.content);
        alert('Successfully posted to Bluesky!');
        setCustomMessage('');
      } else {
        alert(`Failed to post: ${data.error}`);
      }
    } catch (error) {
      console.error('Failed to post to Bluesky:', error);
      alert('Failed to post to Bluesky');
    } finally {
      setIsPosting(false);
    }
  };

  const autoPostMilestone = async () => {
    if (!auth.user || !isConnected) return;

    setIsPosting(true);
    try {
      const response = await fetch('/api/atprotocol/post/milestone', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: auth.user.id,
        }),
      });

      const data = await response.json();
      if (data.success) {
        if (data.data) {
          setLastPost(data.data.content);
          alert('Milestone achievement posted to Bluesky!');
        } else {
          alert('No milestone achievements to post at this time');
        }
      } else {
        alert(`Failed to post milestone: ${data.error}`);
      }
    } catch (error) {
      console.error('Failed to auto-post milestone:', error);
      alert('Failed to auto-post milestone');
    } finally {
      setIsPosting(false);
    }
  };

  if (!auth.user) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Social Sharing</h3>
        <p className="text-gray-600">Please log in to share your learning progress on Bluesky.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Share Learning Progress</h3>
      
      {/* Connection Status */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Bluesky Connection</span>
          <div className="flex items-center">
            <div className={`w-2 h-2 rounded-full mr-2 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className={`text-sm ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
              {isConnected ? 'Connected' : 'Not Connected'}
            </span>
          </div>
        </div>
        
        {!isConnected && (
          <button
            onClick={connectToBluesky}
            disabled={isConnecting}
            className="mt-2 w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {isConnecting ? 'Connecting...' : 'Connect to Bluesky'}
          </button>
        )}
      </div>

      {/* Learning Stats */}
      {stats && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Your Learning Progress</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Total Words:</span>
              <span className="ml-2 font-semibold">{stats.totalWords}</span>
            </div>
            <div>
              <span className="text-gray-600">Known:</span>
              <span className="ml-2 font-semibold text-green-600">{stats.knownWords}</span>
            </div>
            <div>
              <span className="text-gray-600">Learning:</span>
              <span className="ml-2 font-semibold text-yellow-600">{stats.learningWords}</span>
            </div>
            <div>
              <span className="text-gray-600">Streak:</span>
              <span className="ml-2 font-semibold text-blue-600">{stats.studyStreak} days</span>
            </div>
          </div>
        </div>
      )}

      {/* Post Type Selection */}
      {isConnected && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Post Type
          </label>
          <select
            value={selectedTemplate}
            onChange={(e) => setSelectedTemplate(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {templates.map((template) => (
              <option key={template.type} value={template.type}>
                {template.type.charAt(0).toUpperCase() + template.type.slice(1).replace('_', ' ')}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Custom Message */}
      {isConnected && selectedTemplate === 'custom' && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Custom Message
          </label>
          <textarea
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            placeholder="Share your learning journey..."
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
          />
        </div>
      )}

      {/* Action Buttons */}
      {isConnected && (
        <div className="space-y-2">
          <button
            onClick={postToBluesky}
            disabled={isPosting || (selectedTemplate === 'custom' && !customMessage.trim())}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {isPosting ? 'Posting...' : 'Share Progress'}
          </button>
          
          <button
            onClick={autoPostMilestone}
            disabled={isPosting}
            className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            {isPosting ? 'Posting...' : 'Auto-Post Milestone'}
          </button>
        </div>
      )}

      {/* Last Post Preview */}
      {lastPost && (
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Last Posted:</h4>
          <p className="text-sm text-gray-600">{lastPost}</p>
        </div>
      )}

      {/* Template Preview */}
      {isConnected && selectedTemplate !== 'custom' && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <h4 className="text-xs font-medium text-gray-700 mb-1">Preview:</h4>
          <p className="text-xs text-gray-600">
            {templates.find(t => t.type === selectedTemplate)?.examples[0] || 'No preview available'}
          </p>
        </div>
      )}
    </div>
  );
};

export default SocialSharingPanel;