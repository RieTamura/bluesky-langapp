import React from 'react';
import { View, Text, Animated, Easing } from 'react-native';
import { useTheme } from '../stores/theme';

type MiniChartProps = {
  data: number[];
  // labels: optional array of date-like strings (YYYY-MM-DD preferred). If provided, MiniChart will
  // localize and thin them to at most maxLabels entries.
  labels?: string[];
  // max number of labels to show on x-axis (will be thinned evenly)
  maxLabels?: number;
};

const MiniChart: React.FC<MiniChartProps> = ({ data, labels, maxLabels = 7 }) => {
  const { colors } = useTheme();
  const max = Math.max(...data, 1);

  // Animated values for each bar. Keep a stable ref and mutate its .current so
  // we don't reassign the ref object (important for hooks stability).
  const animatedVals = React.useRef<Animated.Value[]>([]);

  React.useEffect(() => {
    // Ensure the ref array has exactly data.length entries. Push new Animated.Value(0)
    // for any newly added indices. If data shrank, remove surplus Animated.Values by
    // mutating the existing array (do NOT reassign animatedVals.current).
    const arr = animatedVals.current;
    for (let i = arr.length; i < data.length; i++) {
      arr.push(new Animated.Value(0));
    }
    if (arr.length > data.length) {
      // remove extra entries in-place to avoid leaking Animated.Value instances
      arr.splice(data.length);
    }

    // Build animations only for the active range (0..data.length-1). If arr has
    // extra entries we simply ignore them.
    const animations: Animated.CompositeAnimation[] = [];
    for (let i = 0; i < data.length; i++) {
      const av = arr[i];
      if (!av) continue;
      animations.push(
        Animated.timing(av, {
          toValue: data[i] / max,
          duration: 600,
          delay: i * 40,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false
        })
      );
    }

    const runner = Animated.stagger(30, animations);
    runner.start();

    return () => {
      // Stop any running animations to avoid leaks.
      try { runner.stop(); } catch (e) { /* ignore */ }
    };
    // Note: intentionally exclude animatedVals from deps; we only react to data/max
  }, [data, max]);

  // NOTE: Label thinning disabled per request. Show all provided labels.

  // Helper: format a date-like string using Intl if available, otherwise fallback
  const formatLabel = (s: string) => {
    if (!s) return '';
    // Prefer YYYY-MM-DD
    const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      const y = Number(isoMatch[1]), m = Number(isoMatch[2]), d = Number(isoMatch[3]);
      // Return fixed MM-DD format as requested
      const mm = m.toString().padStart(2, '0');
      const dd = d.toString().padStart(2, '0');
      return `${mm}-${dd}`;
    }
    // fallback: show first 5-6 chars
    return s.length <= 6 ? s : s.slice(0, 6);
  };

  const labelsToShow = (labels && labels.length > 0) ? labels : [];
  const maxBarPx = 60; // maximum bar pixel height used for animation/calculation
  const insideThresholdPx = 16; // if bar height < this, show the number above the bar instead of inside

  // Color utilities: parse a hex or rgb(a) color and compute relative luminance
  const parseColorToRgb = (c: string): { r: number; g: number; b: number } => {
    if (!c) return { r: 0, g: 0, b: 0 };
    const s = c.trim();
    // hex (#rrggbb or #rgb)
    if (s[0] === '#') {
      const hex = s.slice(1);
      if (hex.length === 3) {
        const r = parseInt(hex[0] + hex[0], 16);
        const g = parseInt(hex[1] + hex[1], 16);
        const b = parseInt(hex[2] + hex[2], 16);
        return { r, g, b };
      }
      // Handle 6-char #RRGGBB
      if (hex.length === 6) {
        const r = parseInt(hex.slice(0, 2), 16);
        const g = parseInt(hex.slice(2, 4), 16);
        const b = parseInt(hex.slice(4, 6), 16);
        return { r, g, b };
      }
      // Handle 8-char hex. There are two common conventions:
      // - CSS: #RRGGBBAA (RRGGBB then alpha)
      // - Android: #AARRGGBB (alpha first)
      if (hex.length === 8) {
        // For React Native, default to Android style #AARRGGBB
        // unless explicitly indicated otherwise
        try {
          // Treat as Android #AARRGGBB: alpha (0-1), R (2-3), G (4-5), B (6-7)
          const r = parseInt(hex.slice(2, 4), 16);
          const g = parseInt(hex.slice(4, 6), 16);
          const b = parseInt(hex.slice(6, 8), 16);
          return { r, g, b };
        } catch (e) {
          return { r: 0, g: 0, b: 0 };
        }
      }
    }

    // rgb(...) or rgba(...)
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

  const relativeLuminance = (r: number, g: number, b: number) => {
    // convert sRGB [0..255] to linear values
    const srgb = [r, g, b].map(v => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
  };

  const getContrastColor = (bgColor: string) => {
    const { r, g, b } = parseColorToRgb(bgColor);
    const lum = relativeLuminance(r, g, b);
    // WCAG suggests threshold around 0.179 for deciding black/white; use 0.5 for more aggressive white
    return lum > 0.5 ? '#000' : '#fff';
  };

  // Darken a color by a fraction (0..1). Larger fraction -> darker.
  const darkenColor = (bgColor: string, fraction: number): string => {
    const { r, g, b } = parseColorToRgb(bgColor);
    const f = Math.max(0, Math.min(1, fraction));
    // Use eased fraction for gentler curve
    const eased = Math.pow(f, 0.6);
    // reduce brightness by up to 30% at fraction==1 (more gradual)
    const maxReduce = 0.3;
    const reduce = (v: number) => Math.round(v * (1 - maxReduce * eased));
    const nr = reduce(r), ng = reduce(g), nb = reduce(b);
    const toHex = (n: number) => n.toString(16).padStart(2, '0');
    return `#${toHex(nr)}${toHex(ng)}${toHex(nb)}`;
  };

  // Mix two colors (hex or rgb) by t (0..1). t=0 -> a, t=1 -> b
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

  // Precompute the darkest accent color (used as end of gradient)
  const darkestAccent = darkenColor(colors.accent, 1);
  // Compute a light accent (a tint toward white) to use as gradient start
  const lightAccent = mixColors('#ffffff', colors.accent, 0.18);

  return (
    <View style={{ marginTop: 8 }}>
      {/* Bars with overlaid numeric counts at the bar's top edge (inside the bar). */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 80 }}>
        {data.map((v, i) => {
          // compute pixel height synchronously for decision logic
          const pixelH = Math.round((v / max) * maxBarPx);
          const showInside = pixelH >= insideThresholdPx;
          // compute per-bar color by normalizing v to [0,1] using current max.
          // This produces a continuous t instead of stepped buckets.
          const safeMax = (typeof max === 'number' && isFinite(max) && max > 0) ? max : 1;
          const tRaw = Math.max(0, Math.min(1, v / safeMax));
          const tEased = Math.pow(tRaw, 0.8);
          // tEased==0 -> lightAccent, tEased==1 -> darkestAccent
          const barColor = mixColors(lightAccent, darkestAccent, tEased);
          const insideTextColor = getContrastColor(barColor);

          return (
            <View key={i} style={{ flex: 1, marginHorizontal: 2, alignItems: 'center' }}>
              <View style={{ width: '100%', height: 80, position: 'relative' }}>
                {/* Animated bar anchored to bottom. If showing inside, center the text inside this animated view. */}
                <Animated.View
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    bottom: 0,
                    borderRadius: 3,
                    backgroundColor: barColor,
                    // Use animatedVals.current and fall back to a static 0 Animated.Value
                    height: Animated.multiply(animatedVals.current[i] || new Animated.Value(0), maxBarPx),
                    justifyContent: 'center',
                    alignItems: 'center',
                    overflow: 'hidden'
                  }}
                >
                  {showInside && (
                    <Animated.Text
                      numberOfLines={1}
                      ellipsizeMode='clip'
                      style={{
                          textAlign: 'center',
                          fontSize: 12,
                          fontWeight: '600',
                          color: insideTextColor,
                          fontVariant: ['tabular-nums'],
                        }}
                    >
                      {String(v)}
                    </Animated.Text>
                  )}
                </Animated.View>

                {/* If not showing inside, draw the number above the bar */}
                {!showInside && (
                  <Text
                    style={{
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      bottom: pixelH + 6,
                      textAlign: 'center',
                      fontSize: 12,
                      fontWeight: '600',
                      color: colors.secondaryText,
                    }}
                  >
                    {String(v)}
                  </Text>
                )}
              </View>
            </View>
          );
        })}
      </View>

      {labelsToShow.length > 0 && (
        <View style={{ flexDirection: 'row', marginTop: 6 }}>
          {labelsToShow.map((lab, i) => (
            <View key={i} style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ fontSize: 10, color: colors.secondaryText }}>{formatLabel(lab)}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

export default MiniChart;
