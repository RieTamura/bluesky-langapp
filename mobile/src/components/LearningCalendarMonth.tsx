import React from 'react';
import { View, Text } from 'react-native';
import { commonStyles } from '../styles/commonStyles';

export type LearningCalendarProps = {
  data?: any[];
  colors: { background: string; text: string; secondaryText: string; accent: string; border?: string };
  weekStart?: 'sunday' | 'monday';
};

const LearningCalendarMonthComponent: React.FC<LearningCalendarProps> = ({ data = [], colors, weekStart = 'sunday' }) => {
  const map: Record<string, number> = {};
  (data || []).forEach(d => {
    const key = String(d.date || d.day || '').slice(0, 10);
    if (key) map[key] = (map[key] || 0) + (Number(d.quizzesTaken ?? d.answers ?? 0) || 0);
  });

  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  // First day of current month
  const first = new Date(year, month, 1);
  // Last day of current month
  const last = new Date(year, month + 1, 0);

  // Days to render: include leading empty days to align weekday
  const daysInMonth = last.getDate();
  // Compute leading based on weekStart
  const rawLeading = first.getDay(); // 0=Sun .. 6=Sat
  const leading = weekStart === 'sunday' ? rawLeading : (rawLeading === 0 ? 6 : rawLeading - 1);

  // We'll compute max within the month
  let max = 0;
  const dayEntries: Array<{ day: number; key: string; count: number }> = [];
  const localKey = (dt: Date) => {
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const dd = String(dt.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  };

  for (let d = 1; d <= daysInMonth; d++) {
    const key = localKey(new Date(year, month, d));
    const cnt = map[key] || 0;
    dayEntries.push({ day: d, key, count: cnt });
    if (cnt > max) max = cnt;
  }

  // Color helpers
  const parseColorToRgb = (c: string): { r: number; g: number; b: number } => {
    if (!c) return { r: 0, g: 0, b: 0 };
    const s = c.trim();
    if (s[0] === '#') {
      const hex = s.slice(1);
      if (hex.length === 3) {
        const r = parseInt(hex[0] + hex[0], 16);
        const g = parseInt(hex[1] + hex[1], 16);
        const b = parseInt(hex[2] + hex[2], 16);
        return { r, g, b };
      }
      if (hex.length === 6) {
        const r = parseInt(hex.slice(0, 2), 16);
        const g = parseInt(hex.slice(2, 4), 16);
        const b = parseInt(hex.slice(4, 6), 16);
        return { r, g, b };
      }
      if (hex.length === 8) {
        try {
          const r = parseInt(hex.slice(2, 4), 16);
          const g = parseInt(hex.slice(4, 6), 16);
          const b = parseInt(hex.slice(6, 8), 16);
          return { r, g, b };
        } catch (e) { return { r: 0, g: 0, b: 0 }; }
      }
    }
    const rgbMatch = s.match(/rgba?\(([^)]+)\)/i);
    if (rgbMatch) {
      const parts = rgbMatch[1].split(',').map(p => p.trim());
      const r = Number(parts[0]) || 0;
      const g = Number(parts[1]) || 0;
      const b = Number(parts[2]) || 0;
      return { r, g, b };
    }
    return { r: 0, g: 0, b: 0 };
  };

  const darkenColor = (bgColor: string, fraction: number): string => {
    const { r, g, b } = parseColorToRgb(bgColor);
    const f = Math.max(0, Math.min(1, fraction));
    const eased = Math.pow(f, 0.6);
    const maxReduce = 0.3;
    const reduce = (v: number) => Math.round(v * (1 - maxReduce * eased));
    const nr = reduce(r), ng = reduce(g), nb = reduce(b);
    const toHex = (n: number) => n.toString(16).padStart(2, '0');
    return `#${toHex(nr)}${toHex(ng)}${toHex(nb)}`;
  };

  const mixColors = (a: string, b: string, t: number): string => {
    const { r: ra, g: ga, b: ba } = parseColorToRgb(a);
    const { r: rb, g: gb, b: bb } = parseColorToRgb(b);
    const clamped = Math.max(0, Math.min(1, t));
    const r = Math.round(ra + (rb - ra) * clamped);
    const g = Math.round(ga + (gb - ga) * clamped);
    const b2 = Math.round(ba + (bb - ba) * clamped);
    const toHex = (n: number) => n.toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b2)}`;
  };

  const darkestAccent = darkenColor(colors.accent, 1);
  const lightAccent = mixColors('#ffffff', colors.accent, 0.18);

  const colorFor = (cnt: number) => {
    if (cnt <= 0) return '#ebedf0';
    if (max <= 1) return '#40c463';
    const p = cnt / max;
    const tRaw = Math.max(0, Math.min(1, p));
    const tEased = Math.pow(tRaw, 0.8);
    return mixColors(lightAccent, darkestAccent, tEased);
  };

  // Weekday labels
  const baseWeekdayLabels = ['日', '月', '火', '水', '木', '金', '土'];
  const weekdayLabels = weekStart === 'sunday'
    ? baseWeekdayLabels
    : ['月', '火', '水', '木', '金', '土', '日'];

  // layout
  const cellWidth = 32;
  const cellMargin = 6;
  const cellTotal = cellWidth + cellMargin * 2;
  const gridWidth = cellTotal * 7;

  return (
    <View style={[commonStyles.card, { padding: 12, borderRadius: 12, borderColor: colors.border ?? colors.secondaryText, borderWidth: 1 }]}> 
      <View style={{ width: gridWidth, alignSelf: 'center', marginBottom: 8 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center' }}>
          <Text style={{ color: colors.text, fontWeight: '700' }}>{year}年{month + 1}月</Text>
        </View>
        <View style={{ flexDirection: 'row', marginTop: 6 }}>
          {weekdayLabels.map((w, i) => (
            <View key={i} style={{ width: cellWidth, margin: cellMargin, alignItems: 'center' }}>
              <Text style={{ color: colors.secondaryText, fontSize: 12 }}>{w}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={{ alignItems: 'center' }}>
        {(() => {
          const totalSlots = leading + daysInMonth;
          const weeksCount = Math.ceil(totalSlots / 7);
          const weeks: Array<Array<{ day?: number; key?: string; count?: number } | null>> = Array.from({ length: weeksCount }, () => Array(7).fill(null));
          let slot = leading;
          for (let d = 0; d < dayEntries.length; d++, slot++) {
            const wi = Math.floor(slot / 7);
            const di = slot % 7;
            weeks[wi][di] = { day: dayEntries[d].day, key: dayEntries[d].key, count: dayEntries[d].count };
          }

          return weeks.map((week, wi) => (
            <View key={wi} style={{ flexDirection: 'row', marginBottom: 4, justifyContent: 'center' }}>
              {week.map((cell, ci) => (
                <View key={ci} style={{ width: cellWidth, height: 36, margin: cellMargin, alignItems: 'center', justifyContent: 'flex-start' }}>
                  {cell ? (
                    <>
                      <Text style={{ color: colors.text, fontSize: 12 }}>{cell.day}</Text>
                      <View style={{ marginTop: 6, width: 10, height: 10, borderRadius: 5, backgroundColor: colorFor(cell.count || 0) }} />
                    </>
                  ) : (
                    <></>
                  )}
                </View>
              ))}
            </View>
          ));
        })()}
      </View>
    </View>
  );
};

export default React.memo(LearningCalendarMonthComponent);
