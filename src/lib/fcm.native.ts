import messaging, { type FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import { Platform } from 'react-native';

import { registerTestingDeviceToken } from '@/lib/api/testing';
import { ensurePostNotificationsPermission } from '@/lib/notification-permission';
import { updateFromInstantDrivePushData } from '@/lib/visit-status-notification';

function getMessaging(): FirebaseMessagingTypes.Module | null {
  try {
    return messaging();
  } catch {
    return null;
  }
}

async function ensurePermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    return ensurePostNotificationsPermission();
  }

  const mod = getMessaging();
  if (!mod) return false;

  const status = await mod.requestPermission();
  return (
    status === messaging.AuthorizationStatus.AUTHORIZED ||
    status === messaging.AuthorizationStatus.PROVISIONAL
  );
}

export async function syncFcmDeviceToken(phone: string): Promise<void> {
  try {
    const mod = getMessaging();
    if (!mod) return;

    const allowed = await ensurePermission();
    if (!allowed) return;

    const token = await mod.getToken();
    if (!token) return;

    await registerTestingDeviceToken({
      phone,
      fcmToken: token,
      platform: Platform.OS === 'ios' ? 'ios' : 'android',
    });
  } catch {
    // FCM optional for app shell; avoid crashing login flow.
  }
}

export function subscribeToFcmMessages(
  onEta: (etaMinutes: number, status: string) => void,
): () => void {
  const mod = getMessaging();
  if (!mod) {
    return () => {};
  }

  const parse = async (data: Record<string, string | undefined>) => {
    if (data.type !== 'testing_instant_drive') return;
    await updateFromInstantDrivePushData(data);
    const eta = Number(data.eta_minutes ?? '0');
    onEta(Number.isNaN(eta) ? 0 : eta, data.status ?? 'tracking');
  };

  let unsubForeground: (() => void) | undefined;

  try {
    unsubForeground = mod.onMessage(async (remoteMessage) => {
      if (remoteMessage.data) {
        await parse(remoteMessage.data as Record<string, string | undefined>);
      }
    });

    mod.onNotificationOpenedApp((remoteMessage) => {
      if (remoteMessage.data) {
        void parse(remoteMessage.data as Record<string, string | undefined>);
      }
    });

    void mod.getInitialNotification().then((remoteMessage) => {
      if (remoteMessage?.data) {
        void parse(remoteMessage.data as Record<string, string | undefined>);
      }
    });
  } catch {
    return () => {};
  }

  return () => {
    unsubForeground?.();
  };
}

export function onFcmTokenRefresh(handler: (token: string) => void): () => void {
  const mod = getMessaging();
  if (!mod) {
    return () => {};
  }

  try {
    return mod.onTokenRefresh(handler);
  } catch {
    return () => {};
  }
}
