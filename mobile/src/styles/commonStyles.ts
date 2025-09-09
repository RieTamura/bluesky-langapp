import { StyleSheet } from 'react-native';

// Shared styles used by Progress and other screens for small charts and status boxes
export const commonStyles = StyleSheet.create({
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginBottom: 12 },
  statusBox: { flex: 1, padding: 12, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center' },
  statusLabel: { fontSize: 12, fontWeight: '600' },
  statusNumber: { fontSize: 20, fontWeight: '800', marginTop: 6 },
  chartContainer: { padding: 12, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, marginBottom: 12 },
  chartTitle: { fontSize: 14, fontWeight: '700', marginBottom: 8 },
  chartRow: { flexDirection: 'row', alignItems: 'flex-end', height: 140, paddingHorizontal: 4 },
  chartCol: { width: 32, alignItems: 'center', marginHorizontal: 6 },
  chartBar: { width: 20, borderRadius: 6 },
  chartLabel: { fontSize: 10, marginTop: 6 }
});
