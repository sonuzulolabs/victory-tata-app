import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EtaTopChip } from '@/components/eta-top-chip';
import { AUTH_BLUE, SCREEN_BG } from '@/constants/brand';
import { googleInitials, useUserProfile } from '@/context/user-profile';
import { useBreakpoint } from '@/hooks/use-breakpoint';

type Props = {
  title: string;
  onPressProfile?: () => void;
  onPressMenu?: () => void;
};

export function AppHeader({ title, onPressProfile, onPressMenu }: Props) {
  const insets = useSafeAreaInsets();
  const { profile } = useUserProfile();
  const { isTablet, gutter, fs } = useBreakpoint();
  const initials = googleInitials(profile);
  const iconBox = isTablet ? 52 : 44;
  const avatar = isTablet ? 40 : 34;

  return (
    <View
      style={[
        styles.wrap,
        {
          paddingTop: insets.top + (isTablet ? 12 : 8),
          paddingBottom: isTablet ? 14 : 10,
          paddingHorizontal: gutter,
          backgroundColor: SCREEN_BG,
        },
      ]}>
      <View style={[styles.row, { minHeight: iconBox }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Profile"
          hitSlop={8}
          onPress={onPressProfile}
          style={({ pressed }) => [
            styles.iconBtn,
            { width: iconBox, height: iconBox, opacity: pressed ? 0.7 : 1 },
          ]}>
          <View
            style={[
              styles.initialsCircle,
              { width: avatar, height: avatar, borderRadius: avatar / 2 },
            ]}>
            {initials ? (
              <Text style={[styles.initials, { fontSize: fs(12) }]}>{initials}</Text>
            ) : (
              <Ionicons name="person" size={fs(18)} color="#FFFFFF" />
            )}
          </View>
        </Pressable>

        <Text
          style={[styles.title, { fontSize: fs(18), lineHeight: fs(22) }]}
          numberOfLines={1}
          allowFontScaling>
          {title}
        </Text>

        <View style={styles.trailing}>
          <EtaTopChip />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open menu"
            hitSlop={8}
            onPress={onPressMenu}
            style={({ pressed }) => [
              styles.iconBtn,
              { width: iconBox, height: iconBox, opacity: pressed ? 0.7 : 1 },
            ]}>
            <Ionicons name="menu" size={fs(26)} color={AUTH_BLUE} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  trailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: '42%',
    justifyContent: 'flex-end',
  },
  iconBtn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialsCircle: {
    backgroundColor: AUTH_BLUE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontWeight: '700',
    color: AUTH_BLUE,
    letterSpacing: -0.2,
    paddingHorizontal: 8,
  },
});
