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
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AUTH_BLUE, DEALERSHIP, SCREEN_BG } from '@/constants/brand';
import { useLikedOffers } from '@/context/liked-offers';
import { useUserProfile } from '@/context/user-profile';
import { FALLBACK_VEHICLE, type Offer } from '@/data/offers';
import { ApiError, fetchOffer } from '@/lib/api';
import { mobileDigitsFromStored } from '@/lib/phone';

const PAD = 20;
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

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!end) {
    return <Text style={styles.validLine}>Till {until}</Text>;
  }

  const remaining = formatRemaining(end.getTime() - now);

  return (
    <View style={[styles.expiryPill, remaining.expired && styles.expiryPillExpired]}>
      <Ionicons
        name={remaining.expired ? 'close-circle' : 'time-outline'}
        size={13}
        color={remaining.expired ? '#B42318' : AUTH_BLUE}
      />
      <Text style={[styles.expiryText, remaining.expired && styles.expiryTextExpired]}>
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
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const contentW = Math.min(width, 480);
  const anglesInnerW = contentW - PAD * 2 - 28;
  const gridCell = (anglesInnerW - GRID_GAP * (GRID_COUNT - 1)) / GRID_COUNT;

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
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <View style={styles.topBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => router.back()}
            style={styles.iconBtn}>
            <Ionicons name="arrow-back" size={20} color={AUTH_BLUE} />
          </Pressable>
        </View>
        <View style={styles.centerState}>
          {loading ? (
            <ActivityIndicator color={AUTH_BLUE} />
          ) : (
            <Text style={styles.stateText}>{loadError ?? 'Offer not found.'}</Text>
          )}
        </View>
      </View>
    );
  }

  const liked = isLiked(offer.id);

  const callDealer = () => {
    Linking.openURL(`tel:${DEALERSHIP.phone}`);
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          hitSlop={6}
          style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.75 : 1 }]}>
          <Ionicons name="arrow-back" size={20} color={AUTH_BLUE} />
        </Pressable>

        <View style={styles.topCenter}>
          <Text style={styles.topEyebrow}>Victory Tata · Offers</Text>
          <Text style={styles.topTitle} numberOfLines={1}>
            {offer.kicker}
          </Text>
        </View>

        <View style={styles.topBadge}>
          <Text style={styles.topBadgeText}>{offer.badge}</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]}>
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={styles.heroHeadline}>
              <Text style={styles.heroKicker}>{offer.kicker}</Text>
              <Text style={styles.heroTitle} numberOfLines={2}>
                {offer.promoTitle}
              </Text>
            </View>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>{offer.badge}</Text>
            </View>
          </View>

          <View style={styles.heroStage}>
            <View style={styles.heroGlow} />
            <Animated.View key={`main-${mainIndex}`} entering={FadeIn.duration(320)} style={styles.heroImageWrap}>
              <Image source={gallery[mainIndex]} style={styles.hero} contentFit="contain" />
            </Animated.View>
          </View>

          <View style={styles.heroMeta}>
            <Text style={styles.heroModel} numberOfLines={1}>
              {offer.modelLine}
            </Text>
            <Text style={styles.heroPower} numberOfLines={1}>
              {offer.powertrain}
            </Text>
          </View>

          <View style={styles.anglesBlock}>
            <Text style={styles.sectionLabel}>More angles</Text>
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

        <View style={styles.detailCard}>
          <View style={styles.detailHead}>
            <Text style={styles.detailEyebrow}>Offer details</Text>
            <ExpiryCounter until={offer.validUntil} />
          </View>

          <Text style={styles.detailBody}>{offer.detail}</Text>

          <View style={styles.facts}>
            {offer.facts.map((fact, i) => (
              <View
                key={fact.label}
                style={[styles.factRow, i === offer.facts.length - 1 && styles.factRowLast]}>
                <Text style={styles.factLabel}>{fact.label}</Text>
                <Text style={styles.factValue}>{fact.value}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.highlightsTitle}>What’s included</Text>
          {offer.highlights.map((line) => (
            <View key={line} style={styles.highlightRow}>
              <View style={styles.dot} />
              <Text style={styles.highlightText}>{line}</Text>
            </View>
          ))}
        </View>

        <View style={styles.dealerCard}>
          <View style={styles.dealerIcon}>
            <Ionicons name="storefront-outline" size={18} color={AUTH_BLUE} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.dealerName}>{DEALERSHIP.name}</Text>
            <Text style={styles.dealerLine}>
              {DEALERSHIP.line} · {DEALERSHIP.city}
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.ctaBar, { paddingBottom: Math.max(insets.bottom, 14) }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={liked ? 'Unlike offer' : 'Like offer'}
          accessibilityState={{ selected: liked }}
          onPress={() => toggleLiked(offer.id)}
          style={({ pressed }) => [
            styles.likeBtn,
            liked && styles.likeBtnActive,
            { opacity: pressed ? 0.88 : 1 },
          ]}>
          <Ionicons
            name={liked ? 'heart' : 'heart-outline'}
            size={22}
            color={liked ? '#E11D48' : AUTH_BLUE}
          />
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Call dealership at ${DEALERSHIP.phoneDisplay}`}
          onPress={callDealer}
          style={({ pressed }) => [styles.cta, { opacity: pressed ? 0.92 : 1 }]}>
          <Ionicons name="call" size={18} color="#FFFFFF" />
          <Text style={styles.ctaText}>Call dealership</Text>
          <Text style={styles.ctaPhone}>{DEALERSHIP.phoneDisplay}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: SCREEN_BG,
    maxWidth: 480,
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
    fontSize: 15,
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
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: SCREEN_BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topCenter: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  topEyebrow: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: 'rgba(10,24,72,0.4)',
    marginBottom: 2,
  },
  topTitle: {
    fontSize: 17,
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
  topBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  scroll: {
    paddingHorizontal: PAD,
    paddingTop: 16,
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
  heroTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 18,
    paddingTop: 18,
    gap: 12,
  },
  heroHeadline: {
    flex: 1,
    paddingRight: 4,
  },
  heroKicker: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(10,24,72,0.5)',
    letterSpacing: 0.2,
  },
  heroTitle: {
    marginTop: 6,
    fontSize: 28,
    lineHeight: 34,
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
  heroBadgeText: {
    fontSize: 11,
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
  heroModel: {
    flex: 1,
    fontSize: 12,
    color: 'rgba(10,24,72,0.48)',
  },
  heroPower: {
    flexShrink: 0,
    fontSize: 12,
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
  sectionLabel: {
    fontSize: 12,
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
  detailHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 12,
  },
  detailEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: 'rgba(10,24,72,0.4)',
  },
  validLine: {
    fontSize: 12,
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
  expiryPillExpired: {
    backgroundColor: 'rgba(180,35,24,0.08)',
  },
  expiryText: {
    fontSize: 11,
    fontWeight: '700',
    color: AUTH_BLUE,
    flexShrink: 1,
  },
  expiryTextExpired: {
    color: '#B42318',
  },
  detailBody: {
    fontSize: 15,
    lineHeight: 23,
    color: 'rgba(18,20,26,0.7)',
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
  factRowLast: {
    borderBottomWidth: 0,
  },
  factLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(10,24,72,0.45)',
  },
  factValue: {
    flexShrink: 1,
    textAlign: 'right',
    fontSize: 13,
    fontWeight: '700',
    color: AUTH_BLUE,
  },
  highlightsTitle: {
    fontSize: 13,
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
  highlightText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 21,
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
  dealerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(10,24,72,0.07)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dealerName: {
    fontSize: 14,
    fontWeight: '700',
    color: AUTH_BLUE,
  },
  dealerLine: {
    marginTop: 2,
    fontSize: 12,
    color: 'rgba(10,24,72,0.5)',
  },
  ctaBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: PAD,
    paddingTop: 10,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(10,24,72,0.08)',
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
  ctaText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  ctaPhone: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
});
