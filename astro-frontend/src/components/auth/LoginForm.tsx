import React, { useState } from 'react';
import { authStore } from '../../stores/auth';
import { apiService } from '../../services/api';
import { Button, Input, Alert } from '../ui';

export default function LoginForm() {
  const [formData, setFormData] = useState({
    blueskyId: '',
    appPassword: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.blueskyId || !formData.appPassword) {
      setMessage({ text: 'すべてのフィールドを入力してください', type: 'error' });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const data = await apiService.login(formData.blueskyId, formData.appPassword);

      if (data.success) {
        // Update auth store
        authStore.set({
          isAuthenticated: true,
          sessionId: data.sessionId,
          user: data.user
        });
        
        // Store session data
        localStorage.setItem('sessionId', data.sessionId);
        if (data.user?.identifier) {
          localStorage.setItem('userIdentifier', data.user.identifier);
        }
        
        // Clear form
        setFormData({ blueskyId: '', appPassword: '' });
        
        // Show success message and redirect
        setMessage({ text: 'ログインに成功しました！', type: 'success' });
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 1000);
      } else {
        setMessage({ 
          text: data.message || 'ログインに失敗しました。認証情報を確認してください。', 
          type: 'error' 
        });
      }
    } catch (error) {
      console.error('Login failed:', error);
      setMessage({ 
        text: 'サーバーに接続できませんでした。しばらく後でお試しください。', 
        type: 'error' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {message && (
        <Alert 
          type={message.type} 
          className="mb-4"
        >
          {message.text}
        </Alert>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
        <Input
          label="Bluesky ID"
          type="text"
          id="blueskyId"
          name="blueskyId"
          value={formData.blueskyId}
          onChange={handleInputChange}
          placeholder="example.bsky.social"
          autoComplete="username"
          helpText="例: your-handle.bsky.social"
          required
        />
        
        <Input
          label="App Password"
          type="password"
          id="appPassword"
          name="appPassword"
          value={formData.appPassword}
          onChange={handleInputChange}
          placeholder="アプリパスワードを入力"
          autoComplete="current-password"
          helpText="Blueskyの設定で生成したApp Passwordを入力"
          required
        />
        
        <div className="pt-2">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isLoading}
            className="w-full"
          >
            {isLoading ? '処理中...' : 'ログイン'}
          </Button>
        </div>
      </form>
    </div>
  );
}