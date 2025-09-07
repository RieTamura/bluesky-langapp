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

const SelectableText: React.FC<{ text: string; highlightWordIndex?: number; onLongPressWord?: (wordIndex: number)=>void }> = ({ text, highlightWordIndex, onLongPressWord }) => {
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
  const currentIdx = wordCounter;
  return <Text key={i} onPress={() => setWord && setWord(cleaned)} onLongPress={() => onLongPressWord && onLongPressWord(currentIdx)} style={[styles.token, playing && styles.tokenPlaying]}>{tok}</Text>;
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
  tokenPlaying: { backgroundColor: '#ffe7b3' },
  waveWrap: { flexDirection:'row', alignItems:'center', marginLeft:8 },
  waveBar: { width:3, marginHorizontal:1, borderRadius:1, backgroundColor:'#007aff' }
});

// --- Feed Item with TTS ---
const FeedItem: React.FC<{ item: any; index: number; accentColor: string; secondaryColor: string; borderColor: string }> = ({ item, index, accentColor, secondaryColor, borderColor }) => {
  const [speaking, setSpeaking] = useState(false);
  const [currentWordIdx, setCurrentWordIdx] = useState<number | null>(null);
  const [waveAmps, setWaveAmps] = useState<number[]>([6,10,14,8]);
  const mode = useTTSStore(s => s.mode);
  const manualLanguage = useTTSStore(s => s.manualLanguage);
  const currentPostId = useTTSStore(s => s.currentPostId);
  const setCurrentPostId = useTTSStore(s => s.setCurrentPostId);
  const postId = item?.uri || item?.cid || `idx_${index}`;
  const cancelRef = React.useRef(false);
  const langCacheRef = React.useRef<Record<string, { lang: string; confidence: number }>>({});
  const progressTimerRef = React.useRef<any>(null);
  const tokensRef = React.useRef<{ raw:string; cleaned:string }[]>([]);
  const baseLangRef = React.useRef<string>('en-US');
  const chunkPlanRef = React.useRef<{ start:number; length:number; durations:number[]; total:number }|null>(null);

  const buildTokens = useCallback(() => {
    const text = item?.text || '';
    const rawTokens: string[] = text.split(/\s+/);
    tokensRef.current = rawTokens.map((t:string)=> ({ raw:t, cleaned: stripEdgePunct(t) }))
      .filter(t=> t.cleaned.length>0);
    // base language
    if (mode === 'manual') baseLangRef.current = manualLanguage || 'en-US';
    else {
      const det = detectLanguage(text);
      baseLangRef.current = mapToSpeechCode(det.code);
    }
  }, [item, mode, manualLanguage]);

  const computeChunk = (startIdx: number) => {
    const { chunkMaxWords, detectionConfidenceThreshold } = useTTSStore.getState();
    const tokens = tokensRef.current;
    if (startIdx >= tokens.length) return null;
    const baseLang = baseLangRef.current;
    const out: { token:string; raw:string; lang:string; end:boolean; short:boolean }[] = [];
    let i = startIdx;
    while (i < tokens.length && out.length < chunkMaxWords) {
      const tk = tokens[i];
      let lang = baseLang;
      if (mode === 'auto-multi') {
        const k = tk.cleaned.toLowerCase();
        let det = langCacheRef.current[k];
        if (!det) {
          const d = detectLanguage(tk.cleaned);
            det = { lang: mapToSpeechCode(d.code), confidence: d.confidence };
            langCacheRef.current[k] = det;
        }
        let thr = detectionConfidenceThreshold;
        if (/-(JP|CN)|ja|zh/.test(det.lang)) thr = Math.min(1, thr + 0.1);
        lang = det.confidence >= thr ? det.lang : baseLang;
      }
      const end = /[.!?。！？]$/.test(tk.raw); const short = /[,;、，]$/.test(tk.raw);
      out.push({ token: tk.cleaned, raw: tk.raw, lang, end, short });
      if (out.length >= chunkMaxWords) break;
      const next = tokens[i+1]; if (!next) break;
      if (mode !== 'auto-multi') { i++; continue; }
      const nk = next.cleaned.toLowerCase();
      let detN = langCacheRef.current[nk];
      if (!detN) { const d2 = detectLanguage(next.cleaned); detN = { lang: mapToSpeechCode(d2.code), confidence: d2.confidence }; langCacheRef.current[nk]=detN; }
      let thrN = detectionConfidenceThreshold; if (/-(JP|CN)|ja|zh/.test(detN.lang)) thrN = Math.min(1, thrN + 0.1);
      const nLang = detN.confidence >= thrN ? detN.lang : baseLang;
      if (nLang !== out[0].lang) break; // 言語変化
      i++;
    }
    // durations estimation
    const { ttsRate } = useTTSStore.getState();
    const speedFactor = 1 / ttsRate;
    const durations = out.map(x=> Math.max(60, x.token.length * 45 * speedFactor));
    const total = durations.reduce((a,b)=> a+b,0);
    chunkPlanRef.current = { start:startIdx, length: out.length, durations, total };
    return out;
  };

  const clearTimers = () => {
    if (progressTimerRef.current) { clearInterval(progressTimerRef.current); progressTimerRef.current=null; }
  };

  const speakChunkFrom = (startIdx: number) => {
    const tokens = tokensRef.current;
    if (startIdx >= tokens.length) { finishPlayback(); return; }
    const chunk = computeChunk(startIdx);
    if (!chunk) { finishPlayback(); return; }
    setCurrentWordIdx(startIdx);
    // progress-driven waveform + highlight
    clearTimers();
    const plan = chunkPlanRef.current!; // not null
    const startTime = Date.now();
    const phases = [0, Math.PI/2, Math.PI, 3*Math.PI/2];
    progressTimerRef.current = setInterval(()=> {
      if (cancelRef.current || !speaking) return; 
      const elapsed = Date.now() - startTime;
      // highlight progression
      let acc=0; let local=0;
      for (; local < plan.durations.length; local++) { acc += plan.durations[local]; if (elapsed < acc) break; }
      if (local !== plan.durations.length && startIdx + local !== currentWordIdx) setCurrentWordIdx(startIdx + Math.min(local, plan.durations.length-1));
      // waveform amplitude (0-1 progress)
      const prog = Math.min(1, elapsed / plan.total);
      const energy = 0.6 + 0.4 * Math.sin(prog * Math.PI);
      setWaveAmps(phases.map(p => 6 + Math.abs(Math.sin(prog * 4 * Math.PI + p))*14*energy));
      if (elapsed >= plan.total) {
        clearTimers();
      }
    }, 60);
    const chunkText = chunk.map(x=> x.token).join(' ');
    const chunkLang = chunk[0].lang;
    const last = chunk[chunk.length-1];
    const { ttsRate, ttsPitch, pauseSentenceMs, pauseShortMs, pauseWordMs } = useTTSStore.getState();
    Speech.stop();
    Speech.speak(chunkText, {
      language: chunkLang,
      rate: Math.min(2, Math.max(0.1, ttsRate)),
      pitch: Math.min(2, Math.max(0.5, ttsPitch)),
      onDone: () => {
        if (cancelRef.current) return;
        const baseDelay = last.end ? pauseSentenceMs : last.short ? pauseShortMs : pauseWordMs;
        const delay = Math.max(20, baseDelay / ttsRate);
        setTimeout(()=> speakChunkFrom(startIdx + chunk.length), delay);
      },
      onError: () => speakChunkFrom(startIdx + chunk.length),
      onStopped: () => {/* manual stop */}
    });
  };

  const finishPlayback = () => {
    clearTimers();
    setSpeaking(false);
    setCurrentWordIdx(null);
    setCurrentPostId(null);
  };

  const startPlayback = (startIdx=0) => {
    const text = item?.text || '';
    if (!text.trim()) return;
    cancelRef.current = false;
    setSpeaking(true);
    setCurrentPostId(postId);
    buildTokens();
    speakChunkFrom(startIdx);
  };

  const stopPlayback = () => {
    cancelRef.current = true;
    Speech.stop();
    finishPlayback();
  };

  const onPressSpeak = useCallback(() => {
    if (speaking) { stopPlayback(); return; }
    startPlayback(0);
  }, [speaking, buildTokens]);

  const resumeFrom = useCallback((wordIndex: number) => {
    stopPlayback();
    startPlayback(wordIndex);
  }, [buildTokens]);
  // 外部停止 (他の投稿再生開始など) を検知
  React.useEffect(()=> {
    if (currentPostId !== postId && speaking) {
      setSpeaking(false);
    }
  }, [currentPostId, postId, speaking]);
  return (
    <View style={[styles.feedRow,{ borderColor, backgroundColor: currentPostId === postId ? 'rgba(0,122,255,0.08)' : 'transparent' }]}> 
      <Text style={[styles.handle,{ color: accentColor }]}>@{item.author?.handle}</Text>
      <SelectableText text={item.text} highlightWordIndex={currentWordIdx ?? undefined} onLongPressWord={resumeFrom} />
      <View style={styles.dateRow}>
        <Text style={[styles.time,{ color: secondaryColor }]}>{new Date(item.createdAt).toLocaleString()}</Text>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={speaking ? '音声停止' : '読み上げ'} onPress={onPressSpeak} style={styles.ttsBtn}>
          <Text style={[styles.ttsBtnText,{ color: speaking ? '#fff' : accentColor, backgroundColor: speaking ? accentColor : 'transparent', borderColor: accentColor }]}>{speaking ? '■' : '▶'}</Text>
          {speaking && (
            <View style={styles.waveWrap} accessibilityLabel="再生中インジケータ">
              {[0,1,2,3].map(b => <AnimatedBar key={b} delay={b * 90} />)}
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

// 簡易アニメーションバー (擬似): setInterval で高さを揺らす
const AnimatedBar: React.FC<{ delay:number }> = ({ delay }) => {
  const [h, setH] = React.useState(6);
  React.useEffect(()=> {
    let mounted = true;
    const tick = () => { if(!mounted) return; setH(6 + Math.round(Math.random()*10)); };
    const id = setInterval(tick, 250 + delay);
    return () => { mounted = false; clearInterval(id); };
  }, [delay]);
  return <View style={[styles.waveBar,{ height: h }]} />;
};

