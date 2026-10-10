import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AUTH_BLUE, DEALERSHIP, SCREEN_BG } from '@/constants/brand';
import { useLikedOffers } from '@/context/liked-offers';
import { useUserProfile } from '@/context/user-profile';
import { FALLBACK_VEHICLE, formatPromoInLakhs, type Offer } from '@/data/offers';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { ApiError, fetchDealership, fetchOffer } from '@/lib/api';
import { mobileDigitsFromStored } from '@/lib/phone';

const GRID_GAP = 8;
const ROTATE_MS = 3000;
const GRID_COUNT = 6;

function parseValidUntil(value: string): Date | null {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return null;
  const end = new Date(parsed);
  end.setHours(23, 59, 59, 999);
  return end;
}

function formatRemaining(ms: number) {
  if (ms <= 0) return { expired: true as const, label: 'Expired' };
  const totalSec = Math.floor(ms / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  if (days > 0) {
    return {
      expired: false as const,
      label: `${days}d ${hours.toString().padStart(2, '0')}h ${mins.toString().padStart(2, '0')}m`,
    };
  }
  return {
    expired: false as const,
    label: `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}`,
  };
}

function ExpiryCounter({ until }: { until: string }) {
  const end = useMemo(() => parseValidUntil(until), [until]);
  const [now, setNow] = useState(() => Date.now());
  const { isTablet, fs } = useBreakpoint();

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!end) {
    return <Text style={[styles.validLine, { fontSize: fs(12) }]}>Till {until}</Text>;
  }

  const remaining = formatRemaining(end.getTime() - now);

  return (
    <View
      style={[
        styles.expiryPill,
        isTablet && styles.expiryPillTablet,
        remaining.expired && styles.expiryPillExpired,
      ]}>
      <Ionicons
        name={remaining.expired ? 'close-circle' : 'time-outline'}
        size={fs(isTablet ? 15 : 13)}
        color={remaining.expired ? '#B42318' : AUTH_BLUE}
      />
      <Text
        style={[
          styles.expiryText,
          remaining.expired && styles.expiryTextExpired,
          { fontSize: fs(isTablet ? 13 : 11) },
        ]}>
        {remaining.expired ? 'Expired' : `Expires in ${remaining.label}`}
      </Text>
    </View>
  );
}

export default function OfferDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const offerId = Array.isArray(id) ? id[0] : id;
  const { profile } = useUserProfile();
  const phone = mobileDigitsFromStored(profile?.phone ?? '');
  const { isLiked, toggleLiked, setLiked } = useLikedOffers();
  const [offer, setOffer] = useState<Offer | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dealer, setDealer] = useState(DEALERSHIP);
  const insets = useSafeAreaInsets();
  const { contentMaxWidth, contentWidth, gutter, isTablet, width, height, fs, lh } = useBreakpoint();
  const isLandscape = width > height;
  /** Side-by-side gallery + details on wide / landscape tablets. */
  const tabletSplit = isTablet && (isLandscape || width >= 900);
  const splitGap = 18;
  const columnW = tabletSplit
    ? (contentWidth - gutter * 2 - splitGap) / 2
    : contentWidth - gutter * 2;
  const anglesInnerW = Math.max(columnW - (isTablet ? 40 : 28), 200);
  const gridCell = Math.max(
    (anglesInnerW - GRID_GAP * (GRID_COUNT - 1)) / GRID_COUNT,
    isTablet ? 52 : 40,
  );
  const heroStageH = isTablet ? (tabletSplit ? 300 : 320) : 248;

  useEffect(() => {
    void fetchDealership()
      .then((next) =>
        setDealer({
          name: next.name,
          city: next.city,
          line: next.line,
          phone: next.phone,
          phoneDisplay: next.phoneDisplay,
        }),
      )
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!offerId) {
      setLoading(false);
      setLoadError('Offer not found.');
      return;
    }
    let cancelled = false;
    setLoading(true);
    void fetchOffer(offerId, phone || undefined)
      .then((next) => {
        if (cancelled) return;
        setOffer(next);
        setLiked(next.id, Boolean(next.liked));
        setLoadError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setOffer(null);
        setLoadError(err instanceof ApiError ? err.message : 'Could not load this offer.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [offerId, phone, setLiked]);

  const gallery = offer && offer.gallery.length > 0 ? offer.gallery : [FALLBACK_VEHICLE];
  const [mainIndex, setMainIndex] = useState(0);
  const [gridOffset, setGridOffset] = useState(0);
  const [userPicked, setUserPicked] = useState(false);

  useEffect(() => {
    setMainIndex(0);
    setGridOffset(0);
    setUserPicked(false);
  }, [offer?.id]);

  useEffect(() => {
    if (!offer || gallery.length === 0) return;
    const timer = setInterval(() => {
      setGridOffset((o) => (o + 1) % gallery.length);
      setMainIndex((prev) => {
        if (userPicked) return prev;
        return (prev + 1) % gallery.length;
      });
    }, ROTATE_MS);
    return () => clearInterval(timer);
  }, [gallery.length, offer, userPicked]);

  const gridImages = useMemo(() => {
    return Array.from({ length: GRID_COUNT }, (_, i) => {
      const index = (gridOffset + i) % gallery.length;
      return { index, source: gallery[index] };
    });
  }, [gallery, gridOffset]);

  if (!offer) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top, maxWidth: contentMaxWidth }]}>
        <View style={[styles.topBar, isTablet && styles.topBarTablet, { paddingHorizontal: gutter }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/(tabs)/offers');
              }
            }}
            style={[styles.iconBtn, isTablet && styles.iconBtnTablet]}>
            <Ionicons name="arrow-back" size={fs(isTablet ? 22 : 20)} color={AUTH_BLUE} />
          </Pressable>
        </View>
        <View style={styles.centerState}>
          {loading ? (
            <ActivityIndicator color={AUTH_BLUE} />
          ) : (
            <Text style={[styles.stateText, { fontSize: fs(isTablet ? 17 : 15) }]}>
              {loadError ?? 'Offer not found.'}
            </Text>
          )}
        </View>
      </View>
    );
  }

  const liked = isLiked(offer.id);

  const callDealer = () => {
    Linking.openURL(`tel:${dealer.phone}`);
  };

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/(tabs)/offers');
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top, maxWidth: contentMaxWidth }]}>
      <View style={[styles.topBar, isTablet && styles.topBarTablet, { paddingHorizontal: gutter }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={goBack}
          hitSlop={6}
          style={({ pressed }) => [
            styles.iconBtn,
            isTablet && styles.iconBtnTablet,
            { opacity: pressed ? 0.75 : 1 },
          ]}>
          <Ionicons name="arrow-back" size={fs(isTablet ? 22 : 20)} color={AUTH_BLUE} />
        </Pressable>

        <View style={styles.topCenter}>
          <Text
            style={[
              styles.topEyebrow,
              { fontSize: fs(isTablet ? 12 : 10) },
            ]}>
            Victory Tata · Offers
          </Text>
          <Text
            style={[styles.topTitle, { fontSize: fs(isTablet ? 20 : 17), lineHeight: lh(isTablet ? 20 : 17, 1.2) }]}
            numberOfLines={1}>
            {offer.kicker}
          </Text>
        </View>

        <View style={[styles.topBadge, isTablet && styles.topBadgeTablet]}>
          <Text style={[styles.topBadgeText, { fontSize: fs(isTablet ? 12 : 11) }]}>{offer.badge}</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scroll,
          isTablet && styles.scrollTablet,
          {
            paddingBottom: insets.bottom + (isTablet ? 120 : 100),
            paddingHorizontal: gutter,
            width: '100%',
            alignSelf: 'center',
          },
        ]}>
        <View style={tabletSplit ? styles.splitRow : undefined}>
          <View style={tabletSplit ? [styles.splitCol, { width: columnW }] : undefined}>
            <View style={[styles.heroCard, isTablet && styles.heroCardTablet]}>
              <View style={[styles.heroTop, isTablet && styles.heroTopTablet]}>
                <View style={styles.heroHeadline}>
                  <Text style={[styles.heroKicker, { fontSize: fs(isTablet ? 14 : 12) }]}>
                    {offer.kicker}
                  </Text>
                  <Text
                    style={[
                      styles.heroTitle,
                      {
                        fontSize: fs(isTablet ? 32 : 28),
                        lineHeight: lh(isTablet ? 32 : 28, 1.2),
                      },
                    ]}
                    numberOfLines={2}
                    adjustsFontSizeToFit
                    minimumFontScale={0.8}>
                    {formatPromoInLakhs(offer.promoTitle)}
                  </Text>
                </View>
                <View style={[styles.heroBadge, isTablet && styles.heroBadgeTablet]}>
                  <Text style={[styles.heroBadgeText, { fontSize: fs(isTablet ? 12 : 11) }]}>
                    {offer.badge}
                  </Text>
                </View>
              </View>

              <View style={[styles.heroStage, { height: heroStageH }]}>
                <View style={styles.heroGlow} />
                <Animated.View
                  key={`main-${mainIndex}`}
                  entering={FadeIn.duration(320)}
                  style={styles.heroImageWrap}>
                  <Image source={gallery[mainIndex]} style={styles.hero} contentFit="contain" />
                </Animated.View>
              </View>

              <View style={[styles.heroMeta, isTablet && styles.heroMetaTablet]}>
                <Text
                  style={[styles.heroModel, { fontSize: fs(isTablet ? 14 : 12) }]}
                  numberOfLines={1}>
                  {offer.modelLine}
                </Text>
                <Text
                  style={[styles.heroPower, { fontSize: fs(isTablet ? 14 : 12) }]}
                  numberOfLines={1}>
                  {offer.powertrain}
                </Text>
              </View>

              <View style={[styles.anglesBlock, isTablet && styles.anglesBlockTablet]}>
                <Text style={[styles.sectionLabel, { fontSize: fs(isTablet ? 14 : 12) }]}>
                  More angles
                </Text>
                <Animated.View
                  key={`grid-${gridOffset}`}
                  entering={FadeIn.duration(280)}
                  style={styles.grid}>
                  {gridImages.map((item, i) => {
                    const active = item.index === mainIndex;
                    return (
                      <Pressable
                        key={`${item.index}-${i}`}
                        onPress={() => {
                          setMainIndex(item.index);
                          setUserPicked(true);
                        }}
                        style={[
                          styles.gridCell,
                          isTablet && styles.gridCellTablet,
                          { width: gridCell, height: gridCell },
                          active && styles.gridCellActive,
                        ]}>
                        <Image source={item.source} style={styles.gridImage} contentFit="contain" />
                      </Pressable>
                    );
                  })}
                </Animated.View>
              </View>
            </View>
          </View>

          <View style={tabletSplit ? [styles.splitCol, { width: columnW }] : undefined}>
            <View style={[styles.detailCard, isTablet && styles.detailCardTablet]}>
              <View style={styles.detailHead}>
                <Text style={[styles.detailEyebrow, { fontSize: fs(isTablet ? 13 : 11) }]}>
                  Offer details
                </Text>
                <ExpiryCounter until={offer.validUntil} />
              </View>

              <Text
                style={[
                  styles.detailBody,
                  {
                    fontSize: fs(isTablet ? 17 : 15),
                    lineHeight: lh(isTablet ? 17 : 15, 1.5),
                  },
                ]}>
                {offer.detail}
              </Text>

              <View style={styles.facts}>
                {offer.facts.map((fact, i) => (
                  <View
                    key={fact.label}
                    style={[
                      styles.factRow,
                      isTablet && styles.factRowTablet,
                      i === offer.facts.length - 1 && styles.factRowLast,
                    ]}>
                    <Text style={[styles.factLabel, { fontSize: fs(isTablet ? 15 : 13) }]}>
                      {fact.label}
                    </Text>
                    <Text style={[styles.factValue, { fontSize: fs(isTablet ? 15 : 13) }]}>
                      {fact.value}
                    </Text>
                  </View>
                ))}
              </View>

              <Text style={[styles.highlightsTitle, { fontSize: fs(isTablet ? 15 : 13) }]}>
                What’s included
              </Text>
              {offer.highlights.map((line) => (
                <View key={line} style={styles.highlightRow}>
                  <View style={[styles.dot, isTablet && styles.dotTablet]} />
                  <Text
                    style={[
                      styles.highlightText,
                      {
                        fontSize: fs(isTablet ? 16 : 14),
                        lineHeight: lh(isTablet ? 16 : 14, 1.45),
                      },
                    ]}>
                    {line}
                  </Text>
                </View>
              ))}
            </View>

            <View style={[styles.dealerCard, isTablet && styles.dealerCardTablet]}>
              <View style={[styles.dealerIcon, isTablet && styles.dealerIconTablet]}>
                <Ionicons name="storefront-outline" size={fs(isTablet ? 22 : 18)} color={AUTH_BLUE} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[styles.dealerName, { fontSize: fs(isTablet ? 16 : 14) }]}>
                  {dealer.name}
                </Text>
                <Text style={[styles.dealerLine, { fontSize: fs(isTablet ? 14 : 12) }]}>
                  {dealer.line} · {dealer.city}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      <View
        style={[
          styles.ctaBar,
          isTablet && styles.ctaBarTablet,
          {
            paddingBottom: Math.max(insets.bottom, isTablet ? 18 : 14),
            paddingHorizontal: gutter,
          },
        ]}>
        <View
          style={[
            styles.ctaBarInner,
            isTablet && { maxWidth: contentMaxWidth, width: '100%', alignSelf: 'center' },
          ]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={liked ? 'Unlike offer' : 'Like offer'}
            accessibilityState={{ selected: liked }}
            onPress={() => toggleLiked(offer.id)}
            style={({ pressed }) => [
              styles.likeBtn,
              isTablet && styles.likeBtnTablet,
              liked && styles.likeBtnActive,
              { opacity: pressed ? 0.88 : 1 },
            ]}>
            <Ionicons
              name={liked ? 'heart' : 'heart-outline'}
              size={fs(isTablet ? 24 : 22)}
              color={liked ? '#E11D48' : AUTH_BLUE}
            />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Call dealership at ${dealer.phoneDisplay}`}
            onPress={callDealer}
            style={({ pressed }) => [
              styles.cta,
              isTablet && styles.ctaTablet,
              { opacity: pressed ? 0.92 : 1 },
            ]}>
            <Ionicons name="call" size={fs(isTablet ? 20 : 18)} color="#FFFFFF" />
            <Text style={[styles.ctaText, { fontSize: fs(isTablet ? 17 : 15) }]}>Call dealership</Text>
            <Text style={[styles.ctaPhone, { fontSize: fs(isTablet ? 14 : 12) }]}>
              {dealer.phoneDisplay}
            </Text>
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
    width: '100%',
    alignSelf: 'center',
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  stateText: {
    marginTop: 24,
    lineHeight: 22,
    textAlign: 'center',
    color: 'rgba(10,24,72,0.6)',
  },
  topBar: {
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
  topBarTablet: {
    paddingTop: 12,
    paddingBottom: 16,
    gap: 16,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: SCREEN_BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnTablet: {
    width: 48,
    height: 48,
    borderRadius: 14,
  },
  topCenter: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  topEyebrow: {
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: 'rgba(10,24,72,0.4)',
    marginBottom: 2,
  },
  topTitle: {
    fontWeight: '800',
    color: AUTH_BLUE,
    letterSpacing: -0.3,
  },
  topBadge: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 9,
    backgroundColor: AUTH_BLUE,
  },
  topBadgeTablet: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
  },
  topBadgeText: {
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  scroll: {
    paddingTop: 16,
  },
  scrollTablet: {
    paddingTop: 22,
  },
  splitRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 18,
  },
  splitCol: {
    flexGrow: 0,
    flexShrink: 0,
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(10,24,72,0.08)',
    marginTop: 4,
    marginBottom: 16,
    shadowColor: '#0A1848',
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  heroCardTablet: {
    borderRadius: 28,
    marginBottom: 18,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 18,
    paddingTop: 18,
    gap: 12,
  },
  heroTopTablet: {
    paddingHorizontal: 22,
    paddingTop: 22,
    gap: 14,
  },
  heroHeadline: {
    flex: 1,
    paddingRight: 4,
    minWidth: 0,
  },
  heroKicker: {
    fontWeight: '600',
    color: 'rgba(10,24,72,0.55)',
    letterSpacing: 0.2,
  },
  heroTitle: {
    marginTop: 6,
    fontWeight: '800',
    letterSpacing: -0.6,
    color: AUTH_BLUE,
  },
  heroBadge: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: AUTH_BLUE,
  },
  heroBadgeTablet: {
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  heroBadgeText: {
    fontWeight: '800',
    letterSpacing: 0.5,
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  heroStage: {
    height: 248,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  heroGlow: {
    position: 'absolute',
    bottom: 28,
    width: '72%',
    height: 28,
    borderRadius: 999,
    backgroundColor: 'rgba(10,24,72,0.06)',
  },
  heroImageWrap: {
    width: '100%',
    height: '100%',
    zIndex: 1,
  },
  hero: {
    width: '100%',
    height: '100%',
  },
  heroMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 18,
    paddingBottom: 14,
    paddingTop: 2,
  },
  heroMetaTablet: {
    paddingHorizontal: 22,
    paddingBottom: 16,
  },
  heroModel: {
    flex: 1,
    minWidth: 0,
    color: 'rgba(10,24,72,0.55)',
  },
  heroPower: {
    flexShrink: 0,
    fontWeight: '700',
    color: AUTH_BLUE,
  },
  anglesBlock: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    paddingTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(10,24,72,0.06)',
  },
  anglesBlockTablet: {
    paddingHorizontal: 18,
    paddingBottom: 18,
  },
  sectionLabel: {
    fontWeight: '700',
    color: AUTH_BLUE,
    marginBottom: 10,
    letterSpacing: -0.1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: GRID_GAP,
  },
  gridCell: {
    backgroundColor: SCREEN_BG,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridCellTablet: {
    borderRadius: 12,
  },
  gridCellActive: {
    borderColor: AUTH_BLUE,
    backgroundColor: '#FFFFFF',
  },
  gridImage: {
    width: '90%',
    height: '90%',
  },
  detailCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(10,24,72,0.08)',
    marginBottom: 12,
  },
  detailCardTablet: {
    borderRadius: 24,
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 20,
    marginBottom: 16,
  },
  detailHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 12,
  },
  detailEyebrow: {
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: 'rgba(10,24,72,0.45)',
  },
  validLine: {
    fontWeight: '600',
    color: AUTH_BLUE,
  },
  expiryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(10,24,72,0.06)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    maxWidth: '62%',
  },
  expiryPillTablet: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    maxWidth: '70%',
  },
  expiryPillExpired: {
    backgroundColor: 'rgba(180,35,24,0.08)',
  },
  expiryText: {
    fontWeight: '700',
    color: AUTH_BLUE,
    flexShrink: 1,
  },
  expiryTextExpired: {
    color: '#B42318',
  },
  detailBody: {
    color: 'rgba(18,20,26,0.72)',
    marginBottom: 18,
  },
  facts: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(10,24,72,0.08)',
    marginBottom: 18,
  },
  factRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(10,24,72,0.06)',
  },
  factRowTablet: {
    paddingVertical: 14,
  },
  factRowLast: {
    borderBottomWidth: 0,
  },
  factLabel: {
    fontWeight: '500',
    color: 'rgba(10,24,72,0.5)',
  },
  factValue: {
    flexShrink: 1,
    textAlign: 'right',
    fontWeight: '700',
    color: AUTH_BLUE,
  },
  highlightsTitle: {
    fontWeight: '700',
    color: AUTH_BLUE,
    marginBottom: 10,
  },
  highlightRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: AUTH_BLUE,
    marginTop: 7,
  },
  dotTablet: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginTop: 8,
  },
  highlightText: {
    flex: 1,
    color: 'rgba(18,20,26,0.72)',
  },
  dealerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(10,24,72,0.08)',
  },
  dealerCardTablet: {
    borderRadius: 18,
    padding: 18,
    gap: 14,
  },
  dealerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(10,24,72,0.07)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dealerIconTablet: {
    width: 48,
    height: 48,
    borderRadius: 14,
  },
  dealerName: {
    fontWeight: '700',
    color: AUTH_BLUE,
  },
  dealerLine: {
    marginTop: 2,
    color: 'rgba(10,24,72,0.55)',
  },
  ctaBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 10,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(10,24,72,0.08)',
  },
  ctaBarTablet: {
    paddingTop: 14,
  },
  ctaBarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  likeBtn: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: AUTH_BLUE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  likeBtnTablet: {
    width: 58,
    height: 58,
    borderRadius: 14,
  },
  likeBtnActive: {
    backgroundColor: 'rgba(225,29,72,0.08)',
    borderColor: '#E11D48',
  },
  cta: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: AUTH_BLUE,
    borderRadius: 12,
    minHeight: 52,
    paddingHorizontal: 16,
  },
  ctaTablet: {
    minHeight: 58,
    borderRadius: 14,
    gap: 10,
  },
  ctaText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  ctaPhone: {
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600',
    marginLeft: 4,
  },
});
