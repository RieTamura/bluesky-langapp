import React, { useState, useMemo } from 'react';
import { View, Text, FlatList, RefreshControl, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../stores/theme';
import { useAuth } from '../hooks/useAuth';
import { useUserPosts, useFollowingFeed, useDiscoverFeed } from '../hooks/usePosts';

export const SocialScreen: React.FC = () => {
  const { identifier } = useAuth();
  const userPosts = useUserPosts(identifier || undefined, 20);
  const following = useFollowingFeed(20);
  const discover = useDiscoverFeed(20);

  const [tab, setTab] = useState<'posts' | 'following' | 'discover'>('posts');
  const loading = userPosts.isLoading || following.isLoading || discover.isLoading;

  const currentData = useMemo(() => {
    switch (tab) {
      case 'posts': return userPosts.data || [];
      case 'following': return following.data || [];
      case 'discover': return discover.data || [];
    }
  }, [tab, userPosts.data, following.data, discover.data]);

  const refetchCurrent = () => {
    if (tab === 'posts') userPosts.refetch();
    else if (tab === 'following') following.refetch();
    else discover.refetch();
  };

  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.tabsWrapper,{ backgroundColor: colors.surface, borderColor: colors.border }]}> 
        {([
          { key: 'posts', label: 'Posts' },
          { key: 'following', label: 'Following' },
          { key: 'discover', label: 'Discover' }
        ] as const).map(t => (
          <TouchableOpacity
            key={t.key}
            style={[
              styles.tab,
              { borderColor: tab === t.key ? colors.accent : 'transparent', borderWidth: StyleSheet.hairlineWidth },
              tab === t.key && { backgroundColor: colors.accent }
            ]}
            onPress={() => setTab(t.key)}
            accessibilityRole="button"
            accessibilityState={{ selected: tab === t.key }}
          >
            <Text style={[styles.tabText, { color: tab === t.key ? '#fff' : colors.accent }]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <FlatList
        style={[styles.list,{ backgroundColor: colors.background }]}
        data={currentData}
        keyExtractor={(_, i) => String(i)}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refetchCurrent} />}
        renderItem={({ item }) => (
          <View style={[styles.card,{ backgroundColor: colors.surface, borderColor: colors.border }] }>
            <Text style={[styles.handle,{ color: colors.accent }]}>@{item.author?.handle}</Text>
            <Text style={[styles.text,{ color: colors.text }]}>{item.text}</Text>
            <Text style={[styles.time,{ color: colors.secondaryText }]}>{new Date(item.createdAt).toLocaleString()}</Text>
          </View>
        )}
        ListHeaderComponent={<Text style={[styles.header,{ color: colors.text }]}>{tab === 'posts' ? 'My Posts' : tab === 'following' ? 'Following Feed' : 'Discovery Feed'}</Text>}
        ListEmptyComponent={loading ? <Text style={[styles.empty,{ color: colors.secondaryText }]}>Loading...</Text> : <Text style={[styles.empty,{ color: colors.secondaryText }]}>No posts</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  list: { flex: 1 },
  header: { fontSize: 22, fontWeight: '700', padding: 16 },
  card: { marginHorizontal: 16, marginBottom: 12, borderRadius: 12, padding: 14, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  handle: { fontWeight: '600', marginBottom: 6 },
  text: { fontSize: 15, lineHeight: 20 },
  time: { marginTop: 8, fontSize: 11 },
  divider: { paddingVertical: 8, paddingHorizontal: 16 },
  dividerText: { fontSize: 16, fontWeight: '600' },
  empty: { textAlign: 'center', marginTop: 40 },
  // tabs
  tabsWrapper: { flexDirection: 'row', padding: 8, justifyContent: 'center', elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4 },
  tab: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20, marginHorizontal: 4 },
  tabText: { fontSize: 14, fontWeight: '600' }
});
