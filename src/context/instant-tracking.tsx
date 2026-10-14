import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { AppState, InteractionManager, Platform, type AppStateStatus } from 'react-native';

import {
  fetchActiveInstantTracking,
  registerTestingDeviceToken,
  type ActiveInstantTracking,
} from '@/lib/api/testing';
import { computeEtaMinutes } from '@/lib/instant-eta';
import { isValidIndianMobile, mobileDigitsFromStored } from '@/lib/phone';
import { subscribeLiveActivityPushToStart } from '@/lib/live-activity-push';
import { subscribePostNotificationsReady } from '@/lib/post-notifications-ready';
import {
  dismissVisitStatusNotification,
  resyncLiveActivityPushRegistration,
  showVisitStatusNotification,
} from '@/lib/visit-status-notification';
import { useUserProfile } from '@/context/user-profile';

type InstantTrackingContextValue = {
  active: ActiveInstantTracking | null;
  refresh: () => Promise<void>;
  applyPushUpdate: (etaMinutes: number, status: string) => void;
  setActiveFromBooking: (drive: ActiveInstantTracking) => void;
  syncPushTokenForPhone: (phone10: string) => Promise<void>;
};

const InstantTrackingContext = createContext<InstantTrackingContextValue | null>(null);

type FcmModule = typeof import('@/lib/fcm');

async function loadFcm(): Promise<FcmModule | null> {
  try {
    return await import('@/lib/fcm');
  } catch {
    return null;
  }
}

export function InstantTrackingProvider({ children }: { children: ReactNode }) {
  const { profile } = useUserProfile();
  const phone = mobileDigitsFromStored(profile?.phone ?? '');
  const [active, setActive] = useState<ActiveInstantTracking | null>(null);
  const [notifPermissionTick, setNotifPermissionTick] = useState(0);

  useEffect(() => subscribePostNotificationsReady(() => setNotifPermissionTick((t) => t + 1)), []);

  useEffect(() => {
    if (Platform.OS !== 'ios' || !isValidIndianMobile(phone)) return;
    return subscribeLiveActivityPushToStart(phone);
  }, [phone]);

  const withLiveEta = useCallback((drive: ActiveInstantTracking | null) => {
    if (!drive || drive.status !== 'tracking') return null;
    return { ...drive, eta_minutes: computeEtaMinutes(drive) };
  }, []);

  const refresh = useCallback(async () => {
    if (!isValidIndianMobile(phone)) {
      setActive(null);
      return;
    }
    try {
      const next = await fetchActiveInstantTracking(phone);
      setActive(withLiveEta(next));
    } catch {
      setActive(null);
    }
  }, [phone, withLiveEta]);

  const syncPushTokenForPhone = useCallback(async (phone10: string) => {
    if (!isValidIndianMobile(phone10)) return;
    const fcm = await loadFcm();
    if (!fcm) return;
    await fcm.syncFcmDeviceToken(phone10).catch(() => {});
  }, []);

  const applyPushUpdate = useCallback(
    (etaMinutes: number, status: string) => {
      if (status === 'arrived' || status === 'cancelled') {
        setActive(null);
        return;
      }
      setActive((prev) => {
        if (!prev) return prev;
        return { ...prev, eta_minutes: etaMinutes, status: 'tracking' };
      });
    },
    [],
  );

  const setActiveFromBooking = useCallback(
    (drive: ActiveInstantTracking) => {
      setActive(withLiveEta(drive.status === 'tracking' ? drive : null));
    },
    [withLiveEta],
  );

  useEffect(() => {
    if (!isValidIndianMobile(phone)) return;

    let cancelled = false;
    let unsubRefresh = () => {};

    let delay: ReturnType<typeof setTimeout> | undefined;

    const task = InteractionManager.runAfterInteractions(() => {
      delay = setTimeout(() => {
        void loadFcm().then((fcm) => {
          if (cancelled || !fcm) return;
          void fcm.syncFcmDeviceToken(phone).catch(() => {});
          unsubRefresh = fcm.onFcmTokenRefresh((token) => {
            void registerTestingDeviceToken({
              phone,
              fcmToken: token,
              platform: Platform.OS === 'ios' ? 'ios' : 'android',
            }).catch(() => {});
          });
        });
      }, 400);
    });

    return () => {
      cancelled = true;
      task.cancel();
      if (delay) clearTimeout(delay);
      unsubRefresh();
    };
  }, [phone]);

  useEffect(() => {
    let unsub = () => {};
    const task = InteractionManager.runAfterInteractions(() => {
      void loadFcm().then((fcm) => {
        if (!fcm) return;
        unsub = fcm.subscribeToFcmMessages(applyPushUpdate);
      });
    });
    return () => {
      task.cancel();
      unsub();
    };
  }, [applyPushUpdate]);

  useEffect(() => {
    void refresh();
    const pollMs = active ? 30_000 : 60_000;
    const id = setInterval(() => void refresh(), pollMs);
    return () => clearInterval(id);
  }, [refresh, active?.id]);

  useEffect(() => {
    if (!active || active.status !== 'tracking') return;
    const tick = setInterval(() => {
      setActive((prev) => {
        if (!prev || prev.status !== 'tracking') return prev;
        return { ...prev, eta_minutes: computeEtaMinutes(prev) };
      });
    }, 10_000);
    return () => clearInterval(tick);
  }, [active?.id, active?.status]);

  useEffect(() => {
    const onState = (state: AppStateStatus) => {
      if (state === 'active') void refresh();
    };
    const sub = AppState.addEventListener('change', onState);
    return () => sub.remove();
  }, [refresh]);

  /**
   * Persistent visit UI: Android ongoing shade (Notifee) + iOS Live Activity.
   * Server pushes still update both when the app is killed; this keeps local state in sync while open.
   */
  useEffect(() => {
    let cancelled = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const delayMs = Platform.OS === 'android' ? 700 : 400;

    const task = InteractionManager.runAfterInteractions(() => {
      timeout = setTimeout(() => {
        if (cancelled) return;

        if (!active || active.status !== 'tracking') {
          void dismissVisitStatusNotification();
          return;
        }

        void showVisitStatusNotification(active);
      }, delayMs);
    });

    return () => {
      cancelled = true;
      task.cancel();
      if (timeout) clearTimeout(timeout);
    };
  }, [
    active?.id,
    active?.status,
    active?.eta_minutes,
    active?.initial_eta_minutes,
    active?.eta_started_at,
    active?.address,
    active?.car,
    notifPermissionTick,
  ]);

  /** Re-upload per-activity APNs token while tracking (iOS may rotate after remote start). */
  useEffect(() => {
    if (Platform.OS !== 'ios' || !active || active.status !== 'tracking') return;

    void resyncLiveActivityPushRegistration(active);
    const id = setInterval(() => {
      void resyncLiveActivityPushRegistration(active);
    }, 12_000);

    return () => clearInterval(id);
  }, [active?.id, active?.status]);

  const value = useMemo(
    () => ({
      active,
      refresh,
      applyPushUpdate,
      setActiveFromBooking,
      syncPushTokenForPhone,
    }),
    [active, refresh, applyPushUpdate, setActiveFromBooking, syncPushTokenForPhone],
  );

  return (
    <InstantTrackingContext.Provider value={value}>{children}</InstantTrackingContext.Provider>
  );
}

export function useInstantTracking() {
  const ctx = useContext(InstantTrackingContext);
  if (!ctx) {
    throw new Error('useInstantTracking must be used within InstantTrackingProvider');
  }
  return ctx;
}
