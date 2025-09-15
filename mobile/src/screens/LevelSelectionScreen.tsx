import React, { useState, useMemo } from 'react';
import { View, Text, Button, FlatList, TouchableOpacity } from 'react-native';
import { setSelectedLevel, getSelectedLevel } from '../stores/userLevel';
import { getWordsForLevel, getAvailableLevels } from '../services/ngslService';

export default function LevelSelectionScreen({ navigation }: any) {
  const [selected, setSelected] = useState<number | null>(getSelectedLevel());

  const levels = getAvailableLevels();
  // Precompute a short preview for each level to avoid recomputing on every item render
  const previews = useMemo(() => {
    const map: Record<number, string> = {};
    for (const l of levels) {
      const words = getWordsForLevel(l);
      map[l] = words && words.length ? `${words.slice(0, 5).join(', ')}${words.length > 5 ? '...' : ''}` : '';
    }
    return map;
  }, [levels]);

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 20, marginBottom: 12 }}>Select your learning level</Text>
      <FlatList
        data={levels}
        keyExtractor={(v) => String(v)}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => setSelected(item)}
            style={{ padding: 12, backgroundColor: selected === item ? '#ddd' : '#fff', marginBottom: 8 }}
          >
            <Text>Level {item}</Text>
            <Text style={{ color: '#666' }}>{previews[item] ?? ''}</Text>
          </TouchableOpacity>
        )}
      />

      <Button
        title="Confirm"
        disabled={selected == null}
        onPress={() => {
          if (selected) {
            setSelectedLevel(selected);
            // Previous flow routed to APISetup here — allow users to continue
            // directly to the main app even if they don't have API keys.
            navigation?.navigate('MainApp');
          }
        }}
      />
    </View>
  );
}
