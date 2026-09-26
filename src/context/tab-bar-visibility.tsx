import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';
import {
  Easing,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

type TabBarVisibilityContextValue = {
  visible: SharedValue<number>;
  show: () => void;
  hide: () => void;
};

const TabBarVisibilityContext = createContext<TabBarVisibilityContextValue | null>(null);

const TIMING = {
  duration: 280,
  easing: Easing.bezier(0.22, 1, 0.36, 1),
};

export function TabBarVisibilityProvider({ children }: { children: ReactNode }) {
  const visible = useSharedValue(1);

  const show = useCallback(() => {
    visible.value = withTiming(1, TIMING);
  }, [visible]);

  const hide = useCallback(() => {
    visible.value = withTiming(0, TIMING);
  }, [visible]);

  const value = useMemo(() => ({ visible, show, hide }), [visible, show, hide]);

  return (
    <TabBarVisibilityContext.Provider value={value}>{children}</TabBarVisibilityContext.Provider>
  );
}

export function useTabBarVisibility() {
  const ctx = useContext(TabBarVisibilityContext);
  if (!ctx) {
    throw new Error('useTabBarVisibility must be used within TabBarVisibilityProvider');
  }
  return ctx;
}
