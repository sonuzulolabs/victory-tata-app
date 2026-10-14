import { AppState, type AppStateStatus } from 'react-native';

import { fetchActiveInstantTracking } from '@/lib/api/testing';
import {
  attachLiveActivityPushToken,
  subscribeLiveActivityPushToStart,
} from '@/lib/live-activity-push';
import { isValidIndianMobile, mobileDigitsFromStored } from '@/lib/phone';
import { loadStoredUserProfile } from '@/lib/user-profile-storage';
import VisitTrackingActivity from '@/widgets/VisitTrackingLiveActivity';

let started = false;
let pushToStartUnsub: (() => void) | null = null;
let appStateUnsub: { remove: () => void } | null = null;
let resyncTimer: ReturnType<typeof setInterval> | null = null;

async function resyncActivityPushTokenForStoredUser(): Promise<void> {
  const profile = await loadStoredUserProfile();
  const phone = mobileDigitsFromStored(profile?.phone ?? '');
  if (!isValidIndianMobile(phone)) return;

  const drive = await fetchActiveInstantTracking(phone).catch(() => null);
  if (!drive || drive.status !== 'tracking') return;

  const instances = VisitTrackingActivity.getInstances();
  if (instances.length === 0) return;

  await attachLiveActivityPushToken(phone, drive.id, instances[0]).catch(() => {});
}

/**
 * Runs before React mounts so iOS can upload Live Activity push tokens after
 * APNs push-to-start wakes the app (required for lock-screen ETA ticks when killed).
 */
export function startLiveActivityHeadlessSync(): void {
  if (started) return;
  started = true;

  void (async () => {
    const profile = await loadStoredUserProfile();
    const phone = mobileDigitsFromStored(profile?.phone ?? '');
    if (!isValidIndianMobile(phone)) return;

    pushToStartUnsub?.();
    pushToStartUnsub = subscribeLiveActivityPushToStart(phone);

    await resyncActivityPushTokenForStoredUser();
  })();

  const onState = (state: AppStateStatus) => {
    if (state !== 'active') return;
    void resyncActivityPushTokenForStoredUser();
  };

  appStateUnsub?.remove();
  appStateUnsub = AppState.addEventListener('change', onState);

  if (resyncTimer) clearInterval(resyncTimer);
  resyncTimer = setInterval(() => {
    if (AppState.currentState !== 'active') return;
    void resyncActivityPushTokenForStoredUser();
  }, 8000);
}
