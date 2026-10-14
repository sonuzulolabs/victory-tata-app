import { testingApiRequest } from '@/lib/api/client';

export type ActiveInstantTracking = {
  id: number;
  car_id: number | null;
  car: string | null;
  customer_name: string;
  customer_phone: string;
  address: string;
  status: 'tracking' | 'arrived' | 'cancelled';
  eta_minutes: number;
  initial_eta_minutes: number;
  eta_started_at: string | null;
  arrived_at: string | null;
};

function phoneQuery(phone: string) {
  return encodeURIComponent(phone);
}

export async function registerTestingDeviceToken(input: {
  phone: string;
  fcmToken: string;
  platform: 'android' | 'ios';
}): Promise<void> {
  await testingApiRequest('/device-tokens', {
    method: 'POST',
    body: JSON.stringify({
      phone: input.phone,
      fcm_token: input.fcmToken,
      platform: input.platform,
    }),
  });
}

export async function registerLiveActivityPushTokens(input: {
  phone: string;
  driveId?: number;
  activityPushToken?: string;
  pushToStartToken?: string;
}): Promise<void> {
  await testingApiRequest('/live-activity-tokens', {
    method: 'POST',
    body: JSON.stringify({
      phone: input.phone,
      drive_id: input.driveId,
      activity_push_token: input.activityPushToken,
      push_to_start_token: input.pushToStartToken,
    }),
  });
}

export async function submitInstantTestDrive(input: {
  customerName: string;
  customerPhone: string;
  carId: string;
  address: string;
}): Promise<ActiveInstantTracking> {
  return testingApiRequest<ActiveInstantTracking>('/instant-test-drives', {
    method: 'POST',
    body: JSON.stringify({
      customer_name: input.customerName,
      customer_phone: input.customerPhone,
      car_id: Number(input.carId),
      address: input.address,
    }),
  });
}

export async function fetchActiveInstantTracking(
  phone: string,
): Promise<ActiveInstantTracking | null> {
  const data = await testingApiRequest<ActiveInstantTracking | null>(
    `/tracking/active?phone=${phoneQuery(phone)}`,
  );
  return data ?? null;
}
