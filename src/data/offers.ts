import type { ImageSourcePropType } from 'react-native';

export type OfferGroup = 'EV' | 'PV';
export type OfferBody = 'SUV' | 'Sedan' | 'Hatch' | 'Crossover';
export type OfferSort = 'featured' | 'benefit' | 'newest';

export type OfferFact = {
  label: string;
  value: string;
};

export type Offer = {
  id: string;
  carId: string | null;
  group: OfferGroup;
  body: OfferBody;
  kicker: string;
  promoTitle: string;
  modelLine: string;
  powertrain: string;
  summary: string;
  detail: string;
  badge: string;
  validUntil: string;
  facts: OfferFact[];
  highlights: string[];
  featured?: boolean;
  benefitRank: number;
  gallery: ImageSourcePropType[];
  liked?: boolean;
};

export const FALLBACK_VEHICLE = require('../../assets/images/vehicles/nexon.jpg');

export function getOfferImage(offer: Offer): ImageSourcePropType {
  return offer.gallery[0] ?? FALLBACK_VEHICLE;
}

export const GROUP_FILTERS: { id: 'All' | OfferGroup; label: string }[] = [
  { id: 'All', label: 'All' },
  { id: 'EV', label: 'EV' },
  { id: 'PV', label: 'PV' },
];

export const BODY_FILTERS: { id: 'All' | OfferBody; label: string }[] = [
  { id: 'All', label: 'All bodies' },
  { id: 'SUV', label: 'SUV' },
  { id: 'Crossover', label: 'Crossover' },
  { id: 'Hatch', label: 'Hatch' },
  { id: 'Sedan', label: 'Sedan' },
];

export const SORT_OPTIONS: { id: OfferSort; label: string }[] = [
  { id: 'featured', label: 'Featured' },
  { id: 'benefit', label: 'Best benefits' },
  { id: 'newest', label: 'Newest' },
];
