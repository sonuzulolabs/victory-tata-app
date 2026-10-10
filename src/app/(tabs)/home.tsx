import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  LayoutChangeEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { OfferCard } from '@/components/offer-card';
import { AUTH_BLUE, AUTH_BLUE_SOFT, SCREEN_BG } from '@/constants/brand';
import { useUserProfile } from '@/context/user-profile';
import { REFER_BANNER, type HomeOffer } from '@/data/homeOffers';
import { formatInr } from '@/data/referrals';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { ApiError, fetchAccountSummary, fetchHome } from '@/lib/api';
import { isValidIndianMobile, mobileDigitsFromStored } from '@/lib/phone';

const GAP = 12;
const GAP_COMPACT = 10;
const TAB_PILL = 64;
const STATS_H = 138;
const STATS_H_COMPACT = 112;
const OFFERS_CARD_H = 88;
const OFFERS_CARD_H_COMPACT = 72;
/** Badge, title, note, and card padding under the car image. */
const OFFER_CHROME = 118;
const OFFER_CHROME_COMPACT = 100;

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { profile, refreshFromServer } = useUserProfile();
  const { isTablet, isCompact, gutter, fs, lh, contentWidth } = useBreakpoint();
  const [bodyH, setBodyH] = useState(0);
  const [offers, setOffers] = useState<HomeOffer[]>([]);
  const [referBanner, setReferBanner] = useState<ImageSourcePropType>(REFER_BANNER);
  const [points, setPoints] = useState<number | null>(null);
  const [rewards, setRewards] = useState<number | null>(null);
  const [loadingOffers, setLoadingOffers] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const phone = mobileDigitsFromStored(profile?.phone ?? '');
  const gap = isCompact ? GAP_COMPACT : GAP;

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLoadingOffers(true);
      void fetchHome()
        .then((home) => {
          if (cancelled) return;
          setOffers(home.offers);
          setReferBanner(home.referBanner);
          setError(null);
        })
        .catch((err: unknown) => {
          if (cancelled) return;
          setError(err instanceof ApiError ? err.message : 'Could not load home.');
        })
        .finally(() => {
          if (!cancelled) setLoadingOffers(false);
        });

      void refreshFromServer();

      if (!isValidIndianMobile(phone)) {
        setPoints(null);
        setRewards(null);
        return () => {
          cancelled = true;
        };
      }

      void fetchAccountSummary(phone)
        .then((summary) => {
          if (cancelled) return;
          setPoints(summary.points);
          setRewards(summary.creditedRewards);
        })
        .catch(() => {
          if (!cancelled) {
            setPoints(null);
            setRewards(null);
          }
        });

      return () => {
        cancelled = true;
      };
    }, [phone, refreshFromServer]),
  );

  const homeStats = [
    {
      id: 'points',
      icon: 'diamond' as const,
      label: 'Points',
      value: points == null ? '—' : points.toLocaleString('en-IN'),
      hint: 'Redeemable',
      tone: 'navy' as const,
    },
    {
      id: 'rewards',
      icon: 'trending-up' as const,
      label: 'Rewards',
      value: rewards == null ? '—' : formatInr(rewards),
      hint: 'Referral credit',
      tone: 'light' as const,
    },
  ];

  const tabClearance = TAB_PILL + Math.max(insets.bottom, 14) + 16;
  const statsH = isTablet ? 168 : isCompact ? STATS_H_COMPACT : STATS_H;
  const offersCardH = isTablet ? 100 : isCompact ? OFFERS_CARD_H_COMPACT : OFFERS_CARD_H;
  /** Wide enough that ~2 car cards fill the first viewport. */
  const stripInnerW = Math.max(contentWidth - gutter * 2, 260);
  const offerCardW = Math.floor((stripInnerW - gap) / 2);
  const offerChrome = isTablet ? 136 : isCompact ? OFFER_CHROME_COMPACT : OFFER_CHROME;

  const onBodyLayout = (e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    setBodyH((prev) => (Math.abs(prev - h) < 1 ? prev : h));
  };

  const usable = Math.max(bodyH - tabClearance - 8, 0);
  const pairH = usable > 0
    ? Math.round(usable * (isTablet ? 0.2 : isCompact ? 0.15 : 0.17))
    : isCompact ? 96 : 112;
  const pairMin = isCompact ? 96 : 112;
  const pairMax = isCompact ? 118 : 160;
  const pairHeight = Math.min(Math.max(pairH, pairMin), pairMax);
  const contentH = Math.max(bodyH - 6 - tabClearance, 0);
  const offersH = Math.max(
    contentH - statsH - (isCompact ? 10 : 14) - offersCardH - gap - gap - pairHeight,
    isTablet ? 240 : isCompact ? 160 : 188,
  );
  const offerImageH = Math.max(
    Math.min(offersH - offerChrome, isTablet ? 230 : isCompact ? 132 : 168),
    isCompact ? 96 : 120,
  );

  return (
    <View style={styles.screen} onLayout={onBodyLayout}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom: tabClearance,
            paddingTop: isCompact ? 4 : 6,
            minHeight: bodyH > 0 ? bodyH : undefined,
          },
        ]}
        showsVerticalScrollIndicator={false}
        bounces={isCompact}
        keyboardShouldPersistTaps="handled">
      <View style={[styles.statsRow, { marginHorizontal: gutter, height: statsH, gap }]}>
        {homeStats.map((stat) => {
          const navy = stat.tone === 'navy';
          return (
            <LinearGradient
              key={stat.id}
              accessibilityLabel={`${stat.label} ${stat.value}`}
              colors={navy ? [AUTH_BLUE, AUTH_BLUE_SOFT] : ['#FFFFFF', '#F3F6FC']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[
                styles.statCard,
                navy ? styles.statCardNavy : styles.statCardLight,
                isTablet && styles.statCardTablet,
                isCompact && styles.statCardCompact,
              ]}>
              <View style={[styles.statOrb, navy ? styles.statOrbNavy : styles.statOrbLight]} />
              <View style={styles.statTop}>
                <View
                  style={[
                    styles.statIcon,
                    navy && styles.statIconNavy,
                    isTablet && styles.statIconTablet,
                    isCompact && styles.statIconCompact,
                  ]}>
                  <Ionicons name={stat.icon} size={fs(15)} color={navy ? '#FFFFFF' : AUTH_BLUE} />
                </View>
                <Text
                  style={[
                    styles.statLabel,
                    navy && styles.statLabelNavy,
                    { fontSize: fs(13), lineHeight: lh(13, 1.25) },
                  ]}>
                  {stat.label}
                </Text>
              </View>
              <Text
                style={[
                  styles.statValue,
                  navy && styles.statValueNavy,
                  isCompact && styles.statValueCompact,
                  { fontSize: fs(isCompact ? 20 : 24), lineHeight: lh(isCompact ? 20 : 24, 1.15) },
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.75}>
                {stat.value}
              </Text>
              <View style={[styles.statHintPill, navy && styles.statHintPillNavy]}>
                <Text
                  style={[
                    styles.statHint,
                    navy && styles.statHintNavy,
                    { fontSize: fs(11), lineHeight: lh(11, 1.25) },
                  ]}>
                  {stat.hint}
                </Text>
              </View>
            </LinearGradient>
          );
        })}
      </View>

      <View style={[styles.actions, { marginHorizontal: gutter, marginTop: isCompact ? 10 : 14 }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Offers for you"
          onPress={() => router.push('/(tabs)/offers')}
          style={({ pressed }) => [
            styles.offersCard,
            isCompact && styles.offersCardCompact,
            { height: offersCardH, opacity: pressed ? 0.92 : 1 },
          ]}>
          <View style={[styles.offersIcon, isTablet && styles.offersIconTablet, isCompact && styles.offersIconCompact]}>
            <Ionicons name="pricetag" size={fs(18)} color="#FFFFFF" />
          </View>
          <View style={styles.offersCopy}>
            <Text style={[styles.offersTitle, { fontSize: fs(16), lineHeight: lh(16, 1.25) }]} numberOfLines={1}>
              Offers for you
            </Text>
            <Text style={[styles.offersSub, { fontSize: fs(12), lineHeight: lh(12, 1.3) }]} numberOfLines={1}>
              Exclusive EV & PV deals
            </Text>
          </View>
          <View style={[styles.offersArrow, isCompact && styles.offersArrowCompact]}>
            <Ionicons name="arrow-forward" size={fs(16)} color={AUTH_BLUE} />
          </View>
        </Pressable>
      </View>

      <View style={[styles.offerSection, { height: offersH, marginTop: gap }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          snapToInterval={offerCardW + gap}
          contentContainerStyle={[styles.offerList, { paddingHorizontal: gutter, gap }]}
          style={styles.offerStrip}>
          {loadingOffers && offers.length === 0 ? (
            <View style={[styles.offerLoading, { width: offerCardW }]}>
              <ActivityIndicator color={AUTH_BLUE} />
            </View>
          ) : null}
          {error && offers.length === 0 ? (
            <View style={[styles.offerLoading, { width: offerCardW }]}>
              <Text style={[styles.offerError, { fontSize: fs(13) }]}>{error}</Text>
            </View>
          ) : null}
          {offers.map((offer) => (
            <OfferCard
              key={offer.id}
              offer={offer}
              width={offerCardW}
              imageHeight={offerImageH}
              onPress={() =>
                router.push({
                  pathname: '/offer/[id]',
                  params: { id: offer.id },
                })
              }
            />
          ))}
        </ScrollView>
      </View>

      <View
        style={[
          styles.actionsRow,
          styles.bottomPair,
          { height: pairHeight, marginHorizontal: gutter, marginTop: gap, gap },
        ]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Book a test drive"
            onPress={() => router.push('/(tabs)/test-drive')}
            style={({ pressed }) => [
              styles.actionTile,
              styles.actionTileDrive,
              isCompact && styles.actionTileDriveCompact,
              { opacity: pressed ? 0.92 : 1 },
            ]}>
            <View style={styles.driveFoot}>
              <Text
                style={[styles.driveTitle, { fontSize: fs(isCompact ? 14 : 16), lineHeight: lh(isCompact ? 14 : 16, 1.25) }]}
                numberOfLines={2}>
                Book a test drive
              </Text>
              {!isCompact ? (
                <Text style={[styles.driveSub, { fontSize: fs(12), lineHeight: lh(12, 1.3) }]} numberOfLines={1}>
                  At your doorstep, in minutes
                </Text>
              ) : null}
              <View style={[styles.actionCta, isTablet && styles.actionCtaTablet, isCompact && styles.actionCtaCompact]}>
                <Text style={[styles.driveCtaText, { fontSize: fs(12) }]}>Schedule</Text>
                <Ionicons name="arrow-forward" size={fs(14)} color={AUTH_BLUE} />
              </View>
            </View>
            <View style={[styles.driveIcon, isTablet && styles.driveIconTablet, isCompact && styles.driveIconCompact]}>
              <Ionicons name="car-sport" size={fs(18)} color="#FFFFFF" />
            </View>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Referrals"
            onPress={() => router.push('/(tabs)/referrals')}
            style={({ pressed }) => [
              styles.actionTile,
              styles.actionTileRefer,
              { opacity: pressed ? 0.92 : 1 },
            ]}>
            <Image source={referBanner} style={styles.referArt} contentFit="cover" />
            <LinearGradient
              colors={['rgba(10,24,72,0.94)', 'rgba(10,24,72,0.55)']}
              start={{ x: 0, y: 0.55 }}
              end={{ x: 1, y: 0.2 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={[styles.referBody, isCompact && styles.referBodyCompact]}>
              <Text
                style={[styles.referTitle, { fontSize: fs(isCompact ? 14 : 16), lineHeight: lh(isCompact ? 14 : 16, 1.25) }]}
                numberOfLines={1}>
                Referrals
              </Text>
              {!isCompact ? (
                <Text style={[styles.referSub, { fontSize: fs(12), lineHeight: lh(12, 1.3) }]} numberOfLines={1}>
                  Earn when they buy
                </Text>
              ) : null}
              <View style={[styles.actionCta, styles.referCta, isTablet && styles.actionCtaTablet, isCompact && styles.actionCtaCompact]}>
                <Text style={[styles.referCtaText, { fontSize: fs(12) }]}>Start</Text>
                <Ionicons name="arrow-forward" size={fs(14)} color={AUTH_BLUE} />
              </View>
            </View>
          </Pressable>
      </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: SCREEN_BG,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  statsRow: {
    flexDirection: 'row',
  },
  statCard: {
    flex: 1,
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 12,
    overflow: 'hidden',
    shadowColor: '#0A1848',
    shadowOpacity: 0.1,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  statCardTablet: {
    borderRadius: 26,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 14,
  },
  statCardCompact: {
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
  },
  statCardNavy: {
    shadowOpacity: 0.22,
  },
  statCardLight: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(10,24,72,0.12)',
  },
  statOrb: {
    position: 'absolute',
    width: 92,
    height: 92,
    borderRadius: 46,
    top: -28,
    right: -22,
  },
  statOrbNavy: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  statOrbLight: {
    backgroundColor: 'rgba(10,24,72,0.05)',
  },
  statTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(10,24,72,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statIconTablet: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  statIconCompact: {
    width: 26,
    height: 26,
    borderRadius: 13,
  },
  statIconNavy: {
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  statLabel: {
    fontWeight: '700',
    letterSpacing: 0.1,
    color: 'rgba(10,24,72,0.62)',
  },
  statLabelNavy: {
    color: 'rgba(255,255,255,0.82)',
  },
  statValue: {
    marginTop: 10,
    fontWeight: '800',
    letterSpacing: -0.5,
    color: AUTH_BLUE,
  },
  statValueCompact: {
    marginTop: 6,
  },
  statValueNavy: {
    color: '#FFFFFF',
  },
  statHintPill: {
    marginTop: 'auto',
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: 'rgba(10,24,72,0.06)',
  },
  statHintPillNavy: {
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  statHint: {
    fontWeight: '700',
    color: 'rgba(10,24,72,0.55)',
  },
  statHintNavy: {
    color: 'rgba(255,255,255,0.88)',
  },
  actions: {
    marginTop: 14,
  },
  offerSection: {
    justifyContent: 'center',
  },
  offerStrip: {
    flexGrow: 0,
  },
  offerList: {
    alignItems: 'stretch',
  },
  offerLoading: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  offerError: {
    fontSize: 13,
    lineHeight: 18,
    color: 'rgba(10,24,72,0.55)',
    textAlign: 'center',
  },
  bottomPair: {
    marginTop: 'auto',
  },
  offersCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    borderRadius: 22,
    backgroundColor: AUTH_BLUE,
    shadowColor: '#0A1848',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  offersCardCompact: {
    borderRadius: 18,
    paddingHorizontal: 12,
    gap: 10,
  },
  offersIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  offersIconTablet: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  offersIconCompact: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  offersCopy: {
    flex: 1,
    minWidth: 0,
  },
  offersTitle: {
    fontWeight: '800',
    letterSpacing: -0.2,
    color: '#FFFFFF',
  },
  offersSub: {
    marginTop: 2,
    color: 'rgba(255,255,255,0.72)',
  },
  offersArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  offersArrowCompact: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  actionsRow: {
    flexDirection: 'row',
  },
  actionTile: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: '0%',
    borderRadius: 22,
    overflow: 'hidden',
    shadowColor: '#0A1848',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  actionTileDrive: {
    backgroundColor: '#FFFFFF',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    borderWidth: 1.5,
    borderColor: AUTH_BLUE,
  },
  actionTileDriveCompact: {
    padding: 10,
    borderRadius: 18,
    gap: 6,
  },
  actionTileRefer: {
    backgroundColor: AUTH_BLUE,
  },
  driveIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: AUTH_BLUE,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  driveIconTablet: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  driveIconCompact: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  driveFoot: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'flex-end',
  },
  driveTitle: {
    fontWeight: '800',
    letterSpacing: -0.2,
    color: AUTH_BLUE,
    marginBottom: 3,
  },
  driveSub: {
    color: '#8B90A0',
    marginBottom: 12,
  },
  actionCta: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(10,24,72,0.08)',
  },
  actionCtaTablet: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  actionCtaCompact: {
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  driveCtaText: {
    fontWeight: '700',
    color: AUTH_BLUE,
  },
  referArt: {
    ...StyleSheet.absoluteFill,
    left: '18%',
  },
  referBody: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 14,
  },
  referBodyCompact: {
    padding: 10,
  },
  referTitle: {
    fontWeight: '800',
    letterSpacing: -0.2,
    color: '#FFFFFF',
    marginBottom: 3,
  },
  referSub: {
    color: 'rgba(255,255,255,0.75)',
    marginBottom: 12,
  },
  referCta: {
    backgroundColor: '#FFFFFF',
  },
  referCtaText: {
    fontWeight: '700',
    color: AUTH_BLUE,
  },
});
