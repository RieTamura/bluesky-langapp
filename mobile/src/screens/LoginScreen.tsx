import React, { useState } from 'react';
import { View, Text, TextInput, Button, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '../hooks/useAuth';

export const LoginScreen: React.FC = () => {
  const { login, loading } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await login(identifier.trim(), password);
    } catch (e: any) {
      setError(e?.message || 'ログイン失敗');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator /></View>;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>ログイン</Text>
      {!!error && <Text style={styles.error}>{error}</Text>}
      <TextInput
        style={styles.input}
        placeholder="Bluesky Identifier"
        autoCapitalize="none"
        value={identifier}
        onChangeText={setIdentifier}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <Button title={submitting ? '送信中...' : 'ログイン'} onPress={onSubmit} disabled={!identifier || !password || submitting} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 16, justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '600', textAlign: 'center' },
  error: { color: 'red' },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 12, borderRadius: 8 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});
