import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AUTH_BLUE } from '@/constants/brand';
import type { HomeOffer } from '@/data/homeOffers';

export const OFFER_CARD_WIDTH = 176;

type Props = {
  offer: HomeOffer;
  onPress?: () => void;
  imageHeight?: number;
};

export function OfferCard({ offer, onPress, imageHeight = 104 }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={offer.promoTitle}
      onPress={onPress}
      style={({ pressed }) => [styles.card, { opacity: pressed ? 0.92 : 1 }]}>
      <View style={styles.badge}>
        <Text style={styles.badgeText} numberOfLines={1}>
          {offer.accentLabel}
        </Text>
      </View>
      <Image
        source={offer.image}
        style={[styles.image, { height: imageHeight }]}
        contentFit="contain"
      />
      <Text style={styles.title} numberOfLines={2}>
        {offer.promoTitle}
      </Text>
      <Text style={styles.meta} numberOfLines={1}>
        {offer.validNote}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: OFFER_CARD_WIDTH,
    borderRadius: 22,
    padding: 14,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
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
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: AUTH_BLUE,
  },
  image: {
    width: '100%',
    marginBottom: 10,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#12141A',
    lineHeight: 18,
    marginBottom: 3,
    minHeight: 36,
  },
  meta: {
    fontSize: 12,
    color: '#8B90A0',
  },
});
