import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AUTH_BLUE, AUTH_BLUE_SOFT, SCREEN_BG } from '@/constants/brand';
import {
  initialsFromName,
  useUserProfile,
  type UserProfile,
} from '@/context/user-profile';
import { formatInr } from '@/data/referrals';
import { fetchAccountSummary } from '@/lib/api';
import { isValidIndianMobile, mobileDigitsFromStored } from '@/lib/phone';

function isProfileIncomplete(profile: UserProfile) {
  if (profile.authMethod === 'phone') {
    return !profile.name.trim() || !profile.email.trim();
  }
  return !profile.phone.trim();
}

function avatarInitials(profile: UserProfile | null) {
  if (!profile) return '?';
  if (profile.name.trim()) return initialsFromName(profile.name);
  if (profile.email.trim()) return initialsFromName(profile.email.split('@')[0] ?? '?');
  const digits = profile.phone.replace(/\D/g, '');
  if (digits.length >= 2) return digits.slice(-2);
  return '?';
}

const LINKS: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  caption: string;
  href?: '/(tabs)/offers' | '/(tabs)/referrals' | '/(tabs)/test-drive';
}[] = [
  {
    icon: 'pricetag-outline',
    label: 'Offers',
    caption: 'Exclusive EV & PV deals',
    href: '/(tabs)/offers',
  },
  {
    icon: 'gift-outline',
    label: 'Referrals',
    caption: 'Invite friends and earn',
    href: '/(tabs)/referrals',
  },
  {
    icon: 'car-sport-outline',
    label: 'Test drive',
    caption: 'Book a doorstep or showroom drive',
    href: '/(tabs)/test-drive',
  },
  {
    icon: 'call-outline',
    label: 'Call showroom',
    caption: 'Victory Tata · Avinashi Road',
  },
];

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { profile, signOut } = useUserProfile();
  const [points, setPoints] = useState<number | null>(null);
  const [rewards, setRewards] = useState<number | null>(null);
  const [referralCount, setReferralCount] = useState<number | null>(null);

  const phone = mobileDigitsFromStored(profile?.phone ?? '');

  useFocusEffect(
    useCallback(() => {
      if (!isValidIndianMobile(phone)) {
        setPoints(null);
        setRewards(null);
        setReferralCount(null);
        return;
      }
      let cancelled = false;
      void fetchAccountSummary(phone)
        .then((summary) => {
          if (cancelled) return;
          setPoints(summary.points);
          setRewards(summary.creditedRewards);
          setReferralCount(summary.referralCount);
        })
        .catch(() => {
          if (cancelled) return;
          setPoints(null);
          setRewards(null);
          setReferralCount(null);
        });
      return () => {
        cancelled = true;
      };
    }, [phone]),
  );

  const memberSince = profile?.memberSince.trim() ?? '';
  const city = profile?.city.trim() ?? '';
  const badgeParts = [memberSince ? `Member since ${memberSince}` : '', city].filter(Boolean);
  const editLabel =
    profile && isProfileIncomplete(profile) ? 'Complete your profile' : 'Edit profile';
  const editIcon =
    profile && isProfileIncomplete(profile) ? ('person-circle-outline' as const) : ('create-outline' as const);

  const showName = Boolean(profile?.name.trim());
  const showPhone = Boolean(profile?.phone.trim());
  const showEmail = Boolean(profile?.email.trim());
  const nameText = profile?.name.trim() || 'Sign in';
  const phoneText = profile?.phone.trim() ?? '';
  const emailText = profile?.email.trim() ?? '';

  const stats = [
    {
      id: 'points',
      icon: 'diamond-outline' as const,
      label: 'Points',
      value: points == null ? '—' : points.toLocaleString('en-IN'),
      hint: 'Redeemable',
    },
    {
      id: 'value',
      icon: 'wallet-outline' as const,
      label: 'Rewards',
      value: rewards == null ? '—' : formatInr(rewards),
      hint: 'Credited',
    },
    {
      id: 'referrals',
      icon: 'people-outline' as const,
      label: 'Referrals',
      value: referralCount == null ? '—' : String(referralCount),
      hint: 'Submitted',
    },
  ];

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/home');
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={6}
          onPress={goBack}
          style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.75 : 1 }]}>
          <Ionicons name="arrow-back" size={20} color={AUTH_BLUE} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerEyebrow}>Victory Tata</Text>
          <Text style={styles.headerTitle}>My Profile</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 28 }]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.identity}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{avatarInitials(profile)}</Text>
          </View>
          {showName || !profile ? <Text style={styles.name}>{nameText}</Text> : null}
          {showPhone ? <Text style={styles.meta}>{phoneText}</Text> : null}
          {showEmail ? <Text style={styles.meta}>{emailText}</Text> : null}
          {badgeParts.length > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badgeParts.join(' · ')}</Text>
            </View>
          ) : null}

          {profile ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={editLabel}
              onPress={() => router.push('/edit-profile')}
              style={({ pressed }) => [styles.editBtn, { opacity: pressed ? 0.85 : 1 }]}>
              <Ionicons name={editIcon} size={16} color={AUTH_BLUE} />
              <Text style={styles.editBtnText}>{editLabel}</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.statsRow}>
          {stats.map((stat) => (
            <View key={stat.id} style={styles.statCard}>
              <View style={styles.statIcon}>
                <Ionicons name={stat.icon} size={15} color={AUTH_BLUE} />
              </View>
              <Text style={styles.statValue} numberOfLines={1}>
                {stat.value}
              </Text>
              <Text style={styles.statLabel} numberOfLines={1}>
                {stat.label}
              </Text>
              <Text style={styles.statHint} numberOfLines={1}>
                {stat.hint}
              </Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionLabel}>Quick links</Text>
        <View style={styles.list}>
          {LINKS.map((item, index) => (
            <Pressable
              key={item.label}
              accessibilityRole="button"
              accessibilityLabel={item.label}
              disabled={!item.href}
              onPress={() => {
                if (item.href) router.push(item.href);
              }}
              style={({ pressed }) => [
                styles.row,
                index === LINKS.length - 1 && styles.rowLast,
                { opacity: pressed && item.href ? 0.75 : 1 },
              ]}>
              <View style={styles.rowIcon}>
                <Ionicons name={item.icon} size={18} color={AUTH_BLUE} />
              </View>
              <View style={styles.rowCopy}>
                <Text style={styles.rowLabel}>{item.label}</Text>
                <Text style={styles.rowCaption}>{item.caption}</Text>
              </View>
              {item.href ? (
                <Ionicons name="chevron-forward" size={16} color="rgba(10,24,72,0.35)" />
              ) : null}
            </Pressable>
          ))}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Sign out"
          onPress={() => {
            signOut();
            router.replace('/');
          }}
          style={({ pressed }) => [styles.signOut, { opacity: pressed ? 0.8 : 1 }]}>
          <Ionicons name="log-out-outline" size={18} color="#B42318" />
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: SCREEN_BG,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(10,24,72,0.08)',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: SCREEN_BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  headerEyebrow: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: 'rgba(10,24,72,0.4)',
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: AUTH_BLUE,
    letterSpacing: -0.3,
  },
  headerSpacer: {
    width: 40,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  identity: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(10,24,72,0.08)',
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: AUTH_BLUE,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  avatarText: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    color: AUTH_BLUE,
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  meta: {
    fontSize: 14,
    color: 'rgba(18,20,26,0.58)',
    marginTop: 2,
  },
  badge: {
    marginTop: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(10,24,72,0.08)',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: AUTH_BLUE_SOFT,
  },
  editBtn: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(10,24,72,0.07)',
  },
  editBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: AUTH_BLUE,
  },
  statsRow: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 10,
  },
  statCard: {
    flex: 1,
    minWidth: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingTop: 14,
    paddingBottom: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(10,24,72,0.08)',
    alignItems: 'center',
  },
  statIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(10,24,72,0.07)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statValue: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '800',
    color: AUTH_BLUE,
    letterSpacing: -0.3,
    marginBottom: 4,
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    color: AUTH_BLUE,
    textAlign: 'center',
  },
  statHint: {
    marginTop: 2,
    fontSize: 11,
    lineHeight: 14,
    color: 'rgba(18,20,26,0.45)',
    textAlign: 'center',
  },
  sectionLabel: {
    marginTop: 28,
    marginBottom: 10,
    marginLeft: 4,
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(10,24,72,0.5)',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  list: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(10,24,72,0.08)',
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(10,24,72,0.06)',
    gap: 12,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(10,24,72,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowCopy: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: AUTH_BLUE,
  },
  rowCaption: {
    marginTop: 2,
    fontSize: 12,
    color: 'rgba(18,20,26,0.5)',
  },
  signOut: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(180,35,24,0.08)',
  },
  signOutText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#B42318',
  },
});
