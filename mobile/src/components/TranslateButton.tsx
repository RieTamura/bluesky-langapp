import React, { useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import translation, { TranslationResult } from '../services/translation';

type Props = {
  text: string;
  targetLang?: string;
  compact?: boolean;
};

export const TranslateButton: React.FC<Props> = ({ text, targetLang = 'ja', compact = false }) => {
  const [loading, setLoading] = useState(false);
  const [translated, setTranslated] = useState<TranslationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onPress() {
    setError(null);
    // toggle off if already translated
    if (translated) {
      setTranslated(null);
      return;
    }
    setLoading(true);
    try {
      const res = await translation.translate(text, targetLang);
      setTranslated(res);
    } catch (e: any) {
      setError(e?.message || 'Translation failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={compact ? styles.containerCompact : styles.container}>
      <Pressable onPress={onPress} style={styles.button} accessibilityLabel="translate-button">
        {loading ? <ActivityIndicator /> : <Text style={styles.buttonText}>{translated ? '原文に戻す' : '翻訳'}</Text>}
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {translated ? <View style={styles.result}><Text>{translated.text}</Text></View> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginVertical: 8 },
  containerCompact: { marginVertical: 4 },
  button: { backgroundColor: '#eee', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, alignSelf: 'flex-start' },
  buttonText: { color: '#333' },
  result: { marginTop: 8, backgroundColor: '#fafafa', padding: 8, borderRadius: 6 },
  error: { color: 'red', marginTop: 4 }
});

export default TranslateButton;
