import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AUTH_BLUE, AUTH_BLUE_SOFT, SCREEN_BG } from '@/constants/brand';
import {
  googleInitials,
  useUserProfile,
  type UserProfile,
} from '@/context/user-profile';
import { formatInr } from '@/data/referrals';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { useRefreshControl } from '@/hooks/use-refresh-control';
import { fetchAccountSummary, fetchDealership } from '@/lib/api';
import { isValidIndianMobile, mobileDigitsFromStored } from '@/lib/phone';

function isProfileIncomplete(profile: UserProfile) {
  if (profile.authMethod === 'phone') {
    return !profile.name.trim() || !profile.email.trim();
  }
  return !profile.phone.trim();
}

const LINKS: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  caption: string;
  href?: '/(tabs)/offers' | '/(tabs)/referrals' | '/(tabs)/test-drive';
  action?: 'call';
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
    action: 'call' as const,
  },
];

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { contentMaxWidth, gutter, isTablet, fs, lh } = useBreakpoint();
  const { profile, signOut, refreshFromServer } = useUserProfile();
  const [points, setPoints] = useState<number | null>(null);
  const [rewards, setRewards] = useState<number | null>(null);
  const [referralCount, setReferralCount] = useState<number | null>(null);

  const phone = mobileDigitsFromStored(profile?.phone ?? '');
  const initials = googleInitials(profile);
  const avatarSize = isTablet ? 96 : 76;
  const backSize = isTablet ? 48 : 40;

  const reloadProfile = useCallback(async () => {
    if (!isValidIndianMobile(phone)) {
      setPoints(null);
      setRewards(null);
      setReferralCount(null);
      return;
    }
    await refreshFromServer();
    try {
      const summary = await fetchAccountSummary(phone);
      setPoints(summary.points);
      setRewards(summary.creditedRewards);
      setReferralCount(summary.referralCount);
    } catch {
      setPoints(null);
      setRewards(null);
      setReferralCount(null);
    }
  }, [phone, refreshFromServer]);

  const { refreshControl } = useRefreshControl(reloadProfile);

  useFocusEffect(
    useCallback(() => {
      void reloadProfile();
    }, [reloadProfile]),
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
    <View style={[styles.root, { paddingTop: insets.top, maxWidth: contentMaxWidth }]}>
      <View
        style={[
          styles.header,
          {
            paddingHorizontal: gutter,
            paddingTop: isTablet ? 12 : 8,
            paddingBottom: isTablet ? 16 : 12,
          },
        ]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={6}
          onPress={goBack}
          style={({ pressed }) => [
            styles.backBtn,
            { width: backSize, height: backSize, borderRadius: isTablet ? 14 : 12, opacity: pressed ? 0.75 : 1 },
          ]}>
          <Ionicons name="arrow-back" size={fs(20)} color={AUTH_BLUE} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerEyebrow, { fontSize: fs(11), lineHeight: lh(11, 1.3) }]}>
            Victory Tata
          </Text>
          <Text style={[styles.headerTitle, { fontSize: fs(20), lineHeight: lh(20, 1.25) }]}>
            My Profile
          </Text>
        </View>
        <View style={[styles.headerSpacer, { width: backSize }]} />
      </View>

      <ScrollView
        refreshControl={refreshControl}
        contentContainerStyle={[
          styles.scroll,
          {
            paddingBottom: insets.bottom + (isTablet ? 40 : 28),
            paddingHorizontal: gutter,
            paddingTop: isTablet ? 22 : 16,
            maxWidth: isTablet ? 720 : undefined,
            width: '100%',
            alignSelf: 'center',
          },
        ]}
        showsVerticalScrollIndicator={false}>
        <View style={[styles.identity, isTablet && styles.identityTablet]}>
          <View
            style={[
              styles.avatar,
              {
                width: avatarSize,
                height: avatarSize,
                borderRadius: avatarSize / 2,
                marginBottom: isTablet ? 18 : 14,
              },
            ]}>
            {initials ? (
              <Text style={[styles.avatarText, { fontSize: fs(30) }]}>{initials}</Text>
            ) : (
              <Ionicons name="person" size={fs(36)} color="#FFFFFF" />
            )}
          </View>
          {showName || !profile ? (
            <Text style={[styles.name, { fontSize: fs(24), lineHeight: lh(24, 1.25) }]}>
              {nameText}
            </Text>
          ) : null}
          {showPhone ? (
            <Text style={[styles.meta, { fontSize: fs(15), lineHeight: lh(15, 1.35) }]}>
              {phoneText}
            </Text>
          ) : null}
          {showEmail ? (
            <Text style={[styles.meta, { fontSize: fs(15), lineHeight: lh(15, 1.35) }]}>
              {emailText}
            </Text>
          ) : null}
          {badgeParts.length > 0 ? (
            <View style={[styles.badge, isTablet && styles.badgeTablet]}>
              <Text style={[styles.badgeText, { fontSize: fs(13), lineHeight: lh(13, 1.3) }]}>
                {badgeParts.join(' · ')}
              </Text>
            </View>
          ) : null}

          {profile ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={editLabel}
              onPress={() => router.push('/edit-profile')}
              style={({ pressed }) => [
                styles.editBtn,
                isTablet && styles.editBtnTablet,
                { opacity: pressed ? 0.85 : 1 },
              ]}>
              <Ionicons name={editIcon} size={fs(16)} color={AUTH_BLUE} />
              <Text style={[styles.editBtnText, { fontSize: fs(14) }]}>{editLabel}</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={[styles.statsRow, isTablet && styles.statsRowTablet]}>
          {stats.map((stat) => (
            <View key={stat.id} style={[styles.statCard, isTablet && styles.statCardTablet]}>
              <View style={[styles.statIcon, isTablet && styles.statIconTablet]}>
                <Ionicons name={stat.icon} size={fs(16)} color={AUTH_BLUE} />
              </View>
              <Text
                style={[styles.statValue, { fontSize: fs(18), lineHeight: lh(18, 1.25) }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}>
                {stat.value}
              </Text>
              <Text
                style={[styles.statLabel, { fontSize: fs(13), lineHeight: lh(13, 1.3) }]}
                numberOfLines={1}>
                {stat.label}
              </Text>
              <Text
                style={[styles.statHint, { fontSize: fs(12), lineHeight: lh(12, 1.3) }]}
                numberOfLines={1}>
                {stat.hint}
              </Text>
            </View>
          ))}
        </View>

        <Text
          style={[
            styles.sectionLabel,
            {
              fontSize: fs(13),
              lineHeight: lh(13, 1.3),
              marginTop: isTablet ? 34 : 28,
              marginBottom: isTablet ? 14 : 10,
            },
          ]}>
          Quick links
        </Text>
        <View style={[styles.list, isTablet && styles.listTablet]}>
          {LINKS.map((item, index) => (
            <Pressable
              key={item.label}
              accessibilityRole="button"
              accessibilityLabel={item.label}
              disabled={!item.href && item.action !== 'call'}
              onPress={() => {
                if (item.href) {
                  router.push(item.href);
                  return;
                }
                if (item.action === 'call') {
                  void fetchDealership()
                    .then((dealership) => Linking.openURL(`tel:${dealership.phone}`))
                    .catch(() => Linking.openURL('tel:0421220000'));
                }
              }}
              style={({ pressed }) => [
                styles.row,
                isTablet && styles.rowTablet,
                index === LINKS.length - 1 && styles.rowLast,
                { opacity: pressed && item.href ? 0.75 : 1 },
              ]}>
              <View style={[styles.rowIcon, isTablet && styles.rowIconTablet]}>
                <Ionicons name={item.icon} size={fs(18)} color={AUTH_BLUE} />
              </View>
              <View style={styles.rowCopy}>
                <Text style={[styles.rowLabel, { fontSize: fs(16), lineHeight: lh(16, 1.3) }]}>
                  {item.label}
                </Text>
                <Text style={[styles.rowCaption, { fontSize: fs(13), lineHeight: lh(13, 1.35) }]}>
                  {item.caption}
                </Text>
              </View>
              {item.href ? (
                <Ionicons name="chevron-forward" size={fs(18)} color="rgba(10,24,72,0.35)" />
              ) : null}
            </Pressable>
          ))}
        </View>

        {profile?.authMethod === 'phone' || profile?.authMethod === 'google' ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Delete account"
            onPress={() => router.push('/delete-account')}
            style={({ pressed }) => [
              styles.deleteAccount,
              isTablet && styles.deleteAccountTablet,
              { opacity: pressed ? 0.8 : 1 },
            ]}>
            <Ionicons name="trash-outline" size={fs(18)} color="#B42318" />
            <Text style={[styles.deleteAccountText, { fontSize: fs(16) }]}>Delete account</Text>
          </Pressable>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={profile ? 'Sign out' : 'Sign in'}
          onPress={() => {
            if (!profile) {
              router.replace('/');
              return;
            }
            signOut();
            router.replace('/');
          }}
          style={({ pressed }) => [
            styles.signOut,
            isTablet && styles.signOutTablet,
            profile?.authMethod !== 'phone' && profile?.authMethod !== 'google'
              ? { marginTop: isTablet ? 28 : 20 }
              : null,
            { opacity: pressed ? 0.8 : 1 },
          ]}>
          <Ionicons
            name={profile ? 'log-out-outline' : 'log-in-outline'}
            size={fs(18)}
            color={profile ? '#B42318' : AUTH_BLUE}
          />
          <Text
            style={[
              styles.signOutText,
              { fontSize: fs(16), color: profile ? '#B42318' : AUTH_BLUE },
            ]}>
            {profile ? 'Sign out' : 'Sign in'}
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: SCREEN_BG,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(10,24,72,0.08)',
  },
  backBtn: {
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
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: 'rgba(10,24,72,0.4)',
    marginBottom: 2,
  },
  headerTitle: {
    fontWeight: '800',
    color: AUTH_BLUE,
    letterSpacing: -0.3,
  },
  headerSpacer: {},
  scroll: {},
  identity: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(10,24,72,0.08)',
  },
  identityTablet: {
    paddingVertical: 32,
    paddingHorizontal: 28,
    borderRadius: 24,
  },
  avatar: {
    backgroundColor: AUTH_BLUE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  name: {
    fontWeight: '700',
    color: AUTH_BLUE,
    letterSpacing: -0.3,
    marginBottom: 4,
    textAlign: 'center',
  },
  meta: {
    color: 'rgba(18,20,26,0.58)',
    marginTop: 4,
    textAlign: 'center',
  },
  badge: {
    marginTop: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(10,24,72,0.08)',
  },
  badgeTablet: {
    marginTop: 18,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  badgeText: {
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
  editBtnTablet: {
    marginTop: 20,
    paddingHorizontal: 18,
    paddingVertical: 12,
    gap: 8,
  },
  editBtnText: {
    fontWeight: '700',
    color: AUTH_BLUE,
  },
  statsRow: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 10,
  },
  statsRowTablet: {
    marginTop: 18,
    gap: 14,
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
  statCardTablet: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingTop: 18,
    paddingBottom: 18,
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
  statIconTablet: {
    width: 36,
    height: 36,
    borderRadius: 10,
    marginBottom: 12,
  },
  statValue: {
    fontWeight: '800',
    color: AUTH_BLUE,
    letterSpacing: -0.3,
    marginBottom: 4,
    textAlign: 'center',
  },
  statLabel: {
    fontWeight: '700',
    color: AUTH_BLUE,
    textAlign: 'center',
  },
  statHint: {
    marginTop: 2,
    color: 'rgba(18,20,26,0.45)',
    textAlign: 'center',
  },
  sectionLabel: {
    marginLeft: 4,
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
  listTablet: {
    borderRadius: 22,
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
  rowTablet: {
    paddingHorizontal: 18,
    paddingVertical: 18,
    gap: 14,
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
  rowIconTablet: {
    width: 44,
    height: 44,
    borderRadius: 12,
  },
  rowCopy: {
    flex: 1,
    minWidth: 0,
  },
  rowLabel: {
    fontWeight: '600',
    color: AUTH_BLUE,
  },
  rowCaption: {
    marginTop: 3,
    color: 'rgba(18,20,26,0.5)',
  },
  deleteAccount: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(180,35,24,0.35)',
  },
  deleteAccountTablet: {
    marginTop: 28,
    paddingVertical: 18,
    borderRadius: 16,
    gap: 10,
  },
  deleteAccountText: {
    fontWeight: '600',
    color: '#B42318',
  },
  signOut: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(180,35,24,0.08)',
  },
  signOutTablet: {
    marginTop: 16,
    paddingVertical: 18,
    borderRadius: 16,
    gap: 10,
  },
  signOutText: {
    fontWeight: '600',
    color: '#B42318',
  },
});
