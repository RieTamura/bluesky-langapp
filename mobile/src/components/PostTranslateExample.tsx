import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import TranslateButton from './TranslateButton';

type Props = {
  author: string;
  content: string;
};

export const PostTranslateExample: React.FC<Props> = ({ author, content }) => {
  return (
    <View style={styles.card}>
      <Text style={styles.author}>{author}</Text>
      <Text style={styles.content}>{content}</Text>
      <TranslateButton text={content} targetLang="ja" />
    </View>
  );
};

const styles = StyleSheet.create({
  card: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  author: { fontWeight: '600', marginBottom: 6 },
  content: { marginBottom: 8 }
});

export default PostTranslateExample;
