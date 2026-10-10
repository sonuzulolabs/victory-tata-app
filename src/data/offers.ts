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

/** Format a rupee amount in Indian lakhs (e.g. 50000 → "₹0.5 Lakh"). */
export function formatAmountInLakhs(amount: number): string {
  if (!Number.isFinite(amount) || amount <= 0) return `₹${amount}`;
  const lakhs = amount / 100_000;
  if (lakhs >= 100) {
    const crore = lakhs / 100;
    const rounded = Number.isInteger(crore) ? String(crore) : crore.toFixed(2).replace(/\.?0+$/, '');
    return `₹${rounded} Cr`;
  }
  const rounded =
    lakhs >= 10
      ? (Number.isInteger(lakhs) ? String(lakhs) : lakhs.toFixed(1).replace(/\.0$/, ''))
      : Number.isInteger(lakhs)
        ? String(lakhs)
        : lakhs.toFixed(2).replace(/\.?0+$/, '');
  return `₹${rounded} Lakh`;
}

/**
 * Rewrite money figures inside promo copy to lakhs form.
 * e.g. "Up to ₹50,000" / "Up to 50000" → "Up to ₹0.5 Lakh"
 */
export function formatPromoInLakhs(text: string): string {
  if (!text) return text;

  return text.replace(
    /(?:₹\s*)?(\d{1,3}(?:,\d{2,3})+|\d{4,})(?:\s*\/\-)?/g,
    (match, raw: string) => {
      const amount = Number(String(raw).replace(/,/g, ''));
      if (!Number.isFinite(amount) || amount < 1000) return match;
      return formatAmountInLakhs(amount);
    },
  );
}
