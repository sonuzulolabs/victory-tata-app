import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AUTH_BLUE } from '@/constants/brand';
import { useLikedOffers } from '@/context/liked-offers';
import { formatPromoInLakhs, getOfferImage, type Offer } from '@/data/offers';
import { useBreakpoint } from '@/hooks/use-breakpoint';

/** Distinct blue shades for top-right offer badges. */
const BADGE_BLUES: Record<string, string> = {
  EV: '#0A1848',
  PV: '#1E3A8A',
  NEW: '#2563EB',
  Festive: '#3B82F6',
};

function badgeBlue(label: string): string {
  return BADGE_BLUES[label] ?? '#152A6B';
}

type Props = {
  offer: Offer;
  onPress?: () => void;
  ctaLabel?: string;
  /** When false, never show the Liked badge (e.g. test-drive catalog). */
  showLikedBadge?: boolean;
  /** Compact card for tablet multi-column grids (layout only — fonts stay large). */
  compact?: boolean;
};

export function OfferListCard({
  offer,
  onPress,
  ctaLabel = 'Explore offers',
  showLikedBadge = true,
  compact = false,
}: Props) {
  const { isLiked } = useLikedOffers();
  const { isTablet, fs, lh } = useBreakpoint();
  const liked = showLikedBadge && isLiked(offer.id);
  const promoLine = formatPromoInLakhs(offer.promoTitle);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${offer.kicker} ${promoLine}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        compact && styles.cardCompact,
        isTablet && styles.cardTablet,
        { opacity: pressed ? 0.97 : 1 },
      ]}>
      <View style={[styles.body, compact && styles.bodyCompact, isTablet && styles.bodyTablet]}>
        <View style={styles.studioTop}>
          <View style={styles.headline}>
            <Text style={[styles.kicker, { fontSize: fs(12), lineHeight: lh(12, 1.3) }]}>
              {offer.kicker}
            </Text>
            <Text
              style={[
                styles.price,
                {
                  fontSize: fs(compact && isTablet ? 24 : 28),
                  lineHeight: lh(compact && isTablet ? 24 : 28, 1.15),
                },
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.72}>
              {promoLine}
            </Text>
          </View>
          <View style={styles.badges}>
            {liked ? (
              <View style={[styles.likedBadge, isTablet && styles.badgePadTablet]}>
                <Ionicons name="heart" size={fs(11)} color="#E11D48" />
                <Text style={[styles.likedBadgeText, { fontSize: fs(11) }]}>Liked</Text>
              </View>
            ) : null}
            <View
              style={[
                styles.badge,
                { backgroundColor: badgeBlue(offer.badge) },
                isTablet && styles.badgePadTablet,
              ]}>
              <Text style={[styles.badgeText, { fontSize: fs(11) }]}>{offer.badge}</Text>
            </View>
          </View>
        </View>

        <Image
          source={getOfferImage(offer)}
          style={[
            styles.car,
            compact && styles.carCompact,
            isTablet && !compact && styles.carTablet,
            isTablet && compact && styles.carTabletCompact,
          ]}
          contentFit="contain"
        />

        <View style={styles.meta}>
          <Text
            style={[styles.modelLine, { fontSize: fs(12), lineHeight: lh(12, 1.35) }]}
            numberOfLines={1}>
            {offer.modelLine}
          </Text>
          <Text
            style={[styles.powertrain, { fontSize: fs(12), lineHeight: lh(12, 1.35) }]}
            numberOfLines={1}>
            {offer.powertrain}
          </Text>
        </View>
      </View>

      <View style={[styles.foot, compact && styles.footCompact, isTablet && styles.footTablet]}>
        <View style={[styles.cta, isTablet && styles.ctaTablet]}>
          <Text style={[styles.ctaText, { fontSize: fs(15) }]}>{ctaLabel}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(15,23,42,0.08)',
    shadowColor: '#0F172A',
    shadowOpacity: 0.07,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
    flex: 1,
  },
  cardCompact: {
    borderRadius: 20,
  },
  cardTablet: {
    borderRadius: 26,
  },
  body: {
    backgroundColor: '#FFFFFF',
    paddingTop: 18,
    paddingBottom: 10,
  },
  bodyCompact: {
    paddingTop: 16,
  },
  bodyTablet: {
    paddingTop: 22,
    paddingBottom: 12,
  },
  studioTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 18,
    gap: 12,
  },
  headline: {
    flex: 1,
    paddingRight: 4,
  },
  kicker: {
    fontWeight: '600',
    color: 'rgba(15,23,42,0.55)',
    letterSpacing: 0.2,
  },
  price: {
    marginTop: 6,
    fontWeight: '800',
    letterSpacing: -0.6,
    color: AUTH_BLUE,
  },
  badges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  likedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: 'rgba(225,29,72,0.1)',
  },
  likedBadgeText: {
    fontWeight: '800',
    letterSpacing: 0.3,
    color: '#E11D48',
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  badgePadTablet: {
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  badgeText: {
    fontWeight: '700',
    letterSpacing: 0.6,
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  car: {
    width: '100%',
    height: 200,
    marginTop: -2,
  },
  carCompact: {
    height: 168,
  },
  carTablet: {
    height: 240,
  },
  carTabletCompact: {
    height: 190,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 18,
    marginTop: 2,
    paddingBottom: 4,
  },
  modelLine: {
    flex: 1,
    color: 'rgba(15,23,42,0.5)',
  },
  powertrain: {
    flexShrink: 0,
    fontWeight: '700',
    color: AUTH_BLUE,
  },
  foot: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(15,23,42,0.06)',
  },
  footCompact: {
    paddingTop: 12,
    paddingBottom: 14,
  },
  footTablet: {
    paddingTop: 16,
    paddingBottom: 18,
  },
  cta: {
    backgroundColor: AUTH_BLUE,
    borderRadius: 12,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  ctaTablet: {
    minHeight: 56,
    borderRadius: 14,
  },
  ctaText: {
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: -0.1,
  },
});
