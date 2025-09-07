import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useThemeColors } from '../stores/theme';

export const LicenseScreen: React.FC = () => {
  const c = useThemeColors();
  return (
    <ScrollView style={[styles.container,{ backgroundColor: c.background }]} contentContainerStyle={{ paddingBottom: 40 }} accessibilityLabel="ライセンス全文スクロール領域">
      <Text style={styles.title}>ライセンス / 使用ライブラリ</Text>
      <Text style={styles.sectionTitle}>Lucide Icons (lucide.dev)</Text>
      <Text style={styles.body} accessibilityLabel="ISC License 本文">
{`ISC License\n\nCopyright (c) 2022 Lucide Contributors\n\nPermission to use, copy, modify, and/or distribute this software for any\npurpose with or without fee is hereby granted, provided that the above\ncopyright notice and this permission notice appear in all copies.\n\nTHE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH\nREGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY\nAND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,\nINDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM\nLOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR\nOTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR\nPERFORMANCE OF THIS SOFTWARE.`}
      </Text>
      <Text style={[styles.sectionTitle,{marginTop:28}]}>アプリ固有</Text>
      <Text style={styles.body}>本アプリ内の独自コードは (未指定の場合) 開発者の著作物です。追加のライセンス表示が必要になった場合ここに追記します。</Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex:1, padding:16 },
  title: { fontSize:24, fontWeight:'700', marginBottom:16 },
  sectionTitle: { fontSize:16, fontWeight:'600', marginTop:12, marginBottom:8 },
  body: { fontSize:12, lineHeight:18 }
});
