import notifee, {
  AndroidCategory,
  AndroidFlags,
  AndroidImportance,
  AndroidVisibility,
  EventType,
} from '@notifee/react-native';
import { Platform } from 'react-native';

import type { ActiveInstantTracking } from '@/lib/api/testing';
import { computeEtaMinutes } from '@/lib/instant-eta';
import { hasPostNotificationsPermission } from '@/lib/notification-permission';

const SMALL_ICON = 'ic_stat_notification';

const CHANNEL_ID = 'visit_tracking';
export const VISIT_STATUS_NOTIFICATION_ID = 'victory-instant-drive-status';

export type VisitStatusPayload = {
  driveId: number;
  etaMinutes: number;
  initialEtaMinutes: number;
  etaStartedAt: string | null;
};

let channelReady = false;
let activePayload: VisitStatusPayload | null = null;
let backgroundHandlerRegistered = false;
let liveUpdateInterval: ReturnType<typeof setInterval> | null = null;

function liveEtaMinutes(payload: VisitStatusPayload): number {
  if (!payload.etaStartedAt) {
    return payload.etaMinutes;
  }
  const started = new Date(payload.etaStartedAt).getTime();
  if (Number.isNaN(started)) {
    return payload.etaMinutes;
  }
  const elapsed = Math.floor((Date.now() - started) / 60_000);
  return Math.max(0, payload.initialEtaMinutes - elapsed);
}

function arrivalTimestampMs(payload: VisitStatusPayload): number {
  if (payload.etaStartedAt) {
    const started = new Date(payload.etaStartedAt).getTime();
    if (!Number.isNaN(started)) {
      return started + payload.initialEtaMinutes * 60_000;
    }
  }
  return Date.now() + liveEtaMinutes(payload) * 60_000;
}

function formatArrivalClock(ms: number): string {
  return new Intl.DateTimeFormat('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(ms));
}

function statusText(payload: VisitStatusPayload, etaMinutes: number): { title: string; body: string } {
  const arrivalMs = arrivalTimestampMs(payload);
  const arrivalLabel = formatArrivalClock(arrivalMs);

  if (etaMinutes <= 0) {
    return {
      title: 'Test drive · arriving now',
      body: `At your address · ETA 0 min (by ${arrivalLabel})`,
    };
  }

  const etaLabel = etaMinutes === 1 ? '1 min' : `${etaMinutes} min`;

  return {
    title: `On the way · ${etaLabel} left`,
    body: `Arriving by ${arrivalLabel} · live ETA ${etaLabel}`,
  };
}

async function ensureChannel(): Promise<void> {
  if (channelReady || Platform.OS !== 'android') return;
  await notifee.createChannel({
    id: CHANNEL_ID,
    name: 'Test drive visit',
    description: 'Live ETA while your test drive is on the way',
    importance: AndroidImportance.DEFAULT,
    vibration: false,
  });
  channelReady = true;
}

function stopLiveUpdates(): void {
  if (liveUpdateInterval) {
    clearInterval(liveUpdateInterval);
    liveUpdateInterval = null;
  }
}

function startLiveUpdates(): void {
  stopLiveUpdates();
  liveUpdateInterval = setInterval(() => {
    if (!activePayload) return;
    const next = { ...activePayload, etaMinutes: liveEtaMinutes(activePayload) };
    activePayload = next;
    void displayVisitNotification(next);
  }, 30_000);
}

async function displayVisitNotification(payload: VisitStatusPayload): Promise<void> {
  const etaMinutes = liveEtaMinutes(payload);
  const { title, body } = statusText(payload, etaMinutes);
  const arrivalMs = arrivalTimestampMs(payload);
  const initial = Math.max(1, payload.initialEtaMinutes);
  const progressCurrent = Math.min(initial, Math.max(0, initial - etaMinutes));

  await notifee.displayNotification({
    id: VISIT_STATUS_NOTIFICATION_ID,
    title,
    body,
    data: {
      type: 'testing_instant_drive',
      drive_id: String(payload.driveId),
      eta_minutes: String(etaMinutes),
    },
    android: {
      channelId: CHANNEL_ID,
      category: AndroidCategory.TRANSPORT,
      ongoing: true,
      autoCancel: false,
      onlyAlertOnce: true,
      flags: [AndroidFlags.FLAG_NO_CLEAR],
      pressAction: { id: 'default', launchActivity: 'default' },
      smallIcon: SMALL_ICON,
      showTimestamp: true,
      timestamp: arrivalMs,
      showChronometer: true,
      chronometerDirection: 'down',
      visibility: AndroidVisibility.PUBLIC,
      progress: {
        max: initial,
        current: progressCurrent,
        indeterminate: false,
      },
    },
  });
}

async function onDismissedReShow(): Promise<void> {
  if (!activePayload) return;
  if (!(await hasPostNotificationsPermission())) return;
  const next = { ...activePayload, etaMinutes: liveEtaMinutes(activePayload) };
  activePayload = next;
  await displayVisitNotification(next);
}

/** Register Notifee background handler (call from app entry). */
export function registerVisitStatusNotifeeHandlers(): void {
  if (backgroundHandlerRegistered || Platform.OS !== 'android') return;
  backgroundHandlerRegistered = true;

  notifee.onBackgroundEvent(async ({ type, detail }) => {
    if (type !== EventType.DISMISSED) return;
    if (detail.notification?.id !== VISIT_STATUS_NOTIFICATION_ID) return;
    await onDismissedReShow();
  });

  notifee.onForegroundEvent(({ type, detail }) => {
    if (type !== EventType.DISMISSED) return;
    if (detail.notification?.id !== VISIT_STATUS_NOTIFICATION_ID) return;
    void onDismissedReShow();
  });
}

function payloadFromDrive(drive: ActiveInstantTracking): VisitStatusPayload {
  return {
    driveId: drive.id,
    etaMinutes: computeEtaMinutes(drive),
    initialEtaMinutes: drive.initial_eta_minutes,
    etaStartedAt: drive.eta_started_at,
  };
}

export async function showVisitStatusNotification(
  payload: VisitStatusPayload | ActiveInstantTracking | number,
  legacyDriveId?: number,
): Promise<void> {
  if (Platform.OS !== 'android') return;

  const normalized: VisitStatusPayload =
    typeof payload === 'number'
      ? {
          driveId: legacyDriveId ?? 0,
          etaMinutes: payload,
          initialEtaMinutes: 15,
          etaStartedAt: null,
        }
      : 'initial_eta_minutes' in payload
        ? payloadFromDrive(payload)
        : { ...payload, etaMinutes: liveEtaMinutes(payload) };

  if (!(await hasPostNotificationsPermission())) {
    return;
  }

  registerVisitStatusNotifeeHandlers();
  await ensureChannel();

  activePayload = normalized;
  await displayVisitNotification(normalized);
  startLiveUpdates();
}

export async function dismissVisitStatusNotification(): Promise<void> {
  if (Platform.OS !== 'android') return;
  activePayload = null;
  stopLiveUpdates();
  await notifee.cancelNotification(VISIT_STATUS_NOTIFICATION_ID);
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
  const driveId = data.drive_id ? Number(data.drive_id) : activePayload?.driveId ?? 0;
  const initial = Number(data.initial_eta_minutes ?? activePayload?.initialEtaMinutes ?? 15);

  await showVisitStatusNotification({
    driveId,
    etaMinutes: Number.isNaN(eta) ? 0 : eta,
    initialEtaMinutes: Number.isNaN(initial) ? 15 : initial,
    etaStartedAt: data.eta_started_at?.trim() || activePayload?.etaStartedAt || null,
  });
}
