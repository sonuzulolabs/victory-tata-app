import type { ImageSourcePropType } from 'react-native';

import type { HomeOffer } from '@/data/homeOffers';
import { FALLBACK_VEHICLE, type Offer, type OfferBody, type OfferGroup } from '@/data/offers';
import {
  formatApiTime,
  rideDateParts,
  type ScheduledRide,
} from '@/data/scheduledRides';
import {
  type Referral,
  type ReferralStatus,
} from '@/data/referrals';
import { mediaUrl } from '@/lib/api/config';
import type { ApiOffer, ApiReferral, ApiTestDrive } from '@/lib/api/types';

const BODIES: OfferBody[] = ['SUV', 'Sedan', 'Hatch', 'Crossover'];

function asGroup(value: string | null): OfferGroup {
  return value === 'EV' ? 'EV' : 'PV';
}

function asBody(value: string | null): OfferBody {
  return BODIES.includes(value as OfferBody) ? (value as OfferBody) : 'SUV';
}

function galleryFrom(urls: string[]): ImageSourcePropType[] {
  const images = urls
    .map((url) => mediaUrl(url))
    .filter((url): url is string => Boolean(url))
    .map((uri) => ({ uri }));
  return images.length > 0 ? images : [FALLBACK_VEHICLE];
}

export function mapOffer(raw: ApiOffer): Offer {
  const facts = (raw.facts ?? []).flatMap((fact) => {
    const label = fact?.label?.trim() ?? '';
    if (!label) return [];
    return [{ label, value: fact.value?.trim() ?? '' }];
  });

  return {
    id: String(raw.id),
    carId: raw.car?.id != null ? String(raw.car.id) : null,
    group: asGroup(raw.group),
    body: asBody(raw.body),
    kicker: raw.kicker || raw.title || 'Offer',
    promoTitle: raw.promo_title || raw.title || 'Offer',
    modelLine: raw.model_line || raw.car?.full_name || '',
    powertrain: raw.powertrain || '',
    summary: raw.summary || '',
    detail: raw.detail || raw.summary || '',
    badge: raw.badge || raw.group || 'PV',
    validUntil: raw.valid_until || '',
    facts,
    highlights: (raw.highlights ?? []).filter((line) => Boolean(line)),
    featured: raw.is_featured,
    benefitRank: raw.benefit_rank ?? 0,
    gallery: galleryFrom(raw.gallery?.length ? raw.gallery : raw.image_url ? [raw.image_url] : []),
    liked: Boolean(raw.is_liked),
  };
}

export function mapHomeOffer(raw: {
  id: number;
  accent_label: string | null;
  promo_title: string | null;
  valid_note: string | null;
  image_url: string | null;
}): HomeOffer {
  const uri = mediaUrl(raw.image_url);
  return {
    id: String(raw.id),
    accentLabel: raw.accent_label || 'Offer',
    promoTitle: raw.promo_title || 'Offer',
    validNote: raw.valid_note || '',
    image: uri ? { uri } : FALLBACK_VEHICLE,
  };
}

const REFERRAL_STATUS: Record<string, ReferralStatus> = {
  created: 'Submitted',
  showroom_visited: 'Contacted',
  test_drive: 'TestDrive',
  purchase_completed: 'Purchased',
  reward_eligible: 'Purchased',
  reward_given: 'Credited',
  cancelled: 'Cancelled',
};

export function mapReferral(raw: ApiReferral): Referral {
  const status = REFERRAL_STATUS[raw.status] ?? 'Submitted';
  const reward = raw.reward;
  const given = reward?.status === 'given' ? reward.value : null;
  const pending =
    reward && (reward.status === 'eligible' || reward.status === 'approved') ? reward.value : null;

  return {
    id: String(raw.id),
    customerName: raw.referred_customer.name,
    customerPhone: raw.referred_customer.phone,
    vehicleLabel: raw.interested_car ?? undefined,
    status,
    creditAmount: status === 'Credited' ? given : null,
    pendingCredit: pending,
    createdAt: raw.referral_date,
    updatedAt: raw.referral_date,
  };
}

const UPCOMING = new Set(['pending', 'confirmed']);

export function mapTestDrive(raw: ApiTestDrive): ScheduledRide | null {
  if (!UPCOMING.has(raw.status)) return null;
  const date = rideDateParts(raw.scheduled_date);
  const uri = mediaUrl(raw.image_url);
  const showroom = /victory|showroom/i.test(raw.location);
  return {
    id: String(raw.id),
    vehicleName: raw.car,
    location: raw.location,
    weekday: date.weekday,
    day: date.day,
    month: date.month,
    time: formatApiTime(raw.scheduled_time),
    meet: showroom ? 'Showroom' : 'Doorstep',
    status: 'Upcoming',
    image: uri ? { uri } : FALLBACK_VEHICLE,
  };
}
