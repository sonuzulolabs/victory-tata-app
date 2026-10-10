import type { ImageSourcePropType } from 'react-native';

import { REFER_BANNER, type HomeOffer } from '@/data/homeOffers';
import { vehicleImage } from '@/data/vehicle-images';
import type { Offer, OfferBody, OfferGroup, OfferSort } from '@/data/offers';
import type { Referral } from '@/data/referrals';
import type { ScheduledRide } from '@/data/scheduledRides';
import { ApiError, apiRequest } from '@/lib/api/client';
import { mediaUrl } from '@/lib/api/config';
import { mapHomeOffer, mapOffer, mapReferral, mapTestDrive } from '@/lib/api/mappers';
import type {
  ApiCustomer,
  ApiDealership,
  ApiHome,
  ApiOffer,
  ApiPoints,
  ApiReferral,
  ApiRewards,
  ApiTestDrive,
  ApiCar,
} from '@/lib/api/types';

export { ApiError } from '@/lib/api/client';

export type VehicleOption = {
  id: string;
  label: string;
};

export type AccountSummary = {
  points: number;
  creditedRewards: number;
  referralCount: number;
};

export type SavedCustomer = {
  id: number;
  name: string;
  phone: string;
  email: string;
  city: string;
  memberSince: string;
  totalPoints: number;
};

export type DealershipInfo = {
  name: string;
  city: string;
  line: string;
  phone: string;
  phoneDisplay: string;
  showrooms: { id: string; label: string }[];
};

const SORT_FILTER: Record<OfferSort, string> = {
  featured: 'featured',
  benefit: 'best_benefits',
  newest: 'newest',
};

function phoneQuery(phone: string) {
  return encodeURIComponent(phone);
}

export async function fetchOffers(params: {
  query?: string;
  group?: 'All' | OfferGroup;
  body?: 'All' | OfferBody;
  sort?: OfferSort;
  phone?: string;
}): Promise<Offer[]> {
  const qs = new URLSearchParams();
  qs.set('per_page', '50');
  qs.set('filter', SORT_FILTER[params.sort ?? 'featured']);
  if (params.query?.trim()) qs.set('search', params.query.trim());
  if (params.group && params.group !== 'All') qs.set('group', params.group);
  if (params.body && params.body !== 'All') qs.set('body', params.body);
  if (params.phone) qs.set('phone', params.phone);

  const data = await apiRequest<{ offers: ApiOffer[] }>(`/offers?${qs.toString()}`);
  return (data.offers ?? []).map(mapOffer);
}

export async function fetchOffer(id: string, phone?: string): Promise<Offer> {
  const qs = phone ? `?phone=${phoneQuery(phone)}` : '';
  const data = await apiRequest<ApiOffer>(`/offers/${encodeURIComponent(id)}${qs}`);
  return mapOffer(data);
}

export async function likeOffer(id: string, phone: string): Promise<void> {
  await apiRequest(`/offers/${encodeURIComponent(id)}/like`, {
    method: 'POST',
    body: JSON.stringify({ phone }),
  });
}

export async function unlikeOffer(id: string, phone: string): Promise<void> {
  await apiRequest(`/offers/${encodeURIComponent(id)}/like?phone=${phoneQuery(phone)}`, {
    method: 'DELETE',
  });
}

export async function fetchHome(): Promise<{
  offers: HomeOffer[];
  referBanner: ImageSourcePropType;
}> {
  const data = await apiRequest<ApiHome>('/home');
  const bannerFile = data.refer_banner?.image_url?.split('/').pop()?.split('?')[0] ?? '';
  const localBanner = vehicleImage(bannerFile);
  const banner = mediaUrl(data.refer_banner?.image_url);
  return {
    offers: (data.offers_for_you ?? []).map(mapHomeOffer),
    referBanner: localBanner ?? (banner ? { uri: banner } : REFER_BANNER),
  };
}

export async function fetchVehicles(): Promise<VehicleOption[]> {
  const data = await apiRequest<{ cars: ApiCar[] }>('/cars?per_page=50');
  return (data.cars ?? []).map((car) => ({
    id: String(car.id),
    label: car.full_name || [car.model, car.variant].filter(Boolean).join(' '),
  }));
}

export async function fetchCustomer(phone: string): Promise<SavedCustomer> {
  const data = await apiRequest<ApiCustomer>(`/customers?phone=${phoneQuery(phone)}`);
  return mapCustomer(data);
}

export async function saveCustomer(input: {
  name: string;
  phone: string;
  email?: string;
  city?: string;
}): Promise<SavedCustomer> {
  const data = await apiRequest<ApiCustomer>('/customers', {
    method: 'POST',
    body: JSON.stringify({
      name: input.name,
      phone: input.phone,
      email: input.email || null,
      city: input.city || null,
    }),
  });
  return mapCustomer(data);
}

let dealershipRequest: Promise<DealershipInfo> | null = null;

export function fetchDealership(): Promise<DealershipInfo> {
  if (!dealershipRequest) {
    dealershipRequest = apiRequest<ApiDealership>('/dealership')
      .then((data) => ({
        name: data.name,
        city: data.city,
        line: data.line,
        phone: data.phone,
        phoneDisplay: data.phone_display,
        showrooms: (data.showrooms ?? []).map((room) => ({
          id: room.id,
          label: room.label,
        })),
      }))
      .catch((error: unknown) => {
        dealershipRequest = null;
        throw error;
      });
  }
  return dealershipRequest;
}

function mapCustomer(data: ApiCustomer): SavedCustomer {
  return {
    id: data.id,
    name: data.name,
    phone: data.phone,
    email: data.email ?? '',
    city: data.city ?? '',
    memberSince: data.member_since ?? '',
    totalPoints: data.total_points ?? 0,
  };
}

export async function fetchReferrals(phone: string): Promise<Referral[]> {
  const data = await apiRequest<ApiReferral[] | { referrals?: ApiReferral[] }>(
    `/referrals?phone=${phoneQuery(phone)}`,
  );
  if (Array.isArray(data)) return [];
  return (data.referrals ?? []).map(mapReferral);
}

export async function submitReferral(input: {
  referrerName: string;
  referrerPhone: string;
  customerName: string;
  customerPhone: string;
  carId?: string;
  notes?: string;
}): Promise<{ id: string; customerName: string }> {
  const data = await apiRequest<{
    id: number;
    referred_customer: { name: string };
  }>('/referrals', {
    method: 'POST',
    body: JSON.stringify({
      referrer_name: input.referrerName,
      referrer_phone: input.referrerPhone,
      referred_name: input.customerName,
      referred_phone: input.customerPhone,
      interested_car_id: input.carId ? Number(input.carId) : null,
      notes: input.notes || null,
    }),
  });
  return { id: String(data.id), customerName: data.referred_customer.name };
}

export async function fetchTestDrives(phone: string): Promise<ScheduledRide[]> {
  const data = await apiRequest<ApiTestDrive[] | Record<string, never>>(
    `/test-drives?phone=${phoneQuery(phone)}`,
  );
  if (!Array.isArray(data)) return [];
  return data.flatMap((item) => {
    const ride = mapTestDrive(item);
    return ride ? [ride] : [];
  });
}

export async function submitTestDrive(input: {
  customerName: string;
  customerPhone: string;
  carId: string;
  location: string;
  scheduledDate: string;
  scheduledTime: string;
  service?: 'instore' | 'concierge';
  guestName?: string | null;
  guestPhone?: string | null;
  referredByPhone?: string | null;
}): Promise<void> {
  await apiRequest('/test-drives', {
    method: 'POST',
    body: JSON.stringify({
      customer_name: input.customerName,
      customer_phone: input.customerPhone,
      car_id: Number(input.carId),
      location: input.location,
      service: input.service ?? null,
      guest_name: input.guestName || null,
      guest_phone: input.guestPhone || null,
      referred_by_phone: input.referredByPhone || null,
      scheduled_date: input.scheduledDate,
      scheduled_time: input.scheduledTime,
    }),
  });
}

export async function fetchAccountSummary(phone: string): Promise<AccountSummary> {
  const [points, rewards, referrals] = await Promise.all([
    apiRequest<ApiPoints>(`/points?phone=${phoneQuery(phone)}`).catch((error: unknown) => {
      if (error instanceof ApiError && error.status === 404) return { total_points: 0 };
      throw error;
    }),
    apiRequest<ApiRewards>(`/rewards?phone=${phoneQuery(phone)}`).catch((error: unknown) => {
      if (error instanceof ApiError && error.status === 404) {
        return { total_points: 0, rewards: [] };
      }
      throw error;
    }),
    fetchReferrals(phone).catch((error: unknown) => {
      if (error instanceof ApiError && error.status === 404) return [];
      throw error;
    }),
  ]);

  const creditedRewards = (rewards.rewards ?? [])
    .filter((reward) => reward.status === 'given')
    .reduce((sum, reward) => sum + (reward.reward_value || 0), 0);

  return {
    points: points.total_points ?? 0,
    creditedRewards,
    referralCount: referrals.length,
  };
}
