import { Image } from 'expo-image';
import { useCallback, useState } from 'react';
import {
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { WalletPassQr } from '@/components/wallet-pass-qr';
import { AUTH_BLUE, SCREEN_BG } from '@/constants/brand';
import type { ScheduledRide } from '@/data/scheduledRides';

type Props = {
  rides: ScheduledRide[];
  onBookPress?: () => void;
};

const VISIBLE_STACK = 3;
const SWAP_MS = 300;
/** Back slot sits below the stage (not the top peek) when hidden. */
const STACK_Y = [0, -18, 80] as const;
const STACK_SCALE = [1, 0.965, 0.93] as const;
const STACK_Z = [30, 20, 10] as const;
const DRAG_PROMOTE = 0.34;

/** Alternating Victory blues so stacked passes read as distinct. */
const PASS_BLUES = ['#0A1848', '#1B3A8C', '#0E2F6B', '#243B7A', '#152A6B'] as const;

function passBlueFor(rideId: string, fallbackIndex: number) {
  let h = 0;
  for (let i = 0; i < rideId.length; i++) h = (h + rideId.charCodeAt(i) * (i + 1)) % PASS_BLUES.length;
  return PASS_BLUES[(h + fallbackIndex) % PASS_BLUES.length];
}

function mod(n: number, m: number) {
  return ((n % m) + m) % m;
}

function useDeckSlotStyle(
  slot: 0 | 1 | 2,
  dragX: SharedValue<number>,
  deckProgress: SharedValue<number>,
  dismissDir: SharedValue<number>,
  snapX: SharedValue<number>,
  cardWidth: SharedValue<number>,
) {
  return useAnimatedStyle(() => {
    'worklet';
    const w = Math.max(cardWidth.value, 1);
    const p = deckProgress.value;
    const dir = dismissDir.value;
    const dx = dragX.value;

    let x = 0;
    let y = STACK_Y[slot];
    let scale = STACK_SCALE[slot];
    let opacity = slot === 2 ? 0 : 1;
    let zIndex = STACK_Z[slot];
    let rotate = 0;

    if (p > 0.001) {
      const exitX = dir === -1 ? -w * 1.18 : w * 1.18;

      if (dir === -1) {
        if (slot === 0) {
          x = interpolate(p, [0, 1], [snapX.value, exitX]);
          opacity = interpolate(p, [0, 0.35, 0.75, 1], [1, 0.85, 0.2, 0], Extrapolation.CLAMP);
          rotate = interpolate(p, [0, 1], [0, -10]);
        } else if (slot === 1) {
          y = interpolate(p, [0, 1], [STACK_Y[1], STACK_Y[0]]);
          scale = interpolate(p, [0, 1], [STACK_SCALE[1], STACK_SCALE[0]]);
          zIndex = p > 0.25 ? 30 : 20;
        } else {
          y = interpolate(p, [0, 1], [STACK_Y[2], STACK_Y[1]]);
          scale = interpolate(p, [0, 1], [STACK_SCALE[2], STACK_SCALE[1]]);
          opacity = interpolate(p, [0, 1], [0, 1]);
        }
      } else if (dir === 1) {
        if (slot === 0) {
          x = interpolate(p, [0, 1], [snapX.value, exitX]);
          opacity = interpolate(p, [0, 0.35, 0.75, 1], [1, 0.85, 0.2, 0], Extrapolation.CLAMP);
          rotate = interpolate(p, [0, 1], [0, 10]);
        } else if (slot === 1) {
          y = interpolate(p, [0, 1], [STACK_Y[1], STACK_Y[2]]);
          scale = interpolate(p, [0, 1], [STACK_SCALE[1], STACK_SCALE[2]]);
          opacity = interpolate(p, [0, 0.6, 1], [1, 0.35, 0], Extrapolation.CLAMP);
        } else {
          y = interpolate(p, [0, 1], [STACK_Y[2], STACK_Y[0]]);
          scale = interpolate(p, [0, 1], [STACK_SCALE[2], STACK_SCALE[0]]);
          opacity = interpolate(p, [0, 0.2, 1], [0.88, 1, 1]);
          zIndex = p > 0.15 ? 30 : 10;
        }
      }
    } else if (slot === 0) {
      x = dx;
      rotate = interpolate(dx, [-w, 0, w], [-7, 0, 7], Extrapolation.CLAMP);
      opacity = interpolate(Math.abs(dx), [0, w * 0.85], [1, 0.9], Extrapolation.CLAMP);
    } else if (dir === 0 || dx <= 0) {
      const t = interpolate(dx, [0, -w * DRAG_PROMOTE], [0, 1], Extrapolation.CLAMP);
      if (slot === 1) {
        y = interpolate(t, [0, 1], [STACK_Y[1], STACK_Y[0]]);
        scale = interpolate(t, [0, 1], [STACK_SCALE[1], STACK_SCALE[0]]);
        zIndex = t > 0.45 ? 29 : 20;
      } else {
        y = interpolate(t, [0, 1], [STACK_Y[2], STACK_Y[1]]);
        scale = interpolate(t, [0, 1], [STACK_SCALE[2], STACK_SCALE[1]]);
        opacity = interpolate(t, [0, 1], [0, 0.96], Extrapolation.CLAMP);
      }
    } else {
      const t = interpolate(dx, [0, w * DRAG_PROMOTE], [0, 1], Extrapolation.CLAMP);
      if (slot === 2) {
        y = interpolate(t, [0, 1], [STACK_Y[2], STACK_Y[0]]);
        scale = interpolate(t, [0, 1], [STACK_SCALE[2], STACK_SCALE[0]]);
        opacity = interpolate(t, [0, 1], [0, 1], Extrapolation.CLAMP);
        zIndex = t > 0.35 ? 29 : 10;
      } else if (slot === 1) {
        y = interpolate(t, [0, 1], [STACK_Y[1], STACK_Y[2]]);
        scale = interpolate(t, [0, 1], [STACK_SCALE[1], STACK_SCALE[2]]);
        opacity = interpolate(t, [0, 1], [1, 0.75]);
      }
    }

    return {
      opacity,
      zIndex,
      transform: [{ translateX: x }, { translateY: y }, { scale }, { rotate: `${rotate}deg` }],
    };
  });
}

export function ScheduledRideStack({ rides, onBookPress }: Props) {
  const [index, setIndex] = useState(0);
  const [swapActive, setSwapActive] = useState(false);
  const [cardW, setCardW] = useState(0);
  const [cardH, setCardH] = useState(0);
  const dragX = useSharedValue(0);
  const deckProgress = useSharedValue(0);
  const dismissDir = useSharedValue(0);
  const snapX = useSharedValue(0);
  const cardWidth = useSharedValue(0);
  const isAnimating = useSharedValue(false);

  const onStageLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    setCardW(w);
    cardWidth.value = w;
  };

  const onFrontLayout = (e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    setCardH((prev) => (Math.abs(prev - h) < 1 ? prev : h));
  };

  const goNext = useCallback(() => {
    setIndex((i) => (i + 1) % rides.length);
  }, [rides.length]);

  const goPrev = useCallback(() => {
    setIndex((i) => (i - 1 + rides.length) % rides.length);
  }, [rides.length]);

  const finishSwap = useCallback(
    (direction: 'next' | 'prev') => {
      isAnimating.value = false;
      dismissDir.value = 0;
      snapX.value = 0;
      dragX.value = 0;
      // Drop the back slot first while the exit pose is still held (opacity 0, off-screen).
      setSwapActive(false);
      if (direction === 'next') goNext();
      else goPrev();
      deckProgress.value = 0;
    },
    [deckProgress, dismissDir, dragX, goNext, goPrev, isAnimating, snapX],
  );

  const startSwap = useCallback(
    (direction: 'next' | 'prev', fromX: number) => {
      setSwapActive(true);
      isAnimating.value = true;
      dismissDir.value = direction === 'next' ? -1 : 1;
      snapX.value = fromX;
      deckProgress.value = 0;
      deckProgress.value = withTiming(1, { duration: SWAP_MS }, (finished) => {
        if (finished) runOnJS(finishSwap)(direction);
      });
    },
    [deckProgress, dismissDir, finishSwap, isAnimating, snapX],
  );

  const slot0Style = useDeckSlotStyle(0, dragX, deckProgress, dismissDir, snapX, cardWidth);
  const slot1Style = useDeckSlotStyle(1, dragX, deckProgress, dismissDir, snapX, cardWidth);
  const slot2Style = useDeckSlotStyle(2, dragX, deckProgress, dismissDir, snapX, cardWidth);
  const slotStyles = [slot0Style, slot1Style, slot2Style] as const;

  const pan = Gesture.Pan()
    .enabled(rides.length > 1)
    .activeOffsetX([-12, 12])
    .failOffsetY([-16, 16])
    .onUpdate((e) => {
      if (isAnimating.value) return;
      dragX.value = e.translationX;
    })
    .onEnd((e) => {
      if (isAnimating.value) return;

      const width = cardWidth.value;
      const dismissThreshold = Math.max(width * 0.2, 68);

      const dismissLeft = e.translationX < -dismissThreshold || e.velocityX < -650;
      const dismissRight = e.translationX > dismissThreshold || e.velocityX > 650;

      if (dismissLeft || dismissRight) {
        runOnJS(startSwap)(dismissLeft ? 'next' : 'prev', e.translationX);
        return;
      }

      dragX.value = withSpring(0, { damping: 22, stiffness: 320 });
    });

  if (rides.length === 0) {
    return <EmptyState onBookPress={onBookPress} />;
  }

  const stackCount = Math.min(rides.length, VISIBLE_STACK);
  /** Third card is only mounted during swap so the dismissed pass cannot reappear on top. */
  const renderedSlots = swapActive ? stackCount : Math.min(stackCount, 2);
  const stackExtra = renderedSlots > 1 ? 18 : 0;
  const ticketWidth = cardW > 0 ? cardW : '100%';

  const deckSlots = Array.from({ length: renderedSlots }, (_, slot) => {
    const reverseSlot = (renderedSlots - 1 - slot) as 0 | 1 | 2;
    const rideIndex = mod(index + reverseSlot, rides.length);
    return { slot: reverseSlot, ride: rides[rideIndex], rideIndex };
  });

  return (
    <GestureHandlerRootView style={styles.root}>
      <View style={styles.pager}>
        <Text style={styles.pagerText}>
          {index + 1} / {rides.length}
        </Text>
        {rides.length > 1 ? <Text style={styles.pagerHint}>Swipe to browse</Text> : null}
      </View>

      <View
        style={[styles.stackStage, cardH > 0 && { height: cardH + stackExtra }]}
        onLayout={onStageLayout}>
        {deckSlots.map(({ slot, ride, rideIndex }) => {
          const isFront = slot === 0;
          const card = (
            <PassTicket
              ride={ride}
              tone={passBlueFor(ride.id, rideIndex)}
              onLayout={isFront ? onFrontLayout : undefined}
              style={{ width: ticketWidth, alignSelf: 'center' }}
            />
          );

          if (!isFront) {
            return (
              <Animated.View
                key={`${ride.id}-${slot}`}
                style={[styles.layer, slotStyles[slot]]}
                pointerEvents="none">
                {card}
              </Animated.View>
            );
          }

          return (
            <GestureDetector key={`${ride.id}-gesture`} gesture={pan}>
              <Animated.View style={[styles.layer, slotStyles[slot]]}>{card}</Animated.View>
            </GestureDetector>
          );
        })}
      </View>
    </GestureHandlerRootView>
  );
}

function PassTicket({
  ride,
  tone,
  style,
  onLayout,
}: {
  ride: ScheduledRide;
  tone: string;
  style?: object;
  onLayout?: (e: LayoutChangeEvent) => void;
}) {
  const dateLine = `${ride.weekday} ${ride.day} ${ride.month}`;

  return (
    <View style={[styles.ticket, { backgroundColor: tone }, style]} onLayout={onLayout}>
      <View style={styles.ticketTop}>
        <View style={styles.titleRow}>
          <View style={styles.titleCopy}>
            <Text style={styles.brand}>Victory Tata</Text>
            <Text style={styles.title} numberOfLines={2}>
              {ride.vehicleName}
            </Text>
          </View>
          <Image source={ride.image} style={styles.thumb} contentFit="contain" />
        </View>

        <View style={styles.metaGrid}>
          <View style={styles.metaCol}>
            <Text style={styles.metaLabel}>Timing</Text>
            <Text style={styles.metaValue}>{dateLine}</Text>
            <Text style={styles.metaSub}>{ride.time}</Text>
          </View>
          <View style={styles.metaCol}>
            <Text style={styles.metaLabel}>Venue</Text>
            <Text style={styles.metaValue}>{ride.meet}</Text>
            <Text style={styles.metaSub} numberOfLines={2}>
              {ride.location}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.perforation}>
        <View style={[styles.notch, styles.notchLeft]} />
        <View style={styles.dashRow}>
          {Array.from({ length: 20 }).map((_, i) => (
            <View key={i} style={styles.dash} />
          ))}
        </View>
        <View style={[styles.notch, styles.notchRight]} />
      </View>

      <View style={styles.ticketBottom}>
        <Text style={styles.scanLabel}>Scan code at entrance</Text>
        <View style={styles.qrPad}>
          <WalletPassQr seed={ride.id} size={168} />
        </View>
        <View style={styles.badgeRow}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Upcoming</Text>
          </View>
          <Text style={styles.licence}>Bring a valid licence</Text>
        </View>
      </View>
    </View>
  );
}

function EmptyState({ onBookPress }: { onBookPress?: () => void }) {
  return (
    <View style={styles.emptyCard}>
      <Text style={styles.emptyBrand}>Scheduled rides</Text>
      <Text style={styles.emptyTitle}>Nothing booked yet</Text>
      <Text style={styles.emptyBody}>
        Switch to Schedule a new ride to lock a free 45-minute drive.
      </Text>
      {onBookPress ? (
        <Pressable
          accessibilityRole="button"
          onPress={onBookPress}
          style={({ pressed }) => [styles.emptyCta, { opacity: pressed ? 0.9 : 1 }]}>
          <Text style={styles.emptyCtaText}>Schedule a new ride</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: '100%',
  },
  pager: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  pagerText: {
    fontSize: 13,
    fontWeight: '700',
    color: AUTH_BLUE,
    letterSpacing: 0.2,
  },
  pagerHint: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(10,24,72,0.4)',
  },
  stackStage: {
    position: 'relative',
    width: '100%',
    minHeight: 520,
    overflow: 'hidden',
  },
  layer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 18,
  },
  ticket: {
    borderRadius: 26,
    overflow: 'hidden',
    shadowColor: '#0A1848',
    shadowOpacity: 0.3,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 14 },
    elevation: 7,
  },
  ticketTop: {
    paddingHorizontal: 24,
    paddingTop: 26,
    paddingBottom: 22,
    gap: 22,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  titleCopy: {
    flex: 1,
    minWidth: 0,
  },
  brand: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '800',
    letterSpacing: -0.6,
    color: '#FFFFFF',
  },
  thumb: {
    width: 88,
    height: 58,
  },
  metaGrid: {
    flexDirection: 'row',
    gap: 18,
  },
  metaCol: {
    flex: 1,
    gap: 5,
    minWidth: 0,
  },
  metaLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.42)',
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  metaSub: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 19,
  },
  perforation: {
    height: 30,
    justifyContent: 'center',
  },
  notch: {
    position: 'absolute',
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: SCREEN_BG,
    zIndex: 2,
  },
  notchLeft: {
    left: -13,
  },
  notchRight: {
    right: -13,
  },
  dashRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 30,
  },
  dash: {
    width: 7,
    height: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(255,255,255,0.28)',
  },
  ticketBottom: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 26,
    paddingHorizontal: 24,
    gap: 14,
  },
  scanLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 0.2,
  },
  qrPad: {
    width: 196,
    height: 196,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(94,234,212,0.18)',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
    color: '#5EEAD4',
    textTransform: 'uppercase',
  },
  licence: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
  },
  emptyCard: {
    backgroundColor: AUTH_BLUE,
    borderRadius: 26,
    padding: 26,
    gap: 8,
  },
  emptyBrand: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.5)',
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.4,
  },
  emptyBody: {
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(255,255,255,0.65)',
    marginBottom: 8,
  },
  emptyCta: {
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  emptyCtaText: {
    fontSize: 13,
    fontWeight: '700',
    color: AUTH_BLUE,
  },
});
