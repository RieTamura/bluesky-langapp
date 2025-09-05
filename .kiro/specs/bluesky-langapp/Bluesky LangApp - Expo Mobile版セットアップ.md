# Bluesky LangApp - Expo Mobile版セットアップ

## プロジェクト構成（シンプル版）

```
bluesky-langapp/
├── backend/         # 既存のExpress API（そのまま活用）
└── mobile/          # Expo React Native（新規作成）
    ├── App.tsx
    ├── app.json
    ├── package.json
    ├── src/
    │   ├── screens/           # 画面コンポーネント
    │   │   ├── AuthScreen.tsx
    │   │   ├── PostsScreen.tsx
    │   │   ├── WordsScreen.tsx
    │   │   ├── QuizScreen.tsx
    │   │   ├── ProgressScreen.tsx
    │   │   └── ShareScreen.tsx
    │   ├── components/        # 再利用可能コンポーネント
    │   │   ├── WordCard.tsx
    │   │   ├── PostItem.tsx
    │   │   ├── QuizCard.tsx
    │   │   └── ProgressChart.tsx
    │   ├── navigation/        # ナビゲーション設定
    │   │   └── AppNavigator.tsx
    │   ├── services/          # API通信
    │   │   ├── api.ts
    │   │   ├── auth.ts
    │   │   ├── posts.ts
    │   │   ├── words.ts
    │   │   ├── tangled.ts
    │   │   └── bluesky.ts
    │   ├── hooks/             # カスタムフック
    │   │   ├── useAuth.ts
    │   │   ├── usePosts.ts
    │   │   ├── useWords.ts
    │   │   └── useQuiz.ts
    │   ├── utils/             # ユーティリティ
    │   │   ├── storage.ts
    │   │   ├── textProcessor.ts
    │   │   └── constants.ts
    │   └── types/             # 型定義
    │       └── index.ts
    ├── assets/
    └── metro.config.js
```

## 初期セットアップ

### 1. Expoプロジェクト作成
```bash
# プロジェクトルートで
npx create-expo-app mobile --template blank-typescript
cd mobile
```

### 2. 必要なパッケージ追加
```json
{
  "dependencies": {
    "expo": "~49.0.0",
    "react": "18.2.0",
    "react-native": "0.72.6",
    "@react-navigation/native": "^6.1.7",
    "@react-navigation/bottom-tabs": "^6.5.8",
    "@react-navigation/native-stack": "^6.9.13",
    "react-native-screens": "~3.22.0",
    "react-native-safe-area-context": "4.6.3",
    "expo-secure-store": "~12.3.1",
    "expo-file-system": "~15.4.4",
    "expo-sharing": "~11.5.0",
    "expo-constants": "~14.4.2",
    "react-native-svg": "13.9.0",
    "react-native-chart-kit": "^6.12.0",
    "@tanstack/react-query": "^4.29.0",
    "zustand": "^4.4.1"
  }
}
```

## 機能別実装計画（優先順位順）

### 1. 投稿から単語発見 📱

**画面構成:**
- 認証画面（Blueskyログイン）
- 投稿一覧画面（単語ハイライト付き）
- 単語詳細モーダル

**実装フロー:**
```typescript
// src/screens/PostsScreen.tsx
const PostsScreen = () => {
  const { posts, isLoading } = usePosts();
  const { addWord } = useWords();

  return (
    <ScrollView>
      {posts.map(post => (
        <PostItem 
          key={post.id}
          post={post}
          onWordPress={(word) => {
            // 単語タップ時のモーダル表示
            showWordModal(word);
          }}
        />
      ))}
    </ScrollView>
  );
};
```

### 2. 単語帳機能 📚

**画面構成:**
- 単語一覧画面（フィルタリング機能付き）
- 単語詳細画面（意味・例文・音声）

**実装フロー:**
```typescript
// src/screens/WordsScreen.tsx
const WordsScreen = () => {
  const { words, updateWordStatus, deleteWord } = useWords();
  const [filter, setFilter] = useState<'all' | 'learning' | 'known'>('all');

  const filteredWords = words.filter(word => 
    filter === 'all' || word.status === filter
  );

  return (
    <FlatList
      data={filteredWords}
      renderItem={({ item }) => (
        <WordCard
          word={item}
          onStatusChange={updateWordStatus}
          onDelete={deleteWord}
        />
      )}
    />
  );
};
```

### 3. クイズ機能 🧠

**画面構成:**
- クイズ画面（スワイプ操作対応）
- 結果画面（正解率・進捗更新）

**実装フロー:**
```typescript
// src/screens/QuizScreen.tsx
const QuizScreen = () => {
  const { currentQuestion, submitAnswer, nextQuestion } = useQuiz();

  return (
    <View style={styles.container}>
      <QuizCard
        question={currentQuestion}
        onAnswer={(answer) => {
          submitAnswer(answer);
          nextQuestion();
        }}
      />
    </View>
  );
};
```

### 4. 進捗確認 📊

**画面構成:**
- ダッシュボード（統計サマリー）
- 詳細進捗画面（グラフ・履歴）

**実装フロー:**
```typescript
// src/screens/ProgressScreen.tsx
const ProgressScreen = () => {
  const { stats, history } = useProgress();

  return (
    <ScrollView>
      <ProgressChart data={stats} />
      <CalendarView history={history} />
    </ScrollView>
  );
};
```

### 5. Tangled連携 🔄

**機能:**
- 学習データのGit形式エクスポート
- Tangledへの手動アップロード用データ準備

**実装フロー:**
```typescript
// src/services/tangled.ts
export const tangledService = {
  exportToGit: async () => {
    const words = await wordsService.getAllWords();
    const progress = await progressService.getProgress();
    
    const gitData = formatForTangled(words, progress);
    return await FileSystem.writeAsStringAsync(
      `${FileSystem.documentDirectory}learning-data.json`,
      JSON.stringify(gitData, null, 2)
    );
  },

  shareToTangled: async () => {
    const fileUri = await exportToGit();
    await Sharing.shareAsync(fileUri);
  }
};
```

### 6. Blueskyシェア機能 🐦

**機能:**
- 学習成果の自動投稿
- 進捗レポートのシェア

**実装フロー:**
```typescript
// src/services/bluesky.ts
export const blueskyShare = {
  shareProgress: async (stats: ProgressStats) => {
    const message = `📚 今日の学習: ${stats.wordsLearned}個の単語を学習！
累計: ${stats.totalWords}語
継続日数: ${stats.streakDays}日 #BlueskyLangApp`;

    return await blueskyApi.createPost(message);
  },

  shareQuizResult: async (score: QuizResult) => {
    const message = `🧠 クイズ結果: ${score.correct}/${score.total}問正解！
正解率: ${score.percentage}% #語学学習`;

    return await blueskyApi.createPost(message);
  }
};
```

## API通信設定

### 既存バックエンドとの連携
```typescript
// src/services/api.ts
import Constants from 'expo-constants';

const API_BASE = __DEV__ 
  ? 'http://localhost:3000'  // 開発時
  : Constants.expoConfig?.extra?.apiUrl; // 本番時

export const apiClient = {
  get: async (endpoint: string) => {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers: await getAuthHeaders(),
    });
    return response.json();
  },

  post: async (endpoint: string, data: any) => {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(await getAuthHeaders()),
      },
      body: JSON.stringify(data),
    });
    return response.json();
  }
};
```

## ナビゲーション設定

```typescript
// src/navigation/AppNavigator.tsx
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

const Tab = createBottomTabNavigator();

export const AppNavigator = () => {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Posts" component={PostsScreen} options={{ title: '投稿' }} />
      <Tab.Screen name="Words" component={WordsScreen} options={{ title: '単語帳' }} />
      <Tab.Screen name="Quiz" component={QuizScreen} options={{ title: 'クイズ' }} />
      <Tab.Screen name="Progress" component={ProgressScreen} options={{ title: '進捗' }} />
      <Tab.Screen name="Share" component={ShareScreen} options={{ title: 'シェア' }} />
    </Tab.Navigator>
  );
};
```

## 実装の進め方（スモールステップ）

### Week 1: 基盤構築
- [ ] Expoプロジェクト作成・環境設定
- [ ] 既存API との通信確認
- [ ] 基本ナビゲーション実装

### Week 2: 投稿表示機能
- [ ] Bluesky認証画面
- [ ] 投稿一覧表示
- [ ] 単語ハイライト機能

### Week 3: 単語管理機能
- [ ] 単語保存機能
- [ ] 単語一覧画面
- [ ] ステータス変更機能

### Week 4: 学習機能
- [ ] 辞書API連携
- [ ] シンプルなクイズ機能
- [ ] 基本的な進捗表示

### Week 5: 外部連携
- [ ] Tangled エクスポート機能
- [ ] Bluesky シェア機能
- [ ] データバックアップ機能

### Week 6: 最適化・リリース準備
- [ ] パフォーマンス最適化
- [ ] エラーハンドリング
- [ ] アプリアイコン・スプラッシュ画面

## 次のステップ

まずは **Week 1** から始めましょう。既存のExpress APIが動いているので、意外と早く実用的なアプリが完成するはずです。

どの部分から着手したいですか？まずは開発環境の構築から始めますか？