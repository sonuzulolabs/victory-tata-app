/** Web — no persistent shade notification. */
export type VisitStatusPayload = {
  driveId: number;
  etaMinutes: number;
  initialEtaMinutes: number;
  etaStartedAt: string | null;
};

export function registerVisitStatusNotifeeHandlers(): void {}

export async function resyncLiveActivityPushRegistration(
  _drive: import('@/lib/api/testing').ActiveInstantTracking,
): Promise<void> {}

import type { ActiveInstantTracking } from '@/lib/api/testing';

export async function showVisitStatusNotification(
  _payload: VisitStatusPayload | ActiveInstantTracking | number,
  _legacyDriveId?: number,
): Promise<void> {}

export async function dismissVisitStatusNotification(): Promise<void> {}

export async function updateFromInstantDrivePushData(
  _data: Record<string, string | undefined>,
): Promise<void> {}
