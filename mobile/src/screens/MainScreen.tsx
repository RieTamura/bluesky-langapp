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
          <FeedItem key={feedTab + '-' + i} item={item} index={i} accentColor={c.accent} secondaryColor={c.secondaryText} borderColor={c.border} />
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

// 共通: トークン前処理（前後句読点除去）
const stripEdgePunct = (tok: string) => tok.replace(/^[.,!?;:()"'`\[\]{}<>…。、，！？：；（）「」『』]+|[.,!?;:()"'`\[\]{}<>…。、，！？：；（）「」『』]+$/g, '');

const SelectableText: React.FC<{ text: string; highlightWordIndex?: number }> = ({ text, highlightWordIndex }) => {
  // Pass selectedWord setter through closure by attaching to each token via captured function from outer component (prop drilling alternative).
  // For simplicity we rely on a temporary global setter injection replaced just-in-time below.
  const setWord = (MainScreen as any)._setWord as (w: string)=>void;
  let wordCounter = -1; // counts only non-space tokens
  return (
    <View style={styles.tokensWrap}>
      {text.split(/(\s+)/).filter(t => t.length > 0).map((tok, i) => {
        if (tok.trim() === '') return <Text key={i} style={styles.space}>{tok}</Text>;
        const cleaned = stripEdgePunct(tok);
        // 句読点のみのトークンはハイライト対象インデックスを進めない
        if (!cleaned) {
          return <Text key={i} style={styles.token}>{tok}</Text>;
        }
        wordCounter += 1;
        const playing = highlightWordIndex === wordCounter;
        return <Text key={i} onPress={() => setWord && setWord(cleaned)} style={[styles.token, playing && styles.tokenPlaying]}>{tok}</Text>;
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
  ttsBtnText: { fontSize: 12, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  tokenPlaying: { backgroundColor: '#ffe7b3' }
});

// --- Feed Item with TTS ---
const FeedItem: React.FC<{ item: any; index: number; accentColor: string; secondaryColor: string; borderColor: string }> = ({ item, index, accentColor, secondaryColor, borderColor }) => {
  const [speaking, setSpeaking] = useState(false);
  const [currentWordIdx, setCurrentWordIdx] = useState<number | null>(null);
  const mode = useTTSStore(s => s.mode);
  const manualLanguage = useTTSStore(s => s.manualLanguage);
  const currentPostId = useTTSStore(s => s.currentPostId);
  const setCurrentPostId = useTTSStore(s => s.setCurrentPostId);
  const postId = item?.uri || item?.cid || `idx_${index}`;
  const cancelRef = React.useRef(false);
  // 言語キャッシュ (投稿単位でリセット)
  const langCacheRef = React.useRef<Record<string, { lang: string; confidence: number }>>({});
  const chunkHighlightTimer = React.useRef<any>(null);
  const onPressSpeak = useCallback(() => {
    if (speaking) {
      cancelRef.current = true;
      Speech.stop();
      setSpeaking(false);
      setCurrentPostId(null);
      setCurrentWordIdx(null);
      return;
    }
    const text = item?.text || '';
    if (!text.trim()) return;
    // 元トークン保持（ハイライト用 index 一致のためクリーン後で空になるものは除外）
  const rawTokens: string[] = text.split(/\s+/);
  const tokens: { raw: string; cleaned: string }[] = rawTokens
      .map((t: string) => ({ raw: t, cleaned: stripEdgePunct(t) }))
      .filter((t: { raw: string; cleaned: string }) => t.cleaned.length > 0); // 空 (句読点のみ) は除外
    cancelRef.current = false;
    Speech.stop();
    let baseLanguage = 'en-US';
    if (mode === 'manual') {
      baseLanguage = manualLanguage || 'en-US';
    } else if (mode === 'auto') {
      const det = detectLanguage(text);
      baseLanguage = mapToSpeechCode(det.code);
    } else if (mode === 'auto-multi') {
      // base fallback (first detection or default)
      const det = detectLanguage(text);
      baseLanguage = mapToSpeechCode(det.code);
    }
    setSpeaking(true);
    setCurrentPostId(postId);
  const speakSeq = (idx: number) => {
      if (cancelRef.current) return;
      if (idx >= tokens.length) {
        setSpeaking(false);
        setCurrentWordIdx(null);
        setCurrentPostId(null);
        return;
      }
      // チャンク化: 連続同一言語(閾値下ならフォールバック言語)をまとめて一度に speak
      let start = idx;
      const toSpeak: { token: string; raw: string; lang: string; end: boolean; short: boolean }[] = [];
      const { chunkMaxWords, detectionConfidenceThreshold, pauseSentenceMs, pauseShortMs, pauseWordMs } = useTTSStore.getState();
      while (start < tokens.length && toSpeak.length < chunkMaxWords) {
        const t = tokens[start];
        let langForToken = baseLanguage;
        if (mode === 'auto-multi') {
            const cacheKey = t.cleaned.toLowerCase();
            const cached = langCacheRef.current[cacheKey];
            let detTok = cached;
            if (!detTok) {
              const det = detectLanguage(t.cleaned);
              detTok = { lang: mapToSpeechCode(det.code), confidence: det.confidence };
              langCacheRef.current[cacheKey] = detTok;
            }
            // 言語別しきい値補正 (漢字系は信頼度過大推定のため少し上乗せ)
            let dynamicThreshold = detectionConfidenceThreshold;
            if (/-(JP|CN)|ja|zh/.test(detTok.lang)) dynamicThreshold = Math.min(1, dynamicThreshold + 0.1);
            if (detTok.confidence >= dynamicThreshold) langForToken = detTok.lang; else langForToken = baseLanguage;
        }
        const sentenceEnd = /[.!?。！？]$/.test(t.raw);
        const shortPause = /[,;、，]$/.test(t.raw);
        toSpeak.push({ token: t.cleaned, raw: t.raw, lang: langForToken, end: sentenceEnd, short: shortPause });
        // 次トークンが同じ言語なら継続、それ以外で break
        const next = tokens[start + 1];
        if (!next) break;
        let nextLang = baseLanguage;
        if (mode === 'auto-multi') {
          const nk = next.cleaned.toLowerCase();
          const cachedNext = langCacheRef.current[nk] || (()=>{
            const det2 = detectLanguage(next.cleaned);
            const entry = { lang: mapToSpeechCode(det2.code), confidence: det2.confidence };
            langCacheRef.current[nk] = entry; return entry; })();
          let dynamicThresholdNext = detectionConfidenceThreshold;
          if (/-(JP|CN)|ja|zh/.test(cachedNext.lang)) dynamicThresholdNext = Math.min(1, dynamicThresholdNext + 0.1);
          nextLang = cachedNext.confidence >= dynamicThresholdNext ? cachedNext.lang : baseLanguage;
        }
        if (nextLang !== toSpeak[0].lang) break; // 言語変化でチャンク終了
        start++;
      }
      // speak this chunk
      setCurrentWordIdx(idx); // ハイライトはチャンク先頭語
      const chunkText = toSpeak.map(x => x.token).join(' ');
      const chunkLang = toSpeak[0].lang;
      const last = toSpeak[toSpeak.length - 1];
      // チャンク内逐次ハイライト (推定時間: トークン長さ / 合計長で均等割)
      if (chunkHighlightTimer.current) clearInterval(chunkHighlightTimer.current as any);
      if (toSpeak.length > 1) {
        const totalLen = toSpeak.reduce((s,x)=> s + x.token.length, 0) || 1;
        let localIdx = 0;
        const startTime = Date.now();
        // 粗い推定: 単語長に比例した相対時間で更新 (50ms * 長さ)
        const durations = toSpeak.map(x => Math.max(80, x.token.length * 50));
        const sumDur = durations.reduce((a,b)=> a+b,0);
        chunkHighlightTimer.current = setInterval(() => {
          if (cancelRef.current) { clearInterval(chunkHighlightTimer.current as any); return; }
          const elapsed = Date.now() - startTime;
          let acc = 0; let idxTok = 0;
          for (; idxTok < durations.length; idxTok++) { acc += durations[idxTok]; if (elapsed < acc) break; }
            if (idxTok !== localIdx && idxTok < toSpeak.length) {
              setCurrentWordIdx(idx + idxTok);
              localIdx = idxTok;
            }
            if (elapsed >= sumDur) {
              clearInterval(chunkHighlightTimer.current as any);
            }
        }, 60);
      }
      Speech.speak(chunkText, {
        language: chunkLang,
        onDone: () => {
          if (cancelRef.current) return;
          const delay = last.end ? pauseSentenceMs : last.short ? pauseShortMs : pauseWordMs;
          setTimeout(() => speakSeq(idx + toSpeak.length), delay);
        },
        onStopped: () => { /* manual stop */ },
        onError: () => speakSeq(idx + toSpeak.length)
      });
    };
    speakSeq(0);
  }, [speaking, item, mode, manualLanguage, postId, setCurrentPostId]);
  // 外部停止 (他の投稿再生開始など) を検知
  React.useEffect(()=> {
    if (currentPostId !== postId && speaking) {
      setSpeaking(false);
    }
  }, [currentPostId, postId, speaking]);
  return (
    <View style={[styles.feedRow,{ borderColor, backgroundColor: currentPostId === postId ? 'rgba(0,122,255,0.08)' : 'transparent' }]}> 
      <Text style={[styles.handle,{ color: accentColor }]}>@{item.author?.handle}</Text>
  <SelectableText text={item.text} highlightWordIndex={currentWordIdx ?? undefined} />
      <View style={styles.dateRow}>
        <Text style={[styles.time,{ color: secondaryColor }]}>{new Date(item.createdAt).toLocaleString()}</Text>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={speaking ? '音声停止' : '読み上げ'} onPress={onPressSpeak} style={styles.ttsBtn}>
          <Text style={[styles.ttsBtnText,{ color: speaking ? '#fff' : accentColor, backgroundColor: speaking ? accentColor : 'transparent', borderColor: accentColor }]}>{speaking ? '■' : '▶'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

