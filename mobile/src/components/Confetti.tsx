import React, { useEffect, useRef, useMemo } from 'react';
import { Animated, Dimensions, Easing, View, StyleSheet } from 'react-native';

interface ConfettiPieceConfig {
  left: number;
  delay: number;
  duration: number;
  size: number;
  color: string;
  rotateStart: string;
  rotateEnd: string;
  fallDistance: number;
}

export interface ConfettiBurstConfig {
  particleCount?: number; // default: pieces prop
  angle?: number; // 発射角度(度) 90=上方向 (記事準拠)
  spread?: number; // 角度拡散幅 (度)
  velocity?: number; // 初速(基準)
  startVelocity?: number; // canvas-confetti の呼び名に合わせる
  gravity?: number; // 0 - 1 (大きいほど下へ落下)
  drift?: number; // 水平ドリフト係数 (±)
  decay?: number; // 速度減衰 (0.9 など) 未使用(将来拡張)
  scalar?: number; // サイズ倍率
  colors?: string[]; // 個別色
  delay?: number; // ms
  ticks?: number; // canvas-confetti の ticks（フレーム数） -> duration に変換
  zIndex?: number;
  origin?: { x: number; y: number }; // normalized 0-1 (canvas-confetti 互換)
}

interface Props {
  run?: boolean;
  pieces?: number; // 後方互換: 単一バースト粒子数
  colors?: string[];
  style?: any;
  angle?: number;
  spread?: number;
  velocity?: number;
  gravity?: number;
  drift?: number;
  scalar?: number;
  bursts?: ConfettiBurstConfig[]; // 連続バースト
  duration?: number; // 1バーストあたり基準アニメ時間
  originX?: number; // クラッカーX座標（画面左上基準）
  originY?: number; // クラッカーY座標（画面左上基準）
  radial?: boolean; // trueで全方位発射
}

/**
 * 軽量な花吹雪コンポーネント（外部ライブラリ不使用）
 */
export const Confetti: React.FC<Props> = ({
  run = true,
  pieces = 100,
  colors = DEFAULT_COLORS,
  style,
  angle = 90,
  spread = 360,
  // lowered default velocity to make particles overall slower
  velocity = 10,
  gravity = 0.2,
  drift = 0,
  scalar = 1,
  bursts,
  duration = 5200,
  originX,
  originY,
  radial = true
}) => {
  const { width, height } = Dimensions.get('window');

  // バーストリスト準備 (後方互換: 単一)
  const burstList: ConfettiBurstConfig[] = useMemo(() => {
    if (bursts && bursts.length > 0) return bursts;
    return [{ particleCount: pieces, angle, spread, velocity, gravity, drift, scalar, colors }];
  }, [bursts, pieces, angle, spread, velocity, gravity, drift, scalar, colors]);

  // container z-index: 優先して最初のバーストの zIndex を使う
  const containerZIndex = burstList && burstList.length > 0 ? (burstList[0].zIndex ?? 100) : 100;

  // 全ピース生成
  type InternalPiece = ConfettiPieceConfig & {
    startAngle: number; // deg
    velocity: number;
    gravity: number;
    drift: number;
    burstDelay: number;
    x0: number; y0: number;
    dx: number; dy: number; // 単位方向
    scale: number;
  };

  const allPieces = useMemo<InternalPiece[]>(() => {
    const list: InternalPiece[] = [];
    burstList.forEach(b => {
      const count = b.particleCount ?? pieces;
      const baseAngle = b.angle ?? angle; // 90=上
  const sp = b.spread ?? spread;
  // canvas-confetti 互換: startVelocity があれば優先
  const vel = b.startVelocity ?? b.velocity ?? velocity;
      const g = b.gravity ?? gravity;
      const dr = b.drift ?? drift;
      const scl = b.scalar ?? scalar;
      const burstColors = b.colors || colors;
  // compute burst origin in pixels if provided
  const burstOriginX = b.origin ? (b.origin.x * width) : undefined;
  const burstOriginY = b.origin ? (b.origin.y * height) : undefined;
  for (let i = 0; i < count; i++) {
        let theta;
        if (radial) {
          // radial モードでも spread を尊重可能にする
          // radialSpread が 360 なら全方位、そうでなければ baseAngle ± radialSpread/2 の範囲
          const radialSpread = sp ?? 360;
          if (radialSpread >= 360) {
            theta = (Math.random() * 360) * Math.PI / 180;
          } else {
            const startDeg = baseAngle - radialSpread / 2;
            theta = (startDeg + Math.random() * radialSpread) * Math.PI / 180;
          }
        } else {
          // 角度ランダム (中心±spread/2)
          theta = (baseAngle + (Math.random() - 0.5) * sp) * Math.PI / 180;
        }
        // 物理上向き: 角度90で真上 => y方向負
        const dirX = Math.cos(theta);
        const dirY = -Math.sin(theta);
  // reduce per-particle speed multiplier to slow overall motion
  const speed = vel * 0.8 * (0.6 + Math.random() * 0.8); // slightly reduced base
        const size = (6 + Math.random() * 10) * scl;
        const delay = (b.delay || 0) + Math.random() * 120; // バースト内微調整
        // 全方位バーストはやや速めに終わるように調整
        // duration は ticks があればそこから計算（おおよそ 16ms/frame）
        const baseDuration = b.ticks ? Math.max(80, Math.round(b.ticks * 16)) : duration;
        const pieceDuration = radial
          ? baseDuration * (0.55 + Math.random() * 0.35)
          : baseDuration * (0.85 + Math.random() * 0.3); // 個別ゆらぎ
        const fallDistance = height + 100; // 画面外まで
  // クラッカー位置指定: 優先順序 burst.origin(px) -> originX/originY (props) -> デフォルト
  // For radial bursts default origin should be screen center for a symmetric explosion
  const x0 = burstOriginX !== undefined ? burstOriginX : (originX !== undefined ? originX : (radial ? width / 2 : Math.random() * width));
  const y0 = burstOriginY !== undefined ? burstOriginY : (originY !== undefined ? originY : (radial ? height / 2 : height * 0.85));
        list.push({
          left: x0,
          delay,
          duration: pieceDuration,
          size,
          color: burstColors[Math.floor(Math.random() * burstColors.length)],
          rotateStart: `${Math.random() * 360}deg`,
          rotateEnd: `${Math.random() * 360 + 1080}deg`,
          fallDistance,
          startAngle: baseAngle,
          velocity: speed,
          gravity: g,
          drift: dr,
          burstDelay: b.delay || 0,
          x0,
          y0,
          dx: dirX,
          dy: dirY,
          scale: 0.8 + Math.random() * 0.6
        });
      }
    });
    return list;
  }, [burstList, pieces, angle, spread, velocity, gravity, drift, scalar, colors, width, height, duration, originX, originY, radial]);

  const anims = useRef<Animated.Value[]>([]);
  if (anims.current.length !== allPieces.length) {
    // cleanup existing Animated.Value instances to avoid leaks
    try {
      anims.current.forEach(v => {
        if (!v) return;
        try {
          // stop any running animation
          if (typeof (v as any).stopAnimation === 'function') {
            (v as any).stopAnimation();
          }
          // remove listeners if present
          if (typeof (v as any).removeAllListeners === 'function') {
            (v as any).removeAllListeners();
          } else if (typeof (v as any).removeListener === 'function') {
            // try best-effort removal by id if available
            try { (v as any).removeAllListeners && (v as any).removeAllListeners(); } catch {};
          }
        } catch (_) {
          // ignore individual errors during cleanup
        }
      });
    } catch (_) {}
    anims.current = allPieces.map(() => new Animated.Value(0));
  }

  useEffect(() => {
    if (!run) return;
    const timers = allPieces.map((cfg, i) => {
      const v = anims.current[i];
      v.setValue(0);
      // radial のときは終盤で速度が落ちるように ease-out を使う
  // radial bursts should ease out (decelerate) for a natural pop-and-slow finish
  const easingFn = radial ? Easing.out(Easing.cubic) : Easing.linear;
      return Animated.timing(v, {
        toValue: 1,
        duration: cfg.duration,
        delay: cfg.delay,
        easing: easingFn,
        useNativeDriver: true
      });
    });
    Animated.stagger(12, timers).start();
  }, [run, allPieces]);

  if (!run) return null;

  return (
    <View pointerEvents="none" style={[styles.container, style, { zIndex: containerZIndex }]}> 
      {allPieces.map((cfg, i) => {
        const t = anims.current[i];
        // 進行 0-1
        // 全方位発射時は直線的に飛ばす
        let translateX, translateY;
        let viewOffsetStyle: any = undefined;
          if (radial) {
          // 直線的に遠くまで飛ばす。velocity を射程の目安に使用
          // reduce distance multiplier so particles don't travel as far (slower feel)
          const dist = Math.max(width, height) * 0.2 + cfg.velocity * (18 + Math.random() * 30);
          // end を原点からの差分で計算する（要素自体は発射点に固定）
          const endDX = cfg.dx * dist;
          const endDY = cfg.dy * dist;
          // use a slightly earlier mid point so the final segment eases out and feels like deceleration
          const midDX = endDX * 0.55 + (Math.random() * 40 - 20);
          const midDY = endDY * 0.55 + (Math.random() * 40 - 20);
          translateX = t.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, midDX, endDX] });
          translateY = t.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, midDY, endDY] });
          // 要素の left/top を発射点にセット（transform は相対オフセットにする）
          viewOffsetStyle = { left: cfg.x0 - cfg.size / 2, top: cfg.y0 - (cfg.size * 0.6) / 2 };
        } else {
          // 既存の上昇→落下パターン
          const peakT = 0.35 + Math.random() * 0.15; // 上昇ピーク位置
          // reduce vertical/horizontal multipliers for slower motion
          const upDist = cfg.velocity * 8 * (0.8 + Math.random() * 0.4); // 上昇距離スケール
          const downward = cfg.gravity * 480; // 落下距離スケール
          const midY = cfg.y0 - upDist; // ピーク
          const endY = cfg.y0 - upDist + downward; // 落下後
          translateY = t.interpolate({ inputRange: [0, peakT, 1], outputRange: [cfg.y0, midY, endY] });
          // X は初速 + ドリフト (線形 + ゆらぎ)
          const driftTotal = cfg.drift * 120 * (1 + Math.random());
          const endX = cfg.x0 + cfg.dx * cfg.velocity * 12 + driftTotal;
          const midX = (cfg.x0 + endX) / 2 + (Math.random() * 40 - 20); // 若干曲線
          translateX = t.interpolate({ inputRange: [0, 0.5, 1], outputRange: [cfg.x0, midX, endX] });
        }
        const rotate = t.interpolate({ inputRange: [0, 1], outputRange: [cfg.rotateStart, cfg.rotateEnd] });
  // keep pieces visible while moving, then fade out near the end
  const opacity = t.interpolate({ inputRange: [0, 0.05, 0.8, 1], outputRange: [0, 1, 1, 0] });
        const scale = t.interpolate({ inputRange: [0, 0.1, 1], outputRange: [0.2, cfg.scale, cfg.scale] });
        const borderRadius = Math.random() < 0.3 ? cfg.size / 2 : 2; // circle/square ミックス
        return (
          <Animated.View
            key={i}
            style={[
              {
                position: 'absolute',
                width: cfg.size,
                height: cfg.size * 0.6,
                backgroundColor: cfg.color,
                borderRadius,
                opacity
              },
              viewOffsetStyle,
              { transform: [{ translateX }, { translateY }, { rotate }, { scale }] }
            ]}
          />
        );
      })}
    </View>
  );
};

const DEFAULT_COLORS = [
  '#6366f1', // indigo
  '#f59e0b', // amber
  '#10b981', // emerald
  '#ef4444', // red
  '#ec4899', // pink
  '#3b82f6', // blue
  '#84cc16'  // lime
];

const styles = StyleSheet.create({
  container: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }
});

export default Confetti;
