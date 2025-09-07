import React, { useState } from 'react';
import { View, Text, TextInput, Button, ActivityIndicator, StyleSheet } from 'react-native';
import { useThemeColors } from '../stores/theme';
import { useAuth } from '../hooks/useAuth';
import { API_BASE_URL, api } from '../services/api';

export const LoginScreen: React.FC = () => {
  const { login, loading } = useAuth();
  const c = useThemeColors();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [connectionInfo, setConnectionInfo] = useState<string | null>(null);

  const onSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await login(identifier.trim(), password);
    } catch (e: any) {
      const msg = e?.message || 'ログイン失敗';
      // ネットワーク系エラーを文字列依存だけでなく構造情報で判定
      // api.ts では fetch 失敗時: { error: 'NETWORK_OFFLINE' | 'SERVER_ERROR', message: 'ネットワークエラー', status: 0 }
      // 一部環境/ライブラリで e.code や e.name が付与される可能性も考慮
      const lower = (msg || '').toLowerCase();
      const isNetworkError = (
        e?.error === 'NETWORK_OFFLINE' ||
        e?.status === 0 || // fetch レベル失敗で付与
        e?.code === 'NETWORK_ERROR' ||
        e?.code === 'ECONNREFUSED' ||
        e?.code === 'ETIMEDOUT' ||
        e?.name === 'TypeError' && lower.includes('network') ||
        lower.includes('network') ||
        msg.includes('ネットワーク')
      );

      if (isNetworkError) {
        setError(msg + '\n(サーバが起動しているか / ポート番号 / 端末とPCが同一LANか / IP変更 を確認してください)');
      } else {
        setError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const testConnection = async () => {
    setTesting(true);
    setConnectionInfo(null);
    setError(null);
    try {
      // /health エンドポイント想定レスポンスの型
      interface HealthResponse { status?: string; message?: string; uptimeSeconds?: number; [k: string]: any; }
      const res = await api.get<HealthResponse>('/health');
      const status = res.data?.status;
      if (status) {
        setConnectionInfo(`✅ 接続成功: status=${status}, time=${new Date().toLocaleTimeString()}`);
      } else {
        setConnectionInfo(`⚠️ 接続応答(ステータス未取得): time=${new Date().toLocaleTimeString()}`);
      }
    } catch (e: any) {
      const msg = e?.message || '不明なエラー';
      setConnectionInfo(null);
      setError(`接続テスト失敗: ${msg}\n(1) サーバ起動確認 (2) ポート衝突で 3000→3001 等へ自動変更されていないか (3) app.json の apiUrl (${API_BASE_URL}) と実サーバ一致か`);
    } finally {
      setTesting(false);
    }
  };

  if (loading) return <View style={[styles.center,{ backgroundColor: c.background }]}><ActivityIndicator /></View>;

  return (
  <View style={[styles.container,{ backgroundColor: c.background }]}>
  <Text style={[styles.title,{ color: c.text }]}>ログイン</Text>
  <Text style={[styles.baseUrl,{ color: c.secondaryText }]}>API: {API_BASE_URL}</Text>
    {!!error && <Text style={{ color: c.error }}>{error}</Text>}
  {!!connectionInfo && <Text style={{ color: c.success }}>{connectionInfo}</Text>}
      <TextInput
    style={[styles.input,{ borderColor: c.border, color: c.text }]}
        placeholder="Bluesky Identifier"
        autoCapitalize="none"
        value={identifier}
        onChangeText={setIdentifier}
      />
      <TextInput
    style={[styles.input,{ borderColor: c.border, color: c.text }]}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
  <Button title={submitting ? '送信中...' : 'ログイン'} onPress={onSubmit} disabled={!identifier || !password || submitting} />
  <View style={{ height: 8 }} />
  <Button title={testing ? 'テスト中...' : '接続テスト'} onPress={testConnection} disabled={testing} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 16, justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '600', textAlign: 'center' },
  baseUrl: { fontSize: 12, textAlign: 'center' },
  input: { borderWidth: 1, padding: 12, borderRadius: 8 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});
