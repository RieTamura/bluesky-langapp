import React from 'react';
import { View, Text, FlatList, RefreshControl, StyleSheet } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { useUserPosts, useFollowingFeed } from '../hooks/usePosts';

export const SocialScreen: React.FC = () => {
  const { identifier } = useAuth();
  const userPosts = useUserPosts(identifier || undefined, 20);
  const following = useFollowingFeed(20);

  const loading = userPosts.isLoading || following.isLoading;

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={{ paddingTop: 32 }}
      data={(userPosts.data || []).concat([{ divider: true } as any]).concat(following.data || [])}
      keyExtractor={(_, i) => String(i)}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={() => { userPosts.refetch(); following.refetch(); }} />}
      renderItem={({ item }) => {
        if ((item as any).divider) {
          return <View style={styles.divider}><Text style={styles.dividerText}>Following Feed</Text></View>;
        }
        return (
          <View style={styles.card}>
            <Text style={styles.handle}>@{item.author?.handle}</Text>
            <Text style={styles.text}>{item.text}</Text>
            <Text style={styles.time}>{new Date(item.createdAt).toLocaleString()}</Text>
          </View>
        );
      }}
      ListEmptyComponent={loading ? <Text style={styles.empty}>Loading...</Text> : <Text style={styles.empty}>No posts</Text>}
    />
  );
};

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: '#f5f5f7' },
  header: { fontSize: 22, fontWeight: '700', padding: 16 },
  card: { backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 12, borderRadius: 12, padding: 14, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  handle: { fontWeight: '600', marginBottom: 6 },
  text: { fontSize: 15, lineHeight: 20 },
  time: { marginTop: 8, fontSize: 11, color: '#555' },
  divider: { paddingVertical: 8, paddingHorizontal: 16, backgroundColor: '#eef1f4' },
  dividerText: { fontSize: 16, fontWeight: '600' },
  empty: { textAlign: 'center', marginTop: 40, color: '#666' }
});
