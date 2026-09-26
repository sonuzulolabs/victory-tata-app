import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AUTH_BLUE } from '@/constants/brand';
import { useLikedOffers } from '@/context/liked-offers';
import { getOfferImage, type Offer } from '@/data/offers';

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
};

export function OfferListCard({
  offer,
  onPress,
  ctaLabel = 'Explore offers',
  showLikedBadge = true,
}: Props) {
  const { isLiked } = useLikedOffers();
  const liked = showLikedBadge && isLiked(offer.id);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${offer.kicker} ${offer.promoTitle}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, { opacity: pressed ? 0.97 : 1 }]}>
      <View style={styles.body}>
        <View style={styles.studioTop}>
          <View style={styles.headline}>
            <Text style={styles.kicker}>{offer.kicker}</Text>
            <Text style={styles.price} numberOfLines={2}>
              {offer.promoTitle}
            </Text>
          </View>
          <View style={styles.badges}>
            {liked ? (
              <View style={styles.likedBadge}>
                <Ionicons name="heart" size={11} color="#E11D48" />
                <Text style={styles.likedBadgeText}>Liked</Text>
              </View>
            ) : null}
            <View style={[styles.badge, { backgroundColor: badgeBlue(offer.badge) }]}>
              <Text style={styles.badgeText}>{offer.badge}</Text>
            </View>
          </View>
        </View>

        <Image source={getOfferImage(offer)} style={styles.car} contentFit="contain" />

        <View style={styles.meta}>
          <Text style={styles.modelLine} numberOfLines={1}>
            {offer.modelLine}
          </Text>
          <Text style={styles.powertrain} numberOfLines={1}>
            {offer.powertrain}
          </Text>
        </View>
      </View>

      <View style={styles.foot}>
        <View style={styles.cta}>
          <Text style={styles.ctaText}>{ctaLabel}</Text>
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
  },
  body: {
    backgroundColor: '#FFFFFF',
    paddingTop: 18,
    paddingBottom: 10,
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
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(15,23,42,0.55)',
    letterSpacing: 0.2,
  },
  price: {
    marginTop: 6,
    fontSize: 28,
    lineHeight: 34,
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
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
    color: '#E11D48',
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 11,
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
    fontSize: 12,
    color: 'rgba(15,23,42,0.5)',
  },
  powertrain: {
    flexShrink: 0,
    fontSize: 12,
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
  cta: {
    backgroundColor: AUTH_BLUE,
    borderRadius: 12,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
});
