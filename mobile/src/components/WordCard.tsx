import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useThemeColors } from '../stores/theme';
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
  const c = useThemeColors();
  return (
    <TouchableOpacity onPress={() => onPress?.(word)} activeOpacity={0.7}>
      <View style={[styles.rowWrap, { borderColor: c.border }]}> 
        <View style={styles.row}> 
          <Text style={[styles.word, { color: c.text }]}>{word.word}</Text>
          <TouchableOpacity
            style={[styles.badge, word.status === 'known'
              ? { backgroundColor: 'transparent' }
              : { backgroundColor: statusColor(word.status, c) }
            ]}
            disabled={loading}
            onPress={() => onStatusChange?.(word.id, nextStatus[word.status])}
          >
            {loading
              ? <ActivityIndicator size="small" color={word.status === 'known' ? c.badgeKnown : '#fff'} />
              : <Text style={[styles.badgeText, word.status === 'known' && { color: c.badgeKnown }]}>{word.status}</Text>}
          </TouchableOpacity>
        </View>
        {!!word.definition && <Text style={[styles.def, { color: c.secondaryText }]} numberOfLines={2}>{word.definition}</Text>}
        {word.exampleSentence && <Text style={[styles.example, { color: c.secondaryText }]} numberOfLines={2}>{word.exampleSentence}</Text>}
      </View>
    </TouchableOpacity>
  );
};

function statusColor(status: WordItem['status'], c: ReturnType<typeof useThemeColors>) {
  switch (status) {
    case 'unknown': return c.badgeUnknown;
    case 'learning': return c.badgeLearning;
    case 'known': return c.badgeKnown;
  }
}

const styles = StyleSheet.create({
  rowWrap: { paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  word: { fontSize: 17, fontWeight: '600' },
  def: { marginTop: 4 },
  example: { marginTop: 4, fontStyle: 'italic' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 14 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '600', textTransform: 'uppercase' }
});
