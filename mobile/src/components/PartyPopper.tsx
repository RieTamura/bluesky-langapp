import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Dimensions, View, StyleSheet } from 'react-native';

interface PieceCfg {
  dx: number; // X方向係数
  dy: number; // Y方向係数(負で上)
  dist: number; // 飛距離係数
  size: number;
  color: string;
  rotate: string;
  rotateEnd: string;
}

interface Props {
  trigger?: boolean; // trueで起動
  pieces?: number;
  duration?: number; // ms
  colors?: string[];
  originX?: number; // 0-1 画面幅割合（既定: 中央）
  originY?: number; // 0-1 画面高割合（既定: 0.85 下寄り）
  style?: any;
  onFinished?: () => void;
}

/**
 * PartyPopper: 画面下付近からクラッカーのように放射状に飛ぶ単発アニメーション
 * 外部ライブラリ依存なし。mounted + trigger で1回再生。
 */
export const PartyPopper: React.FC<Props> = ({
  trigger = true,
  pieces = 28,
  duration = 1400,
  colors = DEFAULT_COLORS,
  originX = 0.5,
  originY = 0.85,
  style,
  onFinished
}) => {
  const { width, height } = Dimensions.get('window');
  const anim = useRef(new Animated.Value(0)).current;
  const cfgRef = useRef<PieceCfg[]>([]);

  if (cfgRef.current.length === 0) {
    cfgRef.current = Array.from({ length: pieces }).map((_, i) => {
      const angle = (Math.random() * 70 + 55) * (Math.random() < 0.5 ? -1 : 1); // 左右に広がる (±)
      const rad = (angle * Math.PI) / 180;
      const speed = 90 + Math.random() * 140; // 基本飛距離
      const dx = Math.cos(rad);
      // 上方向成分を強める (sinは±) → 常に上へ: -|sin|
      const dy = -Math.abs(Math.sin(rad));
      return {
        dx,
        dy,
        dist: speed,
        size: 6 + Math.random() * 10,
        color: colors[i % colors.length],
        rotate: `${Math.random() * 360}deg`,
        rotateEnd: `${Math.random() * 360 + 1080}deg`
      };
    });
  }

  useEffect(() => {
    if (!trigger) return;
    anim.setValue(0);
    Animated.timing(anim, {
      toValue: 1,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true
    }).start(() => {
      onFinished && onFinished();
    });
  }, [trigger, duration, anim, onFinished]);

  if (!trigger) return null;

  const ox = width * originX;
  const oy = height * originY;

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, style]}> 
      {cfgRef.current.map((p, idx) => {
        const translateX = anim.interpolate({
          inputRange: [0, 1],
          outputRange: [ox, ox + p.dx * p.dist]
        });
        // 放物線風: 0→0.6 までは上昇, 0.6→1 で落下 (単純補間)
        const peakY = oy + p.dy * p.dist; // 上昇ピーク
        const endY = peakY + p.dist * 0.6; // 落下後
        const translateY = anim.interpolate({
          inputRange: [0, 0.6, 1],
            outputRange: [oy, peakY, endY]
        });
        const rotate = anim.interpolate({ inputRange: [0, 1], outputRange: [p.rotate, p.rotateEnd] });
        const scale = anim.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0.2, 1, 1] });
        const opacity = anim.interpolate({ inputRange: [0, 0.1, 0.85, 1], outputRange: [0, 1, 1, 0] });
        return (
          <Animated.View
            key={idx}
            style={{
              position: 'absolute',
              width: p.size,
              height: p.size * 0.6,
              backgroundColor: p.color,
              borderRadius: 2,
              transform: [
                { translateX },
                { translateY },
                { rotate },
                { scale }
              ],
              opacity
            }}
          />
        );
      })}
    </View>
  );
};

const DEFAULT_COLORS = [
  '#fbbf24', // amber
  '#fb7185', // rose
  '#60a5fa', // blue
  '#34d399', // emerald
  '#c084fc', // violet
  '#f472b6', // pink
  '#f59e0b', // amber darker
  '#4ade80', // green
  '#38bdf8'  // sky
];

export default PartyPopper;
