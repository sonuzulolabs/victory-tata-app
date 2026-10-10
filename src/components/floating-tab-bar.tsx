import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { LayoutChangeEvent, Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AUTH_BLUE } from '@/constants/brand';
import { useTabBarVisibility } from '@/context/tab-bar-visibility';
import { useBreakpoint } from '@/hooks/use-breakpoint';

type TabRoute = { key: string; name: string };
type TabBarProps = {
  state: { index: number; routes: TabRoute[] };
  descriptors: Record<string, { options: { title?: string } }>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  navigation: any;
};

type TabMeta = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconActive: keyof typeof Ionicons.glyphMap;
};

type ItemLayout = { x: number; width: number };

const META: Record<string, TabMeta> = {
  home: {
    label: 'Home',
    icon: 'home-outline',
    iconActive: 'home',
  },
  offers: {
    label: 'Offers',
    icon: 'pricetag-outline',
    iconActive: 'pricetag',
  },
  referrals: {
    label: 'Referrals',
    icon: 'gift-outline',
    iconActive: 'gift',
  },
  'test-drive': {
    label: 'Test Drive',
    icon: 'car-outline',
    iconActive: 'car-sport',
  },
};

const TIMING = {
  duration: 340,
  easing: Easing.bezier(0.22, 1, 0.36, 1),
};

const HIDE_DISTANCE = 110;

export function FloatingTabBar({ state, descriptors, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const { visible, show } = useTabBarVisibility();
  const { tabBarMaxWidth, isTablet, fs } = useBreakpoint();
  const [layouts, setLayouts] = useState<Record<number, ItemLayout>>({});
  const indicatorX = useSharedValue(0);
  const indicatorW = useSharedValue(0);
  const ready = useSharedValue(0);

  useEffect(() => {
    show();
  }, [state.index, show]);

  useEffect(() => {
    const layout = layouts[state.index];
    if (!layout) return;
    const animate = ready.value === 1;
    indicatorX.value = animate ? withTiming(layout.x, TIMING) : layout.x;
    indicatorW.value = animate ? withTiming(layout.width, TIMING) : layout.width;
    ready.value = 1;
  }, [state.index, layouts, indicatorX, indicatorW, ready]);

  const indicatorStyle = useAnimatedStyle(() => ({
    opacity: ready.value,
    transform: [{ translateX: indicatorX.value + 4 }],
    width: Math.max(indicatorW.value - 8, 1),
  }));

  const wrapStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - visible.value) * HIDE_DISTANCE }],
    opacity: 0.35 + visible.value * 0.65,
  }));

  const onItemLayout = (i: number) => (e: LayoutChangeEvent) => {
    const { x, width } = e.nativeEvent.layout;
    setLayouts((prev) => {
      const cur = prev[i];
      if (cur && Math.abs(cur.x - x) < 0.5 && Math.abs(cur.width - width) < 0.5) return prev;
      return { ...prev, [i]: { x, width } };
    });
  };

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.wrap,
        {
          paddingBottom: Math.max(insets.bottom, isTablet ? 18 : 14),
          paddingHorizontal: isTablet ? 32 : 20,
        },
        wrapStyle,
      ]}>
      <View
        style={[
          styles.pill,
          {
            maxWidth: tabBarMaxWidth,
            minHeight: isTablet ? 72 : 64,
            paddingHorizontal: isTablet ? 14 : 10,
          },
        ]}>
        <Animated.View style={[styles.indicator, indicatorStyle]} />

        {state.routes.map((route, i) => {
          const focused = state.index === i;
          const meta = META[route.name] ?? {
            label: descriptors[route.key]?.options.title ?? route.name,
            icon: 'ellipse-outline' as const,
            iconActive: 'ellipse' as const,
          };

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              accessibilityLabel={meta.label}
              onPress={onPress}
              onLayout={onItemLayout(i)}
              style={[
                styles.item,
                focused ? styles.itemActive : styles.itemIdle,
                !focused && isTablet && styles.itemIdleTablet,
                { minHeight: isTablet ? 64 : 56 },
              ]}>
              <View
                style={[
                  styles.chip,
                  focused && styles.chipActive,
                  focused && isTablet && styles.chipActiveTablet,
                  { minHeight: isTablet ? 52 : 44 },
                ]}>
                <Ionicons
                  name={focused ? meta.iconActive : meta.icon}
                  size={fs(20)}
                  color={focused ? AUTH_BLUE : 'rgba(255,255,255,0.9)'}
                />
                {focused ? (
                  <Animated.Text
                    entering={FadeIn.duration(220)}
                    exiting={FadeOut.duration(140)}
                    style={[styles.label, { fontSize: fs(13) }]}
                    numberOfLines={1}>
                    {meta.label}
                  </Animated.Text>
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    minHeight: 64,
    width: '100%',
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: AUTH_BLUE,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#0A1848',
        shadowOpacity: 0.35,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 10 },
      },
      android: { elevation: 14 },
      default: {
        boxShadow: '0 12px 28px rgba(10, 24, 72, 0.35)',
      } as object,
    }),
  },
  indicator: {
    position: 'absolute',
    top: 8,
    bottom: 8,
    left: 0,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
  },
  item: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
    zIndex: 1,
  },
  itemIdle: {
    width: 54,
    flexGrow: 0,
    flexShrink: 0,
  },
  itemIdleTablet: {
    width: 64,
  },
  itemActive: {
    flexGrow: 0,
    flexShrink: 0,
    paddingHorizontal: 2,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 6,
  },
  chipActive: {
    paddingHorizontal: 14,
    minWidth: 112,
    maxWidth: 148,
  },
  chipActiveTablet: {
    paddingHorizontal: 18,
    minWidth: 132,
    maxWidth: 180,
  },
  label: {
    color: AUTH_BLUE,
    fontWeight: '700',
  },
});
