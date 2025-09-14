import React, { useState } from 'react';
import { View, Text, Button, FlatList, TouchableOpacity } from 'react-native';
import { setSelectedLevel, getSelectedLevel } from '../stores/userLevel';
import { getWordsForLevel } from '../services/ngslService';

export default function LevelSelectionScreen({ navigation }: any) {
  const [selected, setSelected] = useState<number | null>(getSelectedLevel());

  const levels = [1, 2, 3, 4, 5];

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
            <Text style={{ color: '#666' }}>{getWordsForLevel(item).slice(0,5).join(', ')}...</Text>
          </TouchableOpacity>
        )}
      />

      <Button
        title="Confirm"
        onPress={() => {
          if (selected) {
            setSelectedLevel(selected);
            navigation?.navigate('APISetup');
          }
        }}
      />
    </View>
  );
}
