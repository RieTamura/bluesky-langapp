import React, {
  useState,
  useMemo,
  useRef,
  useCallback,
  useEffect,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  SafeAreaView,
  NativeSyntheticEvent,
  NativeScrollEvent,
  ScrollView,
  Alert,
  Animated,
  ActivityIndicator,
  Linking,
  Platform,
} from "react-native";
// import * as Speech from 'expo-speech'; // ← 遅延ロードに切り替え
import { useTTSStore } from "../stores/tts";
import { detectLanguage, mapToSpeechCode } from "../utils/langDetect";
import { useThemeColors, useResolvedTheme } from "../stores/theme";
import { useAuth } from "../hooks/useAuth";
import {
  useUserPosts,
  useFollowingFeed,
  useDiscoverFeed,
} from "../hooks/usePosts";
import { useFeedStore } from "../stores/feed";
import { ListFilter } from "../components/Icons";
import { Languages } from "lucide-react-native";
import { translate as translateService } from "../services/translation";
import { getDeviceLocale } from "../utils/deviceLocale";
import { SquareArrowOutUpRight } from "../components/Icons";
import { WordDetailModal } from "../components/WordDetailModal";
import { useWords } from "../hooks/useWords";
import Constants from "expo-constants";

// チャンク毎エラーによる Alert スパム防止
const ttsErrorAlertedPerPost: Set<string> = new Set();

// 遅延ロード用（必要時のみネイティブ初期化）
let SpeechMod: null | typeof import("expo-speech") = null;
async function ensureSpeech() {
  if (!SpeechMod) {
    const m = await import("expo-speech");
    SpeechMod = m;
  }
  return SpeechMod;
}

// iOS では feature flag で TTS を無効化できるように
function isTTSEnabled() {
  const extra: any =
    (Constants as any)?.expoConfig?.extra ||
    (Constants as any)?.manifest?.extra ||
    {};
  return extra?.enableTTS !== false; // 未指定なら true（=有効）
}

// 共通: トークン前処理
const stripEdgePunct = (tok: string) =>
  tok.replace(
    /^[.,!?;:()"'`[\]{}<>…。、，！？：；（）「」『』]+|[.,!?;:()"'`[\]{}<>…。、，！？：；（）「」『』]+$/g,
    "",
  );

// 動的トークンスタイル計算ヘルパー
const getTokenStyles = (params: {
  noBg: boolean;
  playing: boolean;
  resolved: string;
  tokenBg: string;
  tokenPlayingBg: string;
  colors: { text: string };
}) => {
  const { noBg, playing, resolved, tokenBg, tokenPlayingBg, colors } = params;
  const dynamic: any[] = [styles.token];
  if (noBg) dynamic.push(styles.tokenNoBg);
  if (!noBg && !playing) dynamic.push({ backgroundColor: tokenBg });
  if (playing) dynamic.push({ backgroundColor: tokenPlayingBg });
  if (playing && resolved === "dark") dynamic.push({ color: colors.text });
  return dynamic;
};

// helper to safely pick an accent color or fallback
function accentColorOrDefault(colors: any) {
  return colors?.accent || "#007AFF";
}

// メイン画面
export const MainScreen: React.FC = () => {
  const { identifier } = useAuth();
  const [limit, setLimit] = useState(20);
  const userPosts = useUserPosts(identifier || undefined, limit);
  const following = useFollowingFeed(limit);
  const discover = useDiscoverFeed(limit);
  const feedTab = useFeedStore((s) => s.feedTab);
  const setFeedTab = useFeedStore((s) => s.setFeedTab);
  const loadingFeed =
    userPosts.isLoading || following.isLoading || discover.isLoading;
  const currentFeed = useMemo(() => {
    switch (feedTab) {
      case "posts":
        return userPosts.data || [];
      case "following":
        return following.data || [];
      case "discover":
        return discover.data || [];
    }
  }, [feedTab, userPosts.data, following.data, discover.data]);

  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  (MainScreen as any)._setWord = (w: string) => setSelectedWord(w);

  const c = useThemeColors();
  const { words: allWords } = useWords();
  const knownWords = useMemo(
    () =>
      new Set(
        allWords
          .filter((w) => w.status === "known")
          .map((w) => w.word.toLowerCase()),
      ),
    [allWords],
  );

  const [showTopBtn, setShowTopBtn] = useState(false);
  const scrollRef = useRef<any>(null);
  const scrollToTop = useCallback(() => {
    scrollRef.current?.scrollTo?.({ y: 0, animated: true });
  }, []);
  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = e.nativeEvent.contentOffset.y;
      if (!showTopBtn && y > 200) setShowTopBtn(true);
      else if (showTopBtn && y <= 200) setShowTopBtn(false);
    },
    [showTopBtn],
  );

  const showFeedFilters = useFeedStore((s) => s.showFeedFilters);
  const setShowFeedFilters = useFeedStore((s) => s.setShowFeedFilters);
  const feedAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (showFeedFilters) {
      Animated.timing(feedAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(feedAnim, {
        toValue: 0,
        duration: 160,
        useNativeDriver: true,
      }).start();
    }
  }, [showFeedFilters, feedAnim]);

  return (
    <>
      <SafeAreaView
        style={[styles.container, { backgroundColor: c.background }]}
      >
        <View
          style={{
            width: "100%",
            maxWidth: 680,
            alignSelf: "center",
            paddingHorizontal: 16,
            position: "relative",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              marginTop: 6,
              alignItems: "center",
              justifyContent: "space-between",
            }}
            accessibilityRole="tablist"
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              {(
                [
                  { key: "posts", label: "Posts" },
                  { key: "following", label: "Following" },
                  { key: "discover", label: "Discover" },
                ] as const
              ).map((t) => {
                const active = feedTab === t.key;
                return (
                  <TouchableOpacity
                    key={t.key}
                    onPress={() => setFeedTab(t.key)}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: active }}
                    style={{
                      paddingVertical: 8,
                      paddingHorizontal: 12,
                      marginRight: 8,
                      borderBottomWidth: 2,
                      borderBottomColor: active ? c.accent : "transparent",
                    }}
                  >
                    <Text
                      style={{
                        color: active ? c.accent : c.text,
                        fontWeight: "600",
                      }}
                    >
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity
              onPress={() => setShowFeedFilters(!showFeedFilters)}
              accessibilityRole="button"
              accessibilityLabel="フィルター"
              style={{ padding: 8 }}
            >
              <View
                style={{
                  width: 28,
                  height: 28,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <ListFilter size={20} color={c.text} />
                <View
                  style={{
                    position: "absolute",
                    top: -6,
                    right: -6,
                    minWidth: 18,
                    height: 18,
                    borderRadius: 9,
                    backgroundColor: c.accent,
                    justifyContent: "center",
                    alignItems: "center",
                    paddingHorizontal: 4,
                  }}
                >
                  <Text
                    style={{ color: "#fff", fontSize: 10, fontWeight: "700" }}
                  >
                    {limit}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>

          {showFeedFilters && (
            <Animated.View
              style={{
                position: "absolute",
                top: "100%",
                right: 0,
                opacity: feedAnim,
                transform: [
                  {
                    translateY: feedAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-6, 0],
                    }),
                  },
                ],
                zIndex: 30,
              }}
              pointerEvents={showFeedFilters ? "auto" : "none"}
            >
              <View style={{ alignItems: "flex-end", paddingHorizontal: 0 }}>
                <View
                  style={{
                    backgroundColor: c.surface,
                    borderRadius: 10,
                    padding: 10,
                    borderWidth: StyleSheet.hairlineWidth,
                    borderColor: c.border,
                    shadowColor: "#000",
                    shadowOpacity: 0.06,
                    shadowRadius: 6,
                    elevation: 4,
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    {[10, 20, 50, 100].map((v) => {
                      const active = limit === v;
                      return (
                        <TouchableOpacity
                          key={v}
                          style={{
                            paddingVertical: 6,
                            paddingHorizontal: 10,
                            borderRadius: 12,
                            marginRight: 8,
                            backgroundColor: active ? c.accent : c.surface,
                            borderWidth: StyleSheet.hairlineWidth,
                            borderColor: active ? c.accent : c.border,
                          }}
                          onPress={() => {
                            setLimit(v);
                            setShowFeedFilters(false);
                          }}
                          accessibilityRole="button"
                          accessibilityState={{ selected: active }}
                        >
                          <Text
                            style={{
                              color: active ? "#fff" : c.text,
                              fontWeight: "600",
                            }}
                          >
                            {v}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </View>
            </Animated.View>
          )}
        </View>

        <ScrollView
          ref={scrollRef}
          onScroll={onScroll}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl
              refreshing={loadingFeed}
              onRefresh={refetchCurrentFeed}
            />
          }
          contentContainerStyle={styles.scrollContent}
        >
          {loadingFeed && (!currentFeed || currentFeed.length === 0) ? (
            <View
              style={{
                width: "100%",
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
                paddingVertical: 40,
              }}
            >
              <ActivityIndicator />
            </View>
          ) : (
            currentFeed.map((item: any, i: number) => (
              <FeedItem
                key={feedTab + "-" + i}
                item={item}
                index={i}
                accentColor={c.accent}
                secondaryColor={c.secondaryText}
                borderColor={c.border}
                knownWords={knownWords}
              />
            ))
          )}
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
      <WordDetailModal
        word={selectedWord}
        onClose={() => setSelectedWord(null)}
      />
    </>
  );

  function refetchCurrentFeed() {
    if (feedTab === "posts") userPosts.refetch();
    else if (feedTab === "following") following.refetch();
    else discover.refetch();
  }
};

const SelectableText: React.FC<{
  text: string;
  highlightWordIndex?: number;
  onLongPressWord?: (wordIndex: number) => void;
  knownWords: Set<string>;
}> = ({ text, highlightWordIndex, onLongPressWord, knownWords }) => {
  const setWord = (MainScreen as any)._setWord as (w: string) => void;
  const colors = useThemeColors();
  const resolved = useResolvedTheme();
  const tokenBg = resolved === "dark" ? "#1d252b" : "#eef2f7";
  const tokenPlayingBg =
    resolved === "dark" ? "rgba(255,200,80,0.25)" : "#ffe7b3";
  let wordCounter = -1;

  const parts = Array.from(text.split(/(\s+)/)).filter((p) => p !== "");
  return (
    <View style={styles.tokensWrap}>
      {parts.map((part, i) => {
        if (/^\s+$/.test(part))
          return (
            <Text key={i} style={styles.space}>
              {part}
            </Text>
          );
        const tok = part;
        const cleaned = stripEdgePunct(tok)
          .replace(/[\u200B\uFEFF]/g, "")
          .trim();
        if (!cleaned) {
          const dynamicStyles = getTokenStyles({
            noBg: false,
            playing: false,
            resolved,
            tokenBg,
            tokenPlayingBg,
            colors,
          });
          return (
            <Text key={i} style={[dynamicStyles, { color: colors.text }]}>
              {tok}
            </Text>
          );
        }
        const isHashtag = cleaned.startsWith("#") && cleaned.length > 1;
        const strictUrlRegex =
          /^(?:https?:\/\/\S+|www\.[^\s]+|[a-z0-9.-]+\.[a-z]{2,}(?:\/\S*)?)$/i;
        const dotLike =
          /^[^\s]*\.[^\s]*$/i.test(cleaned) && /[A-Za-z]/.test(cleaned);
        const isUrl = strictUrlRegex.test(cleaned) || dotLike;

        let currentIdx: number | null = null;
        if (!isHashtag && !isUrl) {
          wordCounter += 1;
          currentIdx = wordCounter;
        }
        const playing =
          currentIdx !== null && highlightWordIndex === currentIdx;
        const lw = cleaned.toLowerCase();
        const isKnown = knownWords.has(lw);
        const noBg = isKnown || isHashtag || isUrl;
        const dynamicStyles = getTokenStyles({
          noBg,
          playing,
          resolved,
          tokenBg,
          tokenPlayingBg,
          colors,
        });

        if (isUrl) {
          const href = cleaned.startsWith("http")
            ? cleaned
            : `https://${cleaned}`;
          return (
            <Text
              key={i}
              onPress={() => {
                Linking.openURL(href).catch(() =>
                  Alert.alert("リンクを開けませんでした", href),
                );
              }}
              onLongPress={() => {}}
              style={[
                dynamicStyles,
                {
                  color: accentColorOrDefault(colors),
                  textDecorationLine: "underline",
                },
              ]}
            >
              {tok}
            </Text>
          );
        }

        return (
          <Text
            key={i}
            onPress={() => {
              if (cleaned && !isHashtag) setWord && setWord(cleaned);
            }}
            onLongPress={() =>
              currentIdx !== null &&
              onLongPressWord &&
              onLongPressWord(currentIdx)
            }
            style={[dynamicStyles, { color: colors.text }]}
          >
            {tok}
          </Text>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 48,
    paddingBottom: 140,
  },
  feedRow: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    width: "100%",
    maxWidth: 680,
    alignSelf: "center",
  },
  handle: { fontWeight: "600", marginBottom: 6 },
  postText: { fontSize: 15, lineHeight: 20 },
  tokensWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-start",
  },
  token: {
    fontSize: 15,
    lineHeight: 20,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 4,
    marginBottom: 4,
    borderRadius: 6,
  },
  tokenNoBg: { backgroundColor: "transparent" },
  space: { fontSize: 15, lineHeight: 20 },
  time: { marginTop: 8, fontSize: 11 },
  scrollContent: {
    paddingHorizontal: 16,
    alignItems: "center",
    paddingBottom: 40,
  },
  scrollTopButton: {
    position: "absolute",
    bottom: 32,
    right: 24,
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  scrollTopButtonText: {
    fontSize: 24,
    color: "#fff",
    fontWeight: "700",
    lineHeight: 28,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  ttsBtn: {
    marginLeft: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  ttsBtnText: {
    fontSize: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
});

// --- Feed Item with TTS ---
const FeedItem: React.FC<{
  item: any;
  index: number;
  accentColor: string;
  secondaryColor: string;
  borderColor: string;
  knownWords: Set<string>;
}> = ({
  item,
  index,
  accentColor,
  secondaryColor,
  borderColor,
  knownWords,
}) => {
  const [speaking, setSpeaking] = useState(false);
  const [currentWordIdx, setCurrentWordIdx] = useState<number | null>(null);
  const speakingRef = React.useRef(speaking);
  React.useEffect(() => {
    speakingRef.current = speaking;
  }, [speaking]);
  const mode = useTTSStore((s) => s.mode);
  const manualLanguage = useTTSStore((s) => s.manualLanguage);
  const currentPostId = useTTSStore((s) => s.currentPostId);
  const setCurrentPostId = useTTSStore((s) => s.setCurrentPostId);
  const postId = item?.uri || item?.cid || `idx_${index}`;
  const cancelRef = React.useRef(false);
  const langCacheRef = React.useRef<
    Record<string, { lang: string; confidence: number }>
  >({});
  const progressTimerRef = React.useRef<any>(null);
  const tokensRef = React.useRef<{ raw: string; cleaned: string }[]>([]);
  const baseLangRef = React.useRef<string>("en-US");
  const chunkPlanRef = React.useRef<{
    start: number;
    length: number;
    durations: number[];
    total: number;
  } | null>(null);
  const adaptiveSpeedRef = React.useRef<number>(1);
  const chunkStartTimeRef = React.useRef<number>(0);

  const buildTokens = useCallback(() => {
    const text = item?.text || "";
    const isHashtag = (s: string) => /^#[\p{L}\p{N}_]+$/u.test(s);
    const isUrl = (s: string) =>
      /^(?:https?:\/\/\S+|www\.[^\s]+|[a-z0-9.-]+\.[a-z]{2,}(?:\/\S*)?)$/i.test(
        s,
      );
    const matches = Array.from(
      text.matchAll(
        /(https?:\/\/\S+|www\.[^\s]+|[a-z0-9.-]+\.[a-z]{2,}(?:\/\S*)?)|(#?[\p{L}\p{N}'’-]+)/gu,
      ),
    );
    tokensRef.current = matches
      .map((m: any) => {
        const raw = m[0];
        const cleaned = stripEdgePunct(raw)
          .replace(/[\u200B\uFEFF]/g, "")
          .trim();
        return { raw, cleaned };
      })
      .filter(
        (t) =>
          t.cleaned.length > 0 && !isHashtag(t.cleaned) && !isUrl(t.cleaned),
      );
    if (mode === "manual") baseLangRef.current = manualLanguage || "en-US";
    else {
      const det = detectLanguage(text);
      baseLangRef.current = mapToSpeechCode(det.code);
    }
  }, [item, mode, manualLanguage]);

  const detectTokenLanguage = (
    tokenClean: string,
    baseLang: string,
    modeLocal: string,
    cache: React.MutableRefObject<
      Record<string, { lang: string; confidence: number }>
    >,
    threshold: number,
  ): { lang: string; confidence: number } => {
    if (modeLocal !== "auto-multi") return { lang: baseLang, confidence: 1 };
    const key = tokenClean.toLowerCase();
    let cached = cache.current[key];
    if (!cached) {
      const det = detectLanguage(tokenClean);
      cached = { lang: mapToSpeechCode(det.code), confidence: det.confidence };
      cache.current[key] = cached;
    }
    let thr = threshold;
    if (/-(JP|CN)|ja|zh/.test(cached.lang)) thr = Math.min(1, thr + 0.1);
    const finalLang = cached.confidence >= thr ? cached.lang : baseLang;
    return { lang: finalLang, confidence: cached.confidence };
  };

  const shouldBreakBetweenTokens = (
    prevLang: string,
    nextToken: { cleaned: string },
    baseLang: string,
    modeLocal: string,
    cache: React.MutableRefObject<
      Record<string, { lang: string; confidence: number }>
    >,
    threshold: number,
  ): boolean => {
    if (!nextToken) return true;
    if (modeLocal !== "auto-multi") return false;
    const result = detectTokenLanguage(
      nextToken.cleaned,
      baseLang,
      modeLocal,
      cache,
      threshold,
    );
    return result.lang !== prevLang;
  };

  const clampTTSRate = (rate: number) => Math.min(2, Math.max(0.1, rate));

  const calculateChunkDurations = (
    slice: { token: string; end: boolean; short: boolean }[],
    ttsRate: number,
    lang: string,
  ) => {
    const charBase = /ja|zh|ko/.test(lang) ? 105 : 90;
    const store = useTTSStore.getState();
    const { pauseSentenceMs, pauseShortMs } = store;
    const adaptive = adaptiveSpeedRef.current;
    const invRate = 1 / ttsRate;
    const durations = slice.map((tok, idx) => {
      const base = Math.max(80, tok.token.length * charBase * invRate);
      let extra = 0;
      if (idx < slice.length - 1) {
        if (tok.end) extra = pauseSentenceMs * 0.6 * invRate;
        else if (tok.short) extra = pauseShortMs * 0.5 * invRate;
      }
      return (base + extra) * adaptive;
    });
    const total = durations.reduce((a, b) => a + b, 0);
    return { durations, total };
  };

  const computeChunk = (startIdx: number) => {
    const { chunkMaxWords, detectionConfidenceThreshold } =
      useTTSStore.getState();
    const tokens = tokensRef.current;
    if (startIdx >= tokens.length) return null;
    const baseLang = baseLangRef.current;
    const built: {
      token: string;
      raw: string;
      lang: string;
      end: boolean;
      short: boolean;
    }[] = [];
    let i = startIdx;
    while (i < tokens.length && built.length < chunkMaxWords) {
      const tk = tokens[i];
      const det = detectTokenLanguage(
        tk.cleaned,
        baseLang,
        mode,
        langCacheRef,
        detectionConfidenceThreshold,
      );
      const end = /[.!?。！？]$/.test(tk.raw);
      const short = /[,;、，]$/.test(tk.raw);
      built.push({
        token: tk.cleaned,
        raw: tk.raw,
        lang: det.lang,
        end,
        short,
      });
      if (built.length >= chunkMaxWords) break;
      const next = tokens[i + 1];
      if (!next) break;
      if (
        shouldBreakBetweenTokens(
          built[0].lang,
          next,
          baseLang,
          mode,
          langCacheRef,
          detectionConfidenceThreshold,
        )
      )
        break;
      i++;
    }
    const { durations, total } = calculateChunkDurations(
      built,
      clampTTSRate(useTTSStore.getState().ttsRate),
      built[0].lang,
    );
    chunkPlanRef.current = {
      start: startIdx,
      length: built.length,
      durations,
      total,
    };
    return built;
  };

  const clearTimers = () => {
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
  };

  // Speech モジュールを引数で受け取り、遅延ロードに対応
  const speakChunkFrom = (
    startIdx: number,
    M: typeof import("expo-speech"),
  ) => {
    const tokens = tokensRef.current;
    if (startIdx >= tokens.length) {
      finishPlayback();
      return;
    }
    const chunk = computeChunk(startIdx);
    if (!chunk) {
      finishPlayback();
      return;
    }
    setCurrentWordIdx(startIdx);
    clearTimers();
    const plan = chunkPlanRef.current!;
    const startTime = Date.now();
    chunkStartTimeRef.current = startTime;
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
    progressTimerRef.current = setInterval(() => {
      if (cancelRef.current || !speakingRef.current) {
        if (progressTimerRef.current) {
          clearInterval(progressTimerRef.current);
          progressTimerRef.current = null;
        }
        return;
      }
      const elapsed = Date.now() - startTime;
      let acc = 0;
      let local = 0;
      for (; local < plan.durations.length; local++) {
        acc += plan.durations[local];
        if (elapsed < acc) break;
      }
      if (
        local !== plan.durations.length &&
        startIdx + local !== currentWordIdx
      )
        setCurrentWordIdx(
          startIdx + Math.min(local, plan.durations.length - 1),
        );
      if (elapsed >= plan.total) {
        clearTimers();
      }
    }, 60);

    const chunkText = chunk.map((x) => x.token).join(" ");
    const chunkLang = chunk[0].lang;
    const last = chunk[chunk.length - 1];
    const { ttsRate, ttsPitch, pauseSentenceMs, pauseShortMs, pauseWordMs } =
      useTTSStore.getState();

    try {
      M.stop();
    } catch {}
    M.speak(chunkText, {
      language: chunkLang,
      rate: clampTTSRate(ttsRate),
      pitch: Math.min(2, Math.max(0.5, ttsPitch)),
      onDone: () => {
        if (cancelRef.current) return;
        try {
          const actual = Date.now() - chunkStartTimeRef.current;
          const predicted = plan.total;
          if (predicted > 0) {
            const ratio = actual / predicted;
            adaptiveSpeedRef.current = Math.max(
              0.5,
              Math.min(2, adaptiveSpeedRef.current * 0.7 + ratio * 0.3),
            );
          }
        } catch {}
        const baseDelay = last.end
          ? pauseSentenceMs
          : last.short
            ? pauseShortMs
            : pauseWordMs;
        const delay = Math.max(20, baseDelay / ttsRate);
        setTimeout(() => speakChunkFrom(startIdx + chunk.length, M), delay);
      },
      onError: (_err: any) => {
        try {
          console.error("[TTS] chunk error", {
            postId,
            startIdx,
            chunkLength: chunk.length,
            lang: chunkLang,
          });
        } catch {}
        if (!ttsErrorAlertedPerPost.has(postId)) {
          Alert.alert(
            "TTSエラー",
            "一部の読み上げに失敗しました。続行します。",
          );
          ttsErrorAlertedPerPost.add(postId);
        }
        speakChunkFrom(startIdx + chunk.length, M);
      },
      onStopped: () => {},
    });
  };

  const finishPlayback = () => {
    clearTimers();
    setSpeaking(false);
    setCurrentWordIdx(null);
    setCurrentPostId(null);
    ttsErrorAlertedPerPost.delete(postId);
  };

  // iOS では enableTTS=false の間は何もしない。必要時のみ動的 import。
  const startPlayback = async (startIdx = 0) => {
    if (Platform.OS === "ios" && !isTTSEnabled()) {
      return;
    }
    const M = await ensureSpeech().catch(() => null);
    if (!M) return;

    const text = item?.text || "";
    if (!text.trim()) return;
    cancelRef.current = false;
    setSpeaking(true);
    setCurrentPostId(postId);
    buildTokens();
    speakChunkFrom(startIdx, M);
  };

  const stopPlayback = () => {
    cancelRef.current = true;
    try {
      SpeechMod?.stop?.();
    } catch {}
    finishPlayback();
  };

  const onPressSpeak = useCallback(() => {
    if (speaking) {
      stopPlayback();
      return;
    }
    startPlayback(0);
  }, [speaking, buildTokens]);

  const resumeFrom = useCallback(
    (wordIndex: number) => {
      stopPlayback();
      startPlayback(wordIndex);
    },
    [stopPlayback, startPlayback],
  );

  useEffect(() => {
    return () => {
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
    };
  }, []);

  React.useEffect(() => {
    if (currentPostId !== postId && speaking) {
      setSpeaking(false);
      clearTimers();
      try {
        SpeechMod?.stop?.();
      } catch {}
      setCurrentWordIdx(null);
    }
  }, [currentPostId, postId, speaking]);

  const resolved = useResolvedTheme();
  const highlightBg =
    resolved === "dark" ? "rgba(51,145,255,0.14)" : "rgba(0,122,255,0.08)";

  const openBlueskyProfile = (handle?: string) => {
    if (!handle) return;
    const sanitized = handle.replace(/_/g, "");
    const url = `https://bsky.app/profile/${sanitized}`;
    Linking.openURL(url).catch(() =>
      Alert.alert("リンクを開けませんでした", url),
    );
  };

  const openBlueskyPost = async (item?: any) => {
    if (!item) return;
    const tryOpen = async (url: string) => {
      try {
        await Linking.openURL(url);
        return true;
      } catch (e) {
        return false;
      }
    };

    if (typeof item.url === "string" && item.url) {
      const ok = await tryOpen(item.url);
      if (!ok) Alert.alert("リンクを開けませんでした", item.url);
      return;
    }
    if (typeof item.postUrl === "string" && item.postUrl) {
      const ok = await tryOpen(item.postUrl);
      if (!ok) Alert.alert("リンクを開けませんでした", item.postUrl);
      return;
    }

    const uri =
      item.uri || item.id || item.cid || item.record?.uri || item.post?.uri;
    if (typeof uri === "string") {
      const atUri = uri.startsWith("at://") ? uri : undefined;
      if (atUri) {
        const appDeep = `bsky://post?uri=${encodeURIComponent(atUri)}`;
        try {
          const can = await Linking.canOpenURL(appDeep);
          if (can) {
            const ok = await tryOpen(appDeep);
            if (ok) return;
          }
        } catch (e) {}
      }

      const m = String(uri).match(/app\.bsky\.feed\.post\/(.+)$/);
      const handle = item.author?.handle || item.handle || item.author?.did;
      if (m && m[1]) {
        const rkey = m[1];
        if (handle) {
          const sanitized = String(handle).replace(/_/g, "");
          const appDeepProfilePost = `bsky://profile?handle=${encodeURIComponent(
            sanitized,
          )}&post=${encodeURIComponent(rkey)}`;
          try {
            const can2 = await Linking.canOpenURL(appDeepProfilePost);
            if (can2) {
              const ok = await tryOpen(appDeepProfilePost);
              if (ok) return;
            }
          } catch (e) {}
          const web = `https://bsky.app/profile/${encodeURIComponent(
            sanitized,
          )}/post/${encodeURIComponent(rkey)}`;
          const okWeb = await tryOpen(web);
          if (!okWeb) Alert.alert("リンクを開けませんでした", web);
          return;
        }
        const web2 = `https://bsky.app/post/${encodeURIComponent(rkey)}`;
        const okWeb2 = await tryOpen(web2);
        if (!okWeb2) Alert.alert("リンクを開けませんでした", web2);
        return;
      }

      if (/^https?:\/\//.test(String(uri))) {
        const ok = await tryOpen(String(uri));
        if (!ok) Alert.alert("リンクを開けませんでした", String(uri));
        return;
      }

      const webFallback = `https://bsky.app/post/${encodeURIComponent(String(uri))}`;
      const okFallback = await tryOpen(webFallback);
      if (!okFallback) Alert.alert("元投稿が見つかりません");
      return;
    }
    Alert.alert("元投稿が見つかりません");
  };

  return (
    <View
      style={[
        styles.feedRow,
        {
          borderColor,
          backgroundColor:
            currentPostId === postId ? highlightBg : "transparent",
        },
      ]}
    >
      <Text
        style={[styles.handle, { color: accentColor }]}
        onPress={() => openBlueskyProfile(item.author?.handle)}
        accessibilityRole="link"
      >
        @{item.author?.handle}
      </Text>

      <SelectableText
        text={item.text}
        highlightWordIndex={currentWordIdx ?? undefined}
        onLongPressWord={resumeFrom}
        knownWords={knownWords}
      />

      <View style={styles.dateRow}>
        <Text style={{ color: secondaryColor, marginRight: 8 }}>
          {new Date(item.createdAt).toLocaleString()}
        </Text>

        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TouchableOpacity
            accessibilityRole="link"
            accessibilityLabel="元投稿を開く"
            onPress={() => openBlueskyPost(item)}
            style={{ padding: 8, marginRight: 8 }}
          >
            <SquareArrowOutUpRight
              color={accentColor}
              size={18}
              accessibilityLabel="元投稿を開くアイコン"
            />
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={speaking ? "音声停止" : "読み上げ"}
            onPress={onPressSpeak}
            style={styles.ttsBtn}
          >
            <Text
              style={[
                styles.ttsBtnText,
                {
                  color: speaking ? "#fff" : accentColor,
                  backgroundColor: speaking ? accentColor : "transparent",
                  borderColor: accentColor,
                },
              ]}
            >
              {speaking ? "■" : "▶"}
            </Text>
          </TouchableOpacity>

          <TranslationButton
            item={item}
            accentColor={accentColor}
            secondaryColor={secondaryColor}
          />
        </View>
      </View>
    </View>
  );
};

const TranslationButton: React.FC<{
  item: any;
  accentColor: string;
  secondaryColor: string;
}> = ({ item, accentColor, secondaryColor }) => {
  const [loading, setLoading] = React.useState(false);
  const [translated, setTranslated] = React.useState<string | null>(null);
  const mountedRef = React.useRef(true);
  React.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);
  const onPress = async () => {
    if (loading) return;
    if (translated) {
      setTranslated(null);
      return;
    }
    const text = item?.text || "";
    if (!text.trim()) return;
    setLoading(true);
    try {
      const target = getDeviceLocale();
      const res = await translateService(text, target);
      if (!mountedRef.current) return;
      setTranslated(res.text || "");
    } catch (e) {
      console.error("[translation] failed", e);
      if (!mountedRef.current) return;
      setTranslated("");
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  return (
    <View style={{ alignItems: "center", marginLeft: 6 }}>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="翻訳"
        onPress={onPress}
        style={{ padding: 6 }}
      >
        <Languages size={18} color={accentColor} />
      </TouchableOpacity>
      {loading ? (
        <Text style={{ fontSize: 11, color: secondaryColor }}>翻訳中…</Text>
      ) : null}
      {translated !== null ? (
        <Text style={{ marginTop: 6, fontSize: 13, color: secondaryColor }}>
          {translated}
        </Text>
      ) : null}
    </View>
  );
};
