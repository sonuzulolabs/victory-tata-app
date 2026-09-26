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

import { OfferCard, OFFER_CARD_WIDTH } from '@/components/offer-card';
import { AUTH_BLUE, SCREEN_BG } from '@/constants/brand';
import { useUserProfile } from '@/context/user-profile';
import { REFER_BANNER, type HomeOffer } from '@/data/homeOffers';
import { formatInr } from '@/data/referrals';
import { ApiError, fetchAccountSummary, fetchHome } from '@/lib/api';
import { isValidIndianMobile, mobileDigitsFromStored } from '@/lib/phone';

const PAD = 20;
const GAP = 12;
const TAB_PILL = 64;
/** Fixed chrome under offer image (badge + title + meta + padding). */
const OFFER_CHROME = 118;
const STATS_H = 124;

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { profile } = useUserProfile();
  const [bodyH, setBodyH] = useState(0);
  const [offers, setOffers] = useState<HomeOffer[]>([]);
  const [referBanner, setReferBanner] = useState<ImageSourcePropType>(REFER_BANNER);
  const [points, setPoints] = useState<number | null>(null);
  const [rewards, setRewards] = useState<number | null>(null);
  const [loadingOffers, setLoadingOffers] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const phone = mobileDigitsFromStored(profile?.phone ?? '');

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
    }, [phone]),
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

  const onBodyLayout = (e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    setBodyH((prev) => (Math.abs(prev - h) < 1 ? prev : h));
  };

  // Fill the scene above the floating tab bar.
  // The offer strip keeps the leftover room; quick actions stay a fixed block.
  const usable = Math.max(bodyH - tabClearance - 8, 0);
  const sectionH = 44;
  const gaps = 28;
  const offersCardH = 76;
  const pairH = usable > 0 ? Math.round(usable * 0.2) : 112;
  const actionsBlock = offersCardH + GAP + pairH;
  const offersH = Math.max(usable - STATS_H - sectionH - gaps - actionsBlock, 160);
  const offerImageH = Math.max(Math.min(offersH - OFFER_CHROME, 148), 96);

  return (
    <View style={[styles.screen, { paddingBottom: tabClearance }]} onLayout={onBodyLayout}>
      <View style={styles.statsRow}>
        {homeStats.map((stat) => {
          const navy = stat.tone === 'navy';
          return (
            <View
              key={stat.id}
              accessibilityLabel={`${stat.label} ${stat.value}`}
              style={[styles.statCard, navy ? styles.statCardNavy : styles.statCardLight]}>
              <View style={[styles.statIcon, navy && styles.statIconNavy]}>
                <Ionicons name={stat.icon} size={16} color={navy ? '#FFFFFF' : AUTH_BLUE} />
              </View>
              <Text style={[styles.statLabel, navy && styles.statLabelNavy]}>{stat.label}</Text>
              <Text style={[styles.statValue, navy && styles.statValueNavy]} numberOfLines={1}>
                {stat.value}
              </Text>
              <Text style={[styles.statHint, navy && styles.statHintNavy]}>{stat.hint}</Text>
            </View>
          );
        })}
      </View>

      <View style={styles.sectionHeader}>
        <View style={styles.sectionLeft}>
          <View style={styles.sectionIcon}>
            <Ionicons name="pricetag" size={14} color={AUTH_BLUE} />
          </View>
          <Text style={styles.sectionTitle}>Offers for you</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/(tabs)/offers')}
          hitSlop={6}
          style={({ pressed }) => [styles.viewAllBtn, { opacity: pressed ? 0.75 : 1 }]}>
          <Text style={styles.viewAll}>View all</Text>
          <Ionicons name="chevron-forward" size={13} color={AUTH_BLUE} />
        </Pressable>
      </View>

      <View style={[styles.offerSection, { height: offersH }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          snapToInterval={OFFER_CARD_WIDTH + GAP}
          contentContainerStyle={styles.offerList}
          style={styles.offerStrip}>
          {loadingOffers && offers.length === 0 ? (
            <View style={styles.offerLoading}>
              <ActivityIndicator color={AUTH_BLUE} />
            </View>
          ) : null}
          {error && offers.length === 0 ? (
            <View style={styles.offerLoading}>
              <Text style={styles.offerError}>{error}</Text>
            </View>
          ) : null}
          {offers.map((offer) => (
            <OfferCard
              key={offer.id}
              offer={offer}
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

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Offers"
          onPress={() => router.push('/(tabs)/offers')}
          style={({ pressed }) => [styles.offersCard, { height: offersCardH, opacity: pressed ? 0.92 : 1 }]}>
          <View style={styles.offersIcon}>
            <Ionicons name="pricetag" size={18} color="#FFFFFF" />
          </View>
          <View style={styles.offersCopy}>
            <Text style={styles.offersTitle}>Offers</Text>
            <Text style={styles.offersSub}>Exclusive EV & PV deals</Text>
          </View>
          <View style={styles.offersArrow}>
            <Ionicons name="arrow-forward" size={16} color={AUTH_BLUE} />
          </View>
        </Pressable>

        <View style={[styles.actionsRow, { height: pairH }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Book a test drive"
            onPress={() => router.push('/(tabs)/test-drive')}
            style={({ pressed }) => [
              styles.actionTile,
              styles.actionTileDrive,
              { opacity: pressed ? 0.92 : 1 },
            ]}>
            <View style={styles.driveTop}>
              <View style={styles.driveIcon}>
                <Ionicons name="car-sport" size={18} color="#FFFFFF" />
              </View>
              <Text style={styles.driveTitle} numberOfLines={2}>
                Book a test drive
              </Text>
              <Text style={styles.driveSub}>At your doorstep, in minutes</Text>
            </View>
            <View style={styles.actionCta}>
              <Text style={styles.driveCtaText}>Schedule</Text>
              <Ionicons name="arrow-forward" size={14} color={AUTH_BLUE} />
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
            <View style={styles.referBody}>
              <Text style={styles.referTitle}>Referrals</Text>
              <Text style={styles.referSub}>Earn when they buy</Text>
              <View style={[styles.actionCta, styles.referCta]}>
                <Text style={styles.referCtaText}>Start</Text>
                <Ionicons name="arrow-forward" size={14} color={AUTH_BLUE} />
              </View>
            </View>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: SCREEN_BG,
    paddingTop: 6,
  },
  statsRow: {
    marginHorizontal: PAD,
    flexDirection: 'row',
    gap: GAP,
    height: STATS_H,
  },
  statCard: {
    flex: 1,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    overflow: 'hidden',
    shadowColor: '#0A1848',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  statCardNavy: {
    backgroundColor: AUTH_BLUE,
  },
  statCardLight: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: AUTH_BLUE,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(10,24,72,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statIconNavy: {
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  statLabel: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
    color: 'rgba(10,24,72,0.55)',
  },
  statLabelNavy: {
    color: 'rgba(255,255,255,0.72)',
  },
  statValue: {
    marginTop: 2,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
    color: AUTH_BLUE,
  },
  statValueNavy: {
    color: '#FFFFFF',
  },
  statHint: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '600',
    color: '#8B90A0',
  },
  statHintNavy: {
    color: 'rgba(255,255,255,0.62)',
  },
  sectionHeader: {
    marginTop: 14,
    marginHorizontal: PAD,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: 'rgba(10,24,72,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: AUTH_BLUE,
    letterSpacing: -0.3,
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(10,24,72,0.06)',
  },
  viewAll: {
    fontSize: 12,
    fontWeight: '700',
    color: AUTH_BLUE,
  },
  offerSection: {
    justifyContent: 'flex-start',
  },
  offerStrip: {
    flexGrow: 0,
  },
  offerList: {
    paddingHorizontal: PAD,
    gap: GAP,
    alignItems: 'stretch',
  },
  offerLoading: {
    width: OFFER_CARD_WIDTH,
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
  actions: {
    marginTop: 14,
    marginHorizontal: PAD,
    gap: GAP,
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
  offersIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  offersCopy: {
    flex: 1,
    minWidth: 0,
  },
  offersTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
    color: '#FFFFFF',
  },
  offersSub: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
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
  actionsRow: {
    flexDirection: 'row',
    gap: GAP,
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
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: AUTH_BLUE,
  },
  actionTileRefer: {
    backgroundColor: AUTH_BLUE,
  },
  driveTop: {
    gap: 8,
  },
  driveIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: AUTH_BLUE,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  driveTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
    color: AUTH_BLUE,
  },
  driveSub: {
    fontSize: 12,
    lineHeight: 16,
    color: '#8B90A0',
  },
  actionCta: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(10,24,72,0.07)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  driveCtaText: {
    fontSize: 12,
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
  referTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
    color: '#FFFFFF',
    marginBottom: 3,
  },
  referSub: {
    fontSize: 12,
    lineHeight: 16,
    color: 'rgba(255,255,255,0.78)',
    marginBottom: 12,
  },
  referCta: {
    backgroundColor: '#FFFFFF',
  },
  referCtaText: {
    fontSize: 12,
    fontWeight: '700',
    color: AUTH_BLUE,
  },
});
