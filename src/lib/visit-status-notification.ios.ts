import type { LiveActivity } from 'expo-widgets';

import type { ActiveInstantTracking } from '@/lib/api/testing';
import { computeEtaMinutes } from '@/lib/instant-eta';
import { attachLiveActivityPushToken } from '@/lib/live-activity-push';
import { mobileDigitsFromStored } from '@/lib/phone';
import VisitTrackingActivity from '@/widgets/VisitTrackingLiveActivity';
import type { VisitTrackingActivityProps } from '@/widgets/VisitTrackingLiveActivity';

export type VisitStatusPayload = VisitTrackingActivityProps & { driveId: number };

export const VISIT_STATUS_NOTIFICATION_ID = 'VisitTrackingActivity';

let cachedInstance: LiveActivity<VisitTrackingActivityProps> | null = null;

function formatClock(isoOrNow?: string): string {
  const date = isoOrNow ? new Date(isoOrNow) : new Date();
  return new Intl.DateTimeFormat('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

function truncateAddress(address: string, max = 42): string {
  const line = address.replace(/\s+/g, ' ').trim();
  if (line.length <= max) return line;
  return `${line.slice(0, max - 1)}…`;
}

function propsFromTracking(drive: ActiveInstantTracking): VisitTrackingActivityProps {
  const etaMinutes = computeEtaMinutes(drive);
  const initial = Math.max(1, drive.initial_eta_minutes);
  const elapsed = Math.max(0, initial - etaMinutes);
  const progress = Math.min(1, elapsed / initial);

  const arrivalMs = drive.eta_started_at
    ? new Date(drive.eta_started_at).getTime() + initial * 60_000
    : Date.now() + etaMinutes * 60_000;

  const arrivalLabel = new Intl.DateTimeFormat('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(arrivalMs));

  return {
    etaMinutes,
    arrivalLabel,
    addressLine: truncateAddress(drive.address),
    lastUpdatedLabel: `Updated ${formatClock()}`,
    progress,
    carLabel: drive.car?.trim() ? `Test drive · ${drive.car.trim()}` : 'Concierge test drive',
  };
}

function resolveInstance(): LiveActivity<VisitTrackingActivityProps> | null {
  if (cachedInstance) return cachedInstance;
  const active = VisitTrackingActivity.getInstances();
  if (active.length > 0) {
    cachedInstance = active[0];
    return cachedInstance;
  }
  return null;
}

export function registerVisitStatusNotifeeHandlers(): void {
  // iOS uses Live Activities, not Notifee.
}

/** Re-send per-activity APNs token to the server after relaunch (app was killed). */
export async function resyncLiveActivityPushRegistration(
  drive: ActiveInstantTracking,
): Promise<void> {
  const instance = resolveInstance();
  if (!instance) return;
  const phone = mobileDigitsFromStored(drive.customer_phone);
  if (phone.length !== 10) return;
  await attachLiveActivityPushToken(phone, drive.id, instance).catch(() => {});
}

export async function showVisitStatusNotification(
  payload: VisitStatusPayload | ActiveInstantTracking | number,
  legacyDriveId?: number,
): Promise<void> {
  let props: VisitTrackingActivityProps;
  if (typeof payload === 'number') {
    props = {
      etaMinutes: payload,
      arrivalLabel: formatClock(),
      addressLine: 'Test drive on the way',
      lastUpdatedLabel: `Updated ${formatClock()}`,
      progress: 0,
      carLabel: 'Victory Tata',
    };
    void legacyDriveId;
  } else if ('address' in payload && 'initial_eta_minutes' in payload) {
    props = propsFromTracking(payload);
  } else {
    props = payload;
  }

  const driveId =
    typeof payload === 'number'
      ? legacyDriveId ?? 0
      : 'initial_eta_minutes' in payload
        ? payload.id
        : 'driveId' in payload
          ? Number((payload as VisitStatusPayload).driveId)
          : 0;

  const existing = resolveInstance();
  if (existing) {
    await existing.update(props);
    return;
  }

  cachedInstance = VisitTrackingActivity.start(props, 'adityadesign://test-drive');

  if (driveId > 0 && typeof payload !== 'number' && 'customer_phone' in payload && cachedInstance) {
    const phone = mobileDigitsFromStored(payload.customer_phone);
    if (phone.length === 10) {
      await attachLiveActivityPushToken(phone, driveId, cachedInstance).catch(() => {});
    }
  }
}

export async function dismissVisitStatusNotification(): Promise<void> {
  const instance = resolveInstance();
  cachedInstance = null;
  if (!instance) return;
  await instance.end('immediate');
}

export async function updateFromInstantDrivePushData(
  data: Record<string, string | undefined>,
): Promise<void> {
  if (data.type !== 'testing_instant_drive') return;

  const status = data.status ?? 'tracking';
  if (status === 'arrived' || status === 'cancelled') {
    await dismissVisitStatusNotification();
    return;
  }

  const eta = Number(data.eta_minutes ?? '0');
  const initial = Number(data.initial_eta_minutes ?? '15');
  const driveLike: ActiveInstantTracking = {
    id: Number(data.drive_id ?? '0'),
    car_id: null,
    car: null,
    customer_name: '',
    customer_phone: '',
    address: data.address?.trim() || 'Your address',
    status: 'tracking',
    eta_minutes: Number.isNaN(eta) ? 0 : eta,
    initial_eta_minutes: Number.isNaN(initial) ? 15 : initial,
    eta_started_at: data.eta_started_at?.trim() || null,
    arrived_at: null,
  };

  await showVisitStatusNotification(driveLike);
}
