import { StyleSheet, Text, View } from 'react-native';

import { AUTH_BLUE } from '@/constants/brand';
import { useInstantTracking } from '@/context/instant-tracking';
import { useBreakpoint } from '@/hooks/use-breakpoint';

export function EtaTopChip() {
  const { active } = useInstantTracking();
  const { fs } = useBreakpoint();

  if (!active) return null;

  const label =
    active.eta_minutes <= 0
      ? 'Arriving · 0 min'
      : `ETA ${active.eta_minutes} min`;

  return (
    <View style={styles.chip} accessibilityRole="text" accessibilityLabel={`Test drive ${label}`}>
      <View style={styles.dot} />
      <Text style={[styles.text, { fontSize: fs(11) }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: 120,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderWidth: 1,
    borderColor: 'rgba(10,24,72,0.12)',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#16A34A',
  },
  text: {
    fontWeight: '700',
    color: AUTH_BLUE,
    letterSpacing: -0.2,
  },
});
