import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { WordItem } from '../hooks/useWords';

interface Props {
  word: WordItem;
  onStatusChange?: (id: string, status: WordItem['status']) => void;
  onPress?: (word: WordItem) => void;
  loading?: boolean;
}

const nextStatus: Record<WordItem['status'], WordItem['status']> = {
  unknown: 'learning',
  learning: 'known',
  known: 'unknown'
};

export const WordCard: React.FC<Props> = ({ word, onStatusChange, onPress, loading }) => {
  return (
    <TouchableOpacity onPress={() => onPress?.(word)} activeOpacity={0.8}>
      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.word}>{word.word}</Text>
          <TouchableOpacity
            style={[styles.badge, styles[word.status]]}
            disabled={loading}
            onPress={() => onStatusChange?.(word.id, nextStatus[word.status])}
          >
            {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.badgeText}>{word.status}</Text>}
          </TouchableOpacity>
        </View>
        {!!word.definition && <Text style={styles.def} numberOfLines={2}>{word.definition}</Text>}
        {word.exampleSentence && <Text style={styles.example} numberOfLines={2}>{word.exampleSentence}</Text>}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  word: { fontSize: 18, fontWeight: '600' },
  def: { marginTop: 4, color: '#333' },
  example: { marginTop: 4, fontStyle: 'italic', color: '#666' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 16 },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '600', textTransform: 'uppercase' },
  unknown: { backgroundColor: '#9ca3af' },
  learning: { backgroundColor: '#f59e0b' },
  known: { backgroundColor: '#10b981' }
});
