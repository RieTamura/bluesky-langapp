import React, { useState, useMemo, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, RefreshControl, TouchableOpacity, SafeAreaView, Animated, NativeSyntheticEvent, NativeScrollEvent, Easing } from 'react-native';
import { useThemeColors } from '../stores/theme';
import { useAuth } from '../hooks/useAuth';
import { useUserPosts, useFollowingFeed, useDiscoverFeed } from '../hooks/usePosts';
import { useFeedStore } from '../stores/feed';
import { WordDetailModal } from '../components/WordDetailModal';

// メイン画面: 1) フィード 2) クイズ 3) 進捗
export const MainScreen: React.FC = () => {
  const { identifier } = useAuth();
  // 取得件数をユーザーが変更できるように state 化
  const [limit, setLimit] = useState(20);
  const userPosts = useUserPosts(identifier || undefined, limit);
  const following = useFollowingFeed(limit);
  const discover = useDiscoverFeed(limit);
  const feedTab = useFeedStore(s => s.feedTab);
  const setFeedTab = useFeedStore(s => s.setFeedTab);
  const loadingFeed = userPosts.isLoading || following.isLoading || discover.isLoading;
  const currentFeed = useMemo(() => {
    switch (feedTab) {
      case 'posts': return userPosts.data || [];
      case 'following': return following.data || [];
      case 'discover': return discover.data || [];
    }
  }, [feedTab, userPosts.data, following.data, discover.data]);
  const refetchCurrentFeed = () => {
    if (feedTab === 'posts') userPosts.refetch();
    else if (feedTab === 'following') following.refetch();
    else discover.refetch();
  };

  // Quiz / Progress セクションは削除し、フィードのみ表示

  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  // expose setter for inner token components (quick solution without context)
  (MainScreen as any)._setWord = (w: string) => setSelectedWord(w);

  const c = useThemeColors();

  // --- Tabs hide on scroll animation ---
  // タブ高さを実測し、その分だけ隠す (初期値 56 程度)
  const [tabHeight, setTabHeight] = useState(56);
  const headerOffset = useRef(new Animated.Value(0)).current; // 0=表示 / tabHeight=完全隠れ
  const isShownRef = useRef(true); // 離散状態管理
  const lastY = useRef(0);
  const [tabsInteractive, setTabsInteractive] = useState(true);
  // --- Scroll To Top Button ---
  const [showTopBtn, setShowTopBtn] = useState(false);
  // ref は任意 any で安全側 (複雑な Animated 型指定を避ける)
  const scrollRef = useRef<any>(null);

  const translateY = headerOffset.interpolate({
    inputRange: [0, tabHeight],
    outputRange: [0, -tabHeight],
    extrapolate: 'clamp'
  });
  const opacity = headerOffset.interpolate({
    inputRange: [0, tabHeight * 0.5, tabHeight],
    outputRange: [1, 0.15, 0],
    extrapolate: 'clamp'
  });
  // コンテンツをタブ隠しに同期させるための translateY （tabs と同量シフト）
  const contentTranslateY = headerOffset.interpolate({
    inputRange: [0, tabHeight],
    outputRange: [0, -tabHeight],
    extrapolate: 'clamp'
  });

  const animateTo = useCallback((val: number) => {
    Animated.timing(headerOffset, {
      toValue: val,
      duration: 200,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true
    }).start(() => {
      const interactive = val < tabHeight - 4;
      if (interactive !== tabsInteractive) setTabsInteractive(interactive);
    });
  }, [headerOffset, tabHeight, tabsInteractive]);
  const scrollToTop = useCallback(() => {
    scrollRef.current?.scrollTo?.({ y: 0, animated: true });
    if (!isShownRef.current) {
      isShownRef.current = true;
      animateTo(0);
    }
  }, [animateTo]);
  // トップ到達時だけ表示 / それ以外は隠す (離散)
  const TOP_THRESHOLD = 2; // px
  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    lastY.current = y;
  // TOPボタン表示制御 (200px 超で表示)
  if (!showTopBtn && y > 200) setShowTopBtn(true); else if (showTopBtn && y <= 200) setShowTopBtn(false);
    if (y <= TOP_THRESHOLD) {
      if (!isShownRef.current) {
        isShownRef.current = true;
        animateTo(0);
      }
    } else {
      if (isShownRef.current) {
        isShownRef.current = false;
        animateTo(tabHeight);
      }
    }
  }, [animateTo]);

  const snap = useCallback(() => {}, []); // 不要

  return (
    <>
    <SafeAreaView style={[styles.container,{ backgroundColor: c.background }]}> 
      <Animated.View
        style={[
          styles.tabsWrapper,
          {
            transform: [{ translateY }],
            opacity,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 10
          }
        ]}
        onLayout={e => {
          const h = e.nativeEvent.layout.height;
          if (Math.abs(h - tabHeight) > 2) setTabHeight(h); // 変化があれば更新
        }}
        pointerEvents={tabsInteractive ? 'auto' : 'none'}
      >
        {([
          { key: 'posts', label: 'Posts' },
          { key: 'following', label: 'Following' },
          { key: 'discover', label: 'Discover' }
        ] as const).map(t => {
          const active = feedTab === t.key;
          return (
            <TouchableOpacity
              key={t.key}
              style={[
                styles.tab,
                {
                  backgroundColor: active ? c.accent : c.surface,
                  borderWidth: StyleSheet.hairlineWidth,
                  borderColor: active ? c.accent : c.border
                }
              ]}
              onPress={() => setFeedTab(t.key)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.tabText, { color: active ? '#fff' : c.text }]}>{t.label}</Text>
            </TouchableOpacity>
          );
        })}
        <View style={styles.limitRow} accessibilityRole="adjustable" accessible accessibilityLabel="Posts fetch limit selector">
          {[10,20,50,100].map(v => {
            const active = limit === v;
            return (
              <TouchableOpacity
                key={v}
                style={[
                  styles.limitOption,
                  {
                    backgroundColor: active ? c.accent : c.surface,
                    borderColor: active ? c.accent : c.border
                  }
                ]}
                onPress={() => setLimit(v)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`Limit ${v}`}
              >
                <Text style={[styles.limitText, { color: active ? '#fff' : c.text }]}>{v}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </Animated.View>
      <Animated.ScrollView
        ref={scrollRef}
        onScroll={onScroll}
  // snapは不要（離散制御）
        scrollEventThrottle={16}
        refreshControl={<RefreshControl refreshing={loadingFeed} onRefresh={refetchCurrentFeed} />}
      >
        <Animated.View style={{ paddingTop: tabHeight, paddingBottom: 140, paddingHorizontal: 16, transform: [{ translateY: contentTranslateY }] }}>
          {loadingFeed && <ActivityIndicator style={{ marginVertical: 12 }} />}
          {!loadingFeed && currentFeed.map((item: any, i: number) => (
            <View key={feedTab + '-' + i} style={[styles.feedRow,{ borderColor: c.border }]}> 
              <Text style={[styles.handle,{ color: c.accent }]}>@{item.author?.handle}</Text>
              <SelectableText text={item.text} />
              <Text style={[styles.time,{ color: c.secondaryText }]}>{new Date(item.createdAt).toLocaleString()}</Text>
            </View>
          ))}
        </Animated.View>
      </Animated.ScrollView>
      {showTopBtn && (
        <TouchableOpacity
          style={[styles.scrollTopButton, { backgroundColor: c.accent }]}
          onPress={scrollToTop}
          accessibilityRole="button"
          accessibilityLabel="トップへ戻る"
        >
          <Text style={styles.scrollTopButtonText}>↑</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
    <WordDetailModal word={selectedWord} onClose={() => setSelectedWord(null)} />
    </>
  );
};

// ProgressRow / Quiz は削除

const SelectableText: React.FC<{ text: string }> = ({ text }) => {
  // Pass selectedWord setter through closure by attaching to each token via captured function from outer component (prop drilling alternative).
  // For simplicity we rely on a temporary global setter injection replaced just-in-time below.
  const setWord = (MainScreen as any)._setWord as (w: string)=>void;
  return (
    <View style={styles.tokensWrap}>
      {text.split(/(\s+)/).filter(t => t.length > 0).map((tok, i) => {
        if (tok.trim() === '') return <Text key={i} style={styles.space}>{tok}</Text>;
        return <Text key={i} onPress={() => setWord && setWord(tok)} style={styles.token}>{tok}</Text>;
      })}
    </View>
  );
};


const styles = StyleSheet.create({
  // Words / Quiz と同じ開始位置に揃える (SafeArea + paddingTop:48)
  container: { flex: 1, paddingHorizontal: 12, paddingTop: 48 },
  // sectionTitle 削除
  feedRow: { paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  handle: { fontWeight: '600', marginBottom: 6 },
  postText: { fontSize: 15, lineHeight: 20 },
  tokensWrap: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start' },
  token: { fontSize: 15, lineHeight: 20, paddingHorizontal: 6, paddingVertical: 2, marginRight: 4, marginBottom: 4, borderRadius: 6, backgroundColor: '#eef2f7' },
  space: { fontSize: 15, lineHeight: 20 },
  time: { marginTop: 8, fontSize: 11, color: '#555' },
  feedDivider: { fontSize: 16, fontWeight: '600', marginTop: 8 }, // (legacy not used, keep for potential reuse)
  feedHeader: { fontSize: 18, fontWeight: '700', marginBottom: 4, marginTop: 4 }, // (obsolete, kept for potential reuse)
  // quiz / progress styles 削除
  // Tabs (復元)
  tabsWrapper: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start', marginBottom: 8, paddingHorizontal: 16 },
  tab: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 18, marginRight: 10, marginBottom: 10 },
  tabText: { fontSize: 14, fontWeight: '600' },
  limitRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginTop: 4 },
  limitOption: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 12, marginRight: 6, marginBottom: 6, borderWidth: StyleSheet.hairlineWidth },
  limitText: { fontSize: 12, fontWeight: '600' },
  // Scroll To Top Button
  scrollTopButton: { position: 'absolute', bottom: 32, right: 24, width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 4 },
  scrollTopButtonText: { fontSize: 24, color: '#fff', fontWeight: '700', lineHeight: 28 }
});
