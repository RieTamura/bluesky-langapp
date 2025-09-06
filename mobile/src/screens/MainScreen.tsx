import React, { useState, useMemo, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, RefreshControl, TouchableOpacity, SafeAreaView, NativeSyntheticEvent, NativeScrollEvent, ScrollView } from 'react-native';
import * as Speech from 'expo-speech';
import { useTTSStore } from '../stores/tts';
import { detectLanguage, mapToSpeechCode } from '../utils/langDetect';
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

  // --- Scroll To Top Button ---
  const [showTopBtn, setShowTopBtn] = useState(false);
  const scrollRef = useRef<any>(null);
  const scrollToTop = useCallback(() => {
    scrollRef.current?.scrollTo?.({ y: 0, animated: true });
  }, []);
  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    if (!showTopBtn && y > 200) setShowTopBtn(true); else if (showTopBtn && y <= 200) setShowTopBtn(false);
  }, [showTopBtn]);

  return (
    <>
    <SafeAreaView style={[styles.container,{ backgroundColor: c.background }]}> 
      <View style={styles.limitRowContainer}>
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
      </View>
      <ScrollView
        ref={scrollRef}
        onScroll={onScroll}
        scrollEventThrottle={16}
        refreshControl={<RefreshControl refreshing={loadingFeed} onRefresh={refetchCurrentFeed} />}
        contentContainerStyle={styles.scrollContent}
      >
        {loadingFeed && <ActivityIndicator style={{ marginVertical: 12 }} />}
        {!loadingFeed && currentFeed.map((item: any, i: number) => (
          <FeedItem key={feedTab + '-' + i} item={item} accentColor={c.accent} secondaryColor={c.secondaryText} borderColor={c.border} />
        ))}
      </ScrollView>
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
  container: { flex: 1, paddingHorizontal: 12, paddingTop: 48, paddingBottom: 140 },
  // sectionTitle 削除
  feedRow: { paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, width: '100%', maxWidth: 680, alignSelf: 'center' },
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
  // ヘッダーへ移動済タブ
  limitRowContainer: { width: '100%', alignItems: 'center' },
  limitRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginTop: 4, width: '100%', maxWidth: 680, paddingHorizontal: 16 },
  limitOption: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 12, marginRight: 6, marginBottom: 6, borderWidth: StyleSheet.hairlineWidth },
  limitText: { fontSize: 12, fontWeight: '600' },
  scrollContent: { paddingHorizontal: 16, alignItems: 'center', paddingBottom: 40 },
  // Scroll To Top Button
  scrollTopButton: { position: 'absolute', bottom: 32, right: 24, width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 4 },
  scrollTopButtonText: { fontSize: 24, color: '#fff', fontWeight: '700', lineHeight: 28 },
  dateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  ttsBtn: { marginLeft: 12 },
  ttsBtnText: { fontSize: 12, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 14, borderWidth: 1, overflow: 'hidden' }
});

// --- Feed Item with TTS ---
const FeedItem: React.FC<{ item: any; accentColor: string; secondaryColor: string; borderColor: string }> = ({ item, accentColor, secondaryColor, borderColor }) => {
  const [speaking, setSpeaking] = useState(false);
  const mode = useTTSStore(s => s.mode);
  const manualLanguage = useTTSStore(s => s.manualLanguage);
  const onPressSpeak = useCallback(() => {
    if (speaking) {
      Speech.stop();
      setSpeaking(false);
      return;
    }
    const text = item?.text || '';
    if (!text.trim()) return;
    // 念のため既存の読み上げを停止
    Speech.stop();
    let language = 'en-US';
    if (mode === 'manual') {
      language = manualLanguage || 'en-US';
    } else {
      const det = detectLanguage(text);
      language = mapToSpeechCode(det.code);
    }
    setSpeaking(true);
    Speech.speak(text, {
      language,
      onDone: () => setSpeaking(false),
      onStopped: () => setSpeaking(false),
      onError: () => setSpeaking(false)
    });
  }, [speaking, item, mode, manualLanguage]);
  return (
    <View style={[styles.feedRow,{ borderColor }]}> 
      <Text style={[styles.handle,{ color: accentColor }]}>@{item.author?.handle}</Text>
      <SelectableText text={item.text} />
      <View style={styles.dateRow}>
        <Text style={[styles.time,{ color: secondaryColor }]}>{new Date(item.createdAt).toLocaleString()}</Text>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={speaking ? '音声停止' : '読み上げ'} onPress={onPressSpeak} style={styles.ttsBtn}>
          <Text style={[styles.ttsBtnText,{ color: speaking ? '#fff' : accentColor, backgroundColor: speaking ? accentColor : 'transparent', borderColor: accentColor }]}>{speaking ? '■' : '▶'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

