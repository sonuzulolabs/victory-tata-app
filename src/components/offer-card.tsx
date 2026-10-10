import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AUTH_BLUE } from '@/constants/brand';
import type { HomeOffer } from '@/data/homeOffers';
import { formatPromoInLakhs } from '@/data/offers';
import { useBreakpoint } from '@/hooks/use-breakpoint';

export const OFFER_CARD_WIDTH = 176;
export const OFFER_CARD_WIDTH_TABLET = 248;

type Props = {
  offer: HomeOffer;
  onPress?: () => void;
  imageHeight?: number;
  width?: number;
};

export function OfferCard({ offer, onPress, imageHeight = 104, width = OFFER_CARD_WIDTH }: Props) {
  const { isTablet, fs, lh } = useBreakpoint();
  const promoLine = formatPromoInLakhs(offer.promoTitle);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={promoLine}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        isTablet && styles.cardTablet,
        { width, opacity: pressed ? 0.92 : 1 },
      ]}>
      <View style={[styles.badge, isTablet && styles.badgeTablet]}>
        <Text style={[styles.badgeText, { fontSize: fs(11) }]} numberOfLines={1}>
          {offer.accentLabel}
        </Text>
      </View>
      <Image
        source={offer.image}
        style={[styles.image, { height: imageHeight }]}
        contentFit="contain"
      />
      <Text
        style={[
          styles.title,
          {
            fontSize: fs(14),
            lineHeight: lh(14, 1.3),
            minHeight: lh(14, 1.3) * 2,
          },
        ]}
        numberOfLines={2}>
        {promoLine}
      </Text>
      <Text style={[styles.meta, { fontSize: fs(12), lineHeight: lh(12, 1.3) }]} numberOfLines={1}>
        {offer.validNote}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    padding: 14,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
  },
  cardTablet: {
    borderRadius: 24,
    padding: 18,
    paddingBottom: 16,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(10,24,72,0.08)',
    marginBottom: 8,
    maxWidth: '100%',
  },
  badgeTablet: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginBottom: 10,
  },
  badgeText: {
    fontWeight: '700',
    color: AUTH_BLUE,
  },
  image: {
    width: '100%',
    marginBottom: 10,
  },
  title: {
    fontWeight: '700',
    color: '#12141A',
    marginBottom: 3,
  },
  meta: {
    color: '#8B90A0',
  },
});
