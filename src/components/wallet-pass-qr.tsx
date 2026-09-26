import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';

/** Deterministic wallet-style pass code from a booking key (no network). */
export function WalletPassQr({
  seed,
  size = 92,
}: {
  seed: string;
  size?: number;
}) {
  const cells = useMemo(() => buildMatrix(seed, 21), [seed]);
  const cell = size / 21;

  return (
    <View style={[styles.pad, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Rect x={0} y={0} width={size} height={size} fill="#FFFFFF" />
        {cells.map((on, i) => {
          if (!on) return null;
          const x = (i % 21) * cell;
          const y = Math.floor(i / 21) * cell;
          return <Rect key={i} x={x} y={y} width={cell} height={cell} fill="#0A1848" />;
        })}
      </Svg>
    </View>
  );
}

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function buildMatrix(seed: string, n: number) {
  const rnd = mulberry(hash(seed));
  const m = Array.from({ length: n * n }, () => rnd() > 0.55);

  // Finder patterns (Apple Wallet–like corners)
  paintFinder(m, n, 0, 0);
  paintFinder(m, n, n - 7, 0);
  paintFinder(m, n, 0, n - 7);

  // Timing strips
  for (let i = 8; i < n - 8; i++) {
    m[6 * n + i] = i % 2 === 0;
    m[i * n + 6] = i % 2 === 0;
  }

  return m;
}

function paintFinder(m: boolean[], n: number, ox: number, oy: number) {
  for (let y = 0; y < 7; y++) {
    for (let x = 0; x < 7; x++) {
      const edge = x === 0 || y === 0 || x === 6 || y === 6;
      const core = x >= 2 && x <= 4 && y >= 2 && y <= 4;
      m[(oy + y) * n + (ox + x)] = edge || core;
    }
  }
}

function mulberry(seed: number) {
  let t = seed || 1;
  return () => {
    t |= 0;
    t = (t + 0x6d2b79f5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

const styles = StyleSheet.create({
  pad: {
    overflow: 'hidden',
  },
});
